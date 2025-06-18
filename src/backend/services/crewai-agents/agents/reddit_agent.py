import os
import json
from typing import List, Dict, Any
from datetime import datetime, timedelta
import praw
from crewai import Agent
try:
    from crewai_tools import BaseTool
except ImportError:
    try:
        from crewai.tools import BaseTool
    except ImportError:
        # Fallback for older versions - more complete implementation
        class BaseTool:
            def __init__(self):
                self.name = getattr(self, 'name', 'Tool')
                self.description = getattr(self, 'description', 'A tool')
                # Allow any attribute to be set
                
            def __setattr__(self, name, value):
                object.__setattr__(self, name, value)
                
            def __getattr__(self, name):
                # Return None for any missing attribute instead of raising AttributeError
                return None
                
            def _run(self, *args, **kwargs):
                pass
import logging

logger = logging.getLogger(__name__)

class RedditScraperTool(BaseTool):
    """Tool for scraping Reddit posts and discussions"""
    
    name: str = "Reddit Scraper"
    description: str = "Scrapes Reddit for trending posts and discussions on specified topics"
    
    def __init__(self):
        super().__init__()
        # Initialize with defensive attribute setting
        self._init_attributes()
        
    def __setattr__(self, name, value):
        # Override setattr to ensure compatibility with CrewAI's tool system
        if hasattr(self, '_initialized') and self._initialized:
            object.__setattr__(self, name, value)
        else:
            object.__setattr__(self, name, value)
            
    def __getattr__(self, name):
        # Provide default values for missing attributes to prevent CrewAI errors
        if name == 'reddit':
            return getattr(self, '_reddit_instance', None)
        elif name == 'is_authenticated':
            return getattr(self, '_is_authenticated', False)
        elif name == '_credentials_available':
            return getattr(self, '_creds_available', False)
        else:
            # Return None for any missing attribute instead of raising AttributeError
            return None
        
    def _init_attributes(self):
        """Initialize attributes with defensive programming"""
        # Use internal names to avoid CrewAI conflicts
        self._reddit_instance = None
        self._is_authenticated = False
        self._creds_available = False
        self._initialized = False
        
        # Initialize Reddit API client with proper error handling
        reddit_client_id = os.getenv('REDDIT_CLIENT_ID')
        reddit_client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        reddit_user_agent = os.getenv('REDDIT_USER_AGENT', 'SynapseAgent/1.0')
        
        # Debug environment variables for Render deployment
        logger.info(f"🔍 Reddit credentials check (Render):")
        logger.info(f"   CLIENT_ID: {'✅ Set' if reddit_client_id else '❌ Missing'}")
        logger.info(f"   CLIENT_SECRET: {'✅ Set' if reddit_client_secret else '❌ Missing'}")
        logger.info(f"   USER_AGENT: {reddit_user_agent}")
        
        if not reddit_client_id or not reddit_client_secret:
            logger.error("❌ Reddit API credentials not configured in Render environment")
            logger.error("   Please check Render dashboard environment variables:")
            logger.error("   - REDDIT_CLIENT_ID should be set")
            logger.error("   - REDDIT_CLIENT_SECRET should be set")
            self._creds_available = False
            return
        
        self._creds_available = True
        
        try:
            logger.info("🔄 Attempting Reddit API connection...")
            reddit_instance = praw.Reddit(
                client_id=reddit_client_id,
                client_secret=reddit_client_secret,
                user_agent=reddit_user_agent,
                check_for_async=False,
                # Add rate limiting configuration
                ratelimit_seconds=1,  # Wait 1 second between requests
                timeout=30  # Increase timeout to 30 seconds
            )
            
            # Test connection with a more robust approach
            logger.info("🧪 Testing Reddit API connection...")
            try:
                # Test with read-only access first
                reddit_instance.read_only = True
                test_subreddit = reddit_instance.subreddit('technology')
                
                # Try to get subreddit info (lightweight test)
                subreddit_info = test_subreddit.display_name
                logger.info(f"🧪 Basic connection test successful: r/{subreddit_info}")
                
                # Try to fetch one post to verify API access
                test_posts = list(test_subreddit.hot(limit=1))
                logger.info(f"🧪 API access test successful - got {len(test_posts)} test posts")
                
                if test_posts:
                    test_post = test_posts[0]
                    logger.info(f"🧪 Sample post: {test_post.title[:50]}... (score: {test_post.score})")
                
            except Exception as test_error:
                logger.error(f"❌ Reddit API test failed: {str(test_error)}")
                raise test_error
            
            # Use internal assignment for CrewAI compatibility
            self._reddit_instance = reddit_instance
            self._is_authenticated = True
            self._initialized = True
            logger.info("✅ Reddit API connection and authentication successful")
        except Exception as e:
            logger.error(f"❌ Reddit API connection failed: {str(e)}")
            logger.error(f"   Exception type: {type(e).__name__}")
            logger.error(f"   Error details: {str(e)}")
            self._reddit_instance = None
            self._is_authenticated = False
    
    def _run(self, topics: str = "technology,AI,startups") -> str:
        """Scrape Reddit for posts on specified topics"""
        
        try:
            # Use internal attributes for CrewAI compatibility
            reddit_instance = self._reddit_instance
            is_authenticated = self._is_authenticated
            credentials_available = self._creds_available
            
            logger.info(f"🔍 Reddit scraper status check:")
            logger.info(f"   Credentials available: {credentials_available}")
            logger.info(f"   Reddit instance: {reddit_instance is not None}")
            logger.info(f"   Is authenticated: {is_authenticated}")
            
            topics_list = [topic.strip() for topic in topics.split(',')]
            all_posts = []
            
            # ALWAYS try alternative sources first before checking credentials
            logger.info("🔄 Starting with Reddit JSON endpoints (no auth required)...")
            alternative_posts = self._get_reddit_json_data(topics_list)
            
            if alternative_posts:
                all_posts.extend(alternative_posts)
                logger.info(f"✅ Got {len(alternative_posts)} posts from Reddit JSON endpoints")
            
            # Only try authenticated API if we have credentials AND didn't get enough posts
            if credentials_available and reddit_instance and is_authenticated and len(all_posts) < 10:
                logger.info("🔄 Trying authenticated Reddit API for more posts...")
                api_posts = self._fetch_authenticated_posts(reddit_instance, topics_list)
                all_posts.extend(api_posts)
            
            # Sort by score and return top posts
            all_posts.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            logger.info(f"🎯 Reddit scraping completed: {len(all_posts)} total posts")
            
            # If no posts found, return clear message
            if len(all_posts) == 0:
                logger.warning("⚠️ No Reddit posts found for the given topics")
                return json.dumps({
                    'success': False,
                    'source': 'reddit',
                    'topics': topics_list,
                    'posts_found': 0,
                    'posts': [],
                    'timestamp': datetime.now().isoformat(),
                    'message': 'No Reddit posts found matching your topics. Try broader search terms or check Reddit availability.',
                    'data_sources': {
                        'json_endpoints': 0,
                        'authenticated_api': 0
                    }
                })
            
            result = {
                'success': True,
                'source': 'reddit',
                'topics': topics_list,
                'posts_found': len(all_posts),
                'posts': all_posts[:20],  # Return top 20 posts
                'timestamp': datetime.now().isoformat(),
                'data_sources': {
                    'json_endpoints': len(alternative_posts) if 'alternative_posts' in locals() else 0,
                    'authenticated_api': len(api_posts) if 'api_posts' in locals() else 0
                }
            }
            
            return json.dumps(result, indent=2)
            
        except Exception as e:
            error_result = {
                'success': False,
                'source': 'reddit',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            logger.error(f"Reddit scraping failed: {str(e)}")
            return json.dumps(error_result, indent=2)
    
    def _get_reddit_json_data(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Get Reddit data directly from JSON endpoints (no auth required)"""
        posts = []
        
        try:
            import requests
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            # Direct JSON endpoints that don't require authentication
            subreddit_endpoints = {
                'technology': 'https://www.reddit.com/r/technology/hot.json?limit=10',
                'programming': 'https://www.reddit.com/r/programming/hot.json?limit=10',
                'artificial': 'https://www.reddit.com/r/artificial/hot.json?limit=10',
                'MachineLearning': 'https://www.reddit.com/r/MachineLearning/hot.json?limit=10',
                'startups': 'https://www.reddit.com/r/startups/hot.json?limit=10'
            }
            
            for topic in topics[:3]:  # Limit topics
                relevant_subreddits = []
                topic_lower = topic.lower()
                
                # Map topics to subreddits
                if 'tech' in topic_lower or 'technology' in topic_lower:
                    relevant_subreddits.extend(['technology', 'programming'])
                elif 'ai' in topic_lower or 'artificial' in topic_lower:
                    relevant_subreddits.extend(['artificial', 'MachineLearning'])
                elif 'startup' in topic_lower:
                    relevant_subreddits.append('startups')
                else:
                    relevant_subreddits.append('technology')  # Default
                
                for subreddit in set(relevant_subreddits):
                    if subreddit in subreddit_endpoints:
                        try:
                            logger.info(f"📡 Fetching r/{subreddit} JSON directly...")
                            response = requests.get(
                                subreddit_endpoints[subreddit],
                                headers=headers,
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                data = response.json()
                                if data and 'data' in data and 'children' in data['data']:
                                    for post in data['data']['children'][:5]:  # 5 posts per subreddit
                                        try:
                                            post_data = post['data']
                                            
                                            # Extract post data
                                            posts.append({
                                                'title': post_data.get('title', ''),
                                                'content': post_data.get('selftext', '')[:500],
                                                'url': post_data.get('url', ''),
                                                'reddit_url': f"https://reddit.com{post_data.get('permalink', '')}",
                                                'author': post_data.get('author', 'Unknown'),
                                                'subreddit': subreddit,
                                                'score': post_data.get('score', 0),
                                                'num_comments': post_data.get('num_comments', 0),
                                                'created_utc': datetime.fromtimestamp(
                                                    post_data.get('created_utc', 0)
                                                ).isoformat() if post_data.get('created_utc') else '',
                                                'source': 'reddit_json',
                                                'source_type': 'direct_json'
                                            })
                                        except Exception as e:
                                            logger.debug(f"Error parsing post: {e}")
                                            continue
                                            
                            # Add delay to respect rate limits
                            import time
                            time.sleep(0.5)
                            
                        except Exception as e:
                            logger.debug(f"Failed to fetch r/{subreddit}: {e}")
                            continue
            
            logger.info(f"✅ Got {len(posts)} posts from Reddit JSON endpoints")
            return posts
            
        except Exception as e:
            logger.error(f"Reddit JSON fetch failed: {e}")
            return []
    
    def _fetch_authenticated_posts(self, reddit_instance, topics_list: List[str]) -> List[Dict[str, Any]]:
        """Fetch posts using authenticated Reddit API"""
        posts = []
        
        # (Move the existing authenticated fetching logic here from the main _run method)
        # This is the code that was originally in _run that uses reddit_instance
        
        return posts

class RedditScraperAgent:
    """Reddit scraper agent for news gathering"""
    
    def __init__(self, llm=None):
        self.tool = RedditScraperTool()
        self.agent = Agent(
            role='Reddit News Scraper',
            goal='Scrape Reddit for trending technology and business discussions',
            backstory="""You are a specialized Reddit scraper agent focused on gathering 
            trending discussions and news from technology, AI, startup, and business subreddits. 
            You excel at identifying high-quality posts with meaningful engagement and filtering 
            out noise to surface valuable insights and discussions.""",
            tools=[self.tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )