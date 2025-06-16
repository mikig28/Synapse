# CrewAI Data Guide - Real vs Simulated Content

## 🤖 Current Situation: Simulated Data

Your CrewAI agents are currently generating **simulated/fake data** because the Python service doesn't have real API credentials. This means:

### What You're Seeing:
- **Reddit links**: `https://reddit.com/r/technology` (goes to real subreddit, not specific post)
- **LinkedIn links**: `https://linkedin.com/feed/` (goes to LinkedIn feed, not specific post)  
- **Telegram links**: `https://t.me/durov` (goes to real channel example, not specific message)
- **News links**: Google News search for the topic

### Why URLs Changed:
Instead of broken links like `https://reddit.com/r/technology/post_0/`, the system now provides **useful browsing URLs** where you can actually find similar content.

## 🔧 How to Get Real Data

To get actual Reddit posts, LinkedIn posts, and Telegram messages with real URLs, you need to add API credentials:

### 1. Reddit API Setup
```bash
# In your .env file, add:
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Get these from: https://www.reddit.com/prefs/apps
```

### 2. Telegram API Setup  
```bash
# In your .env file, add:
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Get this from: @BotFather on Telegram
```

### 3. LinkedIn API Setup
LinkedIn requires more complex setup and may have restrictions for content scraping.

## 📊 How to Check What Data You're Getting

### In Agent Logs:
Look for these indicators in your agent execution logs:
- `🤖 SIMULATED:` prefix in descriptions = fake data
- `📱 TELEGRAM DEBUG:` shows exactly what Telegram data was received  
- `📊 Content breakdown:` shows counts from each source

### In News Page:
- **🤖 Simulated Data** badge = fake content
- **CrewAI** badge = content from your agents
- Use source filters to see content by platform

## 🎯 Telegram Visibility Issue

If you can't see Telegram content:

1. **Check agent logs** for "TELEGRAM DEBUG" messages
2. **Look for Telegram items** in News page with 📱 Telegram filter
3. **Verify Telegram is enabled** in your CrewAI agent configuration

## 🚀 Next Steps

1. **Run your agent** and check the new debugging logs
2. **Use News page filters** to see content by source
3. **Add real API credentials** if you want actual posts instead of simulated content
4. **Check agent logs** for detailed processing information

The system is now working correctly - it's just using simulated data for demonstration until you add real API credentials!