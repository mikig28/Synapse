# Synapse CrewAI Multi-Agent News System

This is a comprehensive multi-agent news gathering system built with CrewAI framework that integrates with the Synapse platform.

## Overview

The system uses specialized AI agents to gather news and insights from multiple sources:

- **Reddit Agent**: Scrapes trending discussions from technology subreddits
- **LinkedIn Agent**: Monitors professional insights and industry announcements  
- **Telegram Agent**: Tracks news from tech Telegram channels
- **News Scraper Agent**: Collects articles from major tech publications
- **News Analyst Agent**: Synthesizes all data into comprehensive insights

## Features

### Multi-Source Coverage
- **Reddit**: r/technology, r/artificial, r/startups, r/business
- **LinkedIn**: Industry leaders, company updates, professional insights
- **Telegram**: Tech news channels, crypto updates, industry broadcasts
- **News Sites**: TechCrunch, Wired, MIT Tech Review, Ars Technica, etc.

### AI-Powered Analysis
- **Content Quality Filtering**: Uses GPT-4o-mini to evaluate content relevance
- **Trend Identification**: Identifies emerging topics and patterns
- **Cross-Source Verification**: Validates information across platforms
- **Sentiment Analysis**: Analyzes market and industry sentiment
- **Executive Summaries**: Generates actionable insights

### Integration with Synapse
- **Seamless Integration**: Works with existing Synapse agent system
- **Automated Scheduling**: Supports cron-based execution
- **Data Storage**: Stores results in MongoDB NewsItem collection
- **User-Specific**: Each user gets personalized news curation

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the crewai-agents directory:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional (will use simulated data if not provided)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=SynapseAgent/1.0
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Service Configuration
PORT=5000
CREWAI_SERVICE_URL=http://localhost:5000
```

### 2. Install Dependencies

```bash
cd src/backend/services/crewai-agents
pip install -r requirements.txt
```

### 3. Start the CrewAI Service

```bash
python main.py
```

The service will start on port 5000 and provide the following endpoints:

- `GET /health` - Health check
- `POST /gather-news` - Execute news gathering
- `GET /test-agents` - Test individual agents

### 4. Update Node.js Backend Environment

Add to your main backend `.env` file:

```bash
CREWAI_SERVICE_URL=http://localhost:5000
```

## Usage

### Creating a CrewAI Agent in Synapse

1. **Via API**:
```javascript
POST /api/v1/agents
{
  "name": "My CrewAI News Agent",
  "type": "crewai_news",
  "description": "Multi-agent news gathering from social media and news sites",
  "configuration": {
    "topics": ["AI", "startups", "technology", "blockchain"],
    "sources": {
      "reddit": true,
      "linkedin": true,
      "telegram": true,
      "news_websites": true
    },
    "schedule": "0 */6 * * *",  // Every 6 hours
    "maxItemsPerRun": 50
  }
}
```

2. **Via Frontend**: Create a new agent and select "CrewAI Multi-Agent News" type

### Configuration Options

#### Topics
Specify what topics to monitor:
```json
{
  "topics": ["artificial intelligence", "machine learning", "startups", "venture capital", "cryptocurrency", "blockchain", "software development"]
}
```

#### Sources
Enable/disable specific sources:
```json
{
  "sources": {
    "reddit": true,        // Reddit discussions
    "linkedin": true,      // Professional insights
    "telegram": false,     // Telegram channels
    "news_websites": true  // Tech publications
  }
}
```

## API Reference

### POST /gather-news

Execute the multi-agent news gathering process.

**Request Body**:
```json
{
  "topics": ["AI", "startups"],
  "sources": {
    "reddit": true,
    "linkedin": true,
    "telegram": true,
    "news_websites": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "topics": ["AI", "startups"],
  "data": {
    "executive_summary": [
      "Analyzed 45 items from 4 sources",
      "Key themes: AI advancement, startup funding",
      "Overall sentiment: positive"
    ],
    "trending_topics": [
      {
        "topic": "AI",
        "mentions": 12,
        "trending_score": 89.5
      }
    ],
    "organized_content": {
      "reddit_posts": [...],
      "linkedin_posts": [...],
      "telegram_messages": [...],
      "news_articles": [...]
    },
    "ai_insights": {
      "key_themes": ["innovation", "funding"],
      "sentiment_analysis": "positive",
      "emerging_trends": ["AI automation"]
    },
    "recommendations": [
      "Monitor AI closely - showing high engagement",
      "Focus on emerging trends: automation, ML"
    ]
  }
}
```

## Architecture

### Agent Workflow

1. **Initialization**: Each agent initializes with its specific tools and configuration
2. **Parallel Execution**: Agents run in parallel to gather data from their sources
3. **Data Collection**: Each agent returns structured data in JSON format
4. **Analysis**: News Analyst agent processes all collected data
5. **Synthesis**: AI generates insights, trends, and recommendations
6. **Storage**: Results are stored in Synapse database as NewsItem documents

### Data Flow

```
Reddit Agent ──┐
LinkedIn Agent ─┤
Telegram Agent ─┼── News Analyst Agent ── AI Analysis ── Synapse Database
News Scraper ───┘
```

## Monitoring and Logs

The service provides comprehensive logging for monitoring:

- **Agent execution status**
- **Data collection statistics**
- **Error handling and fallbacks**
- **Performance metrics**

View logs in the CrewAI service console or integrate with your logging system.

## Troubleshooting

### Common Issues

1. **Service Not Starting**
   - Check Python dependencies: `pip install -r requirements.txt`
   - Verify OpenAI API key is set
   - Ensure port 5000 is available

2. **No Data Returned**
   - Check internet connectivity
   - Verify API keys for Reddit/Telegram if using real data
   - LinkedIn requires authentication (uses simulated data by default)

3. **Integration Issues**
   - Ensure `CREWAI_SERVICE_URL` is set in Node.js backend
   - Check that CrewAI service is running and accessible
   - Verify health endpoint: `curl http://localhost:5000/health`

### Rate Limiting

The system implements rate limiting to respect API quotas:
- Reddit: 60 requests per minute
- News websites: 1 request per second
- LinkedIn: Uses simulated data to avoid scraping restrictions

## Development

### Adding New Agents

1. Create new agent file in `agents/` directory
2. Implement the agent class with required methods
3. Register agent in `main.py`
4. Update configuration schema

### Customizing Analysis

Modify `news_analyst_agent.py` to add custom analysis logic:
- Additional AI prompts
- Custom trend identification
- Specialized industry analysis

## Production Deployment

For production deployment:

1. **Use Docker**:
```bash
docker build -t synapse-crewai .
docker run -p 5000:5000 --env-file .env synapse-crewai
```

2. **Environment Variables**: Set all required API keys
3. **Scaling**: Deploy multiple instances with load balancer
4. **Monitoring**: Integrate with your monitoring stack

## License

This CrewAI integration is part of the Synapse platform.