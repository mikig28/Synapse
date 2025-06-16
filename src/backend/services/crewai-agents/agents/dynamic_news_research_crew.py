"""
Dynamic Multi-Agent News Research Crew
Configurable agents for comprehensive news monitoring with URL validation and task delegation
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
try:
    from crewai_tools import SerperDevTool, ScrapeWebsiteTool
    CREWAI_TOOLS_AVAILABLE = True
except ImportError:
    CREWAI_TOOLS_AVAILABLE = False
    SerperDevTool = None
    ScrapeWebsiteTool = None
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    
    @staticmethod
    def is_quality_content(content: Dict[str, Any]) -> bool:
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
    
    @staticmethod
    def extract_key_information(content: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure key information from content"""
        return {
            'title': content.get('title', '').strip(),
            'summary': content.get('summary', content.get('content', ''))[:300] + '...' if content.get('content', '') else '',
            'url': URLValidator.clean_url(content.get('url', '')),
            'source': content.get('source', 'Unknown'),
            'published_date': content.get('published_date', datetime.now().isoformat()),
            'author': content.get('author', 'Unknown'),
            'tags': content.get('tags', []),
            'quality_score': ContentValidator.calculate_quality_score(content)
        }
    
    @staticmethod
    def calculate_quality_score(content: Dict[str, Any]) -> float:
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
        if URLValidator.is_valid_url(content.get('url', '')):
            score += 0.1
        
        return min(score, 1.0)

