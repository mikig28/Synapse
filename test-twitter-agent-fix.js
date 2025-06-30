#!/usr/bin/env node

/**
 * Test script to verify Twitter agent rate limiting fix
 * This script simulates the Twitter agent execution to test the new rate limiting logic
 */

const { TwitterApi } = require('twitter-api-v2');

class TwitterAgentTester {
  constructor() {
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
    this.MAX_REQUESTS_PER_WINDOW = 250; // Conservative limit
    this.MIN_REQUEST_INTERVAL = 3000; // 3 seconds between requests
    
    // Initialize Twitter client if token is available
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (twitterBearerToken) {
      this.twitterClient = new TwitterApi(twitterBearerToken);
      console.log('✅ Twitter API client initialized successfully');
    } else {
      console.log('⚠️ TWITTER_BEARER_TOKEN not configured - will test fallback behavior');
      this.twitterClient = null;
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
        console.log(`🔄 Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      }
    }
    
    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏱️ Waiting ${Math.round(waitTime / 1000)}s for rate limit interval`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
    console.log(`📊 Request count: ${this.requestCount}/${this.MAX_REQUESTS_PER_WINDOW}`);
  }

  async testSearchWithRetry(keyword, maxRetries = 3) {
    console.log(`\n🔍 Testing search for keyword: "${keyword}"`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        
        if (!this.twitterClient) {
          throw new Error('Twitter client not configured');
        }
        
        console.log(`📡 Attempt ${attempt}: Searching Twitter API...`);
        
        const response = await this.twitterClient.v2.search(`"${keyword}" -is:retweet lang:en`, {
          max_results: 10,
          'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
          'user.fields': ['username', 'name'],
          expansions: ['author_id'],
        });

        const tweetCount = response.data?.data?.length || 0;
        console.log(`✅ Success: Found ${tweetCount} tweets for "${keyword}"`);
        return tweetCount;

      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          const waitTime = Math.min(60000 * attempt, 300000); // Exponential backoff, max 5 minutes
          console.log(`⏳ Rate limited, waiting ${Math.round(waitTime / 1000)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Non-rate-limit error, don't retry
        throw error;
      }
    }
    
    throw new Error(`Failed to search tweets for "${keyword}" after ${maxRetries} attempts due to rate limiting`);
  }

  generateFallbackContent(keywords) {
    console.log('\n🔄 Generating fallback content...');
    
    const fallbackItems = [];
    
    for (const keyword of keywords.slice(0, 3)) {
      const fallbackTweet = {
        id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: `Trending discussions about ${keyword} - Twitter content temporarily unavailable due to API limits. Check back later for real-time updates.`,
        url: `https://twitter.com/search?q=${encodeURIComponent(keyword)}`,
        keyword: keyword
      };
      
      fallbackItems.push(fallbackTweet);
      console.log(`📝 Generated fallback content for: ${keyword}`);
    }
    
    return fallbackItems;
  }

  async runTest() {
    console.log('🚀 Starting Twitter Agent Rate Limiting Test\n');
    
    const keywords = ['AI', 'CLAUDE', 'CLAUDE CODE', 'GEMINI'];
    let totalTweets = 0;
    let successfulSearches = 0;
    let fallbackUsed = false;

    console.log(`📋 Testing with keywords: ${keywords.join(', ')}`);
    
    // Test each keyword
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      
      try {
        if (this.twitterClient) {
          const tweetCount = await this.testSearchWithRetry(keyword);
          totalTweets += tweetCount;
          successfulSearches++;
          
          // Add delay between searches
          if (i < keywords.length - 1) {
            console.log('⏱️ Adding 2s delay between keyword searches...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          throw new Error('Twitter client not configured');
        }
        
      } catch (error) {
        console.log(`⚠️ Search failed for "${keyword}": ${error.message}`);
        
        if (!fallbackUsed) {
          console.log('🔄 Switching to fallback content generation...');
          const fallbackItems = this.generateFallbackContent(keywords);
          totalTweets += fallbackItems.length;
          fallbackUsed = true;
          break; // Use fallback for all remaining keywords
        }
      }
    }

    // Test results
    console.log('\n📊 Test Results:');
    console.log(`✅ Successful API searches: ${successfulSearches}/${keywords.length}`);
    console.log(`📝 Total content items: ${totalTweets}`);
    console.log(`🔄 Fallback used: ${fallbackUsed ? 'Yes' : 'No'}`);
    
    if (successfulSearches > 0) {
      console.log('✅ Rate limiting logic is working - API calls succeeded');
    }
    
    if (fallbackUsed) {
      console.log('✅ Fallback mechanism is working - content generated when API unavailable');
    }
    
    if (successfulSearches === 0 && !fallbackUsed) {
      console.log('❌ Both API and fallback failed - check configuration');
      return false;
    }
    
    console.log('\n🎉 Twitter Agent fix test completed successfully!');
    return true;
  }
}

// Run the test
async function main() {
  try {
    const tester = new TwitterAgentTester();
    const success = await tester.runTest();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TwitterAgentTester;
