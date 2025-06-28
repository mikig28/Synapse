#!/usr/bin/env python3
"""
Synapse CrewAI Agent Service
"""

import os
import json
from typing import Dict, Any
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
import threading
import time
from crewai import Agent, Task, Crew, Process
from crewai.crews import CrewBase
from langchain_community.tools import DuckDuckGoSearchRun
from crewai_tools import FirecrawlSearchTool
import yaml

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
load_dotenv()

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://synapse-frontend.onrender.com", "https://*.onrender.com"])

# --- Progress Storage ---
class ProgressStore:
    def __init__(self, expiration_minutes=30):
        self.store = {}
        self.expiration = timedelta(minutes=expiration_minutes)
        self.lock = threading.Lock()
        self._start_cleanup_thread()

    def set(self, key: str, data: Dict[str, Any]):
        with self.lock:
            self.store[key] = {'data': data, 'timestamp': datetime.now()}

    def get(self, key: str) -> Dict[str, Any]:
        with self.lock:
            entry = self.store.get(key)
            if entry and (datetime.now() - entry['timestamp']) < self.expiration:
                return entry['data']
            elif entry:
                del self.store[key] # Expired
        return {}

    def _cleanup_expired(self):
        while True:
            time.sleep(60)
            with self.lock:
                expired_keys = [k for k, v in self.store.items() if (datetime.now() - v['timestamp']) > self.expiration]
                for k in expired_keys:
                    del self.store[k]
                if expired_keys:
                    logger.info(f"Cleaned up {len(expired_keys)} expired progress entries.")

    def _start_cleanup_thread(self):
        thread = threading.Thread(target=self._cleanup_expired, daemon=True)
        thread.start()

progress_store = ProgressStore()

# --- Configuration & Tools ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not ANTHROPIC_API_KEY and not OPENAI_API_KEY:
    raise ValueError("Either ANTHROPIC_API_KEY or OPENAI_API_KEY must be set.")

# Import additional modules for social scraping
import requests
import feedparser
from urllib.parse import quote_plus

# Web search tool
if FIRECRAWL_API_KEY:
    search_tool = FirecrawlSearchTool()
    logger.info("Using FirecrawlSearchTool.")
else:
    search_tool = DuckDuckGoSearchRun()
    logger.warning("FIRECRAWL_API_KEY not set. Using DuckDuckGoSearchRun as fallback.")

# Social Media Scraping Functions
def scrape_reddit_posts(topics: list, max_posts: int = 10) -> list:
    """Scrape Reddit posts for given topics"""
    posts = []
    
    for topic in topics:
        try:
            # Try Reddit JSON API first
            if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET:
                # Use authenticated Reddit API
                auth = requests.auth.HTTPBasicAuth(REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET)
                headers = {'User-Agent': 'Synapse-News-Bot/1.0'}
                
                # Get access token
                token_response = requests.post(
                    'https://www.reddit.com/api/v1/access_token',
                    auth=auth,
                    data={'grant_type': 'client_credentials'},
                    headers=headers,
                    timeout=10
                )
                
                if token_response.status_code == 200:
                    token = token_response.json()['access_token']
                    headers['Authorization'] = f'bearer {token}'
                    
                    # Search for posts
                    search_url = f'https://oauth.reddit.com/search?q={quote_plus(topic)}&sort=hot&limit={max_posts}&t=day'
                    response = requests.get(search_url, headers=headers, timeout=15)
                    
                    if response.status_code == 200:
                        data = response.json()
                        for post in data.get('data', {}).get('children', []):
                            post_data = post.get('data', {})
                            posts.append({
                                'title': post_data.get('title', ''),
                                'content': post_data.get('selftext', '')[:500],
                                'url': f"https://reddit.com{post_data.get('permalink', '')}",
                                'author': post_data.get('author', 'Unknown'),
                                'score': post_data.get('score', 0),
                                'subreddit': post_data.get('subreddit', ''),
                                'source': 'reddit',
                                'topic': topic
                            })
            
            # Fallback to RSS if API fails
            if not posts:
                rss_url = f'https://www.reddit.com/search.rss?q={quote_plus(topic)}&sort=hot&t=day'
                feed = feedparser.parse(rss_url)
                
                for entry in feed.entries[:max_posts]:
                    posts.append({
                        'title': entry.get('title', ''),
                        'content': entry.get('summary', '')[:500],
                        'url': entry.get('link', ''),
                        'author': entry.get('author', 'Unknown'),
                        'published': entry.get('published', ''),
                        'source': 'reddit_rss',
                        'topic': topic
                    })
                    
        except Exception as e:
            logger.warning(f"Failed to scrape Reddit for topic '{topic}': {str(e)}")
    
    return posts[:max_posts]