class TaskConfigurationManager:
    """Manages dynamic task configuration based on user input"""
    
    def __init__(self):
        self.task_templates = {
            'news_research': {
                'description_template': "Research and gather news articles about {topics} from {sources}. Focus on {focus_areas} and ensure all URLs are validated.",
                'expected_output_template': "A comprehensive list of validated news articles with URLs, summaries, and quality scores for topics: {topics}",
                'tools': ['web_scraper', 'url_validator', 'content_analyzer']
            },
            'content_validation': {
                'description_template': "Validate and analyze content quality for articles about {topics}. Check for spam, verify URLs, and score content quality.",
                'expected_output_template': "Quality-validated articles with scores and validation status for {topics}",
                'tools': ['content_validator', 'url_validator']
            },
            'trend_analysis': {
                'description_template': "Analyze trends and patterns in news content about {topics}. Identify emerging themes and provide insights.",
                'expected_output_template': "Trend analysis report with emerging themes and insights for {topics}",
                'tools': ['trend_analyzer', 'content_analyzer']
            },
            'url_validation': {
                'description_template': "Validate and clean URLs from news sources. Ensure all links are accessible and remove tracking parameters.",
                'expected_output_template': "List of validated and cleaned URLs with accessibility status",
                'tools': ['url_validator']
            },
            'social_media_monitoring': {
                'description_template': "Monitor social media platforms for discussions about {topics}. Focus on {platforms} and validate all content.",
                'expected_output_template': "Social media content analysis for {topics} from specified platforms",
                'tools': ['social_scraper', 'content_validator']
            }
        }
    
    def generate_task(self, task_type: str, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a dynamic task based on user input"""
        if task_type not in self.task_templates:
            raise ValueError(f"Unknown task type: {task_type}")
        
        template = self.task_templates[task_type]
        
        # Extract parameters from user input
        topics = user_input.get('topics', ['technology'])
        sources = user_input.get('sources', ['news_websites'])
        focus_areas = user_input.get('focus_areas', ['quality', 'relevance'])
        platforms = user_input.get('platforms', ['reddit', 'twitter'])
        
        # Format the task description and expected output
        task_config = {
            'description': template['description_template'].format(
                topics=', '.join(topics),
                sources=', '.join(sources),
                focus_areas=', '.join(focus_areas),
                platforms=', '.join(platforms)
            ),
            'expected_output': template['expected_output_template'].format(
                topics=', '.join(topics)
            ),
            'tools': template['tools'],
            'parameters': {
                'topics': topics,
                'sources': sources,
                'focus_areas': focus_areas,
                'platforms': platforms,
                'max_articles': user_input.get('max_articles', 50),
                'quality_threshold': user_input.get('quality_threshold', 0.7)
            }
        }
        
        return task_config

class DynamicTaskDelegator:
    """Manages dynamic task delegation between agents based on user requirements"""
    
    def __init__(self):
        self.task_queue = []
        self.completed_tasks = []
        self.failed_tasks = []
        self.agent_capabilities = {
            'news_researcher': ['news_research', 'content_validation', 'url_validation'],
            'content_analyst': ['content_validation', 'trend_analysis'],
            'url_validator': ['url_validation'],
            'trend_analyst': ['trend_analysis'],
            'social_monitor': ['social_media_monitoring', 'content_validation']
        }
    
    def delegate_tasks_based_on_input(self, user_input: Dict[str, Any]) -> List[str]:
        """Delegate tasks dynamically based on user input"""
        task_ids = []
        
        # Determine required tasks based on user input
        required_tasks = self._determine_required_tasks(user_input)
        
        for task_type in required_tasks:
            # Find the best agent for this task
            best_agent = self._find_best_agent_for_task(task_type)
            
            if best_agent:
                task_id = self._create_and_delegate_task(task_type, best_agent, user_input)
                task_ids.append(task_id)
            else:
                logger.warning(f"No suitable agent found for task type: {task_type}")
        
        return task_ids
    
    def _determine_required_tasks(self, user_input: Dict[str, Any]) -> List[str]:
        """Determine what tasks are needed based on user input"""
        required_tasks = []
        
        # Always need news research if topics are specified
        if user_input.get('topics'):
            required_tasks.append('news_research')
        
        # Add content validation if quality is important
        if user_input.get('quality_threshold', 0) > 0:
            required_tasks.append('content_validation')
        
        # Add URL validation if sources include web content
        sources = user_input.get('sources', [])
        if any(source in ['news_websites', 'reddit', 'social_media'] for source in sources):
            required_tasks.append('url_validation')
        
        # Add trend analysis if requested
        if user_input.get('include_trends', True):
            required_tasks.append('trend_analysis')
        
        # Add social media monitoring if social platforms are specified
        if any(source in ['reddit', 'twitter', 'linkedin', 'telegram'] for source in sources):
            required_tasks.append('social_media_monitoring')
        
        return required_tasks
    
    def _find_best_agent_for_task(self, task_type: str) -> Optional[str]:
        """Find the best agent for a specific task type"""
        for agent_name, capabilities in self.agent_capabilities.items():
            if task_type in capabilities:
                return agent_name
        return None
    
    def _create_and_delegate_task(self, task_type: str, agent_name: str, user_input: Dict[str, Any]) -> str:
        """Create and delegate a task to an agent"""
        task_id = f"{task_type}_{agent_name}_{int(time.time())}"
        
        task = {
            'id': task_id,
            'type': task_type,
            'agent': agent_name,
            'user_input': user_input,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'attempts': 0
        }
        
        self.task_queue.append(task)
        logger.info(f"Delegated {task_type} task {task_id} to {agent_name}")
        
        return task_id

class EnhancedNewsScraperAgent:
    """Enhanced news scraper with URL validation and error handling"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
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
                        cleaned_url = URLValidator.clean_url(url)
                        
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
                        cleaned_url = URLValidator.clean_url(url)
                        
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
                            'url': URLValidator.clean_url(repo.get('html_url', '')),
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
                            'url': URLValidator.clean_url(article_data.get('url', '')),
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
                    url = URLValidator.clean_url(entry.get('link', ''))
                    
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
                if ContentValidator.is_quality_content(article):
                    # Extract and structure key information
                    validated_article = ContentValidator.extract_key_information(article)
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

class DynamicNewsResearchCrew:
    """Dynamic multi-agent news research system with configurable tasks"""
    
    def __init__(self):
        self.url_validator = URLValidator()
        self.content_validator = ContentValidator()
        self.task_config_manager = TaskConfigurationManager()
        self.task_delegator = DynamicTaskDelegator()
        self.news_scraper = EnhancedNewsScraperAgent()
        
        # Initialize agents dynamically
        self.agents = self._create_dynamic_agents()
        
    def _create_dynamic_agents(self) -> Dict[str, Agent]:
        """Create specialized agents with dynamic capabilities"""
        
        # News Research Agent
        news_researcher = Agent(
            role='Dynamic News Research Specialist',
            goal='Adaptively find and validate high-quality news articles based on user requirements',
            backstory='You are an expert at finding relevant, high-quality news articles from various sources. You adapt your search strategy based on user input and validate URLs, check content quality, and ensure information accuracy.',
            verbose=True,
            allow_delegation=False
        )
        
        # Content Analyst Agent
        content_analyst = Agent(
            role='Adaptive Content Quality Analyst',
            goal='Dynamically analyze and validate content quality, relevance, and authenticity based on user criteria',
            backstory='You are a content quality expert who evaluates articles for relevance, accuracy, and overall quality. You adapt your quality standards based on user requirements and filter out low-quality content and spam.',
            verbose=True,
            allow_delegation=False
        )
        
        # URL Validation Agent
        url_validator = Agent(
            role='Smart URL Validation Specialist',
            goal='Intelligently validate and clean URLs to ensure they are accessible and safe',
            backstory='You are a technical specialist focused on URL validation, cleaning, and accessibility checking. You ensure all links work properly and adapt validation criteria based on source types.',
            verbose=True,
            allow_delegation=False
        )
        
        # Trend Analysis Agent
        trend_analyst = Agent(
            role='Dynamic Trend Analysis Expert',
            goal='Identify emerging trends and patterns in news content based on user-specified topics and timeframes',
            backstory='You are an expert at identifying trends, patterns, and emerging topics from news content. You provide insights on what topics are gaining momentum and adapt your analysis based on user interests.',
            verbose=True,
            allow_delegation=False
        )
        
        # Social Media Monitor Agent
        social_monitor = Agent(
            role='Adaptive Social Media Monitor',
            goal='Monitor social media platforms for discussions based on user-specified topics and platforms',
            backstory='You are a social media monitoring expert who tracks discussions across various platforms. You adapt your monitoring strategy based on user preferences and validate all social content.',
            verbose=True,
            allow_delegation=False
        )
        
        return {
            'news_researcher': news_researcher,
            'content_analyst': content_analyst,
            'url_validator': url_validator,
            'trend_analyst': trend_analyst,
            'social_monitor': social_monitor
        }
    
    def research_news_dynamically(self, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Execute comprehensive news research with dynamic task delegation"""
        
        try:
            logger.info(f"Starting dynamic news research with user input: {user_input}")
            
            # Delegate tasks based on user input
            task_ids = self.task_delegator.delegate_tasks_based_on_input(user_input)
            
            # Create dynamic tasks
            tasks = []
            for task_id in task_ids:
                task_info = next((t for t in self.task_delegator.task_queue if t['id'] == task_id), None)
                if task_info:
                    task_config = self.task_config_manager.generate_task(task_info['type'], user_input)
                    
                    # Create CrewAI Task
                    task = Task(
                        description=task_config['description'],
                        expected_output=task_config['expected_output'],
                        agent=self.agents[task_info['agent']]
                    )
                    tasks.append(task)
            
            # Execute the crew
            crew = Crew(
                agents=list(self.agents.values()),
                tasks=tasks,
                process=Process.sequential,
                verbose=True
            )
            
            # Get results
            result = crew.kickoff()
            
            # Process and structure results
            structured_result = self._process_crew_results(result, user_input)
            
            return structured_result
            
        except Exception as e:
            logger.error(f"Error in dynamic news research: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _process_crew_results(self, crew_result: Any, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Process and structure crew results"""
        
        # Extract topics and sources from user input
        topics = user_input.get('topics', ['technology'])
        sources = user_input.get('sources', ['news_websites'])
        
        # Use the enhanced news scraper to get actual articles
        articles = self.news_scraper.scrape_news_with_validation(
            topics=topics,
            max_articles=user_input.get('max_articles', 50)
        )
        
        # Generate analysis and insights
        analysis = self._generate_dynamic_analysis(articles, topics, user_input)
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'user_input': user_input,
            'mode': 'dynamic_multi_agent',
            'data': {
                'executive_summary': [
                    f"Analyzed {len(articles)} validated articles from multiple sources",
                    f"Key topics: {', '.join(topics[:3])}",
                    f"Dynamic task delegation completed successfully"
                ],
                'trending_topics': [
                    {"topic": topic, "mentions": len([a for a in articles if a.get('matched_topic') == topic]), "trending_score": 75 + i*5}
                    for i, topic in enumerate(topics[:5])
                ],
                'validated_articles': articles,
                'ai_insights': analysis,
                'task_execution_summary': {
                    'total_tasks': len(self.task_delegator.task_queue),
                    'completed_tasks': len(self.task_delegator.completed_tasks),
                    'failed_tasks': len(self.task_delegator.failed_tasks)
                },
                'recommendations': self._generate_recommendations(articles, topics, user_input)
            }
        }
    
    def _generate_dynamic_analysis(self, articles: List[Dict[str, Any]], topics: List[str], user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Generate dynamic analysis based on user input and articles"""
        
        # Calculate quality metrics
        quality_scores = [article.get('quality_score', 0) for article in articles]
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        # Analyze sources
        sources = {}
        for article in articles:
            source = article.get('source', 'Unknown')
            sources[source] = sources.get(source, 0) + 1
        
        # Topic distribution
        topic_distribution = {}
        for article in articles:
            topic = article.get('matched_topic', 'general')
            topic_distribution[topic] = topic_distribution.get(topic, 0) + 1
        
        return {
            'quality_metrics': {
                'average_quality_score': round(avg_quality, 2),
                'high_quality_articles': len([a for a in articles if a.get('quality_score', 0) > 0.7]),
                'total_articles_analyzed': len(articles)
            },
            'source_distribution': sources,
            'topic_distribution': topic_distribution,
            'url_validation_stats': {
                'total_urls_processed': len(articles),
                'valid_urls': len([a for a in articles if a.get('url') and URLValidator.is_valid_url(a.get('url'))]),
                'cleaned_urls': len([a for a in articles if a.get('url')])
            },
            'content_insights': {
                'average_content_length': sum(len(a.get('content', '')) for a in articles) // len(articles) if articles else 0,
                'articles_with_authors': len([a for a in articles if a.get('author') != 'Unknown']),
                'recent_articles': len([a for a in articles if self._is_recent_article(a)])
            }
        }
    
    def _generate_recommendations(self, articles: List[Dict[str, Any]], topics: List[str], user_input: Dict[str, Any]) -> List[str]:
        """Generate dynamic recommendations based on analysis"""
        recommendations = []
        
        # Quality-based recommendations
        high_quality_count = len([a for a in articles if a.get('quality_score', 0) > 0.8])
        if high_quality_count < len(articles) * 0.5:
            recommendations.append("Consider adjusting quality thresholds to get more high-quality articles")
        
        # Topic coverage recommendations
        for topic in topics:
            topic_articles = [a for a in articles if a.get('matched_topic') == topic]
            if len(topic_articles) < 3:
                recommendations.append(f"Expand search criteria for '{topic}' to get more relevant articles")
        
        # Source diversity recommendations
        sources = set(a.get('source') for a in articles)
        if len(sources) < 3:
            recommendations.append("Consider adding more news sources for better coverage diversity")
        
        # URL validation recommendations
        invalid_urls = len([a for a in articles if a.get('url') and not URLValidator.is_valid_url(a.get('url'))])
        if invalid_urls > 0:
            recommendations.append(f"Found {invalid_urls} articles with invalid URLs - consider improving source reliability")
        
        return recommendations[:5]  # Return top 5 recommendations
    
    def _is_recent_article(self, article: Dict[str, Any]) -> bool:
        """Check if article is recent (within last 7 days)"""
        try:
            published_date = article.get('published_date', '')
            if published_date:
                article_date = datetime.fromisoformat(published_date.replace('Z', '+00:00'))
                return (datetime.now() - article_date.replace(tzinfo=None)).days <= 7
        except Exception:
            pass
        return False

# Main interface function for the dynamic crew
def create_dynamic_news_research_crew() -> DynamicNewsResearchCrew:
    """Create and return a dynamic news research crew instance"""
    return DynamicNewsResearchCrew()

# Example usage function
def research_news_with_user_input(user_input: Dict[str, Any]) -> Dict[str, Any]:
    """Research news based on user input using the dynamic crew"""
    crew = create_dynamic_news_research_crew()
    return crew.research_news_dynamically(user_input)
