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
            
            if not credentials_available or not reddit_instance or not is_authenticated:
                error_msg = "Reddit API not available"
                if not credentials_available:
                    error_msg += " - missing credentials"
                elif not reddit_instance:
                    error_msg += " - instance not created"
                elif not is_authenticated:
                    error_msg += " - authentication failed"
                    
                logger.error(f"❌ {error_msg} - returning empty result")
                return json.dumps({
                    'success': False,
                    'source': 'reddit',
                    'error': error_msg,
                    'posts': [],
                    'timestamp': datetime.now().isoformat()
                })
            
            topics_list = [topic.strip() for topic in topics.split(',')]
            all_posts = []
            
            # Define relevant subreddits for each topic - expanded list
            subreddit_mapping = {
                'technology': ['technology', 'tech', 'gadgets', 'programming', 'coding', 'TechNews'],
                'AI': ['artificial', 'MachineLearning', 'deeplearning', 'singularity', 'OpenAI', 'ChatGPT'],
                'startups': ['startups', 'entrepreneur', 'startup', 'smallbusiness', 'Entrepreneur'],
                'business': ['business', 'investing', 'finance', 'Economics', 'stocks', 'marketing'],
                'innovation': ['Futurology', 'singularity', 'innovation', 'Inventions', 'startups'],
                'ai': ['artificial', 'MachineLearning', 'deeplearning', 'singularity', 'OpenAI', 'ChatGPT'],
                'tech': ['technology', 'tech', 'gadgets', 'programming', 'coding', 'TechNews'],
                'vibe': ['programming', 'coding', 'webdev', 'learnprogramming'],
                'n8n': ['automation', 'nocode', 'workflow', 'productivity', 'selfhosted'],
                'israel': ['Israel', 'worldnews', 'geopolitics', 'news', 'MiddleEastNews', 'politics'],
                'Israel': ['Israel', 'worldnews', 'geopolitics', 'news', 'MiddleEastNews', 'politics'],
                'news': ['worldnews', 'news', 'politics', 'geopolitics', 'intlnews'],
                'politics': ['politics', 'worldnews', 'geopolitics', 'news']
            }
            
            # Collect subreddits based on topics
            subreddits_to_check = set()
            for topic in topics_list:
                topic_lower = topic.lower()
                for key, subs in subreddit_mapping.items():
                    if topic_lower in key.lower() or key.lower() in topic_lower:
                        subreddits_to_check.update(subs)
            
            # If no specific mapping found, use general tech subreddits
            if not subreddits_to_check:
                subreddits_to_check = ['technology', 'artificial', 'startups', 'business']
            
            logger.info(f"Scraping subreddits: {list(subreddits_to_check)}")
            
            # Scrape each subreddit with improved error handling
            subreddits_list = list(subreddits_to_check)[:3]  # Reduced to 3 for better reliability
            logger.info(f"🔍 Starting to scrape {len(subreddits_list)} subreddits: {subreddits_list}")
            
            for subreddit_name in subreddits_list:
                try:
                    logger.info(f"📡 Connecting to subreddit: r/{subreddit_name}")
                    subreddit = reddit_instance.subreddit(subreddit_name)
                    
                    # Verify subreddit exists and is accessible
                    try:
                        subreddit_info = subreddit.display_name
                        logger.info(f"✅ Subreddit verified: r/{subreddit_info}")
                    except Exception as verify_error:
                        logger.error(f"❌ Cannot access r/{subreddit_name}: {str(verify_error)}")
                        continue
                    
                    # Get hot posts with multiple fallback strategies
                    logger.info(f"🔄 Fetching posts from r/{subreddit_name}...")
                    posts_processed = 0
                    posts_added = 0
                    
                    # Try different post types if hot posts fail
                    post_sources = [
                        ('hot', lambda: subreddit.hot(limit=15)),
                        ('new', lambda: subreddit.new(limit=10)),
                        ('top_week', lambda: subreddit.top(time_filter='week', limit=10))
                    ]
                    
                    posts_fetched = False
                    for source_name, post_getter in post_sources:
                        if posts_fetched:
                            break
                            
                        try:
                            logger.info(f"🔄 Trying {source_name} posts from r/{subreddit_name}...")
                            posts_iterator = post_getter()
                            
                            for post in posts_iterator:
                                try:
                                    posts_processed += 1
                                    
                                    # More lenient time filter - last 7 days
                                    post_time = datetime.fromtimestamp(post.created_utc)
                                    time_diff = datetime.now() - post_time
                                    
                                    if time_diff > timedelta(days=7):
                                        logger.debug(f"   ⏰ Skipping old post: {post.title[:50]}... (age: {time_diff.days} days)")
                                        continue
                                    
                                    # Very lenient quality filter - any post with positive score
                                    if post.score < 1:
                                        logger.debug(f"   📊 Skipping negative post: {post.title[:50]}... (score: {post.score})")
                                        continue
                                    
                                    # Safe comment extraction with error handling
                                    top_comments = []
                                    try:
                                        # Only fetch comments if post has some engagement
                                        if post.num_comments > 0 and post.num_comments < 100:  # Avoid huge comment threads
                                            post.comments.replace_more(limit=0)
                                            for comment in post.comments[:2]:  # Just top 2 comments
                                                try:
                                                    if hasattr(comment, 'body') and len(str(comment.body)) > 10:
                                                        top_comments.append({
                                                            'body': str(comment.body)[:150],  # Shorter to avoid rate limits
                                                            'score': getattr(comment, 'score', 0)
                                                        })
                                                except Exception as comment_error:
                                                    logger.debug(f"   ⚠️ Comment error: {str(comment_error)}")
                                                    continue
                                    except Exception as comments_error:
                                        logger.debug(f"   ⚠️ Comments loading error: {str(comments_error)}")
                                        top_comments = []
                            
                                    # Create post data with safe attribute access
                                    try:
                                        post_data = {
                                            'title': str(post.title) if hasattr(post, 'title') else 'No title',
                                            'content': str(post.selftext)[:400] if hasattr(post, 'selftext') and post.selftext else '',
                                            'url': f"https://reddit.com{post.permalink}" if hasattr(post, 'permalink') else '',
                                            'external_url': str(post.url) if hasattr(post, 'url') and post.url != f"https://reddit.com{post.permalink}" else None,
                                            'subreddit': subreddit_name,
                                            'score': getattr(post, 'score', 0),
                                            'num_comments': getattr(post, 'num_comments', 0),
                                            'created_utc': post_time.isoformat(),
                                            'author': str(post.author) if hasattr(post, 'author') and post.author else '[deleted]',
                                            'upvote_ratio': getattr(post, 'upvote_ratio', 0.5),
                                            'top_comments': top_comments,
                                            'flair': getattr(post, 'link_flair_text', None),
                                            'is_video': getattr(post, 'is_video', False),
                                            'source': 'reddit',
                                            'source_type': source_name
                                        }
                                        
                                        all_posts.append(post_data)
                                        posts_added += 1
                                        logger.info(f"   ✅ Added post: {post.title[:50]}... (score: {post.score}, comments: {post.num_comments})")
                                        
                                        # Stop if we have enough posts from this subreddit
                                        if posts_added >= 5:
                                            logger.info(f"   🎯 Got enough posts from r/{subreddit_name}, moving to next")
                                            posts_fetched = True
                                            break
                                            
                                    except Exception as post_data_error:
                                        logger.error(f"   ❌ Error creating post data: {str(post_data_error)}")
                                        continue
                                        
                                except Exception as post_processing_error:
                                    logger.error(f"   ❌ Error processing post: {str(post_processing_error)}")
                                    continue
                                    
                            # Add small delay to respect rate limits
                            import time
                            time.sleep(0.1)
                            
                        except Exception as fetch_error:
                            logger.error(f"   ❌ Error fetching {source_name} posts: {str(fetch_error)}")
                            continue
                    
                    logger.info(f"📊 r/{subreddit_name} results: {posts_added}/{posts_processed} posts added")
                    
                    # Add delay between subreddits to respect rate limits
                    if subreddit_name != subreddits_list[-1]:  # Don't sleep after last subreddit
                        import time
                        time.sleep(1)
                    
                except Exception as e:
                    logger.error(f"❌ Error scraping subreddit r/{subreddit_name}: {str(e)}")
                    logger.error(f"   Exception type: {type(e).__name__}")
                    logger.error(f"   Error details: {str(e)[:200]}")
                    
                    # Continue with next subreddit instead of failing completely
                    continue
            
            # Sort by score and return top posts
            all_posts.sort(key=lambda x: x['score'], reverse=True)
            
            logger.info(f"🎯 Reddit scraping completed:")
            logger.info(f"   📊 Total posts found: {len(all_posts)}")
            logger.info(f"   🏆 Top post score: {all_posts[0]['score'] if all_posts else 'N/A'}")
            
            # If no posts found, try alternative Reddit sources
            if len(all_posts) == 0:
                logger.warning("⚠️ No posts found via Reddit API, trying alternative Reddit sources...")
                alternative_posts = self._get_alternative_reddit_data(topics_list)
                all_posts.extend(alternative_posts)
                logger.info(f"   📊 Alternative sources found: {len(alternative_posts)} posts")
            
            logger.info(f"   📝 Returning top {min(len(all_posts), 20)} posts")
            
            result = {
                'success': True,
                'source': 'reddit',
                'topics': topics_list,
                'subreddits_scraped': list(subreddits_to_check),
                'posts_found': len(all_posts),
                'posts': all_posts[:20],  # Return top 20 posts
                'timestamp': datetime.now().isoformat(),
                'fallback_used': len(alternative_posts) > 0 if 'alternative_posts' in locals() else False
            }
            
            logger.info(f"✅ Reddit agent returning {len(result['posts'])} posts successfully")
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
    
    def _get_alternative_reddit_data(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Get Reddit data from alternative sources when API fails"""
        posts = []
        
        try:
            import requests
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            logger.info("🔄 Trying Reddit RSS feeds as alternative...")
            
            # Reddit RSS feeds for popular subreddits
            reddit_rss_feeds = [
                'https://www.reddit.com/r/technology/.rss',
                'https://www.reddit.com/r/programming/.rss',
                'https://www.reddit.com/r/artificial/.rss',
                'https://www.reddit.com/r/startups/.rss',
                'https://www.reddit.com/r/business/.rss'
            ]
            
            for feed_url in reddit_rss_feeds[:3]:  # Try 3 feeds
                try:
                    logger.info(f"📡 Fetching Reddit RSS: {feed_url}")
                    response = requests.get(feed_url, headers=headers, timeout=10)
                    
                    if response.status_code == 200:
                        try:
                            import feedparser
                            FEEDPARSER_AVAILABLE = True
                        except ImportError:
                            logger.warning("⚠️ feedparser not available for Reddit RSS fallback")
                            continue
                        
                        if FEEDPARSER_AVAILABLE:
                            feed = feedparser.parse(response.content)
                            logger.info(f"📊 RSS feed parsed: {len(feed.entries)} entries")
                            
                            for entry in feed.entries[:3]:  # Get 3 entries per feed
                                title = entry.get('title', '').lower()
                                summary = entry.get('summary', '').lower()
                                
                                # Check topic relevance
                                is_relevant = any(topic.lower() in title or topic.lower() in summary for topic in topics)
                                
                                if is_relevant or len(posts) == 0:  # Include first post even if not perfectly relevant
                                    posts.append({
                                        'title': entry.get('title', 'Reddit Post'),
                                        'content': entry.get('summary', '')[:300],
                                        'url': entry.get('link', ''),
                                        'subreddit': feed_url.split('/r/')[1].split('/')[0] if '/r/' in feed_url else 'unknown',
                                        'score': 50,  # Estimated score
                                        'num_comments': 10,  # Estimated comments
                                        'created_utc': entry.get('published', datetime.now().isoformat()),
                                        'author': 'reddit_user',
                                        'upvote_ratio': 0.8,
                                        'top_comments': [],
                                        'flair': None,
                                        'is_video': False,
                                        'source': 'reddit_rss',
                                        'source_type': 'rss_fallback'
                                    })
                                
                except Exception as rss_error:
                    logger.warning(f"❌ Reddit RSS failed for {feed_url}: {str(rss_error)}")
                    continue
            
            logger.info(f"✅ Alternative Reddit sources found: {len(posts)} posts")
            
        except Exception as e:
            logger.error(f"❌ Alternative Reddit data failed: {str(e)}")
        
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