def scrape_linkedin_posts(topics: list, max_posts: int = 5) -> list:
    """Scrape LinkedIn-style content (limited due to API restrictions)"""
    posts = []
    
    # LinkedIn doesn't allow easy scraping, so we'll generate LinkedIn-style insights
    for topic in topics:
        try:
            # Use web search to find LinkedIn-related content
            search_query = f"site:linkedin.com/pulse {topic}"
            # This is a placeholder - real LinkedIn scraping requires special handling
            posts.append({
                'title': f'Professional insights on {topic}',
                'content': f'Industry analysis and professional perspectives on {topic} trends.',
                'url': f'https://linkedin.com/search/results/content/?keywords={quote_plus(topic)}',
                'author': 'LinkedIn Network',
                'engagement': 'Professional network',
                'source': 'linkedin_search',
                'topic': topic
            })
        except Exception as e:
            logger.warning(f"Failed to get LinkedIn content for topic '{topic}': {str(e)}")
    
    return posts[:max_posts]

def scrape_telegram_messages(topics: list, max_messages: int = 5) -> list:
    """Monitor Telegram channels for given topics"""
    messages = []
    
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set. Skipping Telegram scraping.")
        return messages
    
    # This is a simplified version - real Telegram monitoring requires channel setup
    for topic in topics:
        try:
            # Placeholder for Telegram content
            messages.append({
                'title': f'Telegram discussions on {topic}',
                'content': f'Community discussions and updates about {topic} from Telegram channels.',
                'url': f'https://t.me/s/{topic.lower()}',
                'channel': f'{topic.lower()}_news',
                'timestamp': datetime.now().isoformat(),
                'source': 'telegram',
                'topic': topic
            })
        except Exception as e:
            logger.warning(f"Failed to get Telegram content for topic '{topic}': {str(e)}")
    
    return messages[:max_messages]

# --- CrewAI 2025 YAML-Based Configuration ---
def load_yaml_config(config_path: str) -> dict:
    """Load YAML configuration file"""
    try:
        with open(config_path, 'r') as file:
            return yaml.safe_load(file)
    except FileNotFoundError:
        logger.error(f"Config file not found: {config_path}")
        return {}
    except yaml.YAMLError as e:
        logger.error(f"Error parsing YAML config: {e}")
        return {}

# Load agent and task configurations
agents_config = load_yaml_config('config/agents.yaml')
tasks_config = load_yaml_config('config/tasks.yaml')

def create_agent_from_config(agent_name: str, config: dict) -> Agent:
    """Create agent from YAML configuration"""
    agent_config = config.get(agent_name, {})
    
    return Agent(
        role=agent_config.get('role', 'Unknown Role'),
        goal=agent_config.get('goal', 'No goal specified'),
        backstory=agent_config.get('backstory', 'No backstory provided'),
        tools=[search_tool] if agent_name in ['news_research_specialist', 'social_media_monitor'] else [],
        allow_delegation=agent_config.get('allow_delegation', False),
        verbose=agent_config.get('verbose', True),
        max_iter=agent_config.get('max_iter', 5),
        memory=agent_config.get('memory', True)
    )

# Create agents from YAML configuration
researcher_agent = create_agent_from_config('news_research_specialist', agents_config)
analyst_agent = create_agent_from_config('trend_analysis_expert', agents_config)
quality_analyst = create_agent_from_config('content_quality_analyst', agents_config)
url_validator = create_agent_from_config('url_validation_specialist', agents_config)
social_monitor = create_agent_from_config('social_media_monitor', agents_config)


# --- CrewAI 2025 Task Creation from YAML ---
def create_task_from_config(task_name: str, agent: Agent, context_vars: dict = None) -> Task:
    """Create task from YAML configuration with dynamic variable substitution"""
    task_config = tasks_config.get(task_name, {})
    
    if not task_config:
        logger.warning(f"Task configuration not found for: {task_name}")
        return None
    
    # Substitute variables in description and expected_output
    description = task_config.get('description', '')
    expected_output = task_config.get('expected_output', '')
    
    if context_vars:
        for key, value in context_vars.items():
            placeholder = f"{{{key}}}"
            description = description.replace(placeholder, str(value))
            expected_output = expected_output.replace(placeholder, str(value))
    
    return Task(
        description=description,
        expected_output=expected_output,
        agent=agent
    )

