#!/usr/bin/env python3
"""
Synapse CrewAI Multi-Agent News Gathering System
Handles news collection from multiple sources using specialized agents
"""

import os
import json
from typing import Dict, List, Any
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import logging

from crewai import Agent, Task, Crew, Process
from crewai_tools import BaseTool
from langchain_openai import ChatOpenAI

# Import custom agents
from agents.reddit_agent import RedditScraperAgent
from agents.linkedin_agent import LinkedInScraperAgent  
from agents.telegram_agent import TelegramMonitorAgent
from agents.news_scraper_agent import NewsScraperAgent
from agents.news_analyst_agent import NewsAnalystAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)

class SynapseNewsCrewAI:
    """Main orchestrator for Synapse News CrewAI system"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
            
        # Initialize LLM
        self.llm = ChatOpenAI(
            model_name="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=self.openai_api_key
        )
        
        # Initialize agents
        self.reddit_agent = RedditScraperAgent(llm=self.llm)
        self.linkedin_agent = LinkedInScraperAgent(llm=self.llm)
        self.telegram_agent = TelegramMonitorAgent(llm=self.llm)
        self.news_scraper = NewsScraperAgent(llm=self.llm)
        self.news_analyst = NewsAnalystAgent(llm=self.llm)
        
        logger.info("SynapseNewsCrewAI initialized successfully")
    
    def create_news_gathering_crew(self, topics: List[str] = None, sources: Dict[str, Any] = None) -> Crew:
        """Create a crew of agents for comprehensive news gathering"""
        
        if not topics:
            topics = ["technology", "AI", "startups", "business", "innovation"]
        
        if not sources:
            sources = {
                "reddit": True,
                "linkedin": True, 
                "telegram": True,
                "news_websites": True
            }
        
        # Define tasks for each agent
        tasks = []
        
        # Reddit scraping task
        if sources.get("reddit", False):
            reddit_task = Task(
                description=f"""
                Scrape Reddit for trending posts and discussions about: {', '.join(topics)}.
                Focus on subreddits like r/technology, r/artificial, r/startups, r/business.
                
                Requirements:
                1. Find top posts from last 24 hours
                2. Extract post titles, content, comments with high engagement
                3. Identify trending topics and discussions
                4. Filter for quality content (upvotes > 50, meaningful discussions)
                5. Extract URLs and references mentioned in posts
                
                Return structured data with: title, content, url, engagement_metrics, subreddit, timestamp
                """,
                agent=self.reddit_agent.agent,
                expected_output="JSON array of Reddit posts with metadata and engagement metrics"
            )
            tasks.append(reddit_task)
        
        # LinkedIn scraping task
        if sources.get("linkedin", False):
            linkedin_task = Task(
                description=f"""
                Monitor LinkedIn for professional insights and industry news about: {', '.join(topics)}.
                Focus on posts from industry leaders, companies, and professional networks.
                
                Requirements:
                1. Find posts with high engagement (likes > 100, meaningful comments)
                2. Extract insights from thought leaders and companies
                3. Identify industry trends and announcements
                4. Capture professional perspectives and analysis
                5. Extract referenced articles and resources
                
                Return structured data with: author, title, content, engagement, company, timestamp
                """,
                agent=self.linkedin_agent.agent,
                expected_output="JSON array of LinkedIn posts with professional insights and metadata"
            )
            tasks.append(linkedin_task)
        
        # Telegram monitoring task
        if sources.get("telegram", False):
            telegram_task = Task(
                description=f"""
                Monitor Telegram channels and groups for news and insights about: {', '.join(topics)}.
                Focus on tech news channels, industry groups, and influential broadcasters.
                
                Requirements:
                1. Monitor predefined list of tech/business Telegram channels
                2. Extract breaking news and announcements
                3. Capture forwarded messages from reliable sources
                4. Filter for original content and verified information
                5. Track viral content and trending discussions
                
                Return structured data with: channel, message, media_urls, timestamp, forward_info
                """,
                agent=self.telegram_agent.agent,
                expected_output="JSON array of Telegram messages with source verification and metadata"
            )
            tasks.append(telegram_task)
        
        # News website scraping task
        if sources.get("news_websites", False):
            news_scraping_task = Task(
                description=f"""
                Scrape major news websites and tech blogs for articles about: {', '.join(topics)}.
                Focus on reputable sources like TechCrunch, Ars Technica, Wired, MIT Tech Review, etc.
                
                Requirements:
                1. Scrape latest articles from predefined list of news sources
                2. Extract full article content, headlines, and summaries
                3. Identify breaking news and trending stories
                4. Capture publication metadata (author, date, source credibility)
                5. Extract related articles and cross-references
                
                Return structured data with: headline, content, author, source, timestamp, tags
                """,
                agent=self.news_scraper.agent,
                expected_output="JSON array of news articles with full content and metadata"
            )
            tasks.append(news_scraping_task)
        
        # Analysis and synthesis task
        analysis_task = Task(
            description=f"""
            Analyze and synthesize all gathered news data to create comprehensive insights.
            
            Requirements:
            1. Analyze all collected content from Reddit, LinkedIn, Telegram, and news sources
            2. Identify common themes, trending topics, and emerging patterns
            3. Cross-reference information for accuracy and credibility
            4. Generate executive summaries for each major topic
            5. Create actionable insights and trend predictions
            6. Rank stories by importance and potential impact
            7. Generate tags and categories for easy organization
            
            Output Format:
            - Executive Summary (3-5 key insights)
            - Trending Topics (ranked by significance)
            - Source Analysis (credibility and cross-verification)
            - Recommendations (actionable insights)
            - Full Data (organized and tagged content)
            """,
            agent=self.news_analyst.agent,
            expected_output="Comprehensive analysis report with insights, trends, and organized content",
            context=tasks  # This task depends on all previous tasks
        )
        tasks.append(analysis_task)
        
        # Create and return the crew
        crew = Crew(
            agents=[
                self.reddit_agent.agent,
                self.linkedin_agent.agent,
                self.telegram_agent.agent,
                self.news_scraper.agent,
                self.news_analyst.agent
            ],
            tasks=tasks,
            process=Process.sequential,  # Execute tasks in sequence
            verbose=True,
            memory=True  # Enable memory for better context retention
        )
        
        return crew
    
    def execute_news_gathering(self, topics: List[str] = None, sources: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute the news gathering crew and return results"""
        
        try:
            logger.info(f"Starting news gathering for topics: {topics}")
            
            # Create the crew
            crew = self.create_news_gathering_crew(topics, sources)
            
            # Execute the crew
            result = crew.kickoff()
            
            # Process and structure the result
            processed_result = {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "topics": topics or ["technology", "AI", "startups", "business", "innovation"],
                "sources_used": sources or {"reddit": True, "linkedin": True, "telegram": True, "news_websites": True},
                "raw_result": str(result),
                "data": self._parse_crew_result(result)
            }
            
            logger.info("News gathering completed successfully")
            return processed_result
            
        except Exception as e:
            logger.error(f"Error in news gathering: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _parse_crew_result(self, result: Any) -> Dict[str, Any]:
        """Parse and structure the crew execution result"""
        
        try:
            # Try to parse as JSON if possible
            if isinstance(result, str):
                try:
                    return json.loads(result)
                except json.JSONDecodeError:
                    pass
            
            # Return structured format
            return {
                "type": "crew_result",
                "content": str(result),
                "parsed": True
            }
            
        except Exception as e:
            logger.error(f"Error parsing crew result: {str(e)}")
            return {
                "type": "raw_result", 
                "content": str(result),
                "parsed": False,
                "error": str(e)
            }

# Initialize the CrewAI system
try:
    synapse_crew = SynapseNewsCrewAI()
    logger.info("Synapse CrewAI system ready")
except Exception as e:
    logger.error(f"Failed to initialize Synapse CrewAI system: {str(e)}")
    synapse_crew = None

# Flask API endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "synapse-crewai-agents",
        "timestamp": datetime.now().isoformat(),
        "initialized": synapse_crew is not None
    })

@app.route('/gather-news', methods=['POST'])
def gather_news():
    """Execute news gathering with specified parameters"""
    
    if not synapse_crew:
        return jsonify({
            "success": False,
            "error": "CrewAI system not initialized"
        }), 500
    
    try:
        data = request.get_json()
        topics = data.get('topics', None)
        sources = data.get('sources', None)
        
        # Execute news gathering
        result = synapse_crew.execute_news_gathering(topics, sources)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in gather_news endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/test-agents', methods=['GET'])
def test_agents():
    """Test individual agents functionality"""
    
    if not synapse_crew:
        return jsonify({
            "success": False,
            "error": "CrewAI system not initialized"
        }), 500
    
    try:
        # Test each agent
        results = {
            "reddit_agent": "Available" if synapse_crew.reddit_agent else "Not Available",
            "linkedin_agent": "Available" if synapse_crew.linkedin_agent else "Not Available", 
            "telegram_agent": "Available" if synapse_crew.telegram_agent else "Not Available",
            "news_scraper": "Available" if synapse_crew.news_scraper else "Not Available",
            "news_analyst": "Available" if synapse_crew.news_analyst else "Not Available"
        }
        
        return jsonify({
            "success": True,
            "agents": results
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)