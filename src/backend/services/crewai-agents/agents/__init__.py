# Agent implementations for Synapse CrewAI system

from .simple_news_scraper import SimpleNewsScraperTool
from .news_scraper_agent import NewsScraperTool

__all__ = ['SimpleNewsScraperTool', 'NewsScraperTool']