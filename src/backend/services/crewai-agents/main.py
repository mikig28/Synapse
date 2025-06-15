#!/usr/bin/env python3
"""
Hybrid Synapse CrewAI News Service
Uses real news scraper for websites while keeping social media sources simulated
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

class HybridNewsGatherer:
    """Hybrid news gathering - real news scraper + simulated social media"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        
        # Try to import and initialize news scraper (fallback to simple version)
        try:
            from agents.news_scraper_agent import NewsScraperTool
            self.news_scraper = NewsScraperTool()
            self.real_news_available = True
            self.scraper_type = "full"
            logger.info("Full news scraper initialized successfully")
        except Exception as e:
            logger.warning(f"Full news scraper not available: {str(e)}")
            try:
                from agents.simple_news_scraper import SimpleNewsScraperAgent
                self.news_scraper = SimpleNewsScraperAgent()
                self.real_news_available = True
                self.scraper_type = "simple"
                logger.info("Simple news scraper initialized successfully")
            except Exception as e2:
                logger.error(f"Simple news scraper also failed: {str(e2)}")
                self.news_scraper = None
                self.real_news_available = False
                self.scraper_type = "none"
        
        logger.info("HybridNewsGatherer initialized")
    
    def gather_news(self, topics: List[str] = None, sources: Dict[str, Any] = None) -> Dict[str, Any]:
        """Gather news from multiple sources (hybrid approach)"""
        
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
            
            # Gather news using hybrid approach
            result = self._hybrid_news_gathering(topics, sources)
            
            return {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "topics": topics,
                "sources_used": sources,
                "mode": "hybrid",
                "real_news_enabled": self.real_news_available,
                "data": result
            }
            
        except Exception as e:
            logger.error(f"Error in news gathering: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _hybrid_news_gathering(self, topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Hybrid approach - real news scraper + simulated social media"""
        
        organized_content = {}
        
        # Use simulated data for social media sources
        if sources.get("reddit", False):
            organized_content["reddit_posts"] = self._generate_reddit_posts(topics)
        
        if sources.get("linkedin", False):
            organized_content["linkedin_posts"] = self._generate_linkedin_posts(topics)
        
        if sources.get("telegram", False):
            organized_content["telegram_messages"] = self._generate_telegram_messages(topics)
        
        # Use real news scraper for websites if available
        if sources.get("news_websites", False):
            if self.real_news_available:
                try:
                    real_news = self._get_real_news_articles(topics)
                    organized_content["news_articles"] = real_news
                    logger.info(f"Retrieved {len(real_news)} real news articles")
                except Exception as e:
                    logger.error(f"Real news scraping failed: {str(e)}")
                    organized_content["news_articles"] = self._generate_news_articles(topics)
            else:
                organized_content["news_articles"] = self._generate_news_articles(topics)
        
        # Generate analysis
        analysis = self._generate_analysis(topics, organized_content)
        
        return {
            "executive_summary": [
                f"Analyzed content from {len([k for k, v in sources.items() if v])} sources",
                f"Key topics: {', '.join(topics[:3])}",
                f"Mode: {'Real news + simulated social' if self.real_news_available else 'All simulated'}"
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
    
    def _get_real_news_articles(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Get real news articles using the news scraper tool"""
        
        if not self.news_scraper:
            return []
        
        try:
            topics_str = ','.join(topics)
            
            if self.scraper_type == "full":
                # Use the full news scraper
                result_json = self.news_scraper._run(topics_str)
                result = json.loads(result_json)
                
                if result.get('success') and result.get('articles'):
                    articles = result['articles']
                    logger.info(f"Successfully scraped {len(articles)} articles with full scraper")
                    return articles
                else:
                    logger.warning("Full news scraper returned no articles")
                    return []
                    
            elif self.scraper_type == "simple":
                # Use the simple news scraper
                result_json = self.news_scraper.scrape_news(topics_str)
                result = json.loads(result_json)
                
                if result.get('success') and result.get('articles'):
                    articles = result['articles']
                    logger.info(f"Successfully scraped {len(articles)} articles with simple scraper")
                    return articles
                else:
                    logger.warning("Simple news scraper returned no articles")
                    return []
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error getting real news articles: {str(e)}")
            return []
    
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
                "source": "reddit",
                "simulated": True
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
                "source": "linkedin",
                "simulated": True
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
                "source": "telegram",
                "simulated": True
            })
        return messages
    
    def _generate_news_articles(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated news articles (fallback)"""
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
                "source_category": "tech",
                "simulated": True
            })
        return articles
    
    def _generate_analysis(self, topics: List[str], content: Dict[str, Any]) -> Dict[str, Any]:
        """Generate analysis based on available content"""
        
        # Count real vs simulated articles
        news_articles = content.get('news_articles', [])
        real_articles = [a for a in news_articles if not a.get('simulated', False)]
        simulated_articles = [a for a in news_articles if a.get('simulated', False)]
        
        return {
            "key_themes": topics[:3],
            "sentiment_analysis": "positive",
            "emerging_trends": [f"{topic} adoption" for topic in topics[:2]],
            "market_implications": "Strong growth potential across technology sectors",
            "technology_focus": "AI and automation leading innovation",
            "data_quality": {
                "real_news_articles": len(real_articles),
                "simulated_social_posts": len(content.get('reddit_posts', [])) + len(content.get('linkedin_posts', [])) + len(content.get('telegram_messages', [])),
                "total_sources": len([k for k, v in content.items() if v])
            }
        }

# Initialize the news gatherer
try:
    news_gatherer = HybridNewsGatherer()
    logger.info("Hybrid news gathering system ready")
except Exception as e:
    logger.error(f"Failed to initialize news gatherer: {str(e)}")
    news_gatherer = None

# Flask API endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "synapse-hybrid-news-agents",
        "timestamp": datetime.now().isoformat(),
        "initialized": news_gatherer is not None,
        "mode": "hybrid",
        "real_news_enabled": news_gatherer.real_news_available if news_gatherer else False,
        "scraper_type": getattr(news_gatherer, 'scraper_type', 'none') if news_gatherer else 'none'
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
        "mode": "hybrid",
        "agents": {
            "reddit_agent": "Simulated",
            "linkedin_agent": "Simulated", 
            "telegram_agent": "Simulated",
            "news_scraper": "Real" if news_gatherer and news_gatherer.real_news_available else "Simulated",
            "news_analyst": "Hybrid"
        },
        "note": "Running in hybrid mode - real news scraping + simulated social media"
    })

