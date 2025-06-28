"""
Custom Tools for CrewAI Agents
Implements search, scraping, and analysis tools without external dependencies
"""

import os
import requests
import json
import re
from typing import Dict, List, Any, Optional, TYPE_CHECKING
from datetime import datetime
from urllib.parse import urlparse, urljoin

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
import logging

# Try to import firecrawl
try:
    from firecrawl import FirecrawlApp
    FIRECRAWL_AVAILABLE = True
except ImportError:
    FIRECRAWL_AVAILABLE = False
    FirecrawlApp = None

logger = logging.getLogger(__name__)

from crewai.tools import BaseTool as CrewAIBaseTool
from pydantic import BaseModel, Field
from typing import Type

class BaseTool(CrewAIBaseTool):
    """Base class for all custom tools compatible with CrewAI"""
    
    def __init__(self, name: str = None, description: str = None):
        if name:
            self.name = name
        if description:
            self.description = description
        super().__init__()
    
    def _run(self, *args, **kwargs):
        """Execute the tool - to be implemented by subclasses"""
        return self.execute(*args, **kwargs)
    
    def execute(self, *args, **kwargs):
        """Execute the tool - to be implemented by subclasses"""
        raise NotImplementedError

class WebSearchToolInput(BaseModel):
    query: str = Field(..., description="The search query to execute")
    max_results: int = Field(default=10, description="Maximum number of results to return")

