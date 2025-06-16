# Firecrawl Integration Setup Guide

## Overview
This guide will help you integrate Firecrawl as a scraper tool in your Synapse CrewAI agents and ensure MCP integration works properly.

## 🔥 Firecrawl Tool Integration

### 1. Install Dependencies

```bash
# Navigate to CrewAI agents directory
cd src/backend/services/crewai-agents

# Install Firecrawl Python package
pip install firecrawl-py>=0.0.8

# Install from requirements.txt (already updated)
pip install -r requirements.txt
```

### 2. Get Firecrawl API Key

1. Sign up at [firecrawl.dev](https://firecrawl.dev)
2. Get your API key from the dashboard
3. Add to your environment variables:

```bash
# Add to your .env file
FIRECRAWL_API_KEY=fc-your-api-key-here
```

### 3. Tool Usage Examples

The Firecrawl tool is now available to your CrewAI agents:

#### Basic Scraping
```python
# The tool will automatically be available to agents
# Agents can use it like this:
result = firecrawl_scrape.execute(
    url="https://example.com",
    extract_options={
        "formats": ["markdown", "html"],
        "onlyMainContent": True
    }
)
```

#### Website Crawling
```python
# For crawling multiple pages
result = firecrawl_scrape.crawl_website(
    url="https://example.com", 
    max_pages=5,
    crawl_options={
        "crawlerOptions": {
            "maxDepth": 2,
            "limit": 5
        }
    }
)
```

### 4. Tool Features

✅ **Advanced Content Extraction**: Uses AI to extract clean, structured content  
✅ **Markdown Conversion**: Converts web pages to clean markdown  
✅ **Fallback Mechanism**: Falls back to basic scraping if Firecrawl unavailable  
✅ **URL Validation**: Validates URLs before processing  
✅ **Metadata Extraction**: Extracts titles, links, images, and metadata  

## 🔗 MCP Integration

### 1. Install MCP Firecrawl Server

```bash
# Install the MCP Firecrawl server globally
npm install -g @mendable/firecrawl-mcp-server

# Or use npx (recommended)
npx -y @mendable/firecrawl-mcp-server
```

### 2. Configure MCP Server

Add to your MCP configuration (Claude Desktop config):

```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "@mendable/firecrawl-mcp-server"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-your-api-key-here"
      }
    }
  }
}
```

### 3. Verify MCP Integration

1. Open Claude Desktop
2. Look for the 🔌 MCP indicator
3. Verify Firecrawl tools are available
4. Test with a simple scraping command

## 🎯 Agent Configuration

Your CrewAI agents now automatically have access to these tools:

### News Research Specialist
- `web_search`: Multi-source web searching
- `firecrawl_scrape`: Advanced web scraping
- `url_validator`: URL validation and cleaning

### Content Quality Analyst  
- `news_analysis`: Content analysis and sentiment
- `firecrawl_scrape`: Content extraction for analysis

### URL Validation Specialist
- `url_validator`: URL validation
- `web_scrape`: Basic scraping fallback

## 🧪 Testing the Integration

### 1. Test Firecrawl Tool

```bash
# Start your CrewAI service
cd src/backend/services/crewai-agents
python main_enhanced.py

# Check logs for:
# ✅ Custom tools loaded successfully
# ✅ Firecrawl initialized successfully
# 🔧 CrewAI-compatible tools: ['web_search', 'web_scrape', 'firecrawl_scrape', 'news_analysis', 'url_validator']
```

### 2. Test with API

```bash
curl -X POST http://localhost:5000/gather-news \
  -H "Content-Type: application/json" \
  -d '{
    "topics": ["AI", "technology"],
    "sources": ["news_websites", "reddit"],
    "max_articles": 10
  }'
```

### 3. Check Agent Logs

Look for tool usage in the logs:
```
🔧 Assigning tools to agents:
   News Researcher: 3 tools
   Content Analyst: 2 tools
   URL Validator: 2 tools
   Trend Analyst: 2 tools
   Social Monitor: 2 tools
```

## 🔧 Advanced Configuration

### Custom Tool Settings

Edit `tools/custom_tools.py` to customize Firecrawl behavior:

```python
# Modify default extraction options
default_options = {
    "formats": ["markdown", "html"],
    "includeTags": ["title", "meta", "h1", "h2", "h3", "p", "article"],
    "excludeTags": ["nav", "footer", "aside", "script", "style"],
    "onlyMainContent": True,
    "extractorOptions": {
        "mode": "llm-extraction"  # or "llm-extraction-from-raw-html"
    }
}
```

### Environment Variables

```bash
# Required
FIRECRAWL_API_KEY=fc-your-api-key-here

# Optional
FIRECRAWL_BASE_URL=https://api.firecrawl.dev  # Custom base URL
FIRECRAWL_TIMEOUT=30  # Request timeout in seconds
```

## 🚨 Troubleshooting

### Common Issues

1. **"Firecrawl package not installed"**
   ```bash
   pip install firecrawl-py>=0.0.8
   ```

2. **"FIRECRAWL_API_KEY environment variable not set"**
   ```bash
   export FIRECRAWL_API_KEY=fc-your-key
   # Or add to .env file
   ```

3. **"Falling back to basic scraping"**
   - Check API key is valid
   - Verify network connectivity
   - Check Firecrawl service status

4. **MCP Server Not Connecting**
   ```bash
   # Test MCP server directly
   npx -y @mendable/firecrawl-mcp-server
   ```

### Logs to Check

```bash
# CrewAI Service Logs
tail -f logs/crewai-service.log

# Look for:
# ✅ Firecrawl initialized successfully
# ❌ Firecrawl initialization failed
# 🔄 Falling back to basic scraping
```

## 📈 Benefits

### With Firecrawl Integration:
- **Better Content Quality**: AI-powered content extraction
- **Structured Data**: Clean markdown and HTML output  
- **Advanced Crawling**: Multi-page website crawling
- **Reliability**: Automatic fallback to basic scraping

### With MCP Integration:
- **Tool Discoverability**: Claude can see available tools
- **Seamless Integration**: Works directly in Claude Desktop
- **Resource Management**: Proper tool lifecycle management
- **Error Handling**: Better error reporting and recovery

## 🎉 Next Steps

1. **Test the integration** with your specific use cases
2. **Monitor agent logs** to ensure tools are working
3. **Customize extraction options** for your content needs
4. **Add more MCP servers** from the Synapse catalog
5. **Scale up** with additional Firecrawl features

Your CrewAI agents now have powerful web scraping capabilities with both programmatic and MCP integration! 🚀