import axios from 'axios';
import { AgentExecutor, AgentExecutionContext } from '../agentService';
import { IAgentRun } from '../../models/AgentRun';
import NewsItem from '../../models/NewsItem';

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
        stack: error.stack
      });

      throw error;
    }
  }

  private prepareRequestData(agent: any): any {
    const config = agent.configuration;
    
    // Extract topics from agent configuration
    const topics = config.topics || ['technology', 'AI', 'startups'];
    
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
    const articles = data?.organized_content?.validated_articles || [];
    
    console.log(`[CrewAIExecutor] Processing ${articles.length} articles`);

    let savedCount = 0;
    let skippedCount = 0;

    for (const article of articles) {
      try {
        // Check if article already exists
        const existingItem = await NewsItem.findOne({
          $or: [
            { url: article.url },
            { title: article.title }
          ]
        });

        if (existingItem) {
          skippedCount++;
          continue;
        }

        // Create new news item with enhanced data
        const newsItem = new NewsItem({
          userId,
          agentId: agent._id,
          title: article.title || 'Untitled',
          content: article.content || article.summary || '',
          summary: article.summary || article.content?.substring(0, 300) + '...' || '',
          url: article.url_cleaned || article.url || '',
          source: article.source || 'Unknown',
          author: article.author || 'Unknown',
          publishedDate: article.published_date ? new Date(article.published_date) : new Date(),
          tags: article.tags || [],
          metadata: {
            // Enhanced metadata from CrewAI
            qualityScore: article.quality_score || 0,
            relevanceScore: article.relevance_score || 0,
            matchedTopic: article.matched_topic || 'general',
            sourceCategory: article.source_category || 'news',
            urlValidated: article.url_validated || false,
            scrapedAt: article.scraped_at || new Date().toISOString(),
            
            // Original article data
            originalData: {
              score: article.score || 0,
              comments: article.comments || 0,
              stars: article.stars || 0,
              language: article.language || 'unknown',
              subreddit: article.subreddit || null
            },
            
            // CrewAI execution metadata
            crewaiMode: result.mode,
            enhancedFeatures: result.enhanced_features,
            executionTimestamp: result.timestamp
          }
        });

        await newsItem.save();
        savedCount++;

        await run.addLog('info', 'Saved news article', {
          title: article.title,
          source: article.source,
          qualityScore: article.quality_score,
          urlValidated: article.url_validated
        });

      } catch (error: any) {
        console.error(`[CrewAIExecutor] Error saving article:`, error);
        await run.addLog('warn', 'Failed to save article', {
          title: article.title,
          error: error.message
        });
      }
    }

    // Log execution summary
    await run.addLog('info', 'CrewAI execution completed', {
      totalArticles: articles.length,
      savedArticles: savedCount,
      skippedArticles: skippedCount,
      qualityMetrics: data?.ai_insights?.quality_metrics,
      urlValidationStats: data?.ai_insights?.url_validation_stats,
      recommendations: data?.recommendations
    });

    console.log(`[CrewAIExecutor] Saved ${savedCount} new articles, skipped ${skippedCount} duplicates`);
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
