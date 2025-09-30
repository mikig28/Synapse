import axios from 'axios';
import { AgentExecutor, AgentExecutionContext } from '../agentService';
import NewsItem from '../../models/NewsItem';

/**
 * Custom Agent Executor with CrewAI Integration
 * Allows users to define custom goals and tools that execute via CrewAI service
 */
export class CustomAgentExecutor implements AgentExecutor {
  private crewaiServiceUrl: string;

  constructor() {
    this.crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'https://synapse-crewai.onrender.com';
    console.log(`[CustomAgent] Using CrewAI Service URL: ${this.crewaiServiceUrl}`);
  }

  async execute(context: AgentExecutionContext): Promise<void> {
    const { agent, run, userId } = context;

    await run.addLog('info', `Starting custom agent: ${agent.name}`, {
      agentName: agent.name,
      configuration: agent.configuration
    });

    try {
      // Get custom agent configuration
      const config = agent.configuration as any;

      // Check if user wants to use CrewAI service
      const useCrewAI = config.useCrewAI !== false; // Default to true

      if (useCrewAI) {
        await this.executeWithCrewAI(context);
      } else {
        await this.executeBasicCustomAgent(context);
      }

      await run.addLog('info', 'Custom agent execution completed successfully');

    } catch (error: any) {
      console.error('[CustomAgent] Execution failed:', error);
      await run.addLog('error', `Custom agent execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute custom agent using CrewAI service with user-defined goals and tools
   */
  private async executeWithCrewAI(context: AgentExecutionContext): Promise<void> {
    const { agent, run } = context;
    const config = agent.configuration as any;

    await run.addLog('info', '🤖 Executing with CrewAI multi-agent system');

    // Extract user-defined goal
    const userGoal = config.goal || config.description || agent.description || 'Research and analyze the specified topics';

    // Extract topics
    const topics = agent.configuration.topics || ['general research'];

    // Extract tools configuration
    const enabledTools = config.tools || {
      web_search: true,
      content_analysis: true,
      sentiment_analysis: false,
      trend_detection: false,
      url_extraction: true
    };

    // Extract sources configuration
    const enabledSources = config.sources || {
      reddit: true,
      linkedin: false,
      telegram: false,
      news_websites: true
    };

    await run.addLog('info', '📝 Custom agent configuration', {
      goal: userGoal,
      topics: topics,
      tools: Object.keys(enabledTools).filter(k => enabledTools[k]),
      sources: Object.keys(enabledSources).filter(k => enabledSources[k])
    });

    // Prepare CrewAI request
    const crewaiRequest = {
      topics: Array.isArray(topics) ? topics : [topics],
      sources: enabledSources,
      agent_id: agent._id.toString(),
      tools: enabledTools,
      custom_goal: userGoal, // User-defined goal
      parameters: {
        max_items_per_source: config.maxItemsPerSource || 10,
        time_range: config.timeRange || '24h',
        quality_threshold: config.qualityThreshold || 5,
        include_urls: config.includeUrls !== false,
        include_metadata: config.includeMetadata !== false,
        analyze_sentiment: enabledTools.sentiment_analysis || false,
        extract_entities: config.extractEntities || false
      }
    };

    await run.addLog('info', '🚀 Sending request to CrewAI service', {
      endpoint: `${this.crewaiServiceUrl}/gather-news`,
      requestSize: JSON.stringify(crewaiRequest).length
    });

    try {
      // Make request to CrewAI service
      const response = await axios.post(
        `${this.crewaiServiceUrl}/gather-news`,
        crewaiRequest,
        {
          timeout: 300000, // 5 minutes timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || 'CrewAI execution failed');
      }

      await run.addLog('info', '✅ CrewAI execution completed', {
        mode: result.mode,
        timestamp: result.timestamp
      });

      // Process and save results
      await this.processCrewAIResults(context, result);

    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        await run.addLog('error', '❌ CrewAI service is unreachable', {
          serviceUrl: this.crewaiServiceUrl,
          suggestion: 'The service may be sleeping (Render free tier). Wait 30-60 seconds and try again.'
        });
      }
      throw error;
    }
  }

  /**
   * Process CrewAI results and save to database
   */
  private async processCrewAIResults(context: AgentExecutionContext, result: any): Promise<void> {
    const { agent, run, userId } = context;
    const data = result.data || {};

    let itemsCreated = 0;

    // Process Reddit posts
    const redditPosts = data.organized_content?.reddit_posts || [];
    for (const post of redditPosts) {
      try {
        const newsItem = new NewsItem({
          userId,
          title: post.title || 'Untitled Reddit Post',
          content: post.content || post.selftext || '',
          source: `reddit_r/${post.subreddit}`,
          url: post.reddit_url || post.url || '',
          publishedAt: post.created_utc ? new Date(post.created_utc) : new Date(),
          metadata: {
            agentId: agent._id.toString(),
            agentName: agent.name,
            executionType: 'custom_crewai',
            score: post.score,
            numComments: post.num_comments,
            subreddit: post.subreddit,
            author: post.author
          }
        });

        await newsItem.save();
        itemsCreated++;
      } catch (error) {
        console.error('[CustomAgent] Failed to save Reddit post:', error);
      }
    }

    // Process news articles
    const newsArticles = data.organized_content?.news_articles || [];
    for (const article of newsArticles) {
      try {
        const newsItem = new NewsItem({
          userId,
          title: article.title || 'Untitled News Article',
          content: article.content || article.summary || '',
          source: article.source || 'news',
          url: article.url || '',
          publishedAt: article.published_date ? new Date(article.published_date) : new Date(),
          metadata: {
            agentId: agent._id.toString(),
            agentName: agent.name,
            executionType: 'custom_crewai',
            author: article.author,
            category: article.source_category
          }
        });

        await newsItem.save();
        itemsCreated++;
      } catch (error) {
        console.error('[CustomAgent] Failed to save news article:', error);
      }
    }

    await run.addLog('info', `💾 Saved ${itemsCreated} items to database`, {
      redditPosts: redditPosts.length,
      newsArticles: newsArticles.length,
      totalSaved: itemsCreated
    });

    // Log AI insights if available
    if (data.ai_insights) {
      await run.addLog('info', '🧠 AI Insights', {
        insights: data.ai_insights
      });
    }

    // Log executive summary if available
    if (data.executive_summary && data.executive_summary.length > 0) {
      await run.addLog('info', '📊 Executive Summary', {
        summary: data.executive_summary.join('\n')
      });
    }
  }

  /**
   * Execute basic custom agent (fallback without CrewAI)
   */
  private async executeBasicCustomAgent(context: AgentExecutionContext): Promise<void> {
    const { agent, run } = context;
    const config = agent.configuration as any;

    await run.addLog('info', 'Executing basic custom agent (without CrewAI)');

    // Create a sample news item
    const sampleItem = new NewsItem({
      userId: context.userId,
      title: `Custom Agent Run: ${agent.name}`,
      content: `This is a custom agent execution without CrewAI integration. Goal: ${config.goal || 'No goal specified'}`,
      source: 'custom_agent_basic',
      url: `https://synapse.local/agents/${agent._id}`,
      publishedAt: new Date(),
      metadata: {
        agentId: agent._id.toString(),
        agentName: agent.name,
        executionType: 'basic_custom',
        goal: config.goal,
        topics: agent.configuration.topics
      }
    });

    await sampleItem.save();

    await run.addLog('info', 'Basic custom agent execution completed', {
      itemId: sampleItem._id.toString(),
      message: 'Enable useCrewAI in configuration for full multi-agent capabilities'
    });
  }
}
