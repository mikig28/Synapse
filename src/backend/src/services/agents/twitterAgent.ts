import { TwitterApi } from 'twitter-api-v2';
import OpenAI from 'openai';
import { AgentExecutor, AgentExecutionContext } from '../agentService';
import BookmarkItem from '../../models/BookmarkItem';
import mongoose from 'mongoose';

interface Tweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  author?: {
    username: string;
    name: string;
  };
  url: string;
}

export class TwitterAgentExecutor implements AgentExecutor {
  private twitterClient: TwitterApi | null = null;
  private openaiClient: OpenAI | null = null;

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize Twitter API client
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (twitterBearerToken) {
      this.twitterClient = new TwitterApi(twitterBearerToken);
    } else {
      console.warn('[TwitterAgent] Twitter Bearer Token not configured');
    }

    // Initialize OpenAI client
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
    } else {
      console.warn('[TwitterAgent] OpenAI API Key not configured');
    }
  }

  async execute(context: AgentExecutionContext): Promise<void> {
    const { agent, run, userId } = context;

    if (!this.twitterClient) {
      throw new Error('Twitter API client not configured. Please set TWITTER_BEARER_TOKEN environment variable.');
    }

    if (!this.openaiClient) {
      throw new Error('OpenAI client not configured. Please set OPENAI_API_KEY environment variable.');
    }

    await run.addLog('info', 'Starting Twitter agent execution');

    const config = agent.configuration;
    const keywords = config.keywords || ['AI', 'technology', 'startup'];
    const minLikes = config.minLikes || 10;
    const minRetweets = config.minRetweets || 5;
    const excludeReplies = config.excludeReplies !== false; // Default to true
    const maxItemsPerRun = config.maxItemsPerRun || 10;

    await run.addLog('info', `Searching for tweets with keywords: ${keywords.join(', ')}`);

    try {
      let allTweets: Tweet[] = [];

      // Search for tweets with each keyword
      for (const keyword of keywords) {
        try {
          await run.addLog('info', `Searching for keyword: "${keyword}"`);

          const tweets = await this.searchTweets(keyword, {
            minLikes,
            minRetweets,
            excludeReplies,
            maxResults: Math.ceil(maxItemsPerRun / keywords.length),
          });

          await run.addLog('info', `Found ${tweets.length} tweets for keyword "${keyword}"`);
          allTweets = allTweets.concat(tweets);

        } catch (error: any) {
          await run.addLog('warn', `Failed to search for keyword "${keyword}": ${error.message}`);
        }
      }

      // Remove duplicates
      const uniqueTweets = this.removeDuplicateTweets(allTweets);
      await run.addLog('info', `Total unique tweets found: ${uniqueTweets.length}`);

      run.itemsProcessed = uniqueTweets.length;

      // Filter tweets through AI analysis
      const interestingTweets = await this.filterInterestingTweets(uniqueTweets, run);
      await run.addLog('info', `AI filtered ${interestingTweets.length} interesting tweets`);

      // Add interesting tweets to bookmarks
      let addedCount = 0;
      for (const tweet of interestingTweets.slice(0, maxItemsPerRun)) {
        try {
          const added = await this.addTweetToBookmarks(tweet, userId);
          if (added) {
            addedCount++;
            await run.addLog('info', `Added tweet to bookmarks: ${tweet.url}`);
          } else {
            await run.addLog('info', `Tweet already exists in bookmarks: ${tweet.url}`);
          }
        } catch (error: any) {
          await run.addLog('error', `Failed to add tweet to bookmarks: ${error.message}`);
        }
      }

      run.itemsAdded = addedCount;
      await run.addLog('info', `Successfully added ${addedCount} new tweets to bookmarks`);

    } catch (error: any) {
      await run.addLog('error', `Twitter agent execution failed: ${error.message}`);
      throw error;
    }
  }

  private async searchTweets(
    keyword: string,
    options: {
      minLikes: number;
      minRetweets: number;
      excludeReplies: boolean;
      maxResults: number;
    }
  ): Promise<Tweet[]> {
    if (!this.twitterClient) {
      throw new Error('Twitter client not initialized');
    }

    // Build search query
    let query = `"${keyword}" -is:retweet lang:en`;

    if (options.excludeReplies) {
      query += ' -is:reply';
    }

    // Add engagement filters
    if (options.minLikes > 0) {
      query += ` min_faves:${options.minLikes}`;
    }

    if (options.minRetweets > 0) {
      query += ` min_retweets:${options.minRetweets}`;
    }

    try {
      const response = await this.twitterClient.v2.search(query, {
        max_results: Math.min(options.maxResults, 100), // Twitter API limit
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['username', 'name'],
        expansions: ['author_id'],
      });

      const tweets: Tweet[] = [];

      if (response.data?.data) {
        for (const tweet of response.data.data) {
          const author = response.includes?.users?.find(user => user.id === tweet.author_id);
          
          tweets.push({
            id: tweet.id,
            text: tweet.text,
            author_id: tweet.author_id!,
            created_at: tweet.created_at!,
            public_metrics: tweet.public_metrics!,
            author: author ? {
              username: author.username!,
              name: author.name!,
            } : undefined,
            url: `https://twitter.com/i/status/${tweet.id}`,
          });
        }
      }

      return tweets;

    } catch (error: any) {
      console.error('[TwitterAgent] Error searching tweets:', error);
      throw new Error(`Failed to search tweets: ${error.message}`);
    }
  }

  private removeDuplicateTweets(tweets: Tweet[]): Tweet[] {
    const seen = new Set<string>();
    return tweets.filter(tweet => {
      if (seen.has(tweet.id)) {
        return false;
      }
      seen.add(tweet.id);
      return true;
    });
  }

  private async filterInterestingTweets(tweets: Tweet[], run: any): Promise<Tweet[]> {
    if (!this.openaiClient || tweets.length === 0) {
      return tweets;
    }

    const interestingTweets: Tweet[] = [];

    // Process tweets in batches to avoid token limits
    const batchSize = 5;
    for (let i = 0; i < tweets.length; i += batchSize) {
      const batch = tweets.slice(i, i + batchSize);
      
      try {
        const batchResults = await this.analyzeTweetBatch(batch);
        interestingTweets.push(...batchResults);
      } catch (error: any) {
        await run.addLog('warn', `Failed to analyze tweet batch: ${error.message}`);
        // If analysis fails, include tweets anyway (fallback)
        interestingTweets.push(...batch);
      }
    }

    return interestingTweets;
  }

  private async analyzeTweetBatch(tweets: Tweet[]): Promise<Tweet[]> {
    if (!this.openaiClient) {
      return tweets;
    }

    const tweetTexts = tweets.map((tweet, index) => 
      `${index + 1}. @${tweet.author?.username || 'unknown'}: ${tweet.text}`
    ).join('\n\n');

    const prompt = `
You are an AI assistant that helps curate interesting and valuable content. 
Analyze the following tweets and determine which ones are worth bookmarking based on these criteria:

- Contains valuable insights, tips, or knowledge
- Discusses innovative ideas or technologies
- Provides useful resources or links
- Shares interesting industry news or trends
- Offers thoughtful analysis or commentary
- NOT promotional spam or low-quality content
- NOT purely personal updates without broader value

For each tweet, respond with just the number (1, 2, 3, etc.) if it's worth bookmarking.
If none are worth bookmarking, respond with "NONE".

Tweets to analyze:
${tweetTexts}

Worth bookmarking (just numbers, comma-separated):`;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      });

      const result = response.choices[0]?.message?.content?.trim();
      
      if (!result || result === 'NONE') {
        return [];
      }

      // Parse the response to get tweet indices
      const selectedIndices = result
        .split(',')
        .map(num => parseInt(num.trim()) - 1) // Convert to 0-based index
        .filter(index => index >= 0 && index < tweets.length);

      return selectedIndices.map(index => tweets[index]);

    } catch (error: any) {
      console.error('[TwitterAgent] Error analyzing tweets:', error);
      // Fallback: return all tweets if analysis fails
      return tweets;
    }
  }

  private async addTweetToBookmarks(tweet: Tweet, userId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      // Check if tweet already exists
      const existingBookmark = await BookmarkItem.findOne({
        userId,
        originalUrl: tweet.url,
      });

      if (existingBookmark) {
        return false; // Already exists
      }

      // Create new bookmark
      const bookmark = new BookmarkItem({
        userId,
        originalUrl: tweet.url,
        sourcePlatform: 'X',
        title: `Tweet by @${tweet.author?.username || 'unknown'}`,
        summary: this.generateTweetSummary(tweet),
        tags: ['twitter', 'auto-curated'],
        status: 'metadata_fetched',
        fetchedTitle: `Tweet by @${tweet.author?.username || 'unknown'}`,
        fetchedDescription: tweet.text,
      });

      await bookmark.save();
      return true;

    } catch (error: any) {
      console.error('[TwitterAgent] Error adding tweet to bookmarks:', error);
      throw error;
    }
  }

  private generateTweetSummary(tweet: Tweet): string {
    const author = tweet.author?.name || tweet.author?.username || 'Unknown';
    const metrics = tweet.public_metrics;
    
    return `Tweet by ${author}: ${tweet.text.substring(0, 200)}${tweet.text.length > 200 ? '...' : ''}\n\n` +
           `Engagement: ${metrics.like_count} likes, ${metrics.retweet_count} retweets, ${metrics.reply_count} replies`;
  }
}