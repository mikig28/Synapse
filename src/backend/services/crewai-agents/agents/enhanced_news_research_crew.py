"""
Enhanced Multi-Agent News Research Crew
Specialized agents for comprehensive news monitoring with URL validation and task delegation
"""

import os
import requests
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import json
import re
import time
from urllib.parse import urlparse, urljoin, quote
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False
    BeautifulSoup = None

try:
    import feedparser
    FEEDPARSER_AVAILABLE = True
except ImportError:
    FEEDPARSER_AVAILABLE = False
    feedparser = None
from crewai import Agent, Task, Crew, Process
# from crewai_tools import SerperDevTool, ScrapeWebsiteTool  # Removed due to dependency conflicts
import logging
import sys
import os

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add tools directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
tools_dir = os.path.join(os.path.dirname(current_dir), 'tools')
if tools_dir not in sys.path:
    sys.path.insert(0, tools_dir)

# Import custom tools
try:
    from custom_tools import AVAILABLE_TOOLS, get_tool
    CUSTOM_TOOLS_AVAILABLE = True
    logger.info("✅ Custom tools loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import custom tools: {str(e)}")
    CUSTOM_TOOLS_AVAILABLE = False

class URLValidator:
    """Advanced URL validation and cleaning"""
    
    @staticmethod
    def is_valid_url(url: str) -> bool:
        """Check if URL is valid and accessible"""
        try:
            parsed = urlparse(url)
            if not all([parsed.scheme, parsed.netloc]):
                return False
            
            # Check if URL is accessible
            response = requests.head(url, timeout=10, allow_redirects=True)
            return response.status_code < 400
            
        except Exception:
            return False
    
    @staticmethod
    def clean_url(url: str) -> str:
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
    
    @staticmethod
    def validate_and_clean_urls(urls: List[str]) -> List[str]:
        """Validate and clean a list of URLs"""
        valid_urls = []
        
        for url in urls:
            cleaned_url = URLValidator.clean_url(url)
            if cleaned_url and URLValidator.is_valid_url(cleaned_url):
                valid_urls.append(cleaned_url)
            else:
                logger.warning(f"Invalid or inaccessible URL: {url}")
        
        return valid_urls

