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
            logger.warning("⚠️ Reddit API credentials not configured - using fallback JSON scraping")
            logger.info("   Using public Reddit JSON endpoints instead of API")
            self._creds_available = False
            # Don't return here - continue with fallback method
        else:
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
            
            # Prioritize authenticated API if available
            if credentials_available and reddit_instance and is_authenticated:
                logger.info("🔄 Starting with authenticated Reddit API (preferred method)...")
                api_posts = self._fetch_authenticated_posts(reddit_instance, topics_list)
                if api_posts:
                    all_posts.extend(api_posts)
                    logger.info(f"✅ Got {len(api_posts)} posts from authenticated Reddit API")
            
            # Fall back to JSON endpoints if we need more posts or auth failed
            if len(all_posts) < 10:
                logger.info("🔄 Trying Reddit JSON endpoints for additional posts...")
                alternative_posts = self._get_reddit_json_data(topics_list)
                
                if alternative_posts:
                    # Only add posts that aren't already in our list
                    existing_ids = {post.get('id') for post in all_posts}
                    new_posts = [p for p in alternative_posts if p.get('id') not in existing_ids]
                    all_posts.extend(new_posts)
                    logger.info(f"✅ Added {len(new_posts)} additional posts from Reddit JSON endpoints")
            
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
        """Get Reddit data directly from JSON endpoints (no auth required) with enhanced retry logic"""
        posts = []
        
        try:
            import requests
            import random
            import time
            
            # Enhanced user agent rotation to avoid detection
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
            ]
            
            # Direct JSON endpoints - expanded with better coverage including sports
            subreddit_endpoints = {
                'technology': ['https://www.reddit.com/r/technology/hot.json?limit=15', 'https://www.reddit.com/r/tech/hot.json?limit=10'],
                'programming': ['https://www.reddit.com/r/programming/hot.json?limit=15', 'https://www.reddit.com/r/coding/hot.json?limit=10'],
                'artificial': ['https://www.reddit.com/r/artificial/hot.json?limit=15', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=10'],
                'MachineLearning': ['https://www.reddit.com/r/MachineLearning/hot.json?limit=15', 'https://www.reddit.com/r/artificial/hot.json?limit=10'],
                'startups': ['https://www.reddit.com/r/startups/hot.json?limit=15', 'https://www.reddit.com/r/entrepreneur/hot.json?limit=10'],
                'business': ['https://www.reddit.com/r/business/hot.json?limit=15', 'https://www.reddit.com/r/investing/hot.json?limit=10'],
                'crypto': ['https://www.reddit.com/r/cryptocurrency/hot.json?limit=15', 'https://www.reddit.com/r/bitcoin/hot.json?limit=10'],
                'gaming': ['https://www.reddit.com/r/gaming/hot.json?limit=15', 'https://www.reddit.com/r/pcgaming/hot.json?limit=10'],
                
                # Sports subreddits
                'sports': ['https://www.reddit.com/r/sports/hot.json?limit=15', 'https://www.reddit.com/r/nfl/hot.json?limit=10'],
                'football': ['https://www.reddit.com/r/soccer/hot.json?limit=15', 'https://www.reddit.com/r/football/hot.json?limit=10'],
                'soccer': ['https://www.reddit.com/r/soccer/hot.json?limit=15', 'https://www.reddit.com/r/football/hot.json?limit=10'],
                'basketball': ['https://www.reddit.com/r/nba/hot.json?limit=15', 'https://www.reddit.com/r/basketball/hot.json?limit=10'],
                'baseball': ['https://www.reddit.com/r/baseball/hot.json?limit=15', 'https://www.reddit.com/r/mlb/hot.json?limit=10'],
                'hockey': ['https://www.reddit.com/r/hockey/hot.json?limit=15', 'https://www.reddit.com/r/nhl/hot.json?limit=10'],
                'tennis': ['https://www.reddit.com/r/tennis/hot.json?limit=15'],
                'golf': ['https://www.reddit.com/r/golf/hot.json?limit=15']
            }
            
            # Enhanced topic mapping including sports
            topic_mapping = {
                'tech': ['technology', 'programming'],
                'technology': ['technology', 'programming'],
                'ai': ['artificial', 'MachineLearning'],
                'artificial': ['artificial', 'MachineLearning'],
                'machine learning': ['MachineLearning', 'artificial'],
                'startup': ['startups', 'business'],
                'startups': ['startups', 'business'],
                'business': ['business', 'startups'],
                'crypto': ['crypto'],
                'cryptocurrency': ['crypto'],
                'bitcoin': ['crypto'],
                'blockchain': ['crypto'],
                'gaming': ['gaming'],
                'games': ['gaming'],
                
                # Sports mapping
                'sport': ['sports'],
                'sports': ['sports'],
                'football': ['football', 'soccer'],
                'soccer': ['soccer', 'football'],
                'basketball': ['basketball'],
                'baseball': ['baseball'],
                'hockey': ['hockey'],
                'tennis': ['tennis'],
                'golf': ['golf']
            }
            
            logger.info(f"🔍 Starting Reddit JSON fetch for topics: {topics}")
            
            for topic in topics[:4]:  # Increased topic limit
                relevant_subreddits = []
                topic_lower = topic.lower()
                
                # Enhanced topic mapping
                for keyword, subreddits in topic_mapping.items():
                    if keyword in topic_lower:
                        relevant_subreddits.extend(subreddits)
                        break
                
                # Fallback to technology if no match
                if not relevant_subreddits:
                    relevant_subreddits.append('technology')
                
                logger.info(f"📊 Topic '{topic}' mapped to subreddits: {relevant_subreddits}")
                
                for subreddit in set(relevant_subreddits):
                    if subreddit in subreddit_endpoints:
                        endpoints = subreddit_endpoints[subreddit]
                        
                        for endpoint_url in endpoints:
                            success = False
                            for attempt in range(3):  # 3 retry attempts per endpoint
                                try:
                                    # Random user agent and headers
                                    headers = {
                                        'User-Agent': random.choice(user_agents),
                                        'Accept': 'application/json, text/plain, */*',
                                        'Accept-Language': 'en-US,en;q=0.9',
                                        'Accept-Encoding': 'gzip, deflate, br',
                                        'DNT': '1',
                                        'Connection': 'keep-alive',
                                        'Upgrade-Insecure-Requests': '1',
                                    }
                                    
                                    logger.info(f"📡 Attempt {attempt + 1}: Fetching {endpoint_url}")
                                    
                                    response = requests.get(
                                        endpoint_url,
                                        headers=headers,
                                        timeout=15,  # Increased timeout
                                        allow_redirects=True
                                    )
                                    
                                    logger.info(f"📊 Response: {response.status_code} for r/{subreddit}")
                                    
                                    if response.status_code == 200:
                                        try:
                                            data = response.json()
                                            if data and 'data' in data and 'children' in data['data']:
                                                children = data['data']['children']
                                                logger.info(f"📋 Found {len(children)} posts in r/{subreddit}")
                                                
                                                for post in children[:8]:  # Increased posts per subreddit
                                                    try:
                                                        post_data = post['data']
                                                        
                                                        # Skip removed, deleted, or empty posts
                                                        if post_data.get('removed_by_category') or post_data.get('title') == '[deleted]':
                                                            continue
                                                        
                                                        # Enhanced post data extraction
                                                        reddit_post = {
                                                            'id': post_data.get('id', ''),
                                                            'title': post_data.get('title', ''),
                                                            'content': post_data.get('selftext', '')[:800],  # Increased content length
                                                            'url': post_data.get('url', ''),
                                                            'reddit_url': f"https://reddit.com{post_data.get('permalink', '')}",
                                                            'author': post_data.get('author', 'Unknown'),
                                                            'subreddit': subreddit,
                                                            'score': post_data.get('score', 0),
                                                            'num_comments': post_data.get('num_comments', 0),
                                                            'upvote_ratio': post_data.get('upvote_ratio', 0),
                                                            'created_utc': datetime.fromtimestamp(
                                                                post_data.get('created_utc', 0)
                                                            ).isoformat() if post_data.get('created_utc') else '',
                                                            'domain': post_data.get('domain', ''),
                                                            'flair': post_data.get('link_flair_text', ''),
                                                            'source': 'reddit_json',
                                                            'source_type': 'direct_json',
                                                            'simulated': False,
                                                            'is_video': post_data.get('is_video', False),
                                                            'post_hint': post_data.get('post_hint', '')
                                                        }
                                                        
                                                        # Filter for quality content
                                                        if reddit_post['score'] >= 10 or reddit_post['num_comments'] >= 5:
                                                            posts.append(reddit_post)
                                                            logger.debug(f"✅ Added post: {reddit_post['title'][:50]}...")
                                                        
                                                    except Exception as e:
                                                        logger.debug(f"Error parsing individual post: {e}")
                                                        continue
                                                
                                                success = True
                                                break  # Success, no need to retry
                                            else:
                                                logger.warning(f"⚠️ Invalid JSON structure from r/{subreddit}")
                                        except ValueError as e:
                                            logger.error(f"❌ JSON decode error for r/{subreddit}: {e}")
                                    
                                    elif response.status_code == 429:
                                        logger.warning(f"⚠️ Rate limited by Reddit for r/{subreddit}")
                                        # Exponential backoff for rate limits
                                        wait_time = (2 ** attempt) + random.uniform(0, 1)
                                        logger.info(f"⏱️ Waiting {wait_time:.1f}s before retry...")
                                        time.sleep(wait_time)
                                        continue
                                    
                                    elif response.status_code == 403:
                                        logger.warning(f"⚠️ Access forbidden for r/{subreddit} (subreddit may be private)")
                                        break  # Don't retry 403s
                                    
                                    else:
                                        logger.warning(f"⚠️ HTTP {response.status_code} for r/{subreddit}")
                                        
                                except requests.exceptions.Timeout:
                                    logger.warning(f"⏱️ Timeout fetching r/{subreddit}, attempt {attempt + 1}")
                                except requests.exceptions.ConnectionError:
                                    logger.warning(f"🔌 Connection error for r/{subreddit}, attempt {attempt + 1}")
                                except Exception as e:
                                    logger.error(f"❌ Unexpected error for r/{subreddit}: {e}")
                                
                                # Wait between retries
                                if attempt < 2:  # Don't wait after last attempt
                                    time.sleep(random.uniform(1, 3))
                            
                            # If we got posts from this endpoint, try next subreddit
                            if success:
                                break
                            
                            # Wait between different endpoints for same subreddit
                            time.sleep(random.uniform(0.5, 1.5))
                        
                        # Wait between different subreddits
                        time.sleep(random.uniform(1, 2))
            
            # Remove duplicates based on ID
            unique_posts = {}
            for post in posts:
                post_id = post.get('id', post.get('title', ''))
                if post_id not in unique_posts:
                    unique_posts[post_id] = post
            
            final_posts = list(unique_posts.values())
            
            # Sort by score and recency
            final_posts.sort(key=lambda x: (x.get('score', 0), x.get('created_utc', '')), reverse=True)
            
            logger.info(f"✅ Reddit JSON fetch complete: {len(final_posts)} unique posts collected")
            
            if len(final_posts) == 0:
                logger.warning("⚠️ No Reddit posts collected - possible rate limiting or network issues")
                logger.info("💡 Try again in a few minutes, or check Reddit status")
            
            return final_posts[:20]  # Return top 20 posts
            
        except Exception as e:
            logger.error(f"❌ Reddit JSON fetch failed: {e}")
            logger.error(f"📋 Stack trace: {e.__class__.__name__}: {str(e)}")
            return []
    
    def _fetch_authenticated_posts(self, reddit_instance, topics_list: List[str]) -> List[Dict[str, Any]]:
        """Fetch posts using authenticated Reddit API with dynamic subreddit discovery for ANY topic"""
        posts = []
        
        if not reddit_instance:
            logger.warning("❌ No authenticated Reddit instance available")
            return posts
        
        try:
            logger.info(f"🔐 Using authenticated Reddit API for dynamic topics: {topics_list}")
            logger.info("🔍 No hardcoded mappings - discovering subreddits dynamically")
            
            # Track which subreddits we've already processed
            processed_subreddits = set()
            
            for topic in topics_list:
                try:
                    logger.info(f"🔍 Dynamically searching for subreddits about: {topic}")
                    
                    # Method 1: Search for subreddits by exact name match
                    try:
                        matching_subreddits = reddit_instance.subreddits.search_by_name(topic, include_nsfw=False)
                        for subreddit in list(matching_subreddits)[:3]:  # Limit to 3 per topic
                            if subreddit.display_name.lower() not in processed_subreddits:
                                processed_subreddits.add(subreddit.display_name.lower())
                                logger.info(f"📋 Found exact match: r/{subreddit.display_name}")
                    except Exception as e:
                        logger.debug(f"Exact name search for '{topic}' - no results")
                    
                    # Method 2: Search for subreddits by topic/description
                    try:
                        search_results = reddit_instance.subreddits.search(topic, limit=10)
                        for subreddit in search_results:
                            if subreddit.display_name.lower() not in processed_subreddits:
                                # Check if subreddit is active (has recent posts)
                                try:
                                    recent_posts = list(subreddit.hot(limit=1))
                                    if recent_posts:
                                        processed_subreddits.add(subreddit.display_name.lower())
                                        logger.info(f"📋 Found related active subreddit: r/{subreddit.display_name}")
                                except:
                                    pass
                    except Exception as e:
                        logger.debug(f"Topic search for '{topic}' failed: {e}")
                    
                    # Method 3: Try variations of the topic name
                    topic_variations = [
                        topic.lower(),
                        topic.lower().replace(' ', ''),
                        topic.lower().replace(' ', '_'),
                        topic.lower().replace('-', ''),
                        topic.lower().replace('_', ''),
                    ]
                    
                    # Add plurals/singulars
                    if topic.lower().endswith('s'):
                        topic_variations.append(topic.lower()[:-1])
                    else:
                        topic_variations.append(topic.lower() + 's')
                    
                    # Add common prefixes/suffixes
                    topic_variations.extend([
                        f"{topic.lower()}news",
                        f"{topic.lower()}_news",
                        f"the{topic.lower()}",
                        f"{topic.lower()}community",
                        f"{topic.lower()}discussion"
                    ])
                    
                    for variation in topic_variations:
                        if variation not in processed_subreddits and len(processed_subreddits) < 10:
                            try:
                                subreddit = reddit_instance.subreddit(variation)
                                # Test if subreddit exists and is active
                                _ = subreddit.display_name
                                subscriber_count = subreddit.subscribers
                                if subscriber_count and subscriber_count > 100:  # Active subreddit
                                    processed_subreddits.add(variation)
                                    logger.info(f"📋 Found variation: r/{variation} ({subscriber_count:,} subscribers)")
                            except Exception:
                                continue
                    
                    # Method 4: Search r/all for the topic to find where it's discussed
                    if len(processed_subreddits) < 3:
                        try:
                            all_search = reddit_instance.subreddit('all').search(topic, limit=20)
                            for post in all_search:
                                subreddit_name = str(post.subreddit).lower()
                                if subreddit_name not in processed_subreddits and len(processed_subreddits) < 10:
                                    processed_subreddits.add(subreddit_name)
                                    logger.info(f"📋 Found from r/all search: r/{subreddit_name}")
                        except Exception as e:
                            logger.debug(f"r/all search failed: {e}")
                    
                except Exception as e:
                    logger.error(f"Topic discovery failed for '{topic}': {e}")
                    continue
            
            # If no subreddits found, search r/all directly
            if not processed_subreddits:
                logger.info("🌐 No specific subreddits found - will search r/all")
                processed_subreddits.add('all')
            
            # Now fetch posts from all discovered subreddits
            logger.info(f"📊 Fetching from {len(processed_subreddits)} dynamically discovered subreddits")
            
            for subreddit_name in processed_subreddits:
                try:
                    subreddit = reddit_instance.subreddit(subreddit_name)
                    logger.info(f"🔄 Fetching posts from r/{subreddit_name}")
                    
                    # Get hot posts
                    hot_posts = list(subreddit.hot(limit=10))
                    
                    for post in hot_posts:
                        try:
                            # Skip stickied posts (usually rules/announcements)
                            if post.stickied:
                                continue
                            
                            # Extract post data
                            post_data = {
                                'id': post.id,
                                'title': post.title,
                                'content': post.selftext[:1000] if post.selftext else '',
                                'url': post.url,
                                'reddit_url': f"https://reddit.com{post.permalink}",
                                'author': str(post.author) if post.author else 'Unknown',
                                'subreddit': subreddit_name,
                                'score': post.score,
                                'num_comments': post.num_comments,
                                'upvote_ratio': post.upvote_ratio,
                                'created_utc': datetime.fromtimestamp(post.created_utc).isoformat(),
                                'domain': post.domain if hasattr(post, 'domain') else '',
                                'flair': post.link_flair_text if hasattr(post, 'link_flair_text') else '',
                                'source': 'reddit_api',
                                'source_type': 'authenticated_api',
                                'simulated': False,
                                'is_video': post.is_video if hasattr(post, 'is_video') else False,
                                'over_18': post.over_18 if hasattr(post, 'over_18') else False
                            }
                            
                            # Quality filter
                            if post_data['score'] >= 5 or post_data['num_comments'] >= 3:
                                posts.append(post_data)
                                logger.debug(f"✅ Added post: {post_data['title'][:50]}...")
                            
                        except Exception as e:
                            logger.debug(f"Error processing post: {e}")
                            continue
                    
                    # Also get top posts from the past week for more content
                    try:
                        top_posts = list(subreddit.top(time_filter='week', limit=5))
                        for post in top_posts:
                            if post.id not in [p['id'] for p in posts]:  # Avoid duplicates
                                post_data = {
                                    'id': post.id,
                                    'title': post.title,
                                    'content': post.selftext[:1000] if post.selftext else '',
                                    'url': post.url,
                                    'reddit_url': f"https://reddit.com{post.permalink}",
                                    'author': str(post.author) if post.author else 'Unknown',
                                    'subreddit': subreddit_name,
                                    'score': post.score,
                                    'num_comments': post.num_comments,
                                    'created_utc': datetime.fromtimestamp(post.created_utc).isoformat(),
                                    'source': 'reddit_api',
                                    'source_type': 'authenticated_api',
                                    'simulated': False
                                }
                                
                                if post_data['score'] >= 10:  # Higher threshold for older posts
                                    posts.append(post_data)
                    except Exception as e:
                        logger.debug(f"Error fetching top posts: {e}")
                    
                except Exception as e:
                    logger.warning(f"Failed to fetch from r/{subreddit_name}: {e}")
                    continue
                
                # Rate limiting between subreddits
                import time
                time.sleep(1)
            
            # If we didn't find enough specific subreddits, search r/all
            if len(posts) < 10 and len(processed_subreddits) < 3:
                logger.info("📡 Searching r/all for topic-related posts")
                try:
                    all_subreddit = reddit_instance.subreddit('all')
                    
                    # Search r/all for each topic
                    for topic in topics_list[:2]:  # Limit to avoid rate limits
                        try:
                            search_results = all_subreddit.search(topic, sort='hot', time_filter='week', limit=10)
                            
                            for post in search_results:
                                post_data = {
                                    'id': post.id,
                                    'title': post.title,
                                    'content': post.selftext[:1000] if post.selftext else '',
                                    'url': post.url,
                                    'reddit_url': f"https://reddit.com{post.permalink}",
                                    'author': str(post.author) if post.author else 'Unknown',
                                    'subreddit': str(post.subreddit),
                                    'score': post.score,
                                    'num_comments': post.num_comments,
                                    'created_utc': datetime.fromtimestamp(post.created_utc).isoformat(),
                                    'source': 'reddit_api',
                                    'source_type': 'r_all_search',
                                    'simulated': False,
                                    'matched_topic': topic
                                }
                                
                                if post_data['score'] >= 50:  # Higher threshold for r/all
                                    posts.append(post_data)
                                    logger.debug(f"✅ Added r/all post: {post_data['title'][:50]}...")
                        
                        except Exception as e:
                            logger.debug(f"r/all search failed for {topic}: {e}")
                
                except Exception as e:
                    logger.error(f"Failed to search r/all: {e}")
            
            # Remove duplicates based on ID
            unique_posts = {}
            for post in posts:
                if post['id'] not in unique_posts:
                    unique_posts[post['id']] = post
            
            final_posts = list(unique_posts.values())
            
            # Sort by score
            final_posts.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            logger.info(f"✅ Authenticated API fetch complete: {len(final_posts)} posts from {len(processed_subreddits)} subreddits")
            
            return final_posts[:30]  # Return top 30 posts
            
        except Exception as e:
            logger.error(f"❌ Authenticated Reddit fetch failed: {e}")
            logger.error(f"📋 Stack trace: {e.__class__.__name__}: {str(e)}")
            return []

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