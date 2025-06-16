import axios from 'axios';
import { AgentExecutor, AgentExecutionContext } from '../agentService';
import { IAgentRun } from '../../models/AgentRun';
import NewsItem from '../../models/NewsItem';

export class CrewAIAgentExecutor implements AgentExecutor {
  private crewaiServiceUrl: string;

  constructor() {
    this.crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'http://localhost:5000';
  }

  async execute(context: AgentExecutionContext): Promise<void> {
    const { agent, run, userId } = context;
    
    console.log(`[CrewAIExecutor] Starting execution for agent: ${agent.name}`);
    
    try {
      // Prepare request data based on agent configuration
      const requestData = this.prepareRequestData(agent);
      
      await run.addLog('info', 'Starting CrewAI multi-agent news gathering', {
        topics: requestData.topics,
        sources: requestData.sources,
        mode: 'enhanced_dynamic'
      });

      // Call the enhanced CrewAI service
      const response = await axios.post(`${this.crewaiServiceUrl}/gather-news`, requestData, {
        timeout: 300000, // 5 minutes timeout for AI processing
        headers: {
          'Content-Type': 'application/json'
        }
      });

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
      const response = await axios.get(`${this.crewaiServiceUrl}/health`, {
        timeout: 10000
      });
      
      return (response.data as any)?.status === 'healthy';
    } catch (error) {
      console.error('[CrewAIExecutor] Health check failed:', error);
      return false;
    }
  }

  async getSystemInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.crewaiServiceUrl}/system-info`, {
        timeout: 10000
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
        timeout: 30000
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
        timeout: 60000
      });
      
      return response.data;
    } catch (error) {
      console.error('[CrewAIExecutor] Dynamic crew test failed:', error);
      return null;
    }
  }
}
