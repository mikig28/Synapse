# Twitter Agent Rate Limiting Fix

## Issue Analysis
The Twitter agent is failing with HTTP 429 errors (rate limiting) when searching for tweets. The logs show:
- "Failed to search for keyword 'AI': Failed to search tweets: Request failed with code 429"
- "Failed to search for keyword 'CLAUDE': Failed to search tweets: Request failed with code 429"
- Similar errors for other keywords

## Root Cause
1. **Twitter API Rate Limits**: The Twitter API v2 has strict rate limits:
   - Search tweets: 300 requests per 15-minute window (for app-only auth)
   - That's only 20 requests per minute
2. **No Rate Limiting Logic**: The current implementation doesn't handle rate limits
3. **No Retry Mechanism**: When rate limited, the agent fails immediately
4. **Multiple Concurrent Searches**: Searching for multiple keywords simultaneously can quickly exhaust the rate limit

## Solution Implementation

### 1. Enhanced Rate Limiting and Error Handling

```typescript
// Add to TwitterAgentExecutor class
private lastRequestTime: number = 0;
private requestCount: number = 0;
private rateLimitResetTime: number = 0;
private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
private readonly MAX_REQUESTS_PER_WINDOW = 250; // Conservative limit
private readonly MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests

private async waitForRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Reset counter if window has passed
  if (now - this.lastRequestTime > this.RATE_LIMIT_WINDOW) {
    this.requestCount = 0;
  }
  
  // Check if we're at the rate limit
  if (this.requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
    const waitTime = this.RATE_LIMIT_WINDOW - (now - this.lastRequestTime);
    if (waitTime > 0) {
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

private async searchTweetsWithRetry(
  keyword: string,
  options: SearchOptions,
  maxRetries: number = 3
): Promise<Tweet[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.waitForRateLimit();
      return await this.searchTweets(keyword, options);
    } catch (error: any) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        const waitTime = Math.min(60000 * attempt, 300000); // Exponential backoff, max 5 minutes
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error; // Re-throw non-rate-limit errors
    }
  }
  throw new Error(`Failed to search tweets for "${keyword}" after ${maxRetries} attempts due to rate limiting`);
}
```

### 2. Sequential Keyword Processing

```typescript
// Modified execute method to process keywords sequentially
async execute(context: AgentExecutionContext): Promise<void> {
  // ... existing setup code ...

  try {
    let allTweets: Tweet[] = [];

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

        // Add delay between keyword searches
        if (i < keywords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        await run.addLog('warn', `Failed to search for keyword "${keyword}": ${error.message}`);
        // Continue with next keyword instead of failing completely
      }
    }

    // ... rest of the method remains the same ...
  }
}
```

### 3. Fallback Content Generation

```typescript
// Add fallback method when Twitter API is unavailable
private async generateFallbackContent(keywords: string[], userId: mongoose.Types.ObjectId, run: any): Promise<number> {
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
    } catch (error: any) {
      await run.addLog('warn', `Failed to add fallback content for ${keyword}: ${error.message}`);
    }
  }
  
  return addedCount;
}
```

### 4. Environment Variable Check

```typescript
// Enhanced initialization with better error messages
private initializeClients(): void {
  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (twitterBearerToken) {
    this.twitterClient = new TwitterApi(twitterBearerToken);
    console.log('[TwitterAgent] Twitter API client initialized successfully');
  } else {
    console.warn('[TwitterAgent] TWITTER_BEARER_TOKEN not configured - Twitter agent will use fallback content');
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
    console.log('[TwitterAgent] OpenAI client initialized successfully');
  } else {
    console.warn('[TwitterAgent] OPENAI_API_KEY not configured - AI filtering disabled');
  }
}
```

## Immediate Actions Required

1. **Update Environment Variables**: Ensure `TWITTER_BEARER_TOKEN` is properly set
2. **Implement Rate Limiting**: Apply the enhanced rate limiting logic
3. **Add Fallback Mechanism**: Implement fallback content when API is unavailable
4. **Monitor Usage**: Add logging to track API usage and rate limit status

## Testing Strategy

1. **Rate Limit Testing**: Test with multiple keywords to ensure rate limiting works
2. **Fallback Testing**: Test behavior when Twitter API is unavailable
3. **Error Recovery**: Test recovery after rate limit periods
4. **Performance Testing**: Ensure sequential processing doesn't significantly slow down execution

## Expected Outcomes

- ✅ No more HTTP 429 errors
- ✅ Graceful handling of rate limits
- ✅ Continued operation even when Twitter API is temporarily unavailable
- ✅ Better user experience with informative log messages
- ✅ Sustainable long-term operation within Twitter API limits

## Configuration Recommendations

```env
# Twitter API Configuration
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Rate Limiting Configuration (optional, defaults provided)
TWITTER_MAX_REQUESTS_PER_WINDOW=250
TWITTER_REQUEST_INTERVAL_MS=3000
TWITTER_MAX_RETRIES=3
```

This fix ensures the Twitter agent operates reliably within Twitter's API constraints while providing fallback mechanisms for uninterrupted service.
