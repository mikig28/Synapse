import axios from 'axios';
import { AgentExecutor, AgentExecutionContext } from '../agentService';
import { IAgentRun } from '../../models/AgentRun';
import NewsItem from '../../models/NewsItem';
import mongoose from 'mongoose';

export class CrewAIAgentExecutor implements AgentExecutor {
  private crewaiServiceUrl: string;
  
  // Standardized timeout configurations for Render deployment
  private readonly timeouts = {
    healthCheck: {
      initial: 15000,    // 15s for first attempt
      retry: 45000,      // 45s for retry attempts (cold start)
      maxAttempts: 3
    },
    newsGathering: {
      timeout: 300000,   // 5 minutes for AI processing
      maxAttempts: 2
    },
    testDynamicCrew: {
      timeout: 60000,    // 1 minute for test crew
      maxAttempts: 1
    },
    urlValidation: {
      timeout: 30000,    // 30s for URL validation
      maxAttempts: 1
    }
  };

  constructor() {
    this.crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'http://localhost:5000';
    
    // Validate and log the service URL for debugging
    console.log(`[CrewAIExecutor] Initialized with service URL: ${this.crewaiServiceUrl}`);
    
    if (!this.crewaiServiceUrl) {
      throw new Error('CREWAI_SERVICE_URL environment variable is required');
    }
    
    // Validate URL format
    try {
      new URL(this.crewaiServiceUrl);
    } catch (error) {
      throw new Error(`Invalid CREWAI_SERVICE_URL: ${this.crewaiServiceUrl}`);
    }
  }

