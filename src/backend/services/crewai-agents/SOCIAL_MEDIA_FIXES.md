# Social Media Source Fixes for CrewAI Agents

## Current Status (December 2024)

### ✅ Fixed Issues
1. **Topic Detection** - Sports agents now properly get sports topics instead of tech
2. **Progress Tracking** - Real-time dashboard updates with session-based storage
3. **News Feed Selection** - Sports topics now get sports RSS feeds, not tech feeds

### ❌ Remaining Issues

#### 1. Reddit Posts Empty
**Symptoms:**
- API credentials are set correctly (CLIENT_ID, CLIENT_SECRET confirmed ✅)
- JSON endpoints returning 0 posts for sports topics
- Works for tech topics but not sports

**Potential Causes:**
- Rate limiting from Reddit (429 errors)
- Sports subreddits may have different access requirements
- JSON endpoints may be blocked for certain subreddits
- Headers/User-Agent being detected and blocked

**Solutions to Try:**
1. Add longer delays between Reddit requests
2. Try different sports subreddits (r/sports might be restricted)
3. Use authenticated API instead of JSON endpoints for sports
4. Rotate user agents more aggressively
5. Check if sports subreddits require special permissions

#### 2. LinkedIn Posts Empty  
**Symptoms:**
- Falling back to news sources instead of actual LinkedIn posts
- RSS feeds consistently blocked/returning 403

**Root Cause:**
- LinkedIn aggressively blocks RSS/scraping attempts
- No official API access for post content

**Current Workaround:**
- Using professional news sources as proxy for LinkedIn content
- Formatting news as LinkedIn-style posts

**Better Solutions:**
1. Use LinkedIn API (requires app approval)
2. Implement browser-based scraping with Playwright
3. Partner with LinkedIn data providers
4. Use social media aggregation services

#### 3. Telegram Messages Empty
**Symptoms:**
- Bot token is set correctly ✅
- Still returning 0 messages
- Error messages about channel access

**Potential Causes:**
- Bot not added to target channels
- Channels may be private/restricted
- Bot lacks necessary permissions
- Using channel usernames instead of IDs

**Solutions to Try:**
1. Verify bot is member of target channels
2. Use channel IDs instead of usernames
3. Check bot permissions in each channel
4. Try public channels first for testing
5. Use Telegram Client API instead of Bot API

### 4. Duplicate Detection Too Aggressive
**Symptoms:**
- All 20 news items skipped as duplicates
- Even with 4-hour window, everything marked as existing

**Potential Causes:**
- URLs not changing between runs
- Database has accumulated too much data
- Time-based duplicate check not working correctly

**Solutions:**
1. Add timestamp to article IDs to ensure uniqueness
2. Clear old news items periodically
3. Use content hash instead of just URL
4. Check duplicate detection logic in NewsItem model

## Debug Commands

```bash
# Test Reddit directly
curl -H "User-Agent: Mozilla/5.0" "https://www.reddit.com/r/sports/hot.json?limit=5"

# Test sports agent
node test-sports-agent.js

# Check CrewAI logs
docker logs synapse-crewai

# Clear old news items (be careful!)
# mongo -> use synapse -> db.newsitems.deleteMany({createdAt: {$lt: new Date(Date.now() - 7*24*60*60*1000)}})
```

## Environment Variables (All Confirmed Set ✅)
- REDDIT_CLIENT_ID
- REDDIT_CLIENT_SECRET  
- TELEGRAM_BOT_TOKEN
- OPENAI_API_KEY
- ANTHROPIC_API_KEY

## Next Steps Priority
1. Debug Reddit JSON endpoint responses for sports subreddits
2. Verify Telegram bot channel membership
3. Implement unique IDs for news items to avoid duplicate issues
4. Consider implementing retry logic with exponential backoff
5. Add comprehensive logging for each social media source

## Testing Checklist
- [ ] Reddit returns sports posts (not tech)
- [ ] LinkedIn returns some content (even if from news sources)
- [ ] Telegram returns messages from monitored channels
- [ ] New items are saved (not all skipped as duplicates)
- [ ] Dashboard shows real-time progress updates
- [ ] Sports agent gets sports content exclusively