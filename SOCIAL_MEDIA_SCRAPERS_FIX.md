# Social Media Scrapers Dependency Fix Guide

## Issue
The warning messages indicate that Reddit and Telegram scrapers are not available due to missing Python dependencies:

```
WARNING:agents.enhanced_news_research_crew:⚠️ Reddit scraper not available - check dependencies
WARNING:agents.enhanced_news_research_crew:⚠️ Telegram scraper not available - check dependencies
```

## Root Cause
The social media scrapers require specific Python libraries that may not be installed in your environment:
- **Reddit scraper**: Requires `praw` (Python Reddit API Wrapper)
- **Telegram scraper**: Requires `python-telegram-bot`

## Solutions

### Option 1: Install Dependencies Manually

Run these commands in your terminal:

```bash
# Navigate to the CrewAI agents directory
cd src/backend/services/crewai-agents

# Install missing dependencies
pip install praw>=7.0.0
pip install python-telegram-bot>=20.0
pip install beautifulsoup4>=4.10.0
pip install feedparser>=6.0.0
```

### Option 2: Use the Installation Script

A helper script has been created to check and install missing dependencies:

```bash
# Navigate to the CrewAI agents directory
cd src/backend/services/crewai-agents

# Run the installation script
python install_missing_deps.py
```

### Option 3: Install All Requirements

To install all CrewAI agent dependencies at once:

```bash
# Navigate to the CrewAI agents directory
cd src/backend/services/crewai-agents

# Install all requirements
pip install -r requirements.txt
```

## Verification

After installing the dependencies, the logs should show:

```
INFO:agents.enhanced_news_research_crew:✅ Reddit scraper available
INFO:agents.enhanced_news_research_crew:✅ Telegram scraper available
```

## Environment Variables

Make sure you have the necessary API credentials set in your environment:

### For Reddit:
```bash
export REDDIT_CLIENT_ID="your_client_id"
export REDDIT_CLIENT_SECRET="your_client_secret"
export REDDIT_USER_AGENT="SynapseAgent/1.0"
```

### For Telegram:
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
```

## Fallback Behavior

Even without these dependencies, the system will still work by:
1. Using alternative web scraping methods
2. Fetching from RSS feeds
3. Using general news sources

However, installing the dependencies will enable:
- Authenticated Reddit API access for better rate limits
- Direct Telegram channel monitoring (if bot has access)
- More reliable and comprehensive data collection

## Docker/Production Deployment

For production deployments (e.g., on Render), ensure the requirements.txt is included in your build process:

```dockerfile
# In your Dockerfile
COPY requirements.txt .
RUN pip install -r requirements.txt
```

Or in your build command:
```bash
pip install -r src/backend/services/crewai-agents/requirements.txt
```

## Troubleshooting

If you continue to see dependency warnings after installation:

1. **Check Python environment**: Make sure you're installing in the correct virtual environment
2. **Verify installation**: Run `pip list | grep praw` and `pip list | grep telegram`
3. **Check imports**: The enhanced_news_research_crew.py now handles missing imports gracefully
4. **Review logs**: The system will log specific import errors for debugging

## Code Changes Made

The following improvements have been implemented:

1. **Better error handling**: The import statements now provide detailed guidance on missing dependencies
2. **Graceful fallback**: If dependencies are missing, the system uses alternative methods
3. **None assignment**: Missing tools are assigned as None to prevent NameError
4. **Installation script**: Created `install_missing_deps.py` for easy dependency management

The social media scrapers will work with or without these dependencies, but installing them provides the best experience and data quality. 