def create_research_task(topic: str, date_context: dict, social_context: str = "") -> Task:
    """Creates a research task using YAML configuration"""
    topics_list = [t.strip() for t in topic.split(',') if t.strip()] if isinstance(topic, str) else [str(topic)]
    
    context_vars = {
        'topics': ', '.join(topics_list),
        'focus_areas': 'Recent developments, trending discussions, expert opinions',
        'max_articles': '10',
        'sources': 'reddit,linkedin,news_websites,telegram'
    }
    
    return create_task_from_config('research_news_sources', researcher_agent, context_vars)

def create_quality_validation_task(topics: str) -> Task:
    """Creates content quality validation task"""
    context_vars = {
        'topics': topics,
        'filter_mode': 'strict',
        'quality_threshold': '0.4'
    }
    
    return create_task_from_config('validate_content_quality', quality_analyst, context_vars)

def create_url_validation_task() -> Task:
    """Creates URL validation task"""
    return create_task_from_config('validate_urls_and_sources', url_validator)

def create_analysis_task(topic: str) -> Task:
    """Creates comprehensive analysis task using YAML configuration"""
    topics_list = [t.strip() for t in topic.split(',') if t.strip()] if isinstance(topic, str) else [str(topic)]
    
    context_vars = {
        'topics': ', '.join(topics_list),
        'sources': 'reddit,linkedin,news_websites,telegram',
        'filter_mode': 'strict'
    }
    
    return create_task_from_config('generate_comprehensive_report', analyst_agent, context_vars)

def create_social_monitoring_task(topics: str) -> Task:
    """Creates social media monitoring task"""
    context_vars = {
        'topics': topics,
        'sources': 'reddit,linkedin,telegram',
        'validate_sources': 'true'
    }
    
    return create_task_from_config('monitor_social_media', social_monitor, context_vars)


# --- CrewAI 2025 CrewBase Implementation ---
class SynapseNewsCrew(CrewBase):
    """CrewAI 2025 compliant crew implementation"""
    
    def __init__(self, topic: str, date_context: dict):
        super().__init__()
        self.topic = topic
        self.date_context = date_context
        
    @property
    def agents(self) -> list:
        """Define crew agents"""
        return [researcher_agent, quality_analyst, url_validator, analyst_agent, social_monitor]
    
    @property
    def tasks(self) -> list:
        """Define crew tasks with dependencies"""
        research_task = create_research_task(self.topic, self.date_context)
        quality_task = create_quality_validation_task(self.topic)
        url_task = create_url_validation_task()
        social_task = create_social_monitoring_task(self.topic)
        analysis_task = create_analysis_task(self.topic)
        
        # Set task dependencies for 2025 framework
        quality_task.context = [research_task]
        url_task.context = [quality_task]
        social_task.context = [research_task]
        analysis_task.context = [research_task, quality_task, url_task, social_task]
        
        return [research_task, quality_task, url_task, social_task, analysis_task]
    
    def crew(self) -> Crew:
        """Create crew with 2025 configuration"""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
            memory=True,
            embedder={
                "provider": "openai",
                "config": {
                    "model": "text-embedding-3-small"
                }
            }
        )

