"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterAgentExecutor = void 0;
const twitter_api_v2_1 = require("twitter-api-v2");
const openai_1 = __importDefault(require("openai"));
const BookmarkItem_1 = __importDefault(require("../../models/BookmarkItem"));
class TwitterAgentExecutor {
    constructor() {
        this.twitterClient = null;
        this.openaiClient = null;
        // Rate limiting properties
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
        this.MAX_REQUESTS_PER_WINDOW = 250; // Conservative limit
        this.MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests
        this.initializeClients();
    }
    initializeClients() {
        // Initialize Twitter API client
        const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
        if (twitterBearerToken) {
            this.twitterClient = new twitter_api_v2_1.TwitterApi(twitterBearerToken);
            console.log('[TwitterAgent] Twitter API client initialized successfully');
        }
        else {
            console.warn('[TwitterAgent] TWITTER_BEARER_TOKEN not configured - Twitter agent will use fallback content');
        }
        // Initialize OpenAI client
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
            this.openaiClient = new openai_1.default({ apiKey: openaiApiKey });
            console.log('[TwitterAgent] OpenAI client initialized successfully');
        }
        else {
            console.warn('[TwitterAgent] OPENAI_API_KEY not configured - AI filtering disabled');
        }
    }
    async waitForRateLimit() {
        const now = Date.now();
        // Reset counter if window has passed
        if (now - this.lastRequestTime > this.RATE_LIMIT_WINDOW) {
            this.requestCount = 0;
        }
        // Check if we're at the rate limit
        if (this.requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
            const waitTime = this.RATE_LIMIT_WINDOW - (now - this.lastRequestTime);
            if (waitTime > 0) {
                console.log(`[TwitterAgent] Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                this.requestCount = 0;
            }
        }
        // Ensure minimum interval between requests
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }
    async searchTweetsWithRetry(keyword, options, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.waitForRateLimit();
                return await this.searchTweets(keyword, options);
            }
            catch (error) {
                if (error.message.includes('429') || error.message.includes('rate limit')) {
                    const waitTime = Math.min(60000 * attempt, 300000); // Exponential backoff, max 5 minutes
                    console.log(`[TwitterAgent] Rate limited, attempt ${attempt}/${maxRetries}, waiting ${Math.round(waitTime / 1000)}s`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw error; // Re-throw non-rate-limit errors
            }
        }
        throw new Error(`Failed to search tweets for "${keyword}" after ${maxRetries} attempts due to rate limiting`);
    }
    async generateFallbackContent(keywords, userId, run) {
        await run.addLog('info', 'Twitter API unavailable, generating fallback content');
        let addedCount = 0;
        for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords
            try {
                const fallbackTweet = {
                    id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: `Trending discussions about ${keyword} - Twitter content temporarily unavailable due to API limits. Check back later for real-time updates.`,
                    author_id: 'system',
                    created_at: new Date().toISOString(),
                    public_metrics: {
                        retweet_count: 0,
                        like_count: 0,
                        reply_count: 0,
                        quote_count: 0,
                    },
                    author: {
                        username: 'system',
                        name: 'System Generated',
                    },
                    url: `https://twitter.com/search?q=${encodeURIComponent(keyword)}`,
                };
                const added = await this.addTweetToBookmarks(fallbackTweet, userId);
                if (added) {
                    addedCount++;
                    await run.addLog('info', `Added fallback content for keyword: ${keyword}`);
                }
            }
            catch (error) {
                await run.addLog('warn', `Failed to add fallback content for ${keyword}: ${error.message}`);
            }
        }
        return addedCount;
    }
    async execute(context) {
        const { agent, run, userId } = context;
        await run.addLog('info', 'Starting Twitter agent execution');
        const config = agent.configuration;
        const keywords = config.keywords || ['AI', 'technology', 'startup'];
        const minLikes = config.minLikes || 10;
        const minRetweets = config.minRetweets || 5;
        const excludeReplies = config.excludeReplies !== false; // Default to true
        const maxItemsPerRun = config.maxItemsPerRun || 10;
        await run.addLog('info', `Searching for tweets with keywords: ${keywords.join(', ')}`);
        // Check if Twitter API is available
        if (!this.twitterClient) {
            await run.addLog('warn', 'Twitter API client not configured, using fallback content');
            const fallbackCount = await this.generateFallbackContent(keywords, userId, run);
            run.itemsProcessed = fallbackCount;
            run.itemsAdded = fallbackCount;
            return;
        }
        try {
            let allTweets = [];
            // Process keywords sequentially to avoid rate limits
            for (let i = 0; i < keywords.length; i++) {
                const keyword = keywords[i];
                try {
                    await run.addLog('info', `Searching for keyword: "${keyword}" (${i + 1}/${keywords.length})`);
                    const tweets = await this.searchTweetsWithRetry(keyword, {
                        minLikes,
                        minRetweets,
                        excludeReplies,
                        maxResults: Math.ceil(maxItemsPerRun / keywords.length),
                    });
                    await run.addLog('info', `Found ${tweets.length} tweets for keyword "${keyword}"`);
                    allTweets = allTweets.concat(tweets);
                    // Add delay between keyword searches to respect rate limits
                    if (i < keywords.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                catch (error) {
                    await run.addLog('warn', `Failed to search for keyword "${keyword}": ${error.message}`);
                    // Continue with next keyword instead of failing completely
                }
            }
            // If no tweets found due to rate limiting, use fallback
            if (allTweets.length === 0) {
                await run.addLog('info', 'No tweets found, generating fallback content');
                const fallbackCount = await this.generateFallbackContent(keywords, userId, run);
                run.itemsProcessed = fallbackCount;
                run.itemsAdded = fallbackCount;
                return;
            }
            // Remove duplicates
            const uniqueTweets = this.removeDuplicateTweets(allTweets);
            await run.addLog('info', `Total unique tweets found: ${uniqueTweets.length}`);
            run.itemsProcessed = uniqueTweets.length;
            // Filter tweets through AI analysis if OpenAI is available
            let interestingTweets = uniqueTweets;
            if (this.openaiClient) {
                interestingTweets = await this.filterInterestingTweets(uniqueTweets, run);
                await run.addLog('info', `AI filtered ${interestingTweets.length} interesting tweets`);
            }
            else {
                await run.addLog('info', 'OpenAI not configured, skipping AI filtering');
            }
            // Add interesting tweets to bookmarks
            let addedCount = 0;
            for (const tweet of interestingTweets.slice(0, maxItemsPerRun)) {
                try {
                    const added = await this.addTweetToBookmarks(tweet, userId);
                    if (added) {
                        addedCount++;
                        await run.addLog('info', `Added tweet to bookmarks: ${tweet.url}`);
                    }
                    else {
                        await run.addLog('info', `Tweet already exists in bookmarks: ${tweet.url}`);
                    }
                }
                catch (error) {
                    await run.addLog('error', `Failed to add tweet to bookmarks: ${error.message}`);
                }
            }
            run.itemsAdded = addedCount;
            await run.addLog('info', `Successfully added ${addedCount} new tweets to bookmarks`);
        }
        catch (error) {
            await run.addLog('error', `Twitter agent execution failed: ${error.message}`);
            // Try fallback content as last resort
            try {
                await run.addLog('info', 'Attempting fallback content generation');
                const fallbackCount = await this.generateFallbackContent(keywords, userId, run);
                run.itemsProcessed = fallbackCount;
                run.itemsAdded = fallbackCount;
                await run.addLog('info', `Generated ${fallbackCount} fallback items`);
            }
            catch (fallbackError) {
                await run.addLog('error', `Fallback content generation also failed: ${fallbackError.message}`);
                throw error; // Re-throw original error
            }
        }
    }
    async searchTweets(keyword, options) {
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
            const tweets = [];
            if (response.data?.data) {
                for (const tweet of response.data.data) {
                    const author = response.includes?.users?.find(user => user.id === tweet.author_id);
                    tweets.push({
                        id: tweet.id,
                        text: tweet.text,
                        author_id: tweet.author_id,
                        created_at: tweet.created_at,
                        public_metrics: tweet.public_metrics,
                        author: author ? {
                            username: author.username,
                            name: author.name,
                        } : undefined,
                        url: `https://twitter.com/i/status/${tweet.id}`,
                    });
                }
            }
            return tweets;
        }
        catch (error) {
            console.error('[TwitterAgent] Error searching tweets:', error);
            throw new Error(`Failed to search tweets: ${error.message}`);
        }
    }
    removeDuplicateTweets(tweets) {
        const seen = new Set();
        return tweets.filter(tweet => {
            if (seen.has(tweet.id)) {
                return false;
            }
            seen.add(tweet.id);
            return true;
        });
    }
    async filterInterestingTweets(tweets, run) {
        if (!this.openaiClient || tweets.length === 0) {
            return tweets;
        }
        const interestingTweets = [];
        // Process tweets in batches to avoid token limits
        const batchSize = 5;
        for (let i = 0; i < tweets.length; i += batchSize) {
            const batch = tweets.slice(i, i + batchSize);
            try {
                const batchResults = await this.analyzeTweetBatch(batch);
                interestingTweets.push(...batchResults);
            }
            catch (error) {
                await run.addLog('warn', `Failed to analyze tweet batch: ${error.message}`);
                // If analysis fails, include tweets anyway (fallback)
                interestingTweets.push(...batch);
            }
        }
        return interestingTweets;
    }
    async analyzeTweetBatch(tweets) {
        if (!this.openaiClient) {
            return tweets;
        }
        const tweetTexts = tweets.map((tweet, index) => `${index + 1}. @${tweet.author?.username || 'unknown'}: ${tweet.text}`).join('\n\n');
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
        }
        catch (error) {
            console.error('[TwitterAgent] Error analyzing tweets:', error);
            // Fallback: return all tweets if analysis fails
            return tweets;
        }
    }
    async addTweetToBookmarks(tweet, userId) {
        try {
            // Check if tweet already exists
            const existingBookmark = await BookmarkItem_1.default.findOne({
                userId,
                originalUrl: tweet.url,
            });
            if (existingBookmark) {
                return false; // Already exists
            }
            // Create new bookmark
            const bookmark = new BookmarkItem_1.default({
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
        }
        catch (error) {
            console.error('[TwitterAgent] Error adding tweet to bookmarks:', error);
            throw error;
        }
    }
    generateTweetSummary(tweet) {
        const author = tweet.author?.name || tweet.author?.username || 'Unknown';
        const metrics = tweet.public_metrics;
        return `Tweet by ${author}: ${tweet.text.substring(0, 200)}${tweet.text.length > 200 ? '...' : ''}\n\n` +
            `Engagement: ${metrics.like_count} likes, ${metrics.retweet_count} retweets, ${metrics.reply_count} replies`;
    }
}
exports.TwitterAgentExecutor = TwitterAgentExecutor;
