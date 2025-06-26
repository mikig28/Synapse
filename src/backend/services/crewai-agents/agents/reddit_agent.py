
import os
import json
import requests
import random
import time
from typing import List, Dict, Any
from datetime import datetime
import praw
from crewai import Agent
from crewai_tools import BaseTool
import logging

logger = logging.getLogger(__name__)

class RedditScraperTool(BaseTool):
    name: str = "Reddit Scraper"
    description: str = "Scrapes Reddit for trending posts and discussions on specified topics using the API or a JSON fallback."

    def __init__(self):
        super().__init__()
        self.reddit_instance = None
        self.is_authenticated = False
        try:
            # Attempt to initialize with PRAW for authenticated requests
            self.reddit_instance = praw.Reddit(
                client_id=os.getenv('REDDIT_CLIENT_ID'),
                client_secret=os.getenv('REDDIT_CLIENT_SECRET'),
                user_agent=os.getenv('REDDIT_USER_AGENT', 'SynapseAgent/1.0'),
                check_for_async=False
            )
            if self.reddit_instance.read_only:
                self.is_authenticated = True
                logger.info("Reddit API (PRAW) initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize PRAW. Will use JSON fallback. Error: {e}")

    def _run(self, topics: str) -> str:
        topics_list = [topic.strip().lower() for topic in topics.split(',')]
        all_posts = []

        # Prefer authenticated API if available
        if self.is_authenticated:
            logger.info("Using authenticated Reddit API to fetch posts.")
            api_posts = self._fetch_authenticated_posts(topics_list)
            all_posts.extend(api_posts)

        # Use JSON fallback if API fails or returns no posts
        if not all_posts:
            logger.info("Using Reddit JSON fallback to fetch posts.")
            json_posts = self._get_reddit_json_data(topics_list)
            all_posts.extend(json_posts)

        if not all_posts:
            return json.dumps({
                'success': False,
                'source': 'reddit',
                'error': 'No posts found for the given topics from any method.',
                'posts': []
            })

        # Sort by score and return top posts
        all_posts.sort(key=lambda x: x.get('score', 0), reverse=True)
        return json.dumps({
            'success': True,
            'source': 'reddit',
            'posts': all_posts[:25] # Limit to 25 posts
        }, indent=2)

    def _fetch_authenticated_posts(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Fetches posts using the authenticated PRAW instance."""
        posts = []
        subreddits = self._get_subreddits_for_topics(topics)
        for subreddit_name in subreddits:
            try:
                subreddit = self.reddit_instance.subreddit(subreddit_name)
                for post in subreddit.hot(limit=15):
                    if any(topic in post.title.lower() or topic in post.selftext.lower() for topic in topics):
                        posts.append({
                            'source': 'reddit_api',
                            'display_source': f"Reddit (r/{subreddit_name})",
                            'title': post.title,
                            'url': f"https://reddit.com{post.permalink}",
                            'content': post.selftext,
                            'score': post.score,
                            'author': str(post.author),
                            'published_date': datetime.fromtimestamp(post.created_utc).isoformat()
                        })
            except Exception as e:
                logger.error(f"Failed to fetch from r/{subreddit_name} via API: {e}")
        return posts

    def _get_reddit_json_data(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Fetches posts using public JSON endpoints as a fallback."""
        posts = []
        subreddits = self._get_subreddits_for_topics(topics)
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]

        for subreddit_name in subreddits:
            url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit=20"
            try:
                headers = {'User-Agent': random.choice(user_agents)}
                response = requests.get(url, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    for post_data in data['data']['children']:
                        post = post_data['data']
                        title = post.get('title', '').lower()
                        if any(topic in title for topic in topics):
                            posts.append({
                                'source': 'reddit_json_fallback',
                                'display_source': f"Reddit (r/{subreddit_name})",
                                'title': post.get('title', 'No Title'),
                                'url': post.get('url', f"https://reddit.com{post.get('permalink', '')}"),
                                'content': post.get('selftext', ''),
                                'score': post.get('score', 0),
                                'author': post.get('author', 'Unknown'),
                                'published_date': datetime.fromtimestamp(post.get('created_utc', 0)).isoformat()
                            })
                time.sleep(random.uniform(1, 3)) # Respect rate limits
            except Exception as e:
                logger.error(f"Failed to fetch from r/{subreddit_name} via JSON: {e}")
        return posts

    def _get_subreddits_for_topics(self, topics: List[str]) -> List[str]:
        """Returns a list of subreddits based on the given topics."""
        subreddit_map = {
            'sport': ['sports', 'soccer', 'nba', 'baseball'],
            'ai': ['artificial', 'singularity', 'machinelearning'],
            'technology': ['technology', 'gadgets', 'Futurology'],
            'news': ['worldnews', 'news']
        }
        subreddits = []
        for topic in topics:
            for keyword, subs in subreddit_map.items():
                if keyword in topic:
                    subreddits.extend(subs)
        return list(set(subreddits)) or ['news'] # Return unique subs or a default

class RedditScraperAgent:
    """Agent that scrapes Reddit for trending posts and discussions."""

    def __init__(self, llm=None):
        self.tool = RedditScraperTool()
        self.agent = Agent(
            role='Reddit Content Scraper',
            goal='Scrape trending posts from relevant subreddits based on specified topics.',
            backstory=(
                "You are a Reddit scraping expert. You know how to find the most relevant subreddits for any topic "
                "and extract the hottest posts. You can use the official Reddit API for authenticated requests or fall back to public JSON endpoints, "
                "ensuring you always get the data while being transparent about its source."
            ),
            tools=[self.tool],
            llm=llm,
            verbose=True,
            allow_delegation=False
        )
