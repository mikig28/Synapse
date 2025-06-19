import os
import json
import requests
from typing import List, Dict, Any, TYPE_CHECKING
from datetime import datetime, timedelta

# Type checking imports
if TYPE_CHECKING:
    from bs4 import BeautifulSoup as BeautifulSoupType
else:
    BeautifulSoupType = Any

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    BeautifulSoup = None
    
import feedparser
from newspaper import Article
from crewai import Agent
from crewai_tools import BaseTool
import logging

logger = logging.getLogger(__name__)

class NewsScraperTool(BaseTool):
    """Tool for scraping news websites and tech blogs"""
    
    name: str = "News Website Scraper"
    description: str = "Scrapes major news websites and tech blogs for articles"
    
    def __init__(self):
        super().__init__()
        # Define news sources with their RSS feeds or URLs
        self.news_sources = {
            'techcrunch': {
                'name': 'TechCrunch',
                'rss': 'https://techcrunch.com/feed/',
                'url': 'https://techcrunch.com',
                'category': 'tech'
            },
            'arstechnica': {
                'name': 'Ars Technica',
                'rss': 'https://feeds.arstechnica.com/arstechnica/index',
                'url': 'https://arstechnica.com',
                'category': 'tech'
            },
            'wired': {
                'name': 'Wired',
                'rss': 'https://www.wired.com/feed/rss',
                'url': 'https://www.wired.com',
                'category': 'tech'
            },
            'mit_tech_review': {
                'name': 'MIT Technology Review',
                'rss': 'https://www.technologyreview.com/feed/',
                'url': 'https://www.technologyreview.com',
                'category': 'tech'
            },
            'venturebeat': {
                'name': 'VentureBeat',
                'rss': 'https://venturebeat.com/feed/',
                'url': 'https://venturebeat.com',
                'category': 'tech'
            },
            'reuters_tech': {
                'name': 'Reuters Technology',
                'rss': 'https://feeds.reuters.com/reuters/technologyNews',
                'url': 'https://www.reuters.com/technology',
                'category': 'news'
            },
            'bbc_tech': {
                'name': 'BBC Technology',
                'rss': 'https://feeds.bbci.co.uk/news/technology/rss.xml',
                'url': 'https://www.bbc.com/news/technology',
                'category': 'news'
            }
        }
    
    def _run(self, topics: str = "technology,AI,startups") -> str:
        """Scrape news websites for articles on specified topics"""
        
        try:
            topics_list = [topic.strip().lower() for topic in topics.split(',')]
            all_articles = []
            
            logger.info(f"Scraping news sources for topics: {topics_list}")
            
            # Scrape each news source
            for source_key, source_info in self.news_sources.items():
                try:
                    articles = self._scrape_source(source_info, topics_list)
                    all_articles.extend(articles)
                    logger.info(f"Scraped {len(articles)} articles from {source_info['name']}")
                    
                except Exception as e:
                    logger.error(f"Error scraping {source_info['name']}: {str(e)}")
                    continue
            
            # Filter and sort articles by relevance and recency
            filtered_articles = self._filter_articles_by_topics(all_articles, topics_list)
            sorted_articles = sorted(filtered_articles, key=lambda x: x.get('published_date', ''), reverse=True)
            
            result = {
                'success': True,
                'source': 'news_websites',
                'topics': topics_list,
                'sources_scraped': list(self.news_sources.keys()),
                'articles_found': len(sorted_articles),
                'articles': sorted_articles[:25],  # Return top 25 articles
                'timestamp': datetime.now().isoformat()
            }
            
            return json.dumps(result, indent=2)
            
        except Exception as e:
            error_result = {
                'success': False,
                'source': 'news_websites',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            logger.error(f"News scraping failed: {str(e)}")
            return json.dumps(error_result, indent=2)
    
    def _scrape_source(self, source_info: Dict[str, str], topics: List[str]) -> List[Dict[str, Any]]:
        """Scrape a single news source"""
        
        articles = []
        
        try:
            # Try RSS feed first
            if 'rss' in source_info:
                articles = self._scrape_rss_feed(source_info, topics)
            
            # If RSS fails or returns few articles, try direct scraping
            if len(articles) < 5 and 'url' in source_info:
                direct_articles = self._scrape_website_direct(source_info, topics)
                articles.extend(direct_articles)
            
        except Exception as e:
            logger.error(f"Error scraping source {source_info['name']}: {str(e)}")
        
        return articles
    
    def _scrape_rss_feed(self, source_info: Dict[str, str], topics: List[str]) -> List[Dict[str, Any]]:
        """Scrape articles from RSS feed"""
        
        articles = []
        
        try:
            # Parse RSS feed
            feed = feedparser.parse(source_info['rss'])
            
            for entry in feed.entries[:15]:  # Limit to 15 entries per source
                try:
                    # Check if article is recent (last 7 days)
                    published_date = None
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        published_date = datetime(*entry.published_parsed[:6])
                        if datetime.now() - published_date > timedelta(days=7):
                            continue
                    
                    # Extract article content using newspaper3k
                    article_content = self._extract_article_content(entry.link)
                    
                    article_data = {
                        'title': getattr(entry, 'title', ''),
                        'summary': getattr(entry, 'summary', ''),
                        'content': article_content.get('content', ''),
                        'url': getattr(entry, 'link', ''),
                        'author': getattr(entry, 'author', 'Unknown'),
                        'published_date': published_date.isoformat() if published_date else '',
                        'source': source_info['name'],
                        'source_category': source_info['category'],
                        'tags': getattr(entry, 'tags', []),
                        'image_url': article_content.get('image_url', ''),
                        'source_url': source_info['url'],
                        'scraped_at': datetime.now().isoformat()
                    }
                    
                    articles.append(article_data)
                    
                except Exception as e:
                    logger.error(f"Error processing RSS entry: {str(e)}")
                    continue
        
        except Exception as e:
            logger.error(f"Error parsing RSS feed for {source_info['name']}: {str(e)}")
        
        return articles
    
    def _scrape_website_direct(self, source_info: Dict[str, str], topics: List[str]) -> List[Dict[str, Any]]:
        """Scrape website directly when RSS is not available"""
        
        articles = []
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(source_info['url'], headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find article links (this would need to be customized per site)
            article_links = self._extract_article_links(soup, source_info)
            
            for link in article_links[:10]:  # Limit to 10 articles
                try:
                    article_content = self._extract_article_content(link)
                    if article_content:
                        articles.append(article_content)
                except Exception as e:
                    logger.error(f"Error extracting article from {link}: {str(e)}")
                    continue
        
        except Exception as e:
            logger.error(f"Error scraping website {source_info['url']}: {str(e)}")
        
        return articles
    
    def _extract_article_links(self, soup: BeautifulSoupType, source_info: Dict[str, str]) -> List[str]:
        """Extract article links from website homepage"""
        
        links = []
        
        # Generic approach - look for article links
        # This would need to be customized for each news site
        for link in soup.find_all('a', href=True):
            href = link['href']
            
            # Make relative URLs absolute
            if href.startswith('/'):
                href = source_info['url'].rstrip('/') + href
            
            # Filter for article URLs
            if any(pattern in href for pattern in ['/article/', '/story/', '/news/', '/tech/', '/2024/', '/2025/']):
                if href.startswith('http') and len(href) > 50:
                    links.append(href)
        
        return list(set(links))  # Remove duplicates
    
    def _extract_article_content(self, url: str) -> Dict[str, Any]:
        """Extract article content using newspaper3k"""
        
        try:
            article = Article(url)
            article.download()
            article.parse()
            
            return {
                'title': article.title,
                'content': article.text[:1000],  # Limit content length
                'summary': article.summary if hasattr(article, 'summary') else '',
                'url': url,
                'author': ', '.join(article.authors) if article.authors else 'Unknown',
                'published_date': article.publish_date.isoformat() if article.publish_date else '',
                'image_url': article.top_image,
                'keywords': article.keywords[:5] if article.keywords else [],
                'scraped_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {str(e)}")
            return {}
    
    def _filter_articles_by_topics(self, articles: List[Dict[str, Any]], topics: List[str]) -> List[Dict[str, Any]]:
        """Filter articles based on topic relevance"""
        
        filtered_articles = []
        
        for article in articles:
            # Check if any topic appears in title, summary, or content
            text_to_search = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}".lower()
            
            for topic in topics:
                if topic in text_to_search:
                    article['matched_topic'] = topic
                    filtered_articles.append(article)
                    break
        
        return filtered_articles

class NewsScraperAgent:
    """News scraper agent for gathering articles from websites"""
    
    def __init__(self, llm=None):
        self.tool = NewsScraperTool()
        self.agent = Agent(
            role='News Website Scraper',
            goal='Scrape major news websites and tech blogs for relevant articles',
            backstory="""You are a specialized news scraping agent focused on gathering 
            articles from reputable technology and business news sources. You excel at 
            finding breaking news, in-depth analysis, and industry insights from major 
            publications like TechCrunch, Wired, MIT Technology Review, and other 
            authoritative sources.""",
            tools=[self.tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )