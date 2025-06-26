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
            
            # Dynamic subreddit endpoint generation - no hardcoded topics
            def generate_subreddit_endpoints(topic):
                """Generate potential subreddit endpoints for any topic dynamically"""
                topic_clean = topic.lower().strip()
                
                # Generate variations of the topic
                variations = [
                    topic_clean,
                    topic_clean.replace(' ', ''),
                    topic_clean.replace(' ', '_'),
                    topic_clean.replace('-', ''),
                    topic_clean.replace('_', ''),
                ]
                
                # Add plurals/singulars
                if topic_clean.endswith('s'):
                    variations.append(topic_clean[:-1])
                else:
                    variations.append(topic_clean + 's')
                
                # Add common patterns
                variations.extend([
                    f"{topic_clean}news",
                    f"{topic_clean}_news",
                    f"the{topic_clean}",
                    f"{topic_clean}community",
                    f"{topic_clean}discussion",
                    f"{topic_clean}fans",
                    f"{topic_clean}hub"
                ])
                
                # Generate endpoints for each variation
                endpoints = {}
                for variation in variations:
                    endpoints[variation] = [f'https://www.reddit.com/r/{variation}/hot.json?limit=15']
                
                return endpoints
            
            # Generate dynamic endpoints based on actual topics
            subreddit_endpoints = {}
            for topic in topics:
                topic_endpoints = generate_subreddit_endpoints(topic)
                subreddit_endpoints.update(topic_endpoints)
            
            # No hardcoded topic mapping - discover dynamically
            def find_related_subreddits(topic):
                """Find related subreddits for any topic dynamically"""
                topic_lower = topic.lower().strip()
                
                # Basic variations
                variations = [
                    topic_lower,
                    topic_lower.replace(' ', ''),
                    topic_lower.replace(' ', '_'),
                ]
                
                # Add plurals/singulars
                if topic_lower.endswith('s'):
                    variations.append(topic_lower[:-1])
                else:
                    variations.append(topic_lower + 's')
                
                return variations
            
            logger.info(f"🔍 Starting Reddit JSON fetch for topics: {topics}")
            
            for topic in topics[:4]:  # Process up to 4 topics
                logger.info(f"🔍 Dynamically discovering subreddits for topic: '{topic}'")
                
                # Use dynamic subreddit discovery
                relevant_subreddits = find_related_subreddits(topic)
                logger.info(f"📊 Generated subreddit variations for '{topic}': {relevant_subreddits}")
                
                # Always include general subreddits as fallback for comprehensive coverage
                general_subreddits = ['worldnews', 'news', 'politics', 'all']
                all_subreddits = relevant_subreddits + general_subreddits
                
                logger.info(f"📊 Final subreddit list for '{topic}': {all_subreddits}")
                
                # Add general subreddit endpoints for comprehensive coverage
                general_endpoints = {
                    'worldnews': ['https://www.reddit.com/r/worldnews/hot.json?limit=20'],
                    'news': ['https://www.reddit.com/r/news/hot.json?limit=20'], 
                    'politics': ['https://www.reddit.com/r/politics/hot.json?limit=15'],
                    'all': ['https://www.reddit.com/r/all/hot.json?limit=25']
                }
                
                # Combine dynamic endpoints with general ones
                all_endpoints = {**subreddit_endpoints, **general_endpoints}
                
                for subreddit in set(all_subreddits):
                    if subreddit in all_endpoints:
                        endpoints = all_endpoints[subreddit]
                        
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
                                                
                                                # NEW: Filter posts for topic relevance BEFORE adding them
                                                relevant_posts = 0
                                                for post in children:
                                                    try:
                                                        post_data = post['data']
                                                        
                                                        # Skip removed, deleted, or empty posts
                                                        if post_data.get('removed_by_category') or post_data.get('title') == '[deleted]':
                                                            continue
                                                        
                                                        title = post_data.get('title', '').lower()
                                                        content = post_data.get('selftext', '').lower()
                                                        
                                                        # CHECK RELEVANCE: Post must contain the topic
                                                        is_relevant = any(
                                                            topic_word in title or topic_word in content
                                                            for topic_word in topic.lower().split()
                                                        ) or topic.lower() in title or topic.lower() in content
                                                        
                                                        # Only include relevant posts
                                                        if is_relevant:
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
                                                'source_type': 'reddit_post',
                                                'simulated': False,
                                                'is_video': post_data.get('is_video', False),
                                                'post_hint': post_data.get('post_hint', ''),
                                                'matched_topic': topic,  # Track which topic matched
                                                'relevance_reason': f"Contains '{topic}' in {'title' if topic.lower() in title else 'content'}",
                                                'reddit_post_info': f"Reddit post from r/{subreddit} linking to {post_data.get('domain', 'external site')}",
                                                'display_source': f"Reddit (r/{subreddit})",
                                                'external_link': post_data.get('url', '') != f"https://reddit.com{post_data.get('permalink', '')}"
                                                            }
                                                            
                                                            # Filter for quality content
                                                            if reddit_post['score'] >= 5 or reddit_post['num_comments'] >= 3:
                                                                posts.append(reddit_post)
                                                                relevant_posts += 1
                                                                logger.debug(f"✅ Added relevant post: {reddit_post['title'][:50]}...")
                                                        
                                                    except Exception as e:
                                                        logger.debug(f"Error parsing individual post: {e}")
                                                        continue
                                                
                                                logger.info(f"📊 Found {relevant_posts} relevant posts about '{topic}' from r/{subreddit}")
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
        """Fetch posts using authenticated Reddit API with fully dynamic subreddit discovery for ANY topic"""
        posts = []
        
        if not reddit_instance:
            logger.warning("❌ No authenticated Reddit instance available")
            return posts
        
        try:
            logger.info(f"🔐 Using authenticated Reddit API for any topics: {topics_list}")
            logger.info("🚀 100% Dynamic - will discover relevant subreddits for ANY topic")
            
            # Track which subreddits we've already processed
            processed_subreddits = set()
            
            for topic in topics_list:
                try:
                    logger.info(f"🔍 Discovering subreddits for: '{topic}' (no presets, fully dynamic)")
                    
                    # Method 1: Direct subreddit name variations
                    topic_clean = topic.lower().strip()
                    direct_variations = [
                        topic_clean,
                        topic_clean.replace(' ', ''),
                        topic_clean.replace(' ', '_'),
                        topic_clean.replace('-', ''),
                        topic_clean.replace('_', ''),
                    ]
                    
                    # Add plurals/singulars
                    if topic_clean.endswith('s'):
                        direct_variations.append(topic_clean[:-1])
                    else:
                        direct_variations.append(topic_clean + 's')
                    
                    # Add common subreddit patterns
                    direct_variations.extend([
                        f"{topic_clean}news",
                        f"{topic_clean}_news", 
                        f"the{topic_clean}",
                        f"{topic_clean}community",
                        f"{topic_clean}discussion",
                        f"{topic_clean}fans",
                        f"{topic_clean}hub",
                        f"{topic_clean}talk"
                    ])
                    
                    # Test each variation to see if it's a real subreddit
                    for variation in direct_variations:
                        if variation not in processed_subreddits and len(processed_subreddits) < 15:
                            try:
                                subreddit = reddit_instance.subreddit(variation)
                                # Test if subreddit exists and is active
                                _ = subreddit.display_name
                                subscriber_count = subreddit.subscribers
                                if subscriber_count and subscriber_count > 50:  # Lower threshold for broader discovery
                                    processed_subreddits.add(variation)
                                    logger.info(f"📋 Direct match: r/{variation} ({subscriber_count:,} subscribers)")
                            except Exception:
                                continue
                    
                    # Method 2: Search Reddit's subreddit directory
                    try:
                        search_results = reddit_instance.subreddits.search(topic, limit=15)
                        for subreddit in search_results:
                            if subreddit.display_name.lower() not in processed_subreddits and len(processed_subreddits) < 15:
                                # Check if subreddit is active
                                try:
                                    recent_posts = list(subreddit.hot(limit=1))
                                    if recent_posts and subreddit.subscribers > 100:
                                        processed_subreddits.add(subreddit.display_name.lower())
                                        logger.info(f"📋 Search found: r/{subreddit.display_name} ({subreddit.subscribers:,} subs)")
                                except:
                                    pass
                    except Exception as e:
                        logger.debug(f"Subreddit search failed for '{topic}': {e}")
                    
                    # Method 3: Search r/all to find where this topic is discussed
                    try:
                        all_search = reddit_instance.subreddit('all').search(topic, limit=25, sort='hot')
                        subreddit_frequency = {}
                        
                        for post in all_search:
                            subreddit_name = str(post.subreddit).lower()
                            subreddit_frequency[subreddit_name] = subreddit_frequency.get(subreddit_name, 0) + 1
                        
                        # Add subreddits where the topic appears frequently
                        for subreddit_name, frequency in sorted(subreddit_frequency.items(), key=lambda x: x[1], reverse=True)[:8]:
                            if subreddit_name not in processed_subreddits and len(processed_subreddits) < 15:
                                processed_subreddits.add(subreddit_name)
                                logger.info(f"📋 r/all discovery: r/{subreddit_name} ({frequency} posts about '{topic}')")
                        
                    except Exception as e:
                        logger.debug(f"r/all search failed for '{topic}': {e}")
                    
                except Exception as e:
                    logger.error(f"Topic discovery failed for '{topic}': {e}")
                    continue
            
            # If still no subreddits found, use broad search approach
            if not processed_subreddits:
                logger.info("🌐 No specific subreddits found - using broad search on r/all")
                processed_subreddits.add('all')
            
            # Now fetch posts from all discovered subreddits
            logger.info(f"📊 Fetching from {len(processed_subreddits)} dynamically discovered subreddits: {list(processed_subreddits)}")
            
            for subreddit_name in processed_subreddits:
                try:
                    if subreddit_name == 'all':
                        # Special handling for r/all - search by topic
                        all_subreddit = reddit_instance.subreddit('all')
                        for topic in topics_list[:2]:
                            try:
                                search_results = all_subreddit.search(topic, sort='hot', time_filter='week', limit=15)
                                for post in search_results:
                                    # Add topic relevance filtering
                                    title_lower = post.title.lower()
                                    content_lower = (post.selftext or '').lower()
                                    topic_lower = topic.lower()
                                    
                                    # Check if post is actually about the topic
                                    if topic_lower in title_lower or any(word in title_lower for word in topic_lower.split()):
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
                                            'source_type': 'reddit_post',
                                            'simulated': False,
                                            'matched_topic': topic,
                                            'reddit_post_info': f"Reddit post from r/{str(post.subreddit)}",
                                            'display_source': f"Reddit (r/{str(post.subreddit)})",
                                            'external_link': post.url != f"https://reddit.com{post.permalink}"
                                        }
                                        
                                        if post_data['score'] >= 20:  # Quality threshold for r/all
                                            posts.append(post_data)
                                            logger.debug(f"✅ r/all post: {post_data['title'][:50]}...")
                            except Exception as e:
                                logger.debug(f"r/all search failed for {topic}: {e}")
                    else:
                        # Regular subreddit fetching
                        subreddit = reddit_instance.subreddit(subreddit_name)
                        logger.info(f"🔄 Fetching from r/{subreddit_name}")
                        
                        # Get hot posts
                        hot_posts = list(subreddit.hot(limit=12))
                        
                        for post in hot_posts:
                            try:
                                if post.stickied:
                                    continue
                                
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
                                    'source_type': 'reddit_post',
                                    'simulated': False,
                                    'is_video': post.is_video if hasattr(post, 'is_video') else False,
                                    'over_18': post.over_18 if hasattr(post, 'over_18') else False,
                                    'reddit_post_info': f"Reddit post from r/{subreddit_name}",
                                    'display_source': f"Reddit (r/{subreddit_name})",
                                    'external_link': post.url != f"https://reddit.com{post.permalink}"
                                }
                                
                                # Quality filter
                                if post_data['score'] >= 3 or post_data['num_comments'] >= 2:  # Lower threshold for better coverage
                                    posts.append(post_data)
                                    logger.debug(f"✅ Added: {post_data['title'][:50]}...")
                                
                            except Exception as e:
                                logger.debug(f"Error processing post: {e}")
                                continue
                    
                except Exception as e:
                    logger.warning(f"Failed to fetch from r/{subreddit_name}: {e}")
                    continue
                
                # Rate limiting
                import time
                time.sleep(0.5)
            
            # Remove duplicates and sort
            unique_posts = {}
            for post in posts:
                if post['id'] not in unique_posts:
                    unique_posts[post['id']] = post
            
            final_posts = list(unique_posts.values())
            final_posts.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            logger.info(f"✅ Dynamic API discovery complete: {len(final_posts)} posts from {len(processed_subreddits)} subreddits")
            
            return final_posts[:25]  # Return top 25 posts
            
        except Exception as e:
            logger.error(f"❌ Authenticated Reddit fetch failed: {e}")
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