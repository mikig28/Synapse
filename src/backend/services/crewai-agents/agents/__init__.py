# Agent implementations for Synapse CrewAI system

from .simple_news_scraper import SimpleNewsScraperTool

# Initialize all agents list
__all__ = ['SimpleNewsScraperTool']

# Try to import news scraper agent (requires BeautifulSoup)
try:
    from .news_scraper_agent import NewsScraperTool
    __all__.append('NewsScraperTool')
except ImportError:
    pass

# Try to import Reddit agent
try:
    from .reddit_agent import RedditScraperTool
    __all__.append('RedditScraperTool')
except ImportError:
    pass

# Try to import Telegram agent
try:
    from .telegram_agent import TelegramMonitorTool
    __all__.append('TelegramMonitorTool')
except ImportError:
    pass

# Try to import news analyst agent
try:
    from .news_analyst_agent import NewsAnalysisTool
    __all__.append('NewsAnalysisTool')
except ImportError:
    pass

# Try to import LinkedIn agent
try:
    from .linkedin_agent import LinkedInScraperTool
    __all__.append('LinkedInScraperTool')
except ImportError:
    pass