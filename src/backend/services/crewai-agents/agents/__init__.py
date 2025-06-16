# Agent implementations for Synapse CrewAI system

from .simple_news_scraper import SimpleNewsScraperTool

# Try to import news scraper agent (requires BeautifulSoup)
try:
    from .news_scraper_agent import NewsScraperTool
    __all__ = ['SimpleNewsScraperTool', 'NewsScraperTool']
except ImportError:
    __all__ = ['SimpleNewsScraperTool']