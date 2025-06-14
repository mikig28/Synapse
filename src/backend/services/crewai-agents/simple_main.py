#!/usr/bin/env python3
"""
Simplified Synapse CrewAI News Service
Compatible with older Python versions and simpler dependencies
"""

import os
import json
from typing import Dict, List, Any
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)

class SimpleNewsGatherer:
    """Simplified news gathering without full CrewAI dependencies"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        logger.info("SimpleNewsGatherer initialized")
    
    def gather_news(self, topics: List[str] = None, sources: Dict[str, Any] = None) -> Dict[str, Any]:
        """Gather news from multiple sources (simplified version)"""
        
        if not topics:
            topics = ["technology", "AI", "startups", "business", "innovation"]
        
        if not sources:
            sources = {
                "reddit": True,
                "linkedin": True, 
                "telegram": True,
                "news_websites": True
            }
        
        try:
            logger.info(f"Gathering news for topics: {topics}")
            
            # Simulate multi-agent news gathering
            # In production, this would call actual APIs
            result = self._simulate_news_gathering(topics, sources)
            
            return {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "topics": topics,
                "sources_used": sources,
                "data": result
            }
            
        except Exception as e:
            logger.error(f"Error in news gathering: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _simulate_news_gathering(self, topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate CrewAI multi-agent news gathering"""
        
        organized_content = {}
        
        # Simulate Reddit posts
        if sources.get("reddit", False):
            organized_content["reddit_posts"] = self._generate_reddit_posts(topics)
        
        # Simulate LinkedIn posts
        if sources.get("linkedin", False):
            organized_content["linkedin_posts"] = self._generate_linkedin_posts(topics)
        
        # Simulate Telegram messages
        if sources.get("telegram", False):
            organized_content["telegram_messages"] = self._generate_telegram_messages(topics)
        
        # Simulate news articles
        if sources.get("news_websites", False):
            organized_content["news_articles"] = self._generate_news_articles(topics)
        
        # Generate analysis
        analysis = self._generate_analysis(topics, organized_content)
        
        return {
            "executive_summary": [
                f"Analyzed content from {len([k for k, v in sources.items() if v])} sources",
                f"Key topics: {', '.join(topics[:3])}",
                "Simulated multi-agent analysis completed successfully"
            ],
            "trending_topics": [
                {"topic": topic, "mentions": 5 + i*2, "trending_score": 50 + i*10}
                for i, topic in enumerate(topics[:5])
            ],
            "organized_content": organized_content,
            "ai_insights": analysis,
            "recommendations": [
                f"Monitor {topics[0]} for emerging trends",
                "Continue tracking multi-platform discussions",
                "Consider expanding source coverage"
            ]
        }
    
    def _generate_reddit_posts(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated Reddit posts"""
        posts = []
        for i, topic in enumerate(topics[:3]):
            posts.append({
                "title": f"Breaking: Major developments in {topic} space",
                "content": f"Exciting news in the {topic} industry. Community discussing potential impacts and opportunities.",
                "url": f"https://reddit.com/r/technology/post_{i}",
                "subreddit": "technology",
                "score": 156 + i*20,
                "num_comments": 23 + i*5,
                "created_utc": datetime.now().isoformat(),
                "author": f"tech_enthusiast_{i}",
                "source": "reddit"
            })
        return posts
    
    def _generate_linkedin_posts(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated LinkedIn posts"""
        posts = []
        for i, topic in enumerate(topics[:3]):
            posts.append({
                "title": f"Industry Insights: The Future of {topic}",
                "content": f"Professional analysis of {topic} trends and market implications for businesses.",
                "author": f"Industry Expert {i+1}",
                "company": f"Tech Corp {i+1}",
                "engagement": {"likes": 89 + i*15, "comments": 12 + i*3, "shares": 8 + i*2},
                "timestamp": datetime.now().isoformat(),
                "url": f"https://linkedin.com/posts/expert_{i}",
                "source": "linkedin"
            })
        return posts
    
    def _generate_telegram_messages(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated Telegram messages"""
        messages = []
        for i, topic in enumerate(topics[:3]):
            messages.append({
                "channel": f"@tech_news_{i}",
                "text": f"🚀 Breaking: {topic} announcement could revolutionize the industry",
                "timestamp": datetime.now().isoformat(),
                "views": 1250 + i*200,
                "forwards": 45 + i*10,
                "source": "telegram"
            })
        return messages
    
    def _generate_news_articles(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated news articles"""
        articles = []
        sources = ["TechCrunch", "Wired", "MIT Technology Review"]
        for i, topic in enumerate(topics[:3]):
            articles.append({
                "title": f"{topic}: Revolutionary Breakthrough Changes Everything",
                "content": f"Comprehensive analysis of recent {topic} developments and their implications for the future.",
                "url": f"https://techcrunch.com/{topic.lower()}-breakthrough-{i}",
                "source": sources[i % len(sources)],
                "author": f"Tech Reporter {i+1}",
                "published_date": datetime.now().isoformat(),
                "source_category": "tech"
            })
        return articles
    
    def _generate_analysis(self, topics: List[str], content: Dict[str, Any]) -> Dict[str, Any]:
        """Generate simulated AI analysis"""
        return {
            "key_themes": topics[:3],
            "sentiment_analysis": "positive",
            "emerging_trends": [f"{topic} adoption" for topic in topics[:2]],
            "market_implications": "Strong growth potential across technology sectors",
            "technology_focus": "AI and automation leading innovation"
        }

# Initialize the news gatherer
try:
    news_gatherer = SimpleNewsGatherer()
    logger.info("Simple news gathering system ready")
except Exception as e:
    logger.error(f"Failed to initialize news gatherer: {str(e)}")
    news_gatherer = None

# Flask API endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "synapse-simple-news-agents",
        "timestamp": datetime.now().isoformat(),
        "initialized": news_gatherer is not None,
        "mode": "simplified"
    })

@app.route('/gather-news', methods=['POST'])
def gather_news():
    """Execute news gathering with specified parameters"""
    
    if not news_gatherer:
        return jsonify({
            "success": False,
            "error": "News gathering system not initialized"
        }), 500
    
    try:
        data = request.get_json() if request.is_json else {}
        topics = data.get('topics', None)
        sources = data.get('sources', None)
        
        # Execute news gathering
        result = news_gatherer.gather_news(topics, sources)
        
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
    
    return jsonify({
        "success": True,
        "mode": "simplified",
        "agents": {
            "reddit_agent": "Simulated",
            "linkedin_agent": "Simulated", 
            "telegram_agent": "Simulated",
            "news_scraper": "Simulated",
            "news_analyst": "Simulated"
        },
        "note": "Running in simplified mode without full CrewAI dependencies"
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"🚀 Starting SIMPLIFIED CrewAI service on port {port}")
    logger.info("📝 Service mode: SIMPLIFIED (no complex dependencies)")
    app.run(host='0.0.0.0', port=port, debug=False)