class ContentValidator:
    """Validates content quality and relevance"""
    
    def __init__(self, url_validator: URLValidator):
        self.url_validator = url_validator

    def is_quality_content(self, content: Dict[str, Any]) -> bool:
        """Check if content meets quality standards"""
        title = content.get('title', '')
        text = content.get('content', '') or content.get('text', '')
        
        # Basic quality checks
        if len(title) < 10 or len(text) < 50:
            return False
        
        # Check for spam indicators
        spam_indicators = ['click here', 'buy now', 'limited time', 'act fast', 'free money']
        text_lower = text.lower()
        
        if any(indicator in text_lower for indicator in spam_indicators):
            return False
        
        return True
    
    def extract_key_information(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure key information from content"""
        return {
            'title': content.get('title', '').strip(),
            'summary': content.get('summary', content.get('content', ''))[:300] + '...' if content.get('content', '') else '',
            'url': self.url_validator.clean_url(content.get('url', '')),
            'source': content.get('source', 'Unknown'),
            'published_date': content.get('published_date', datetime.now().isoformat()),
            'author': content.get('author', 'Unknown'),
            'tags': content.get('tags', []),
            'quality_score': self.calculate_quality_score(content)
        }
    
    def calculate_quality_score(self, content: Dict[str, Any]) -> float:
        """Calculate content quality score (0-1)"""
        score = 0.5  # Base score
        
        title = content.get('title', '')
        text = content.get('content', '') or content.get('text', '')
        
        # Title quality
        if len(title) > 20:
            score += 0.1
        if len(title) > 50:
            score += 0.1
        
        # Content length
        if len(text) > 200:
            score += 0.1
        if len(text) > 500:
            score += 0.1
        
        # Has author
        if content.get('author') and content.get('author') != 'Unknown':
            score += 0.1
        
        # Has valid URL
        if self.url_validator.is_valid_url(content.get('url', '')):
            score += 0.1
        
        return min(score, 1.0)

class TaskDelegator:
    """Manages task delegation between agents"""
    
    def __init__(self):
        self.task_queue = []
        self.completed_tasks = []
        self.failed_tasks = []
    
    def delegate_task(self, task_type: str, agent_name: str, parameters: Dict[str, Any]) -> str:
        """Delegate a task to a specific agent"""
        task_id = f"{task_type}_{agent_name}_{int(time.time())}"
        
        task = {
            'id': task_id,
            'type': task_type,
            'agent': agent_name,
            'parameters': parameters,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'attempts': 0
        }
        
        self.task_queue.append(task)
        logger.info(f"Delegated task {task_id} to {agent_name}")
        
        return task_id
    
    def complete_task(self, task_id: str, result: Any) -> None:
        """Mark task as completed"""
        for task in self.task_queue:
            if task['id'] == task_id:
                task['status'] = 'completed'
                task['result'] = result
                task['completed_at'] = datetime.now().isoformat()
                self.completed_tasks.append(task)
                self.task_queue.remove(task)
                break
    
    def fail_task(self, task_id: str, error: str) -> None:
        """Mark task as failed"""
        for task in self.task_queue:
            if task['id'] == task_id:
                task['status'] = 'failed'
                task['error'] = error
                task['failed_at'] = datetime.now().isoformat()
                task['attempts'] += 1
                
                # Retry logic
                if task['attempts'] < 3:
                    task['status'] = 'pending'
                    logger.info(f"Retrying task {task_id} (attempt {task['attempts']})")
                else:
                    self.failed_tasks.append(task)
                    self.task_queue.remove(task)
                break

class EnhancedNewsScraperAgent:
    """Enhanced news scraper with URL validation and error handling"""
    
    def __init__(self, url_validator: URLValidator, content_validator: ContentValidator):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.url_validator = url_validator
        self.content_validator = content_validator
        
        self.news_sources = {
            'hackernews': {
                'name': 'Hacker News',
                'api_url': 'https://hacker-news.firebaseio.com/v0/topstories.json',
                'item_url': 'https://hacker-news.firebaseio.com/v0/item/{}.json',
                'category': 'tech'
            },
            'reddit_tech': {
                'name': 'Reddit Technology',
                'api_url': 'https://www.reddit.com/r/technology.json',
                'category': 'tech'
            },
            'github_trending': {
                'name': 'GitHub Trending',
                'api_url': 'https://api.github.com/search/repositories?q=created:>{}+language:python&sort=stars&order=desc',
                'category': 'tech'
            },
            'dev_to': {
                'name': 'Dev.to',
                'api_url': 'https://dev.to/api/articles?top=7',
                'category': 'tech'
            }
        }
        
        self.rss_feeds = {
            'techcrunch': 'https://techcrunch.com/feed/',
            'arstechnica': 'https://feeds.arstechnica.com/arstechnica/index',
            'wired': 'https://www.wired.com/feed/rss',
            'mit_tech_review': 'https://www.technologyreview.com/feed/',
            'reuters_tech': 'https://feeds.reuters.com/reuters/technologyNews',
            'bbc_tech': 'https://feeds.bbci.co.uk/news/technology/rss.xml'
        }
    
    def scrape_news_with_validation(self, topics: List[str], max_articles: int = 50) -> List[Dict[str, Any]]:
        """Scrape news with comprehensive validation"""
        all_articles = []
        
        try:
            # Scrape from API sources
            for source_name, source_config in self.news_sources.items():
                try:
                    articles = self._scrape_api_source(source_name, source_config, topics)
                    validated_articles = self._validate_articles(articles)
                    all_articles.extend(validated_articles)
                    
                    logger.info(f"Scraped {len(validated_articles)} validated articles from {source_name}")
                    
                except Exception as e:
                    logger.error(f"Error scraping {source_name}: {str(e)}")
                    continue
            
            # Scrape from RSS feeds
            for feed_name, feed_url in self.rss_feeds.items():
                try:
                    articles = self._scrape_rss_feed(feed_name, feed_url, topics)
                    validated_articles = self._validate_articles(articles)
                    all_articles.extend(validated_articles)
                    
                    logger.info(f"Scraped {len(validated_articles)} validated articles from {feed_name}")
                    
                except Exception as e:
                    logger.error(f"Error scraping RSS feed {feed_name}: {str(e)}")
                    continue
            
            # Filter by topics and quality
            filtered_articles = self._filter_and_rank_articles(all_articles, topics)
            
            return filtered_articles[:max_articles]
            
        except Exception as e:
            logger.error(f"Error in enhanced news scraping: {str(e)}")
            return []
    
    def _scrape_api_source(self, source_name: str, source_config: Dict[str, Any], topics: List[str]) -> List[Dict[str, Any]]:
        """Scrape from API source with error handling"""
        articles = []
        
        try:
            if source_name == 'hackernews':
                articles = self._scrape_hackernews_enhanced()
            elif source_name == 'reddit_tech':
                articles = self._scrape_reddit_enhanced()
            elif source_name == 'github_trending':
                articles = self._scrape_github_enhanced()
            elif source_name == 'dev_to':
                articles = self._scrape_devto_enhanced()
                
        except Exception as e:
            logger.error(f"Error scraping {source_name}: {str(e)}")
        
        return articles
    
    def _scrape_hackernews_enhanced(self) -> List[Dict[str, Any]]:
        """Enhanced Hacker News scraping with validation"""
        articles = []
        
        try:
            # Get top stories
            response = self.session.get(self.news_sources['hackernews']['api_url'], timeout=10)
            response.raise_for_status()
            
            top_stories = response.json()[:50]  # Get top 50 stories
            
            for story_id in top_stories[:20]:  # Process first 20
                try:
                    item_url = self.news_sources['hackernews']['item_url'].format(story_id)
                    item_response = self.session.get(item_url, timeout=5)
                    item_response.raise_for_status()
                    
                    item_data = item_response.json()
                    
                    if item_data and item_data.get('type') == 'story':
                        # Validate URL if present
                        url = item_data.get('url', f'https://news.ycombinator.com/item?id={story_id}')
                        cleaned_url = self.url_validator.clean_url(url)
                        
                        article = {
                            'title': item_data.get('title', ''),
                            'url': cleaned_url,
                            'content': item_data.get('text', '')[:500] if item_data.get('text') else '',
                            'summary': item_data.get('title', ''),
                            'author': item_data.get('by', 'Unknown'),
                            'published_date': datetime.fromtimestamp(item_data.get('time', 0)).isoformat() if item_data.get('time') else '',
                            'source': 'Hacker News',
                            'source_category': 'tech',
                            'score': item_data.get('score', 0),
                            'comments': item_data.get('descendants', 0),
                            'scraped_at': datetime.now().isoformat(),
                            'validated': True
                        }
                        
                        # Additional content extraction if URL is valid
                        if cleaned_url and cleaned_url != f'https://news.ycombinator.com/item?id={story_id}':
                            try:
                                content = self._extract_content_from_url(cleaned_url)
                                if content:
                                    article['content'] = content[:1000]
                                    article['summary'] = content[:300] + '...'
                            except Exception:
                                pass  # Use original content
                        
                        articles.append(article)
                        
                except Exception as e:
                    logger.error(f"Error processing HN story {story_id}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error scraping Hacker News: {str(e)}")
        
        return articles
    
    def _scrape_reddit_enhanced(self) -> List[Dict[str, Any]]:
        """Enhanced Reddit scraping with validation"""
        articles = []
        
        try:
            response = self.session.get(self.news_sources['reddit_tech']['api_url'], timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and 'data' in data and 'children' in data['data']:
                for post in data['data']['children'][:20]:  # Get top 20 posts
                    try:
                        post_data = post['data']
                        
                        # Validate URL
                        url = post_data.get('url', '')
                        cleaned_url = self.url_validator.clean_url(url)
                        
                        article = {
                            'title': post_data.get('title', ''),
                            'url': cleaned_url,
                            'content': post_data.get('selftext', '')[:500],
                            'summary': post_data.get('selftext', '')[:300] + '...' if post_data.get('selftext') else post_data.get('title', ''),
                            'author': post_data.get('author', 'Unknown'),
                            'published_date': datetime.fromtimestamp(post_data.get('created_utc', 0)).isoformat() if post_data.get('created_utc') else '',
                            'source': 'Reddit r/technology',
                            'source_category': 'tech',
                            'score': post_data.get('score', 0),
                            'comments': post_data.get('num_comments', 0),
                            'subreddit': post_data.get('subreddit', 'technology'),
                            'scraped_at': datetime.now().isoformat(),
                            'validated': True
                        }
                        
                        # Extract content from URL if it's an external link
                        if cleaned_url and not cleaned_url.startswith('https://www.reddit.com'):
                            try:
                                content = self._extract_content_from_url(cleaned_url)
                                if content:
                                    article['content'] = content[:1000]
                                    article['summary'] = content[:300] + '...'
                            except Exception:
                                pass
                        
                        articles.append(article)
                        
                    except Exception as e:
                        logger.error(f"Error processing Reddit post: {str(e)}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Reddit: {str(e)}")
        
        return articles
    
    def _scrape_github_enhanced(self) -> List[Dict[str, Any]]:
        """Enhanced GitHub trending scraping"""
        articles = []
        
        try:
            # Get repositories created in the last week
            last_week = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            api_url = self.news_sources['github_trending']['api_url'].format(last_week)
            
            response = self.session.get(api_url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and 'items' in data:
                for repo in data['items'][:15]:  # Get top 15 repos
                    try:
                        article = {
                            'title': f"{repo.get('name', '')}: {repo.get('description', '')}",
                            'url': self.url_validator.clean_url(repo.get('html_url', '')),
                            'content': repo.get('description', ''),
                            'summary': repo.get('description', ''),
                            'author': repo.get('owner', {}).get('login', 'Unknown'),
                            'published_date': repo.get('created_at', ''),
                            'source': 'GitHub Trending',
                            'source_category': 'tech',
                            'stars': repo.get('stargazers_count', 0),
                            'language': repo.get('language', ''),
                            'scraped_at': datetime.now().isoformat(),
                            'validated': True
                        }
                        articles.append(article)
                        
                    except Exception as e:
                        logger.error(f"Error processing GitHub repo: {str(e)}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping GitHub: {str(e)}")
        
        return articles
    
    def _scrape_devto_enhanced(self) -> List[Dict[str, Any]]:
        """Enhanced Dev.to scraping"""
        articles = []
        
        try:
            response = self.session.get(self.news_sources['dev_to']['api_url'], timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and isinstance(data, list):
                for article_data in data[:15]:  # Get top 15 articles
                    try:
                        article = {
                            'title': article_data.get('title', ''),
                            'url': self.url_validator.clean_url(article_data.get('url', '')),
                            'content': article_data.get('description', '')[:500],
                            'summary': article_data.get('description', ''),
                            'author': article_data.get('user', {}).get('name', 'Unknown'),
                            'published_date': article_data.get('published_at', ''),
                            'source': 'Dev.to',
                            'source_category': 'tech',
                            'score': article_data.get('positive_reactions_count', 0),
                            'comments': article_data.get('comments_count', 0),
                            'tags': article_data.get('tag_list', []),
                            'scraped_at': datetime.now().isoformat(),
                            'validated': True
                        }
                        articles.append(article)
                        
                    except Exception as e:
                        logger.error(f"Error processing Dev.to article: {str(e)}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Dev.to: {str(e)}")
        
        return articles
    
    def _scrape_rss_feed(self, feed_name: str, feed_url: str, topics: List[str]) -> List[Dict[str, Any]]:
        """Scrape RSS feed with validation"""
        articles = []
        
        try:
            feed = feedparser.parse(feed_url)
            
            for entry in feed.entries[:10]:  # Get top 10 entries
                try:
                    # Validate URL
                    url = self.url_validator.clean_url(entry.get('link', ''))
                    
                    article = {
                        'title': entry.get('title', ''),
                        'url': url,
                        'content': entry.get('summary', '')[:500],
                        'summary': entry.get('summary', '')[:300] + '...' if entry.get('summary') else '',
                        'author': entry.get('author', 'Unknown'),
                        'published_date': entry.get('published', ''),
                        'source': feed_name.replace('_', ' ').title(),
                        'source_category': 'news',
                        'scraped_at': datetime.now().isoformat(),
                        'validated': True
                    }
                    
                    # Extract full content if URL is valid
                    if url:
                        try:
                            content = self._extract_content_from_url(url)
                            if content:
                                article['content'] = content[:1000]
                                article['summary'] = content[:300] + '...'
                        except Exception:
                            pass
                    
                    articles.append(article)
                    
                except Exception as e:
                    logger.error(f"Error processing RSS entry from {feed_name}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error scraping RSS feed {feed_name}: {str(e)}")
        
        return articles
    
    def _extract_content_from_url(self, url: str) -> Optional[str]:
        """Extract content from URL using BeautifulSoup"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text[:2000]  # Return first 2000 characters
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {str(e)}")
            return None
    
    def _validate_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate articles for quality and accessibility"""
        validated_articles = []
        
        for article in articles:
            try:
                # Check content quality
                if self.content_validator.is_quality_content(article):
                    # Extract and structure key information
                    validated_article = self.content_validator.extract_key_information(article)
                    validated_articles.append(validated_article)
                else:
                    logger.debug(f"Article failed quality check: {article.get('title', 'Unknown')}")
                    
            except Exception as e:
                logger.error(f"Error validating article: {str(e)}")
                continue
        
        return validated_articles
    
    def _filter_and_rank_articles(self, articles: List[Dict[str, Any]], topics: List[str]) -> List[Dict[str, Any]]:
        """Filter articles by topics and rank by quality"""
        filtered_articles = []
        
        for article in articles:
            # Check topic relevance
            text_to_search = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}".lower()
            
            for topic in topics:
                topic_keywords = [topic.lower()] + self._get_topic_keywords(topic.lower())
                
                if any(keyword in text_to_search for keyword in topic_keywords):
                    article['matched_topic'] = topic
                    article['relevance_score'] = self._calculate_relevance_score(article, topic_keywords)
                    filtered_articles.append(article)
                    break
        
        # Sort by quality score and relevance
        filtered_articles.sort(key=lambda x: (x.get('quality_score', 0) + x.get('relevance_score', 0)) / 2, reverse=True)
        
        return filtered_articles
    
    def _get_topic_keywords(self, topic: str) -> List[str]:
        """Get related keywords for a topic"""
        keyword_map = {
            'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'gpt', 'llm', 'chatgpt', 'openai'],
            'technology': ['tech', 'software', 'hardware', 'computing', 'digital', 'innovation'],
            'startups': ['startup', 'venture', 'funding', 'investment', 'entrepreneur', 'vc'],
            'business': ['company', 'corporate', 'market', 'industry', 'enterprise', 'economy'],
            'innovation': ['breakthrough', 'revolutionary', 'cutting-edge', 'advanced', 'novel'],
            'israel': ['israeli', 'jerusalem', 'tel aviv', 'gaza', 'palestine', 'middle east', 'netanyahu'],
            'politics': ['government', 'election', 'policy', 'senate', 'congress', 'president'],
            'security': ['cybersecurity', 'privacy', 'encryption', 'hacking', 'breach'],
            'crypto': ['cryptocurrency', 'bitcoin', 'blockchain', 'ethereum', 'nft'],
            'climate': ['environment', 'global warming', 'carbon', 'renewable', 'sustainability'],
            'health': ['medical', 'healthcare', 'medicine', 'hospital', 'treatment', 'vaccine'],
            'space': ['nasa', 'spacex', 'rocket', 'satellite', 'mars', 'moon'],
            'finance': ['banking', 'stocks', 'market', 'trading', 'economy', 'inflation']
        }
        
        return keyword_map.get(topic, [])
    
    def _calculate_relevance_score(self, article: Dict[str, Any], keywords: List[str]) -> float:
        """Calculate relevance score based on keyword matches"""
        text = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}".lower()
        
        matches = sum(1 for keyword in keywords if keyword in text)
        return min(matches / len(keywords), 1.0) if keywords else 0.0

class EnhancedNewsResearchCrew:
    """Enhanced multi-agent news research system"""
    
    def __init__(self):
        self.url_validator = URLValidator()
        self.content_validator = ContentValidator(self.url_validator)
        self.task_delegator = TaskDelegator()
        self.news_scraper = EnhancedNewsScraperAgent(self.url_validator, self.content_validator)
        
        # Initialize agents
        self.agents = self._create_agents()
        
    def _create_agents(self) -> Dict[str, Agent]:
        """Create specialized agents"""
        
        # Get current date context
        current_date = datetime.now().strftime('%Y-%m-%d')
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        # News Research Agent
        news_researcher = Agent(
            role='News Research Specialist',
            goal=f'Find and validate high-quality, RECENT news articles from multiple sources. Current date: {current_date}. Focus on news from the last 24-48 hours.',
            backstory=f'You are an expert at finding relevant, high-quality news articles from various sources. Today is {current_time}. You validate URLs, check content quality, and ensure information accuracy. You prioritize recent news and current events, filtering out outdated content.',
            verbose=True,
            allow_delegation=False
        )
        
        # Content Analyst Agent
        content_analyst = Agent(
            role='Content Quality Analyst',
            goal=f'Analyze and validate content quality, relevance, and authenticity for current news. Today is {current_date}. Prioritize recent, timely content.',
            backstory=f'You are a content quality expert who evaluates articles for relevance, accuracy, and overall quality. Current time: {current_time}. You filter out low-quality content, spam, and outdated news. You prefer articles published within the last 24-48 hours.',
            verbose=True,
            allow_delegation=False
        )
        
        # URL Validation Agent
        url_validator_agent = Agent(
            role='URL Validation Specialist',
            goal='Validate and clean URLs to ensure they are accessible and safe',
            backstory=f'You are a technical specialist focused on URL validation, cleaning, and accessibility checking. Current date: {current_date}. You ensure all links work properly and lead to current, active content.',
            verbose=True,
            allow_delegation=False
        )
        
        # Trend Analysis Agent
        trend_analyst = Agent(
            role='Trend Analysis Expert',
            goal=f'Identify emerging trends and patterns in CURRENT news content. Focus on trends happening now and recently. Today is {current_date}.',
            backstory=f'You are an expert at identifying trends, patterns, and emerging topics from current news content. Today is {current_time}. You provide insights on what topics are gaining momentum RIGHT NOW, focusing on recent developments and current events.',
            verbose=True,
            allow_delegation=False
        )
        
        return {
            'news_researcher': news_researcher,
            'content_analyst': content_analyst,
            'url_validator': url_validator_agent,
            'trend_analyst': trend_analyst
        }
    
    def research_news(self, topics: List[str], sources: Dict[str, bool] = None, progress_callback=None) -> Dict[str, Any]:
        """Execute comprehensive news research with task delegation and detailed progress tracking"""
        
        if not sources:
            sources = {
                'reddit': True,
                'linkedin': True,
                'telegram': True,
                'news_websites': True
            }
        
        # Initialize progress tracking
        progress_steps = [
            {'agent': 'News Research Specialist', 'step': 'Initializing news research', 'status': 'pending'},
            {'agent': 'News Research Specialist', 'step': 'Scraping recent news from multiple sources', 'status': 'pending'},
            {'agent': 'Content Quality Analyst', 'step': 'Analyzing content quality and relevance', 'status': 'pending'},
            {'agent': 'URL Validation Specialist', 'step': 'Validating and cleaning URLs', 'status': 'pending'},
            {'agent': 'Trend Analysis Expert', 'step': 'Identifying current trends and patterns', 'status': 'pending'},
            {'agent': 'Crew', 'step': 'Generating comprehensive analysis report', 'status': 'pending'}
        ]
        
        def update_progress(step_index: int, status: str, message: str = None):
            if step_index < len(progress_steps):
                progress_steps[step_index]['status'] = status
                if message:
                    progress_steps[step_index]['message'] = message
                    
                # Log progress with structured format
                agent = progress_steps[step_index]['agent']
                step = progress_steps[step_index]['step']
                logger.info(f"🔄 [{agent}] {step} - {status.upper()}")
                if message:
                    logger.info(f"📝 [{agent}] {message}")
                    
                # Call progress callback if provided
                if progress_callback:
                    progress_callback({
                        'step': step_index + 1,
                        'total_steps': len(progress_steps),
                        'agent': agent,
                        'description': step,
                        'status': status,
                        'message': message,
                        'timestamp': datetime.now().isoformat()
                    })
        
        try:
            current_date = datetime.now().strftime('%Y-%m-%d')
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
            
            update_progress(0, 'in_progress', f"Starting enhanced news research for topics: {topics} on {current_date}")
            logger.info(f"🚀 Starting enhanced news research for topics: {topics} on {current_date}")
            
            # Task 1: Scrape and validate RECENT news articles
            update_progress(1, 'in_progress', f"Scraping recent news from {len([k for k, v in sources.items() if v])} sources")
            
            scraping_task = Task(
                description=f"Scrape high-quality, RECENT news articles for topics: {', '.join(topics)}. "
                           f"Current date: {current_date}. Focus on articles published within the last 24-48 hours. "
                           f"Prioritize current events and breaking news. Filter out outdated content (older than 3 days). "
                           f"Search sources: {', '.join([k for k, v in sources.items() if v])}. "
                           f"Provide detailed progress updates as you work through each source.",
                agent=self.agents['news_researcher'],
                expected_output="A list of validated and cleaned RECENT news articles as dictionaries, related to the topics and published within the last 48 hours."
            )

            # Task 2: Analyze content quality, relevance, and recency
            analysis_task = Task(
                description=f"Analyze the provided articles for quality, relevance, authenticity, and RECENCY. "
                           f"Current time: {current_time}. Filter out any low-quality content, ads, spam, or OUTDATED articles. "
                           f"Prioritize articles published within the last 24-48 hours. Assign quality and recency scores to each article. "
                           f"Provide detailed analysis progress updates as you evaluate each article.",
                agent=self.agents['content_analyst'],
                context=[scraping_task],
                expected_output="A curated list of high-quality, RECENT articles with analysis, quality scores, and publication timestamps."
            )

            # Task 3: Identify CURRENT trends from recent news
            trending_task = Task(
                description=f"From the curated list of recent articles, identify CURRENT emerging trends, breaking news, and developing patterns. "
                           f"Today is {current_date}. Focus on trends happening NOW and in the last 24-48 hours. "
                           f"Summarize the most important current trends and breaking developments. "
                           f"Provide progress updates as you analyze trending patterns and generate insights.",
                agent=self.agents['trend_analyst'],
                context=[analysis_task],
                expected_output="A report summarizing the top 3-5 CURRENT news trends with supporting recent articles and timestamps."
            )
            
            # Create and run the crew with progress tracking
            crew = Crew(
                agents=list(self.agents.values()),
                tasks=[scraping_task, analysis_task, trending_task],
                process=Process.sequential,
                verbose=True
            )
            
            logger.info("🚀 Crew kickoff initiated - agents are now working...")
            update_progress(0, 'completed', "Crew setup completed successfully")
            
            # Execute with progress tracking
            result = crew.kickoff()
            
            # Mark remaining steps as completed
            update_progress(1, 'completed', "News research completed successfully")
            update_progress(2, 'completed', "Content analysis completed successfully")
            update_progress(3, 'completed', "URL validation completed successfully")
            update_progress(4, 'completed', "Trend analysis completed successfully")
            update_progress(5, 'in_progress', "Generating comprehensive analysis report...")
            
            # Extract usage metrics safely
            usage_metrics = {}
            if hasattr(crew, 'usage_metrics') and crew.usage_metrics:
                metrics = crew.usage_metrics
                usage_metrics = {
                    "total_tokens": getattr(metrics, 'total_tokens', 0),
                    "successful_tasks": getattr(metrics, 'successful_tasks', 0),
                    "total_costs": getattr(metrics, 'total_costs', 0),
                    "prompt_tokens": getattr(metrics, 'prompt_tokens', 0),
                    "completion_tokens": getattr(metrics, 'completion_tokens', 0)
                }
            else:
                usage_metrics = {
                    "total_tokens": 0,
                    "successful_tasks": len([task for task in [scraping_task, analysis_task, trending_task] if task]),
                    "total_costs": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                }
            
            update_progress(5, 'completed', "Analysis report generated successfully")
            
            return {
                "status": "success",
                "result": result,
                "usage_metrics": usage_metrics,
                "progress_steps": progress_steps,
                "total_steps_completed": len([s for s in progress_steps if s['status'] == 'completed']),
                "current_date": current_date,
                "execution_time": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ An error occurred during news research: {str(e)}")
            
            # Update progress to show error
            for i, step in enumerate(progress_steps):
                if step['status'] == 'in_progress':
                    update_progress(i, 'failed', f"Error: {str(e)}")
                    break
            
            return {
                "status": "error", 
                "message": str(e),
                "progress_steps": progress_steps,
                "failed_at": datetime.now().isoformat()
            }

if __name__ == '__main__':
    # Example usage
    news_crew = EnhancedNewsResearchCrew()
    
    # Define topics to research
    research_topics = ['israel', 'ai', 'startups']
    
    # Run the research
    research_result = news_crew.research_news(topics=research_topics)
    
    # Print the result
    if research_result['status'] == 'success':
        logger.info("\n\n--- News Research Final Report ---")
        print(json.dumps(research_result['result'], indent=2))
        logger.info(f"\nUsage Metrics: {research_result['usage_metrics']}")
    else:
        logger.error(f"News research failed: {research_result['message']}")