import axios from 'axios';
import { AgentExecutor, AgentExecutionContext } from '../agentService';
import { IAgentRun } from '../../models/AgentRun';
import NewsItem from '../../models/NewsItem';
import mongoose from 'mongoose';
import { enhanceNewsItemWithImage } from '../newsEnhancementService';

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
    this.crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'https://synapse-crewai.onrender.com';
    
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

      if (!result.success && !result.sessionId) {
        throw new Error(result.error || 'CrewAI service returned unsuccessful result or did not provide a session ID');
      }

      // **FIX**: Immediately save the session ID to the agent run to enable progress tracking.
      // This is the most critical part for ensuring the frontend can poll for progress.
      if (result.sessionId) {
        run.results = { ...run.results, sessionId: result.sessionId };
        await run.save();
        await run.addLog('info', 'CrewAI session started', { sessionId: result.sessionId });
        console.log(`[CrewAIExecutor] Saved session ID ${result.sessionId} to run ${run._id}`);
      } else {
        // If no session ID is returned, we cannot track progress. Log a warning.
        await run.addLog('warn', 'CrewAI service did not return a session ID. Progress tracking will be unavailable for this run.');
        console.warn(`[CrewAIExecutor] No session ID returned from CrewAI service for agent ${agent.name}`);
      }

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

    // **FIX 19: Include agent_id for proper session tracking**
    // **FIX 26: Add current date awareness for up-to-date content**
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDateTime = now.toISOString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return {
      topics,
      sources,
      agent_id: agent._id.toString(), // Critical for session tracking
      max_articles: config.maxItemsPerRun || 50,
      quality_threshold: 0.7,
      include_trends: true,
      focus_areas: ['quality', 'relevance', 'url_validation', 'recency'],
      // Date awareness for latest content
      current_date: currentDate,
      current_datetime: currentDateTime,
      timezone: timeZone,
      time_range: '24h', // Focus on last 24 hours
      recency_boost: true, // Boost recent content in scoring
      date_filters: {
        min_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
        max_date: currentDate,
        prefer_recent: true
      }
    };
  }

  private async processResults(result: any, agent: any, run: IAgentRun, userId: string): Promise<void> {
    const data = result.data;
    
    // Handle organized content from multiple sources
    const organizedContent = data?.organized_content || {};
    const validatedArticles = data?.validated_articles || [];
    
    // Process each source separately to maintain accurate attribution
    const sourceData = {
      reddit: organizedContent.reddit_posts || [],
      linkedin: organizedContent.linkedin_posts || [],
      telegram: organizedContent.telegram_messages || [],
      news_website: organizedContent.news_articles || [],
      validated: validatedArticles || []
    };
    
    // Combine all content sources with explicit source labeling
    const allContent: any[] = [];
    
    // Process each source type separately
    for (const [sourceType, items] of Object.entries(sourceData)) {
      if (Array.isArray(items)) {
        items.forEach(item => {
          // Validate source attribution
          const actualSource = this.validateSourceType(item, sourceType);
          allContent.push({
            ...item,
            source_type: actualSource,
            original_source_claim: sourceType,
            source_validated: actualSource === sourceType
          });
        });
      }
    }
    
    console.log(`[CrewAIExecutor] Processing ${allContent.length} items from all sources`);
    console.log(`[CrewAIExecutor] Source breakdown:`, {
      reddit: sourceData.reddit.length,
      linkedin: sourceData.linkedin.length,
      telegram: sourceData.telegram.length,
      news: sourceData.news_website.length,
      validated: sourceData.validated.length
    });

    // Log source validation summary
    const sourceValidation = allContent.reduce((acc, item) => {
      const key = item.original_source_claim;
      if (!acc[key]) acc[key] = { total: 0, valid: 0, invalid: 0 };
      acc[key].total++;
      if (item.source_validated) {
        acc[key].valid++;
      } else {
        acc[key].invalid++;
        console.warn(`[CrewAIExecutor] Source mismatch: Item claimed as ${item.original_source_claim} but appears to be ${item.source_type}`);
      }
      return acc;
    }, {} as Record<string, any>);
    
    console.log(`[CrewAIExecutor] Source validation summary:`, sourceValidation);

    let savedCount = 0;
    let skippedCount = 0;
    let sourceCounts: Record<string, number> = {};

    // Check if refresh mode is enabled
    const refreshMode = agent.configuration?.refreshMode || false;
    const duplicateWindow = refreshMode ? 1 : 4; // 1 hour in refresh mode, 4 hours normally
    
    // Import crypto for hashing
    const crypto = require('crypto');

    // Group processing by verified source type
    const processingGroups = allContent.reduce((groups, item) => {
      const sourceType = item.source_type;
      if (!groups[sourceType]) groups[sourceType] = [];
      groups[sourceType].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    console.log(`[CrewAIExecutor] Processing groups:`, Object.keys(processingGroups).map(k => `${k}: ${processingGroups[k].length}`));

    for (const [sourceType, articles] of Object.entries(processingGroups)) {
      console.log(`[CrewAIExecutor] 📝 Processing ${(articles as any[]).length} items from ${sourceType}`);
      
      for (let i = 0; i < (articles as any[]).length; i++) {
        const article = (articles as any[])[i];
        
        try {
          console.log(`[CrewAIExecutor] Processing ${sourceType} item ${i+1}/${(articles as any[]).length}: ${article.title?.substring(0, 80)}...`);
          
          // Generate content hash for better duplicate detection
          const contentHash = crypto.createHash('md5')
            .update((article.title || '') + (article.url || ''))
            .digest('hex');
          
          // Generate unique ID with timestamp to ensure uniqueness
          const uniqueId = `${sourceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
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
            console.log(`[CrewAIExecutor] ⏭️ Skipped ${sourceType} item ${i+1} (already exists)`);
            await run.addLog('info', 'Skipped duplicate article', {
              title: article.title,
              reason: `Similar content found within ${duplicateWindow} hours`,
              existingDate: existingItem.createdAt,
              refreshMode: refreshMode,
              window: `${duplicateWindow}h`,
              sourceType: sourceType
            });
            continue;
          }

          // Create new news item with enhanced data and unique ID
          const newsItem = new NewsItem({
            _id: new mongoose.Types.ObjectId(), // Ensure unique ObjectId
            userId,
            agentId: agent._id,
            runId: run._id, // Link to the specific agent run
            title: article.title || 'Untitled',
            content: article.content || article.summary || article.text || '',
            summary: article.summary || article.content?.substring(0, 300) + '...' || article.text?.substring(0, 300) + '...' || '',
            url: article.url_cleaned || article.url || article.external_url || '',
            source: this.determineActualSource(article, sourceType),
            author: article.author || 'Unknown',
            publishedDate: article.published_date ? new Date(article.published_date) : 
                          article.timestamp ? new Date(article.timestamp) :
                          article.date ? new Date(article.date) : new Date(),
            tags: article.tags || [],
            contentHash: contentHash, // Store content hash for future duplicate detection
            metadata: {
              uniqueId: uniqueId, // Store unique ID
              // Enhanced metadata from CrewAI
              qualityScore: article.quality_score || 0,
              relevanceScore: article.relevance_score || 0,
              matchedTopic: article.matched_topic || 'general',
              sourceCategory: article.source_category || sourceType,
              sourceType: sourceType, // Use validated source type
              originalSourceClaim: article.original_source_claim,
              sourceValidated: article.source_validated,
              urlValidated: article.url_validated || article.validated || false,
              scrapedAt: article.scraped_at || new Date().toISOString(),
              
              // Social media specific data
              engagement: article.engagement || {
                likes: article.likes || article.score || 0,
                comments: article.comments || article.num_comments || 0,
                shares: article.shares || article.forwards || 0,
                views: article.views || 0,
                reactions: article.reactions || {}
              },
              
              // Source-specific data
              sourceSpecific: this.extractSourceSpecificData(article, sourceType),
              
              // CrewAI execution metadata
              crewaiMode: result.mode,
              enhancedFeatures: result.enhanced_features,
              executionTimestamp: result.timestamp,
              refreshMode: refreshMode
            }
          });

          await newsItem.save();
          savedCount++;
          
          // Track source counts by verified type
          sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;

          console.log(`[CrewAIExecutor] ✅ Successfully stored ${sourceType} item ${i+1}`);
          
          // Enhance with relevant image (async, don't block the main flow)
          // Changed skipExisting to false to ensure all items get images
          enhanceNewsItemWithImage(newsItem, { skipExisting: false })
            .then((enhancedItem) => {
              if (enhancedItem?.generatedImage) {
                console.log(`[CrewAIExecutor] 🖼️ Enhanced news item with ${enhancedItem.generatedImage.source} image`);
                run.addLog('info', 'Enhanced article with image', {
                  title: article.title,
                  imageSource: enhancedItem.generatedImage.source,
                  imageUrl: enhancedItem.generatedImage.url
                });
              } else {
                console.log(`[CrewAIExecutor] ⚠️ Image enhancement returned null for item: ${article.title}`);
              }
            })
            .catch((error) => {
              console.warn(`[CrewAIExecutor] Failed to enhance item with image: ${error.message}`);
              // Log the specific error for debugging
              run.addLog('warn', 'Image enhancement failed', {
                title: article.title,
                error: error.message,
                suggestion: 'Check if REPLICATE_API_TOKEN or UNSPLASH_ACCESS_KEY are configured'
              });
            });

          await run.addLog('info', 'Saved news article', {
            title: article.title,
            source: newsItem.source,
            sourceType: sourceType,
            qualityScore: article.quality_score,
            urlValidated: article.url_validated || article.validated,
            uniqueId: uniqueId,
            sourceValidated: article.source_validated
          });

        } catch (error: any) {
          console.error(`[CrewAIExecutor] Error saving ${sourceType} article:`, error);
          await run.addLog('warn', 'Failed to save article', {
            title: article.title,
            sourceType: sourceType,
            error: error.message
          });
        }
      }
      
      console.log(`[CrewAIExecutor] 📊 ${sourceType}: Stored ${sourceCounts[sourceType] || 0}/${(articles as any[]).length} items`);
    }

    // Log execution summary with source breakdown
    await run.addLog('info', 'CrewAI execution completed', {
      totalArticles: allContent.length,
      savedArticles: savedCount,
      skippedArticles: skippedCount,
      sourceBreakdown: sourceCounts,
      sourceValidation: sourceValidation,
      qualityMetrics: data?.ai_insights?.quality_metrics,
      urlValidationStats: data?.ai_insights?.url_validation_stats,
      recommendations: data?.recommendations,
      refreshMode: refreshMode,
      duplicateWindow: `${duplicateWindow} hours`
    });

    console.log(`[CrewAIExecutor] Successfully stored ${savedCount} items from CrewAI agents`);
    console.log(`[CrewAIExecutor] Source breakdown (verified):`, sourceCounts);
    console.log(`[CrewAIExecutor] Refresh mode: ${refreshMode}, Duplicate window: ${duplicateWindow}h`);
  }

  private validateSourceType(item: any, claimedSource: string): string {
    // Validate source based on URL patterns and content structure
    const url = item.url || item.external_url || '';
    const content = JSON.stringify(item).toLowerCase();
    
    // Reddit validation - handle both direct reddit links and reddit posts with external links
    if (claimedSource === 'reddit' || item.source_type === 'reddit_post' || item.source_type === 'reddit_json' || item.source_type === 'reddit_api') {
      if (item.subreddit || 
          item.reddit_url ||
          content.includes('subreddit') ||
          item.source_type === 'reddit_json' ||
          item.source_type === 'reddit_api' ||
          item.source_type === 'reddit_post') {
        return 'reddit_post';
      }
      // If claimed as Reddit but doesn't have Reddit indicators, mark as misattributed
      return 'misattributed_reddit';
    }
    
    // Telegram validation
    if (claimedSource === 'telegram') {
      if (url.includes('t.me') || 
          item.channel ||
          item.channel_name ||
          item.message_id ||
          content.includes('telegram') ||
          item.source_type === 'telegram_web' ||
          item.source_type === 'telegram_rss') {
        return 'telegram';
      }
      return 'misattributed_telegram';
    }
    
    // LinkedIn validation  
    if (claimedSource === 'linkedin') {
      if (url.includes('linkedin.com') ||
          item.company ||
          content.includes('linkedin') ||
          item.source_type === 'linkedin_professional') {
        return 'linkedin';
      }
      return 'misattributed_linkedin';
    }
    
    // News website validation
    if (claimedSource === 'news_website' || claimedSource === 'validated') {
      // Most legitimate news sources
      return 'news_website';
    }
    
    // Default to claimed source if no validation fails
    return claimedSource;
  }

  private determineActualSource(item: any, sourceType: string): string {
    // Return the most accurate source description
    if (sourceType.startsWith('misattributed_')) {
      return `Misattributed (claimed ${sourceType.replace('misattributed_', '')} but appears to be news)`;
    }
    
    // For Reddit posts, show that it's a Reddit post linking to an external source
    if (sourceType === 'reddit_post' || sourceType === 'reddit') {
      const domain = item.domain || (item.url ? new URL(item.url).hostname : '');
      const subreddit = item.subreddit;
      
      if (item.external_link === true || (item.url && !item.url.includes('reddit.com'))) {
        return subreddit ? `Reddit r/${subreddit} → ${domain}` : `Reddit → ${domain}`;
      }
      return subreddit ? `Reddit r/${subreddit}` : 'Reddit';
    }
    
    if (item.display_source) {
      return item.display_source;
    }
    
    if (item.source) {
      return item.source;
    }
    
    if (sourceType === 'telegram') {
      return item.channel_name || item.channel || 'Telegram';
    }
    
    if (sourceType === 'linkedin') {
      return 'LinkedIn Professional';
    }
    
    return sourceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private extractSourceSpecificData(item: any, sourceType: string): any {
    switch (sourceType) {
      case 'reddit_post':
      case 'reddit':
        return {
          subreddit: item.subreddit,
          score: item.score,
          comments: item.num_comments,
          upvoteRatio: item.upvote_ratio,
          redditUrl: item.reddit_url,
          flair: item.flair,
          domain: item.domain,
          externalLink: item.external_link,
          redditPostInfo: item.reddit_post_info
        };
      
      case 'telegram':
        return {
          channel: item.channel,
          channelName: item.channel_name,
          messageId: item.message_id,
          views: item.views,
          forwards: item.forwards,
          reactions: item.reactions
        };
      
      case 'linkedin':
        return {
          company: item.company,
          engagement: item.engagement
        };
      
      default:
        return {};
    }
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
    
    // **FIX 20: Store session ID from response for progress tracking**
    let sessionId: string | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[CrewAIExecutor] News gathering attempt ${attempt}/${maxAttempts} for agent: ${requestData.agent_id}`);
        
        if (run) {
          await run.addLog('info', `🤖 Starting CrewAI multi-agent research (attempt ${attempt}/${maxAttempts})...`);
          await run.addLog('info', `🔍 Session tracking enabled for agent: ${requestData.agent_id}`);
        }
        
        const response = await axios.post(`${this.crewaiServiceUrl}/gather-news`, requestData, {
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Synapse-CrewAI-Executor/1.0'
          }
        });

        console.log(`[CrewAIExecutor] ✅ News gathering succeeded on attempt ${attempt}`);
        
        // **FIX 21: Extract and store session ID from response**
        const responseData = response.data as any;
        if (responseData?.session_id) {
          sessionId = responseData.session_id;
          console.log(`[CrewAIExecutor] 📊 Session ID received: ${sessionId}`);
          
          if (run) {
            await run.addLog('info', `📊 Session ID: ${sessionId} - Use this for progress tracking`);
            
            // Store session ID in the run results for later retrieval
            try {
              const AgentRun = require('../../models/AgentRun').default;
              await AgentRun.findByIdAndUpdate(run._id, {
                'results.sessionId': sessionId,
                'results.sessionCreated': new Date().toISOString()
              });
              console.log(`[CrewAIExecutor] 💾 Stored session ID ${sessionId} in run ${run._id}`);
            } catch (updateError) {
              console.warn(`[CrewAIExecutor] ⚠️ Failed to store session ID: ${updateError}`);
            }
          }
        } else {
          console.warn(`[CrewAIExecutor] ⚠️ No session_id in response - progress tracking may be limited`);
          if (run) {
            await run.addLog('warn', 'No session ID received - progress tracking may be limited');
          }
        }
        
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
