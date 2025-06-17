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
        # Fallback for older versions
        class BaseTool:
            name: str = ""
            description: str = ""
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
        # Initialize Reddit API client with proper error handling
        self.reddit_client_id = os.getenv('REDDIT_CLIENT_ID')
        self.reddit_client_secret = os.getenv('REDDIT_CLIENT_SECRET')
        self.reddit_user_agent = os.getenv('REDDIT_USER_AGENT', 'SynapseAgent/1.0')
        
        if not self.reddit_client_id or not self.reddit_client_secret:
            logger.error("❌ Reddit API credentials not configured")
            raise ValueError("Reddit API credentials missing")
        
        try:
            self.reddit = praw.Reddit(
                client_id=self.reddit_client_id,
                client_secret=self.reddit_client_secret,
                user_agent=self.reddit_user_agent
            )
            # Test connection
            self.reddit.user.me()
            logger.info("✅ Reddit API connection successful")
        except Exception as e:
            logger.error(f"❌ Reddit API connection failed: {str(e)}")
            # Create read-only instance for public data
            self.reddit = praw.Reddit(
                client_id=self.reddit_client_id,
                client_secret=self.reddit_client_secret,
                user_agent=self.reddit_user_agent
            )
    
    def _run(self, topics: str = "technology,AI,startups") -> str:
        """Scrape Reddit for posts on specified topics"""
        
        try:
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
            for subreddit_name in list(subreddits_to_check)[:5]:  # Limit to 5 subreddits
                try:
                    subreddit = self.reddit.subreddit(subreddit_name)
                    
                    # Get hot posts from last 24 hours
                    for post in subreddit.hot(limit=10):
                        try:
                            # Check if post is from last 24 hours
                            post_time = datetime.fromtimestamp(post.created_utc)
                            if datetime.now() - post_time > timedelta(days=1):
                                continue
                            
                            # Filter for quality content
                            if post.score < 50:  # Minimum upvotes
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
                            
                        except Exception as e:
                            logger.error(f"Error processing post: {str(e)}")
                            continue
                    
                except Exception as e:
                    logger.error(f"Error scraping subreddit {subreddit_name}: {str(e)}")
                    continue
            
            # Sort by score and return top posts
            all_posts.sort(key=lambda x: x['score'], reverse=True)
            result = {
                'success': True,
                'source': 'reddit',
                'topics': topics_list,
                'subreddits_scraped': list(subreddits_to_check),
                'posts_found': len(all_posts),
                'posts': all_posts[:20],  # Return top 20 posts
                'timestamp': datetime.now().isoformat()
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