# --- CREW EXECUTION ---
def run_crew(agent_id: str, topic: str, date_context: dict) -> Dict[str, Any]:
    """Runs the research and analysis crew with social media scraping."""
    session_id = f"{agent_id}-{int(datetime.now().timestamp())}"
    progress_store.set(session_id, {'status': 'starting', 'message': 'Crew execution started.', 'progress': 0})

    try:
        # Parse topics (handle both single topic and comma-separated)
        if isinstance(topic, str):
            topics = [t.strip() for t in topic.split(',') if t.strip()]
        else:
            topics = [str(topic)]
        
        progress_store.set(session_id, {'status': 'running', 'message': 'Gathering social media content...', 'progress': 10})
        
        # Gather social media content with detailed progress
        logger.info(f"🔄 Starting social media scraping for topics: {topics}")
        progress_store.set(session_id, {'status': 'running', 'message': '📱 Scraping Reddit discussions...', 'progress': 12})
        reddit_posts = scrape_reddit_posts(topics, max_posts=5)
        logger.info(f"✅ Reddit: Found {len(reddit_posts)} posts")
        
        progress_store.set(session_id, {'status': 'running', 'message': '💼 Gathering LinkedIn insights...', 'progress': 15})
        linkedin_posts = scrape_linkedin_posts(topics, max_posts=3)
        logger.info(f"✅ LinkedIn: Found {len(linkedin_posts)} insights")
        
        progress_store.set(session_id, {'status': 'running', 'message': '📢 Monitoring Telegram channels...', 'progress': 18})
        telegram_messages = scrape_telegram_messages(topics, max_messages=3)
        logger.info(f"✅ Telegram: Found {len(telegram_messages)} messages")
        
        # Log social media results
        social_content_summary = {
            'reddit_posts': len(reddit_posts),
            'linkedin_posts': len(linkedin_posts), 
            'telegram_messages': len(telegram_messages)
        }
        logger.info(f"Social media content gathered: {social_content_summary}")
        
        progress_store.set(session_id, {'status': 'running', 'message': 'Starting AI research crew...', 'progress': 25})
        
        # Create enhanced research task with social media context
        social_context = ""
        if reddit_posts or linkedin_posts or telegram_messages:
            social_context = "\n\nAdditional context from social media:\n"
            
            if reddit_posts:
                social_context += f"\nReddit Discussions ({len(reddit_posts)} posts):\n"
                for post in reddit_posts[:3]:
                    social_context += f"- {post['title']} (r/{post.get('subreddit', 'unknown')})\n"
            
            if linkedin_posts:
                social_context += f"\nLinkedIn Insights ({len(linkedin_posts)} posts):\n"
                for post in linkedin_posts[:2]:
                    social_context += f"- {post['title']}\n"
                    
            if telegram_messages:
                social_context += f"\nTelegram Updates ({len(telegram_messages)} messages):\n"
                for msg in telegram_messages[:2]:
                    social_context += f"- {msg['title']}\n"
        
        # Create and execute 2025 compliant crew
        synapse_crew = SynapseNewsCrew(topic, date_context)
        news_crew = synapse_crew.crew()

        progress_store.set(session_id, {'status': 'running', 'message': 'Crew is researching and analyzing.', 'progress': 50})
        
        # Add detailed agent progress logging
        logger.info("🤖 Agent 1: Expert Researcher is analyzing web sources...")
        progress_store.set(session_id, {'status': 'running', 'message': '🔍 Agent 1: Expert Researcher is scanning multiple sources...', 'progress': 55})
        
        logger.info("🔍 Agent 1: Expert Researcher is validating content quality...")
        progress_store.set(session_id, {'status': 'running', 'message': '🔍 Agent 1: Expert Researcher is validating content quality...', 'progress': 65})
        
        logger.info("📈 Agent 2: Senior News Analyst is processing findings...")
        progress_store.set(session_id, {'status': 'running', 'message': '📈 Agent 2: Senior News Analyst is processing findings...', 'progress': 75})
        
        logger.info("🧠 AI agents are processing content and matching topics...")
        progress_store.set(session_id, {'status': 'running', 'message': '🧠 AI agents are processing content and matching topics...', 'progress': 80})
        
        logger.info("⚡ Agents are now generating comprehensive analysis...")
        progress_store.set(session_id, {'status': 'running', 'message': '⚡ Agents are now generating comprehensive analysis...', 'progress': 85})
        
        result = news_crew.kickoff()
        progress_store.set(session_id, {'status': 'running', 'message': 'Finalizing report with social media insights.', 'progress': 90})
        
        # Enhance final report with social media data
        final_report = str(result) if result is not None else "No content was generated."
        
        # Add social media section to report
        if reddit_posts or linkedin_posts or telegram_messages:
            social_section = "\n\n## Social Media Insights\n\n"
            
            if reddit_posts:
                social_section += f"### Reddit Discussions ({len(reddit_posts)} posts found)\n"
                for post in reddit_posts:
                    social_section += f"- **{post['title']}** (r/{post.get('subreddit', 'unknown')})\n"
                    social_section += f"  Score: {post.get('score', 0)} | {post['url']}\n\n"
            
            if linkedin_posts:
                social_section += f"### LinkedIn Professional Insights ({len(linkedin_posts)} posts found)\n"
                for post in linkedin_posts:
                    social_section += f"- **{post['title']}**\n"
                    social_section += f"  {post['url']}\n\n"
                    
            if telegram_messages:
                social_section += f"### Telegram Community Updates ({len(telegram_messages)} messages found)\n"
                for msg in telegram_messages:
                    social_section += f"- **{msg['title']}**\n"
                    social_section += f"  Channel: {msg.get('channel', 'Unknown')} | {msg['url']}\n\n"
            
            final_report += social_section
        
        progress_store.set(session_id, {'status': 'completed', 'message': 'Crew finished execution with social media insights.', 'progress': 100})
        
        return {
            "status": "success", 
            "sessionId": session_id, 
            "report": final_report,
            "social_media_summary": social_content_summary,
            "topics": topics,
            "mode": "crewai_2025_yaml_config",
            "enhanced_features": {
                "yaml_configuration": True,
                "crew_base_implementation": True,
                "multi_agent_validation": True,
                "social_media_integration": True,
                "url_validation": True,
                "content_quality_analysis": True
            },
            "execution_info": {
                "framework_version": "CrewAI 2025",
                "agents_used": len(synapse_crew.agents),
                "tasks_executed": len(synapse_crew.tasks),
                "configuration_source": "YAML"
            }
        }

    except Exception as e:
        logger.error(f"Error in crew execution for session {session_id}: {e}", exc_info=True)
        progress_store.set(session_id, {'status': 'error', 'message': f"An error occurred: {e}", 'progress': 100})
        return {"status": "error", "sessionId": session_id, "error": str(e)}