class WebSearchTool(BaseTool):
    """Custom web search tool using multiple search engines"""
    
    name: str = "web_search"
    description: str = "Search the web for information using multiple search engines and APIs. Provide a query and get relevant articles and information."
    args_schema: Type[BaseModel] = WebSearchToolInput
    
    def __init__(self):
        super().__init__()
        # Initialize session after super().__init__()
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        object.__setattr__(self, 'session', session)
    
    def _run(self, query: str, max_results: int = 10) -> str:
        """Execute web search - returns JSON string for CrewAI compatibility"""
        result = self.execute(query, max_results)
        return json.dumps(result, indent=2)
    
    def execute(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """Execute web search using available APIs and sources"""
        try:
            results = []
            
            # Try multiple search sources
            sources = [
                self._search_hackernews,
                self._search_reddit,
                self._search_github,
                self._search_devto
            ]
            
            for search_func in sources:
                try:
                    source_results = search_func(query, max_results // len(sources))
                    results.extend(source_results)
                except Exception as e:
                    logger.warning(f"Search source failed: {str(e)}")
                    continue
            
            return {
                "success": True,
                "query": query,
                "results": results[:max_results],
                "total_found": len(results),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "results": []
            }
    
    def _search_hackernews(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search Hacker News"""
        results = []
        try:
            # Get top stories
            response = self.session.get('https://hacker-news.firebaseio.com/v0/topstories.json', timeout=10)
            story_ids = response.json()[:50]
            
            for story_id in story_ids[:max_results]:
                try:
                    item_response = self.session.get(f'https://hacker-news.firebaseio.com/v0/item/{story_id}.json', timeout=5)
                    item = item_response.json()
                    
                    if item and item.get('title') and query.lower() in item.get('title', '').lower():
                        results.append({
                            'title': item.get('title', ''),
                            'url': item.get('url', f'https://news.ycombinator.com/item?id={story_id}'),
                            'snippet': item.get('title', ''),
                            'source': 'Hacker News',
                            'score': item.get('score', 0),
                            'timestamp': datetime.fromtimestamp(item.get('time', 0)).isoformat() if item.get('time') else ''
                        })
                except Exception:
                    continue
                    
        except Exception as e:
            logger.error(f"Hacker News search failed: {str(e)}")
        
        return results
    
    def _search_reddit(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search Reddit"""
        results = []
        try:
            # Search multiple tech subreddits
            subreddits = ['technology', 'programming', 'MachineLearning', 'artificial']
            
            for subreddit in subreddits:
                try:
                    response = self.session.get(f'https://www.reddit.com/r/{subreddit}.json', timeout=10)
                    data = response.json()
                    
                    if data and 'data' in data and 'children' in data['data']:
                        for post in data['data']['children'][:max_results // len(subreddits)]:
                            post_data = post['data']
                            title = post_data.get('title', '')
                            
                            if query.lower() in title.lower():
                                results.append({
                                    'title': title,
                                    'url': post_data.get('url', ''),
                                    'snippet': post_data.get('selftext', '')[:200] + '...' if post_data.get('selftext') else title,
                                    'source': f'Reddit r/{subreddit}',
                                    'score': post_data.get('score', 0),
                                    'timestamp': datetime.fromtimestamp(post_data.get('created_utc', 0)).isoformat() if post_data.get('created_utc') else ''
                                })
                except Exception:
                    continue
                    
        except Exception as e:
            logger.error(f"Reddit search failed: {str(e)}")
        
        return results
    
    def _search_github(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search GitHub repositories"""
        results = []
        try:
            # Search GitHub repositories
            search_url = f'https://api.github.com/search/repositories?q={query}&sort=stars&order=desc'
            response = self.session.get(search_url, timeout=10)
            data = response.json()
            
            if data and 'items' in data:
                for repo in data['items'][:max_results]:
                    results.append({
                        'title': f"{repo.get('name', '')}: {repo.get('description', '')}",
                        'url': repo.get('html_url', ''),
                        'snippet': repo.get('description', ''),
                        'source': 'GitHub',
                        'score': repo.get('stargazers_count', 0),
                        'timestamp': repo.get('created_at', '')
                    })
                    
        except Exception as e:
            logger.error(f"GitHub search failed: {str(e)}")
        
        return results
    
    def _search_devto(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search Dev.to articles"""
        results = []
        try:
            response = self.session.get('https://dev.to/api/articles?top=7', timeout=10)
            articles = response.json()
            
            for article in articles[:max_results]:
                title = article.get('title', '')
                if query.lower() in title.lower() or query.lower() in article.get('description', '').lower():
                    results.append({
                        'title': title,
                        'url': article.get('url', ''),
                        'snippet': article.get('description', ''),
                        'source': 'Dev.to',
                        'score': article.get('positive_reactions_count', 0),
                        'timestamp': article.get('published_at', '')
                    })
                    
        except Exception as e:
            logger.error(f"Dev.to search failed: {str(e)}")
        
        return results

class WebScrapeToolInput(BaseModel):
    url: str = Field(..., description="The URL to scrape content from")
    extract_type: str = Field(default="text", description="Type of content to extract: 'text', 'links', or 'metadata'")

class WebScrapeTool(BaseTool):
    """Custom web scraping tool"""
    
    name: str = "web_scrape"
    description: str = "Scrape content from web pages with intelligent content extraction. Provide a URL and extraction type."
    args_schema: Type[BaseModel] = WebScrapeToolInput
    
    def __init__(self):
        super().__init__()
        # Initialize session after super().__init__()
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        object.__setattr__(self, 'session', session)
    
    def _run(self, url: str, extract_type: str = "text") -> str:
        """Execute web scraping - returns JSON string for CrewAI compatibility"""
        result = self.execute(url, extract_type)
        return json.dumps(result, indent=2)
    
    def execute(self, url: str, extract_type: str = "text") -> Dict[str, Any]:
        """Scrape content from a URL"""
        try:
            # Validate URL
            parsed_url = urlparse(url)
            if not all([parsed_url.scheme, parsed_url.netloc]):
                return {
                    "success": False,
                    "error": "Invalid URL format",
                    "url": url
                }
            
            # Fetch content
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Parse content
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "aside"]):
                script.decompose()
            
            # Extract content based on type
            if extract_type == "text":
                content = self._extract_text_content(soup)
            elif extract_type == "links":
                content = self._extract_links(soup, url)
            elif extract_type == "metadata":
                content = self._extract_metadata(soup)
            else:
                content = self._extract_text_content(soup)
            
            return {
                "success": True,
                "url": url,
                "content": content,
                "title": soup.title.string if soup.title else "",
                "timestamp": datetime.now().isoformat(),
                "content_length": len(str(content))
            }
            
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Request failed: {str(e)}",
                "url": url
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Scraping failed: {str(e)}",
                "url": url
            }
    
    def _extract_text_content(self, soup: BeautifulSoupType) -> str:
        """Extract clean text content"""
        # Try to find main content areas
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main|article'))
        
        if main_content:
            text = main_content.get_text()
        else:
            text = soup.get_text()
        
        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text[:5000]  # Limit to 5000 characters
    
    def _extract_links(self, soup: BeautifulSoupType, base_url: str) -> List[Dict[str, str]]:
        """Extract all links from the page"""
        links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            # Convert relative URLs to absolute
            if href.startswith('/'):
                href = urljoin(base_url, href)
            elif not href.startswith(('http://', 'https://')):
                continue
            
            links.append({
                'url': href,
                'text': link.get_text(strip=True),
                'title': link.get('title', '')
            })
        
        return links[:50]  # Limit to 50 links
    
    def _extract_metadata(self, soup: BeautifulSoupType) -> Dict[str, str]:
        """Extract page metadata"""
        metadata = {}
        
        # Title
        if soup.title:
            metadata['title'] = soup.title.string
        
        # Meta tags
        for meta in soup.find_all('meta'):
            name = meta.get('name') or meta.get('property')
            content = meta.get('content')
            if name and content:
                metadata[name] = content
        
        # Headings
        headings = []
        for i in range(1, 7):
            for heading in soup.find_all(f'h{i}'):
                headings.append({
                    'level': i,
                    'text': heading.get_text(strip=True)
                })
        metadata['headings'] = headings[:10]  # Limit to 10 headings
        
        return metadata

class FirecrawlScrapeToolInput(BaseModel):
    url: str = Field(..., description="The URL to scrape content from")
    extract_options: Dict[str, Any] = Field(default={}, description="Extraction options for Firecrawl")

class FirecrawlScrapeTool(BaseTool):
    """Advanced web scraping tool using Firecrawl for better content extraction"""
    
    name: str = "firecrawl_scrape"
    description: str = "Advanced web scraping with Firecrawl for clean, structured content extraction"
    args_schema: Type[BaseModel] = FirecrawlScrapeToolInput
    
    def __init__(self):
        super().__init__()
        # Use object.__setattr__ to avoid Pydantic validation issues
        object.__setattr__(self, 'api_key', os.getenv('FIRECRAWL_API_KEY'))
        object.__setattr__(self, 'firecrawl', None)
        
        if FIRECRAWL_AVAILABLE and self.api_key:
            try:
                firecrawl_app = FirecrawlApp(api_key=self.api_key)
                object.__setattr__(self, 'firecrawl', firecrawl_app)
                logger.info("✅ Firecrawl initialized successfully")
            except Exception as e:
                logger.error(f"❌ Firecrawl initialization failed: {str(e)}")
                object.__setattr__(self, 'firecrawl', None)
        else:
            if not FIRECRAWL_AVAILABLE:
                logger.warning("⚠️ Firecrawl package not installed. Install with: pip install firecrawl-py")
            if not self.api_key:
                logger.warning("⚠️ FIRECRAWL_API_KEY environment variable not set")
    
    def _run(self, url: str, extract_options: Dict[str, Any] = None) -> str:
        """Execute Firecrawl scraping - returns JSON string for CrewAI compatibility"""
        result = self.execute(url, extract_options)
        return json.dumps(result, indent=2)
    
    def execute(self, url: str, extract_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Scrape content using Firecrawl with advanced options"""
        try:
            # Validate URL
            parsed_url = urlparse(url)
            if not all([parsed_url.scheme, parsed_url.netloc]):
                return {
                    "success": False,
                    "error": "Invalid URL format",
                    "url": url
                }
            
            if not self.firecrawl:
                # Fallback to basic scraping if Firecrawl not available
                logger.info("🔄 Falling back to basic scraping (Firecrawl unavailable)")
                return self._fallback_scrape(url)
            
            # Set default extraction options
            default_options = {
                "formats": ["markdown", "html"],
                "includeTags": ["title", "meta", "h1", "h2", "h3", "p", "article"],
                "excludeTags": ["nav", "footer", "aside", "script", "style"],
                "onlyMainContent": True,
                "extractorOptions": {
                    "mode": "llm-extraction"
                }
            }
            
            # Merge with user options
            if extract_options:
                default_options.update(extract_options)
            
            # Scrape with Firecrawl (v1 API format)
            result = self.firecrawl.scrape_url(url, default_options)
            
            if result.get('success'):
                content_data = result.get('data', {})
                
                return {
                    "success": True,
                    "url": url,
                    "title": content_data.get('metadata', {}).get('title', ''),
                    "content": {
                        "markdown": content_data.get('markdown', ''),
                        "html": content_data.get('html', ''),
                        "text": content_data.get('content', '')
                    },
                    "metadata": content_data.get('metadata', {}),
                    "links": content_data.get('links', []),
                    "images": content_data.get('images', []),
                    "timestamp": datetime.now().isoformat(),
                    "source": "firecrawl",
                    "processing_time": result.get('processingTime', 0)
                }
            else:
                error_msg = result.get('error', 'Unknown Firecrawl error')
                logger.error(f"❌ Firecrawl scraping failed: {error_msg}")
                return self._fallback_scrape(url)
                
        except Exception as e:
            logger.error(f"❌ Firecrawl execution error: {str(e)}")
            return self._fallback_scrape(url)
    
    def crawl_website(self, url: str, max_pages: int = 5, crawl_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Crawl entire website or multiple pages using Firecrawl"""
        try:
            if not self.firecrawl:
                return {
                    "success": False,
                    "error": "Firecrawl not available for crawling",
                    "url": url
                }
            
            # Set default crawl options
            default_options = {
                "crawlerOptions": {
                    "maxDepth": 2,
                    "limit": max_pages,
                    "allowBackwardCrawling": False,
                    "allowExternalContentLinks": False
                },
                "pageOptions": {
                    "onlyMainContent": True,
                    "formats": ["markdown"]
                }
            }
            
            # Merge with user options
            if crawl_options:
                default_options.update(crawl_options)
            
            # Start crawl job (v1 API format)
            crawl_result = self.firecrawl.crawl_url(url, default_options)
            
            if crawl_result.get('success'):
                pages = crawl_result.get('data', [])
                
                return {
                    "success": True,
                    "url": url,
                    "pages_found": len(pages),
                    "pages": [
                        {
                            "url": page.get('metadata', {}).get('sourceURL', ''),
                            "title": page.get('metadata', {}).get('title', ''),
                            "content": page.get('markdown', ''),
                            "metadata": page.get('metadata', {})
                        }
                        for page in pages
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "source": "firecrawl-crawl"
                }
            else:
                return {
                    "success": False,
                    "error": crawl_result.get('error', 'Crawl failed'),
                    "url": url
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Crawl execution error: {str(e)}",
                "url": url
            }
    
    def _fallback_scrape(self, url: str) -> Dict[str, Any]:
        """Fallback to basic scraping when Firecrawl is unavailable"""
        try:
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            
            response = session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove unwanted elements
            for element in soup(["script", "style", "nav", "footer", "aside"]):
                element.decompose()
            
            # Extract content
            title = soup.title.string if soup.title else ""
            content = soup.get_text()
            
            # Clean content
            lines = (line.strip() for line in content.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_content = ' '.join(chunk for chunk in chunks if chunk)
            
            return {
                "success": True,
                "url": url,
                "title": title,
                "content": {
                    "text": clean_content[:5000],  # Limit content length
                    "markdown": "",
                    "html": str(soup)[:10000]
                },
                "metadata": {
                    "title": title,
                    "url": url
                },
                "links": [],
                "images": [],
                "timestamp": datetime.now().isoformat(),
                "source": "fallback-scrape",
                "note": "Firecrawl unavailable - using basic scraping"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Fallback scraping failed: {str(e)}",
                "url": url
            }

class NewsAnalysisToolInput(BaseModel):
    articles: List[Dict[str, Any]] = Field(..., description="List of articles to analyze")
    analysis_type: str = Field(default="trends", description="Type of analysis: 'trends', 'sentiment', 'keywords', or 'comprehensive'")

class NewsAnalysisTool(BaseTool):
    """Tool for analyzing news content and trends"""
    
    name: str = "news_analysis"
    description: str = "Analyze news content for trends, sentiment, and key insights. Provide articles and analysis type."
    args_schema: Type[BaseModel] = NewsAnalysisToolInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, articles: List[Dict[str, Any]], analysis_type: str = "trends") -> str:
        """Execute news analysis - returns JSON string for CrewAI compatibility"""
        result = self.execute(articles, analysis_type)
        return json.dumps(result, indent=2)
    
    def execute(self, articles: List[Dict[str, Any]], analysis_type: str = "trends") -> Dict[str, Any]:
        """Analyze news articles"""
        try:
            if analysis_type == "trends":
                return self._analyze_trends(articles)
            elif analysis_type == "sentiment":
                return self._analyze_sentiment(articles)
            elif analysis_type == "keywords":
                return self._extract_keywords(articles)
            else:
                return self._comprehensive_analysis(articles)
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "analysis_type": analysis_type
            }
    
    def _analyze_trends(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze trending topics"""
        word_freq = {}
        topics = []
        
        for article in articles:
            title = article.get('title', '').lower()
            content = article.get('content', '').lower()
            text = f"{title} {content}"
            
            # Extract meaningful words (simple approach)
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
            for word in words:
                if word not in ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way']:
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top trending words
        trending_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]
        
        # Identify topics based on word clusters
        tech_keywords = ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'technology', 'software', 'data', 'algorithm']
        business_keywords = ['business', 'company', 'market', 'startup', 'investment', 'funding', 'revenue', 'growth']
        
        tech_score = sum(word_freq.get(word, 0) for word in tech_keywords)
        business_score = sum(word_freq.get(word, 0) for word in business_keywords)
        
        topics.append({
            'topic': 'Technology',
            'score': tech_score,
            'keywords': [word for word in tech_keywords if word in word_freq]
        })
        
        topics.append({
            'topic': 'Business',
            'score': business_score,
            'keywords': [word for word in business_keywords if word in word_freq]
        })
        
        return {
            "success": True,
            "analysis_type": "trends",
            "trending_words": trending_words,
            "topics": sorted(topics, key=lambda x: x['score'], reverse=True),
            "total_articles": len(articles),
            "timestamp": datetime.now().isoformat()
        }
    
    def _analyze_sentiment(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Simple sentiment analysis"""
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'positive', 'success', 'win', 'growth', 'innovation', 'breakthrough']
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'negative', 'fail', 'failure', 'problem', 'issue', 'crisis', 'decline', 'loss']
        
        sentiments = []
        
        for article in articles:
            text = f"{article.get('title', '')} {article.get('content', '')}".lower()
            
            positive_count = sum(1 for word in positive_words if word in text)
            negative_count = sum(1 for word in negative_words if word in text)
            
            if positive_count > negative_count:
                sentiment = 'positive'
                score = positive_count / (positive_count + negative_count + 1)
            elif negative_count > positive_count:
                sentiment = 'negative'
                score = negative_count / (positive_count + negative_count + 1)
            else:
                sentiment = 'neutral'
                score = 0.5
            
            sentiments.append({
                'title': article.get('title', ''),
                'sentiment': sentiment,
                'score': score,
                'positive_signals': positive_count,
                'negative_signals': negative_count
            })
        
        # Overall sentiment
        avg_score = sum(s['score'] for s in sentiments) / len(sentiments) if sentiments else 0.5
        overall_sentiment = 'positive' if avg_score > 0.6 else 'negative' if avg_score < 0.4 else 'neutral'
        
        return {
            "success": True,
            "analysis_type": "sentiment",
            "overall_sentiment": overall_sentiment,
            "average_score": avg_score,
            "article_sentiments": sentiments,
            "timestamp": datetime.now().isoformat()
        }
    
    def _extract_keywords(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract key terms and phrases"""
        all_text = ""
        for article in articles:
            all_text += f" {article.get('title', '')} {article.get('content', '')}"
        
        # Simple keyword extraction
        words = re.findall(r'\b[a-zA-Z]{4,}\b', all_text.lower())
        word_freq = {}
        
        for word in words:
            if word not in ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other']:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:30]
        
        return {
            "success": True,
            "analysis_type": "keywords",
            "keywords": keywords,
            "total_unique_words": len(word_freq),
            "timestamp": datetime.now().isoformat()
        }
    
    def _comprehensive_analysis(self, articles: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Comprehensive analysis combining all methods"""
        trends = self._analyze_trends(articles)
        sentiment = self._analyze_sentiment(articles)
        keywords = self._extract_keywords(articles)
        
        return {
            "success": True,
            "analysis_type": "comprehensive",
            "trends": trends,
            "sentiment": sentiment,
            "keywords": keywords,
            "summary": {
                "total_articles": len(articles),
                "top_trend": trends.get('topics', [{}])[0].get('topic', 'Unknown') if trends.get('topics') else 'Unknown',
                "overall_sentiment": sentiment.get('overall_sentiment', 'neutral'),
                "top_keyword": keywords.get('keywords', [('unknown', 0)])[0][0] if keywords.get('keywords') else 'unknown'
            },
            "timestamp": datetime.now().isoformat()
        }

class URLValidatorToolInput(BaseModel):
    urls: List[str] = Field(..., description="List of URLs to validate")
    check_accessibility: bool = Field(default=True, description="Whether to check if URLs are accessible")

class URLValidatorTool(BaseTool):
    """Tool for validating and cleaning URLs"""
    
    name: str = "url_validator"
    description: str = "Validate, clean, and check accessibility of URLs"
    args_schema: Type[BaseModel] = URLValidatorToolInput
    
    def __init__(self):
        super().__init__()
        # Initialize session after super().__init__()
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        object.__setattr__(self, 'session', session)
    
    def _run(self, urls: List[str], check_accessibility: bool = True) -> str:
        """Execute URL validation - returns JSON string for CrewAI compatibility"""
        result = self.execute(urls, check_accessibility)
        return json.dumps(result, indent=2)
    
    def execute(self, urls: List[str], check_accessibility: bool = True) -> Dict[str, Any]:
        """Validate and clean a list of URLs"""
        try:
            results = []
            
            for url in urls:
                result = {
                    'original_url': url,
                    'cleaned_url': self._clean_url(url),
                    'is_valid_format': self._is_valid_format(url),
                    'is_accessible': False,
                    'status_code': None,
                    'redirect_url': None,
                    'error': None
                }
                
                if check_accessibility and result['is_valid_format']:
                    try:
                        response = self.session.head(result['cleaned_url'], timeout=10, allow_redirects=True)
                        result['is_accessible'] = response.status_code < 400
                        result['status_code'] = response.status_code
                        if response.url != result['cleaned_url']:
                            result['redirect_url'] = response.url
                    except Exception as e:
                        result['error'] = str(e)
                
                results.append(result)
            
            valid_urls = [r['cleaned_url'] for r in results if r['is_valid_format'] and (not check_accessibility or r['is_accessible'])]
            
            return {
                "success": True,
                "total_urls": len(urls),
                "valid_urls": valid_urls,
                "validation_results": results,
                "summary": {
                    "valid_format": len([r for r in results if r['is_valid_format']]),
                    "accessible": len([r for r in results if r['is_accessible']]),
                    "redirects": len([r for r in results if r['redirect_url']]),
                    "errors": len([r for r in results if r['error']])
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "urls": urls
            }
    
    def _clean_url(self, url: str) -> str:
        """Clean and normalize URL"""
        if not url:
            return ""
        
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Remove tracking parameters
        tracking_params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
        parsed = urlparse(url)
        
        if parsed.query:
            query_params = []
            for param in parsed.query.split('&'):
                if '=' in param:
                    key = param.split('=')[0]
                    if key not in tracking_params:
                        query_params.append(param)
            
            # Reconstruct URL
            from urllib.parse import urlunparse
            cleaned_query = '&'.join(query_params)
            url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, cleaned_query, parsed.fragment))
        
        return url
    
    def _is_valid_format(self, url: str) -> bool:
        """Check if URL has valid format"""
        try:
            parsed = urlparse(url if url.startswith(('http://', 'https://')) else 'https://' + url)
            return all([parsed.scheme, parsed.netloc])
        except Exception:
            return False

# Tool registry for easy access
AVAILABLE_TOOLS = {
    'web_search': WebSearchTool(),
    'web_scrape': WebScrapeTool(),
    'firecrawl_scrape': FirecrawlScrapeTool(),
    'news_analysis': NewsAnalysisTool(),
    'url_validator': URLValidatorTool()
}

def get_tool(tool_name: str) -> Optional[BaseTool]:
    """Get a tool by name"""
    return AVAILABLE_TOOLS.get(tool_name)

def list_available_tools() -> List[str]:
    """List all available tool names"""
    return list(AVAILABLE_TOOLS.keys())

def get_tool_descriptions() -> Dict[str, str]:
    """Get descriptions of all available tools"""
    return {name: tool.description for name, tool in AVAILABLE_TOOLS.items()}
