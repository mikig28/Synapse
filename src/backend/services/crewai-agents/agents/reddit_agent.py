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
        
    def _init_attributes(self):
        """Initialize attributes with defensive programming"""
        # Use setattr to ensure compatibility with all BaseTool implementations
        setattr(self, 'reddit', None)
        setattr(self, 'is_authenticated', False)
        setattr(self, '_credentials_available', False)
        
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
            setattr(self, '_credentials_available', False)
            return
        
        setattr(self, '_credentials_available', True)
        
        try:
            logger.info("🔄 Attempting Reddit API connection...")
            reddit_instance = praw.Reddit(
                client_id=reddit_client_id,
                client_secret=reddit_client_secret,
                user_agent=reddit_user_agent,
                check_for_async=False
            )
            
            # Test connection with a simple request
            logger.info("🧪 Testing Reddit API with technology subreddit...")
            test_posts = list(reddit_instance.subreddit('technology').hot(limit=1))
            logger.info(f"🧪 Test successful - got {len(test_posts)} test posts")
            
            # Use setattr for compatibility
            setattr(self, 'reddit', reddit_instance)
            setattr(self, 'is_authenticated', True)
            logger.info("✅ Reddit API connection and authentication successful")
        except Exception as e:
            logger.error(f"❌ Reddit API connection failed: {str(e)}")
            logger.error(f"   Exception type: {type(e).__name__}")
            logger.error(f"   Error details: {str(e)}")
            setattr(self, 'reddit', None)
            setattr(self, 'is_authenticated', False)
    
    def _run(self, topics: str = "technology,AI,startups") -> str:
        """Scrape Reddit for posts on specified topics"""
        
        try:
            # Defensive attribute access
            reddit_instance = getattr(self, 'reddit', None)
            is_authenticated = getattr(self, 'is_authenticated', False)
            credentials_available = getattr(self, '_credentials_available', False)
            
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
            
            # Define relevant subreddits for each topic
            subreddit_mapping = {
                'technology': ['technology', 'tech', 'gadgets', 'programming'],
                'AI': ['artificial', 'MachineLearning', 'deeplearning', 'singularity'],
                'startups': ['startups', 'entrepreneur', 'startup'],
                'business': ['business', 'investing', 'finance', 'Economics'],
                'innovation': ['Futurology', 'singularity', 'innovation']
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
            
            # Scrape each subreddit
            logger.info(f"🔍 Starting to scrape {len(list(subreddits_to_check)[:5])} subreddits: {list(subreddits_to_check)[:5]}")
            for subreddit_name in list(subreddits_to_check)[:5]:  # Limit to 5 subreddits
                try:
                    logger.info(f"📡 Connecting to subreddit: r/{subreddit_name}")
                    subreddit = reddit_instance.subreddit(subreddit_name)
                    
                    # Get hot posts from last 24 hours
                    logger.info(f"🔄 Fetching hot posts from r/{subreddit_name} (limit=10)...")
                    posts_processed = 0
                    posts_added = 0
                    
                    for post in subreddit.hot(limit=10):
                        try:
                            posts_processed += 1
                            
                            # Check if post is from last 24 hours
                            post_time = datetime.fromtimestamp(post.created_utc)
                            time_diff = datetime.now() - post_time
                            
                            if time_diff > timedelta(days=1):
                                logger.debug(f"   ⏰ Skipping old post: {post.title[:50]}... (age: {time_diff})")
                                continue
                            
                            # Filter for quality content
                            if post.score < 50:  # Minimum upvotes
                                logger.debug(f"   📊 Skipping low-score post: {post.title[:50]}... (score: {post.score})")
                                continue
                            
                            # Extract top comments
                            post.comments.replace_more(limit=0)  # Remove "more comments"
                            top_comments = []
                            for comment in post.comments[:3]:  # Top 3 comments
                                if hasattr(comment, 'body') and len(comment.body) > 20:
                                    top_comments.append({
                                        'body': comment.body[:200],
                                        'score': getattr(comment, 'score', 0)
                                    })
                            
                            post_data = {
                                'title': post.title,
                                'content': post.selftext[:500] if post.selftext else '',
                                'url': f"https://reddit.com{post.permalink}",
                                'external_url': post.url if post.url != f"https://reddit.com{post.permalink}" else None,
                                'subreddit': subreddit_name,
                                'score': post.score,
                                'num_comments': post.num_comments,
                                'created_utc': post_time.isoformat(),
                                'author': str(post.author) if post.author else '[deleted]',
                                'upvote_ratio': getattr(post, 'upvote_ratio', 0),
                                'top_comments': top_comments,
                                'flair': post.link_flair_text,
                                'is_video': post.is_video,
                                'source': 'reddit'
                            }
                            
                            all_posts.append(post_data)
                            posts_added += 1
                            logger.info(f"   ✅ Added post: {post.title[:60]}... (score: {post.score}, comments: {post.num_comments})")
                            
                        except Exception as e:
                            logger.error(f"   ❌ Error processing post: {str(e)}")
                            continue
                    
                    logger.info(f"📊 r/{subreddit_name} results: {posts_added}/{posts_processed} posts added")
                    
                except Exception as e:
                    logger.error(f"❌ Error scraping subreddit r/{subreddit_name}: {str(e)}")
                    logger.error(f"   Exception type: {type(e).__name__}")
                    continue
            
            # Sort by score and return top posts
            all_posts.sort(key=lambda x: x['score'], reverse=True)
            
            logger.info(f"🎯 Reddit scraping completed:")
            logger.info(f"   📊 Total posts found: {len(all_posts)}")
            logger.info(f"   🏆 Top post score: {all_posts[0]['score'] if all_posts else 'N/A'}")
            logger.info(f"   📝 Returning top {min(len(all_posts), 20)} posts")
            
            result = {
                'success': True,
                'source': 'reddit',
                'topics': topics_list,
                'subreddits_scraped': list(subreddits_to_check),
                'posts_found': len(all_posts),
                'posts': all_posts[:20],  # Return top 20 posts
                'timestamp': datetime.now().isoformat()
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