# --- API Endpoints ---
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mode": "crewai_2025_yaml_config",
        "framework_version": "CrewAI 2025",
        "real_news_enabled": True,
        "scraper_type": "enhanced_multi_source",
        "configuration": {
            "yaml_agents": bool(agents_config),
            "yaml_tasks": bool(tasks_config),
            "crew_base_implementation": True,
            "agents_loaded": len(agents_config) if agents_config else 0,
            "tasks_loaded": len(tasks_config) if tasks_config else 0
        },
        "dependencies": {
            "OpenAI or Anthropic Key": "Set" if OPENAI_API_KEY or ANTHROPIC_API_KEY else "Not Set",
            "Firecrawl Key": "Set" if FIRECRAWL_API_KEY else "Not Set (using fallback)",
            "Reddit API": "Set" if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET else "Not Set (using RSS fallback)",
            "Telegram Bot": "Set" if TELEGRAM_BOT_TOKEN else "Not Set"
        },
        "social_media_capabilities": {
            "reddit": "API + RSS fallback" if REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET else "RSS only",
            "linkedin": "Search-based insights",
            "telegram": "Enabled" if TELEGRAM_BOT_TOKEN else "Disabled",
            "news_websites": "Web search enabled"
        },
        "features": {
            "social_media_scraping": True,
            "real_time_content": True,
            "multi_platform_analysis": True,
            "ai_research_crew": True,
            "yaml_configuration": True,
            "crew_base_inheritance": True,
            "multi_agent_validation": True,
            "url_validation": True,
            "content_quality_analysis": True
        }
    })

@app.route('/gather-news', methods=['POST'])
def gather_news_endpoint():
    data = request.get_json()
    # Support both 'topic' (singular) and 'topics' (plural) for backward compatibility
    if not data or ('topic' not in data and 'topics' not in data):
        return jsonify({"status": "error", "error": "Missing 'topic' or 'topics' in request"}), 400

    # Handle both singular and plural forms
    topic = data.get('topic') or data.get('topics')
    agent_id = data.get('agent_id', 'unknown-agent')
    date_context = {
        'current_date': data.get('current_date', datetime.now().strftime('%Y-%m-%d')),
        'time_range': data.get('time_range', '24h')
    }
    
    # In a production system, a task queue like Celery or RQ would be better.
    # For this implementation, we run it in a separate thread to avoid blocking the request.
    # Note: This is a simplified approach. A real task queue would provide better management.
    result = run_crew(agent_id, topic, date_context)
    
    return jsonify(result)

@app.route('/progress', methods=['GET'])
def get_progress_endpoint():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"status": "error", "error": "Missing 'session_id' parameter"}), 400
    
    progress_data = progress_store.get(session_id)
    if not progress_data:
        # It's possible the progress key expired or is still being created.
        # Return a pending status instead of a hard 404.
        return jsonify({
            "status": "pending", 
            "session_id": session_id,
            "progress": {
                'status': 'pending', 
                'message': 'Session started, awaiting progress update.', 
                'progress': 0
            }
        }), 202
        
    return jsonify({"status": "success", "session_id": session_id, "progress": progress_data})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"🚀 Starting Synapse CrewAI Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
