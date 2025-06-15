import os
import json
import requests
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging
import re
import urllib.parse as urlparse

logger = logging.getLogger(__name__)

class SimpleNewsScraperTool:
    """Simplified news scraper using only requests and basic parsing"""
    
    def __init__(self):
        # News sources with RSS feeds that return JSON or simple text
        self.news_sources = {
            'hackernews': {
                'name': 'Hacker News',
                'api_url': 'https://hacker-news.firebaseio.com/v0/topstories.json',
                'item_url': 'https://hacker-news.firebaseio.com/v0/item/{}.json',
                'category': 'tech'
            },
            'reddit_api': {
                'name': 'Reddit Technology',
                'api_url': 'https://www.reddit.com/r/technology.json',
                'category': 'tech'
            },
            'github_trending': {
                'name': 'GitHub Trending',
                'api_url': 'https://api.github.com/search/repositories?q=created:>{}+language:python&sort=stars&order=desc',
                'category': 'tech'
            }
        }
        
        # RSS feeds that might work with simple parsing
        self.rss_sources = {
            'techcrunch': 'https://techcrunch.com/feed/',
            'arstechnica': 'https://feeds.arstechnica.com/arstechnica/index',
            'wired': 'https://www.wired.com/feed/rss',
            'mit_tech_review': 'https://www.technologyreview.com/feed/',
            'reuters_tech': 'https://feeds.reuters.com/reuters/technologyNews',
            'bbc_tech': 'https://feeds.bbci.co.uk/news/technology/rss.xml'
        }
    
    def scrape_news(self, topics: str = "technology,AI,startups") -> str:
        """Scrape news using simple HTTP requests"""
        
        try:
            topics_list = [topic.strip().lower() for topic in topics.split(',')]
            all_articles = []
            
            logger.info(f"Scraping news for topics: {topics_list}")
            
            # Try Hacker News API first (most reliable)
            hn_articles = self._scrape_hackernews()
            all_articles.extend(hn_articles)
            
            # Try Reddit API
            reddit_articles = self._scrape_reddit_api()
            all_articles.extend(reddit_articles)
            
            # Try GitHub trending
            github_articles = self._scrape_github_trending()
            all_articles.extend(github_articles)
            
            # Filter by topics
            filtered_articles = self._filter_articles_by_topics(all_articles, topics_list)
            
            result = {
                'success': True,
                'source': 'simple_news_scraper',
                'topics': topics_list,
                'articles_found': len(filtered_articles),
                'articles': filtered_articles[:25],
                'timestamp': datetime.now().isoformat()
            }
            
            return json.dumps(result, indent=2)
            
        except Exception as e:
            error_result = {
                'success': False,
                'source': 'simple_news_scraper',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            logger.error(f"Simple news scraping failed: {str(e)}")
            return json.dumps(error_result, indent=2)
    
    def _scrape_hackernews(self) -> List[Dict[str, Any]]:
        """Scrape Hacker News using their API"""
        
        articles = []
        
        try:
            headers = {'User-Agent': 'SynapseNewsBot/1.0'}
            
            # Get top stories
            response = requests.get(self.news_sources['hackernews']['api_url'], 
                                  headers=headers, timeout=10)
            response.raise_for_status()
            
            top_stories = response.json()[:30]  # Get top 30 stories
            
            for story_id in top_stories[:10]:  # Process first 10
                try:
                    item_url = self.news_sources['hackernews']['item_url'].format(story_id)
                    item_response = requests.get(item_url, headers=headers, timeout=5)
                    item_response.raise_for_status()
                    
                    item_data = item_response.json()
                    
                    if item_data and item_data.get('type') == 'story':
                        article = {
                            'title': item_data.get('title', ''),
                            'url': item_data.get('url', f'https://news.ycombinator.com/item?id={story_id}'),
                            'content': item_data.get('text', '')[:500] if item_data.get('text') else '',
                            'summary': item_data.get('title', ''),  # Use title as summary
                            'author': item_data.get('by', 'Unknown'),
                            'published_date': datetime.fromtimestamp(item_data.get('time', 0)).isoformat() if item_data.get('time') else '',
                            'source': 'Hacker News',
                            'source_category': 'tech',
                            'score': item_data.get('score', 0),
                            'comments': item_data.get('descendants', 0),
                            'scraped_at': datetime.now().isoformat()
                        }
                        articles.append(article)
                        
                except Exception as e:
                    logger.error(f"Error processing HN story {story_id}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error scraping Hacker News: {str(e)}")
        
        return articles
    
    def _scrape_reddit_api(self) -> List[Dict[str, Any]]:
        """Scrape Reddit using their JSON API"""
        
        articles = []
        
        try:
            headers = {'User-Agent': 'SynapseNewsBot/1.0'}
            
            response = requests.get(self.news_sources['reddit_api']['api_url'], 
                                  headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and 'data' in data and 'children' in data['data']:
                for post in data['data']['children'][:15]:  # Get top 15 posts
                    try:
                        post_data = post['data']
                        
                        article = {
                            'title': post_data.get('title', ''),
                            'url': post_data.get('url', ''),
                            'content': post_data.get('selftext', '')[:500],
                            'summary': post_data.get('title', ''),
                            'author': post_data.get('author', 'Unknown'),
                            'published_date': datetime.fromtimestamp(post_data.get('created_utc', 0)).isoformat() if post_data.get('created_utc') else '',
                            'source': 'Reddit r/technology',
                            'source_category': 'tech',
                            'score': post_data.get('score', 0),
                            'comments': post_data.get('num_comments', 0),
                            'subreddit': post_data.get('subreddit', 'technology'),
                            'scraped_at': datetime.now().isoformat()
                        }
                        articles.append(article)
                        
                    except Exception as e:
                        logger.error(f"Error processing Reddit post: {str(e)}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Reddit: {str(e)}")
        
        return articles
    
    def _scrape_github_trending(self) -> List[Dict[str, Any]]:
        """Scrape GitHub trending repos"""
        
        articles = []
        
        try:
            headers = {'User-Agent': 'SynapseNewsBot/1.0'}
            
            # Get repositories created in the last week
            last_week = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            api_url = self.news_sources['github_trending']['api_url'].format(last_week)
            
            response = requests.get(api_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data and 'items' in data:
                for repo in data['items'][:10]:  # Get top 10 repos
                    try:
                        article = {
                            'title': f"{repo.get('name', '')}: {repo.get('description', '')}",
                            'url': repo.get('html_url', ''),
                            'content': repo.get('description', ''),
                            'summary': repo.get('description', ''),
                            'author': repo.get('owner', {}).get('login', 'Unknown'),
                            'published_date': repo.get('created_at', ''),
                            'source': 'GitHub Trending',
                            'source_category': 'tech',
                            'stars': repo.get('stargazers_count', 0),
                            'language': repo.get('language', ''),
                            'scraped_at': datetime.now().isoformat()
                        }
                        articles.append(article)
                        
                    except Exception as e:
                        logger.error(f"Error processing GitHub repo: {str(e)}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping GitHub: {str(e)}")
        
        return articles
    
    def _filter_articles_by_topics(self, articles: List[Dict[str, Any]], topics: List[str]) -> List[Dict[str, Any]]:
        """Filter articles based on topic relevance"""
        
        filtered_articles = []
        
        for article in articles:
            # Check if any topic appears in title, summary, or content
            text_to_search = f"{article.get('title', '')} {article.get('summary', '')} {article.get('content', '')}".lower()
            
            for topic in topics:
                if topic in text_to_search or any(keyword in text_to_search for keyword in self._get_topic_keywords(topic)):
                    article['matched_topic'] = topic
                    filtered_articles.append(article)
                    break
        
        return filtered_articles
    
    def _get_topic_keywords(self, topic: str) -> List[str]:
        """Get related keywords for a topic"""
        
        keyword_map = {
            'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'neural', 'gpt', 'llm'],
            'technology': ['tech', 'software', 'hardware', 'computing', 'digital'],
            'startups': ['startup', 'venture', 'funding', 'investment', 'entrepreneur'],
            'business': ['company', 'corporate', 'market', 'industry', 'enterprise'],
            'innovation': ['breakthrough', 'revolutionary', 'cutting-edge', 'advanced', 'novel']
        }
        
        return keyword_map.get(topic.lower(), [])

class SimpleNewsScraperAgent:
    """Simple news scraper agent using basic HTTP requests"""
    
    def __init__(self):
        self.tool = SimpleNewsScraperTool()
    
    def scrape_news(self, topics: str = "technology,AI,startups") -> str:
        return self.tool.scrape_news(topics)