@app.route('/test-news-scraper', methods=['GET'])
def test_news_scraper():
    """Test the news scraper specifically"""
    
    if not news_gatherer or not news_gatherer.real_news_available:
        return jsonify({
            "success": False,
            "error": "Real news scraper not available"
        })
    
    try:
        # Test with default topics
        topics = ["technology", "AI"]
        real_articles = news_gatherer._get_real_news_articles(topics)
        
        return jsonify({
            "success": True,
            "articles_found": len(real_articles),
            "test_topics": topics,
            "sample_articles": real_articles[:3] if real_articles else [],
            "sources_configured": list(news_gatherer.news_scraper.news_sources.keys()) if news_gatherer.news_scraper else []
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"🚀 Starting HYBRID CrewAI service on port {port}")
    logger.info("📝 Service mode: HYBRID (real news scraper + simulated social media)")
    logger.info(f"📁 Current working directory: {os.getcwd()}")
    
    if news_gatherer and news_gatherer.real_news_available:
        logger.info("✅ Real news scraper is ENABLED")
        logger.info(f"📰 News sources configured: {list(news_gatherer.news_scraper.news_sources.keys())}")
    else:
        logger.info("⚠️ Real news scraper is DISABLED - using simulated data")
    
    app.run(host='0.0.0.0', port=port, debug=False)