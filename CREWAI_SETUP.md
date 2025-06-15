# CrewAI Real Data Setup Guide

## Current Issue: Fake URLs and Simulated Data

If you're seeing fake URLs like `https://www.linkedin.com/posts/expert_2` that return 404 errors, this is because CrewAI is running in **simulation mode** instead of fetching real content.

## Why This Happens

The CrewAI agents are designed to fall back to simulated data when:
1. The CrewAI Python service is not running
2. Real API credentials are not configured
3. External APIs are unavailable

## Quick Fix: Start CrewAI Service

### 1. Install Dependencies
```bash
cd src/backend/services/crewai-agents
pip install -r requirements.txt
```

### 2. Start the Service
```bash
python3 main.py
```

The service should start on port 5000 and provide hybrid mode:
- ✅ **Real news articles** from RSS feeds (no credentials needed)
- ⚠️ **Simulated social media** posts (requires API credentials)

## Get 100% Real Data: Add API Credentials

### Reddit API Setup (Recommended)
1. Go to [Reddit Apps](https://www.reddit.com/prefs/apps)
2. Create a new "script" application
3. Copy the client ID and secret
4. Add to your `.env` file:
```bash
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
```

### Telegram Bot Setup (Optional)
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token
4. Add to your `.env` file:
```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### LinkedIn (Advanced)
LinkedIn requires complex scraping or official partnership. Keep this simulated for now.

## Service Status Check

Check if CrewAI service is running:
```bash
curl http://localhost:5000/health
```

You should see:
```json
{
  "status": "healthy",
  "real_news_enabled": true,
  "scraper_type": "simple"
}
```

## What Each Mode Provides

### With Service Running + No API Credentials
- ✅ **Real news articles** from Hacker News, Reddit r/technology, GitHub trending
- ⚠️ **Simulated Reddit posts** with fake URLs
- ⚠️ **Simulated LinkedIn posts** with fake URLs  
- ⚠️ **Simulated Telegram messages** with fake URLs

### With Service Running + Reddit API Credentials
- ✅ **Real news articles** from RSS feeds
- ✅ **Real Reddit posts** with actual URLs and content
- ⚠️ **Simulated LinkedIn posts** with fake URLs
- ⚠️ **Simulated Telegram messages** with fake URLs

### With Service Running + All API Credentials
- ✅ **Real news articles** from RSS feeds
- ✅ **Real Reddit posts** with actual URLs
- ✅ **Real Telegram messages** from monitored channels
- ⚠️ **Simulated LinkedIn posts** (complex to implement)

## Troubleshooting

### Service Won't Start
```bash
# Check Python installation
python3 --version

# Install pip if missing
sudo apt update && sudo apt install python3-pip

# Install dependencies
pip3 install flask python-dotenv requests
```

### API Credentials Not Working
- Reddit: Ensure you created a "script" type application
- Telegram: Ensure the bot token is from @BotFather
- Check `.env` file has no quotes around values

### Still Seeing Fake URLs
1. Restart the backend service after adding credentials
2. Wait for the next CrewAI run to complete
3. Check the analysis report for simulation warnings

## Environment File Template

Create/update your `.env` files:

```bash
# Root .env
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret  
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Backend .env (src/backend/.env)
CREWAI_SERVICE_URL=http://localhost:5000
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## Expected Results

After setup, your CrewAI Analysis Reports will show:
- Real news articles with working URLs
- Real Reddit discussions with actual r/technology posts
- Real Telegram messages (if bot configured)
- Clear indicators when data is simulated vs real

The fake URLs issue will be resolved once real API credentials are configured and the service is running properly.