  async execute(context: AgentExecutionContext): Promise<void> {
    const { agent, run, userId } = context;
    
    console.log(`[CrewAIExecutor] Starting execution for agent: ${agent.name}`);
    
    try {
      // First perform health check with retry logic
      await run.addLog('info', '🔄 Checking CrewAI service availability...');
      await this.healthCheckWithRetry(run);
      
      // Prepare request data based on agent configuration
      const requestData = this.prepareRequestData(agent);
      
      await run.addLog('info', 'Starting CrewAI multi-agent news gathering', {
        topics: requestData.topics,
        sources: requestData.sources,
        mode: 'enhanced_dynamic'
      });

      // Call the enhanced CrewAI service with retry logic
      const response = await this.executeNewsGatheringWithRetry(requestData, run);

      const result = response.data as any;

      if (!result.success) {
        throw new Error(result.error || 'CrewAI service returned unsuccessful result');
      }

      await run.addLog('info', 'CrewAI multi-agent research completed', {
        mode: result.mode,
        articlesFound: result.data?.organized_content?.validated_articles?.length || 0,
        enhancedFeatures: result.enhanced_features
      });

      // Process and save the results
      await this.processResults(result, agent, run, userId.toString());

      // Update agent statistics
      await this.updateAgentStatistics(agent, result);

    } catch (error: any) {
      console.error(`[CrewAIExecutor] Error executing agent ${agent.name}:`, error);
      
      await run.addLog('error', 'CrewAI execution failed', {
        error: error.message,
        stack: error.stack,
        serviceUrl: this.crewaiServiceUrl
      });

      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('ECONNREFUSED') || error.message.includes('service is unavailable')) {
        userMessage = 'CrewAI service is currently unavailable. Please try again in a few minutes.';
      } else if (error.message.includes('timeout')) {
        userMessage = 'CrewAI service timed out. The service may be busy or starting up.';
      } else if (error.message.includes('cold start')) {
        userMessage = 'CrewAI service is starting up. Please try again in about a minute.';
      }

      // Create an enhanced error with user-friendly message
      const enhancedError = new Error(userMessage);
      enhancedError.name = error.name;
      (enhancedError as any).originalError = error;
      (enhancedError as any).code = error.code;

      throw enhancedError;
    }
  }

  private prepareRequestData(agent: any): any {
    const config = agent.configuration;
    
    // Dynamic topic handling - accept any topics without hardcoded mappings
    let topics = config.topics;
    
    // Handle various formats and ensure we have valid topics
    if (!topics || (Array.isArray(topics) && topics.length === 0) || (typeof topics === 'string' && !topics.trim())) {
      // No topics configured - use generic defaults
      console.warn(`[CrewAIExecutor] No topics configured for agent ${agent.name}`);
      topics = ['news', 'trending', 'latest'];
    } else if (typeof topics === 'string') {
      // Handle string topics - could be comma-separated or single topic
      const trimmed = topics.trim();
      if (trimmed) {
        topics = trimmed.includes(',')
          ? trimmed.split(',').map(t => t.trim()).filter(t => t.length > 0)
          : [trimmed];
      }
      // If still empty after processing, use defaults
      if (!topics || topics.length === 0) {
        topics = ['news', 'trending', 'latest'];
      }
    } else if (Array.isArray(topics)) {
      // Filter out empty topics
      topics = topics.filter(t => t && t.trim && t.trim().length > 0);
      if (topics.length === 0) {
        topics = ['news', 'trending', 'latest'];
      }
    }
    
    console.log(`[CrewAIExecutor] Using topics for agent ${agent.name}:`, topics);
    console.log(`[CrewAIExecutor] Topics are dynamically provided by user - no hardcoded mappings`);
    
    // Map CrewAI sources to the enhanced service format
    const sources: any = {};
    
    if (config.crewaiSources) {
      sources.reddit = config.crewaiSources.reddit || false;
      sources.linkedin = config.crewaiSources.linkedin || false;
      sources.telegram = config.crewaiSources.telegram || false;
      sources.news_websites = config.crewaiSources.news_websites || false;
    } else {
      // Default sources if not configured
      sources.reddit = true;
      sources.news_websites = true;
      sources.linkedin = false;
      sources.telegram = false;
    }

    return {
      topics,
      sources,
      max_articles: config.maxItemsPerRun || 50,
      quality_threshold: 0.7,
      include_trends: true,
      focus_areas: ['quality', 'relevance', 'url_validation']
    };
  }

  private async processResults(result: any, agent: any, run: IAgentRun, userId: string): Promise<void> {
    const data = result.data;
    
    // Handle organized content from multiple sources
    const organizedContent = data?.organized_content || {};
    const validatedArticles = data?.validated_articles || [];
    
    // Combine all content sources
    const allContent = [
      ...(organizedContent.reddit_posts || []).map((item: any) => ({ ...item, source_type: 'reddit' })),
      ...(organizedContent.linkedin_posts || []).map((item: any) => ({ ...item, source_type: 'linkedin' })),
      ...(organizedContent.telegram_messages || []).map((item: any) => ({ ...item, source_type: 'telegram' })),
      ...(organizedContent.news_articles || []).map((item: any) => ({ ...item, source_type: 'news_website' })),
      ...validatedArticles.map((item: any) => ({ ...item, source_type: item.source_type || 'news_website' }))
    ];
    
    console.log(`[CrewAIExecutor] Processing ${allContent.length} items from all sources`);
    console.log(`[CrewAIExecutor] Source breakdown:`, {
      reddit: organizedContent.reddit_posts?.length || 0,
      linkedin: organizedContent.linkedin_posts?.length || 0,
      telegram: organizedContent.telegram_messages?.length || 0,
      news: organizedContent.news_articles?.length || 0,
      validated: validatedArticles.length
    });

    let savedCount = 0;
    let skippedCount = 0;
    let sourceCounts: Record<string, number> = {};

    // Check if refresh mode is enabled
    const refreshMode = agent.configuration?.refreshMode || false;
    const duplicateWindow = refreshMode ? 1 : 4; // 1 hour in refresh mode, 4 hours normally
    
    // Import crypto for hashing
    const crypto = require('crypto');

    for (const article of allContent) {
      try {
        // Generate content hash for better duplicate detection
        const contentHash = crypto.createHash('md5')
          .update((article.title || '') + (article.url || ''))
          .digest('hex');
        
        // Generate unique ID with timestamp to ensure uniqueness
        const uniqueId = `${article.source_type || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check for duplicates based on content hash instead of just URL
        const duplicateCheckDate = new Date(Date.now() - duplicateWindow * 60 * 60 * 1000);
        
        const existingItem = await NewsItem.findOne({
          $or: [
            // Check by content hash (preferred)
            { 
              contentHash: contentHash,
              createdAt: { $gte: duplicateCheckDate }
            },
            // Fallback to URL check for backward compatibility
            { 
              url: article.url,
              createdAt: { $gte: duplicateCheckDate }
            }
          ]
        });

        if (existingItem) {
          skippedCount++;
          console.log(`[CrewAIExecutor] Skipping duplicate article: ${article.title} (found within ${duplicateWindow}h)`);
          await run.addLog('info', 'Skipped duplicate article', {
            title: article.title,
            reason: `Similar content found within ${duplicateWindow} hours`,
            existingDate: existingItem.createdAt,
            refreshMode: refreshMode,
            window: `${duplicateWindow}h`
          });
          continue;
        }

        // Create new news item with enhanced data and unique ID
        const newsItem = new NewsItem({
          _id: new mongoose.Types.ObjectId(), // Ensure unique ObjectId
          userId,
          agentId: agent._id,
          title: article.title || 'Untitled',
          content: article.content || article.summary || '',
          summary: article.summary || article.content?.substring(0, 300) + '...' || '',
          url: article.url_cleaned || article.url || '',
          source: article.source || article.source_type || 'Unknown',
          author: article.author || 'Unknown',
          publishedDate: article.published_date ? new Date(article.published_date) : new Date(),
          tags: article.tags || [],
          contentHash: contentHash, // Store content hash for future duplicate detection
          metadata: {
            uniqueId: uniqueId, // Store unique ID
            // Enhanced metadata from CrewAI
            qualityScore: article.quality_score || 0,
            relevanceScore: article.relevance_score || 0,
            matchedTopic: article.matched_topic || 'general',
            sourceCategory: article.source_category || article.source_type || 'news',
            sourceType: article.source_type || 'news_website',
            urlValidated: article.url_validated || article.validated || false,
            scrapedAt: article.scraped_at || new Date().toISOString(),
            
            // Social media specific data
            engagement: article.engagement || {
              likes: article.likes || article.score || 0,
              comments: article.comments || article.num_comments || 0,
              shares: article.shares || 0,
              views: article.views || 0
            },
            
            // Original article data
            originalData: {
              score: article.score || 0,
              comments: article.comments || article.num_comments || 0,
              stars: article.stars || 0,
              language: article.language || 'unknown',
              subreddit: article.subreddit || null,
              company: article.company || null,
              messageId: article.messageId || null
            },
            
            // CrewAI execution metadata
            crewaiMode: result.mode,
            enhancedFeatures: result.enhanced_features,
            executionTimestamp: result.timestamp,
            refreshMode: refreshMode
          }
        });

        await newsItem.save();
        savedCount++;
        
        // Track source counts
        const sourceType = article.source_type || 'unknown';
        sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;

        await run.addLog('info', 'Saved news article', {
          title: article.title,
          source: article.source,
          sourceType: article.source_type,
          qualityScore: article.quality_score,
          urlValidated: article.url_validated || article.validated,
          uniqueId: uniqueId
        });

      } catch (error: any) {
        console.error(`[CrewAIExecutor] Error saving article:`, error);
        await run.addLog('warn', 'Failed to save article', {
          title: article.title,
          error: error.message
        });
      }
    }

    // Log execution summary with source breakdown
    await run.addLog('info', 'CrewAI execution completed', {
      totalArticles: allContent.length,
      savedArticles: savedCount,
      skippedArticles: skippedCount,
      sourceBreakdown: sourceCounts,
      sources: {
        reddit: organizedContent.reddit_posts?.length || 0,
        linkedin: organizedContent.linkedin_posts?.length || 0,
        telegram: organizedContent.telegram_messages?.length || 0,
        news: organizedContent.news_articles?.length || 0
      },
      qualityMetrics: data?.ai_insights?.quality_metrics,
      urlValidationStats: data?.ai_insights?.url_validation_stats,
      recommendations: data?.recommendations,
      refreshMode: refreshMode,
      duplicateWindow: `${duplicateWindow} hours`
    });

    console.log(`[CrewAIExecutor] Saved ${savedCount} new articles, skipped ${skippedCount} duplicates`);
    console.log(`[CrewAIExecutor] Source breakdown:`, sourceCounts);
    console.log(`[CrewAIExecutor] Refresh mode: ${refreshMode}, Duplicate window: ${duplicateWindow}h`);
  }

  private async updateAgentStatistics(agent: any, result: any): Promise<void> {
    try {
      const data = result.data;
      const articles = data?.organized_content?.validated_articles || [];
      
      // Update agent statistics
      agent.statistics.totalRuns += 1;
      agent.statistics.successfulRuns += 1;
      agent.statistics.totalItemsProcessed += articles.length;
      
      // Count only new items (this is approximate since we don't track exact duplicates here)
      const estimatedNewItems = Math.floor(articles.length * 0.7); // Estimate 70% are new
      agent.statistics.totalItemsAdded += estimatedNewItems;
      
      agent.lastRun = new Date();
      agent.status = 'idle';
      
      await agent.save();
      
      console.log(`[CrewAIExecutor] Updated agent statistics for ${agent.name}`);
      
    } catch (error: any) {
      console.error(`[CrewAIExecutor] Error updating agent statistics:`, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.healthCheckWithRetry();
      return true;
    } catch (error) {
      console.error('[CrewAIExecutor] Health check failed:', error);
      return false;
    }
  }

  private async healthCheckWithRetry(run?: any): Promise<void> {
    let lastError: any;
    const { initial, retry, maxAttempts } = this.timeouts.healthCheck;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[CrewAIExecutor] Health check attempt ${attempt}/${maxAttempts} to: ${this.crewaiServiceUrl}/health`);
        
        if (run) {
          await run.addLog('info', `🔍 Health check attempt ${attempt}/${maxAttempts}...`);
        }
        
        // Progressive timeout: 15s first attempt, 45s for subsequent attempts (Render cold starts)
        const timeout = attempt === 1 ? initial : retry;
        
        const response = await axios.get<{status?: string; initialized?: boolean}>(`${this.crewaiServiceUrl}/health`, {
          timeout,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log(`[CrewAIExecutor] Health check response (attempt ${attempt}):`, response.data);
        
        const isHealthy = response.data.status === 'healthy' || response.data.initialized === true;
        if (!isHealthy) {
          throw new Error('CrewAI service is not ready');
        }
        
        console.log(`[CrewAIExecutor] Health check passed on attempt ${attempt} - service is ready`);
        
        if (run) {
          await run.addLog('info', `✅ CrewAI service is ready (attempt ${attempt})`);
        }
        
        return; // Success!
        
      } catch (error: any) {
        lastError = error;
        console.error(`[CrewAIExecutor] Health check attempt ${attempt} failed:`, {
          url: `${this.crewaiServiceUrl}/health`,
          error: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          timeout: attempt === 1 ? initial : retry
        });
        
        if (run) {
          await run.addLog('warn', `⚠️ Health check attempt ${attempt} failed: ${error.message}`);
        }
        
        // If this is not the last attempt and it's a connection/timeout error, wait before retrying
        if (attempt < maxAttempts && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
          const waitTime = Math.min(5000 * attempt, 15000); // Progressive backoff: 5s, 10s, 15s max
          console.log(`[CrewAIExecutor] Waiting ${waitTime}ms before retry (service may be cold starting)`);
          
          if (run) {
            await run.addLog('info', `⏳ Waiting ${waitTime/1000}s before retry (service may be starting up)...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If it's the last attempt or a non-retryable error, break
        break;
      }
    }
    
    // All attempts failed
    if (lastError.code === 'ECONNREFUSED' || lastError.code === 'ETIMEDOUT' || lastError.code === 'ENOTFOUND') {
      throw new Error(`CrewAI service is unavailable at ${this.crewaiServiceUrl} after ${maxAttempts} attempts. This could be due to:
- Service is sleeping on Render (cold start can take 30-60 seconds)
- Network connectivity issues
- Service deployment problems

Attempted with progressive timeouts (${initial/1000}s, ${retry/1000}s, ${retry/1000}s) to account for cold starts.`);
    }
    
    throw new Error(`CrewAI service health check failed after ${maxAttempts} attempts: ${lastError.message} (URL: ${this.crewaiServiceUrl})`);
  }

  private async executeNewsGatheringWithRetry(requestData: any, run?: any): Promise<any> {
    let lastError: any;
    const { timeout, maxAttempts } = this.timeouts.newsGathering;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[CrewAIExecutor] News gathering attempt ${attempt}/${maxAttempts}`);
        
        if (run) {
          await run.addLog('info', `🤖 Starting CrewAI multi-agent research (attempt ${attempt}/${maxAttempts})...`);
        }
        
        const response = await axios.post(`${this.crewaiServiceUrl}/gather-news`, requestData, {
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        console.log(`[CrewAIExecutor] News gathering succeeded on attempt ${attempt}`);
        
        if (run) {
          await run.addLog('info', `✅ CrewAI research completed successfully on attempt ${attempt}`);
        }
        
        return response;
        
      } catch (error: any) {
        lastError = error;
        console.error(`[CrewAIExecutor] News gathering attempt ${attempt} failed:`, {
          error: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        if (run) {
          await run.addLog('warn', `⚠️ News gathering attempt ${attempt} failed: ${error.message}`);
        }
        
        // Only retry on connection/timeout errors and if not the last attempt
        if (attempt < maxAttempts && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
          const waitTime = 10000; // 10 seconds between news gathering retries
          console.log(`[CrewAIExecutor] Waiting ${waitTime}ms before retry (service may have restarted)`);
          
          if (run) {
            await run.addLog('info', `⏳ Waiting ${waitTime/1000}s before retry...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        break;
      }
    }
    
    // All attempts failed
    if (lastError.response) {
      throw new Error(`CrewAI service error after ${maxAttempts} attempts: ${lastError.response.data?.error || lastError.response.statusText}`);
    }
    throw new Error(`Failed to communicate with CrewAI service after ${maxAttempts} attempts: ${lastError.message}`);
  }

  async getSystemInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.crewaiServiceUrl}/system-info`, {
        timeout: this.timeouts.healthCheck.initial
      });
      
      return response.data;
    } catch (error) {
      console.error('[CrewAIExecutor] Failed to get system info:', error);
      return null;
    }
  }

  async validateUrls(urls: string[]): Promise<any> {
    try {
      const response = await axios.post(`${this.crewaiServiceUrl}/validate-urls`, {
        urls
      }, {
        timeout: this.timeouts.urlValidation.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('[CrewAIExecutor] URL validation failed:', error);
      return null;
    }
  }

  async testDynamicCrew(): Promise<any> {
    try {
      const response = await axios.get(`${this.crewaiServiceUrl}/test-dynamic-crew`, {
        timeout: this.timeouts.testDynamicCrew.timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('[CrewAIExecutor] Dynamic crew test failed:', error);
      return null;
    }
  }
}
