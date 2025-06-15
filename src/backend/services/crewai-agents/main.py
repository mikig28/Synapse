#!/usr/bin/env python3
"""
Hybrid Synapse CrewAI News Service
Uses real news scraper for websites while keeping social media sources simulated
"""

import os
import sys
import json
from typing import Dict, List, Any
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import logging

# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

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
        self.initialization_error = None
        
        # Try to import and initialize news scraper (fallback to simple version)
        try:
            from agents.news_scraper_agent import NewsScraperTool
            self.news_scraper = NewsScraperTool()
            self.real_news_available = True
            self.scraper_type = "full"
            logger.info("✅ Full news scraper initialized successfully")
        except Exception as e:
            logger.warning(f"⚠️ Full news scraper not available: {str(e)}")
            try:
                from agents.simple_news_scraper import SimpleNewsScraperTool
                self.news_scraper = SimpleNewsScraperTool()
                self.real_news_available = True
                self.scraper_type = "simple"
                logger.info("✅ Simple news scraper initialized successfully")
            except Exception as e2:
                logger.error(f"❌ Simple news scraper also failed: {str(e2)}")
                self.news_scraper = None
                self.real_news_available = False
                self.scraper_type = "none"
                self.initialization_error = f"Full scraper: {str(e)} | Simple scraper: {str(e2)}"
        
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
        """Generate simulated Reddit posts with better variety"""
        posts = []
        
        reddit_templates = [
            {
                "title": "Breaking: Major developments in {topic} - What are your thoughts?",
                "content": "Just saw some significant news regarding {topic}. The implications could be huge for the industry. What's everyone's take on this?",
                "subreddit": "worldnews" if topics[0].lower() in ['israel', 'politics', 'ukraine'] else "technology"
            },
            {
                "title": "Analysis: How {topic} is reshaping the global landscape",
                "content": "Deep dive into recent {topic} trends and their potential impact on various sectors. Key stakeholders are already adapting strategies.",
                "subreddit": "news" if topics[0].lower() in ['israel', 'politics'] else "technology"
            },
            {
                "title": "Discussion: {topic} megathread - Latest updates and community insights",
                "content": "Comprehensive thread covering all recent {topic} developments. Community members sharing expertise and diverse perspectives.",
                "subreddit": "worldnews" if topics[0].lower() in ['israel', 'politics'] else "technology"
            },
            {
                "title": "LIVE: {topic} situation developing - Real-time updates",
                "content": "Continuous coverage of ongoing {topic} events. Multiple sources confirming significant developments in the past hour.",
                "subreddit": "news"
            },
            {
                "title": "Expert AMA: Working in {topic} industry - Ask me anything",
                "content": "10+ years experience in {topic} sector. Happy to answer questions about current trends, challenges, and opportunities.",
                "subreddit": "IAmA"
            }
        ]
        
        for i, topic in enumerate(topics[:5]):  # Increased from 3 to 5
            template = reddit_templates[i % len(reddit_templates)]
            posts.append({
                "title": template["title"].format(topic=topic),
                "content": template["content"].format(topic=topic),
                "url": f"https://reddit.com/r/{template['subreddit']}/post_{i}",
                "subreddit": template["subreddit"],
                "score": 256 + i*47 + (hash(topic) % 200),  # More varied scores
                "num_comments": 45 + i*12 + (hash(topic) % 50),
                "created_utc": datetime.now().isoformat(),
                "author": f"expert_{topic.lower().replace(' ', '_')}_{i}",
                "source": "reddit",
                "simulated": True
            })
        return posts
    
    def _generate_linkedin_posts(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated LinkedIn posts with professional insights"""
        posts = []
        
        linkedin_templates = [
            {
                "title": "Strategic Outlook: {topic} transformation in 2025",
                "content": "As {topic} continues to evolve, industry leaders must adapt their strategies. Key insights from recent market analysis and expert consultations. #Leadership #Strategy",
                "author": "Sarah Chen, MBA",
                "company": "Global Strategy Consulting"
            },
            {
                "title": "Investment Perspective: {topic} market opportunities",
                "content": "The {topic} sector presents compelling investment opportunities. Our team has identified three key growth drivers that institutional investors should monitor. #Investment #Growth",
                "author": "Michael Rodriguez",
                "company": "Venture Capital Partners"
            },
            {
                "title": "Policy Impact: How {topic} regulations are changing business",
                "content": "New regulatory frameworks around {topic} are reshaping operational strategies across industries. Companies need to prepare for compliance requirements. #Policy #Compliance",
                "author": "Dr. Jennifer Walsh",
                "company": "Regulatory Affairs Institute"
            },
            {
                "title": "Innovation Spotlight: {topic} breakthrough technologies",
                "content": "Exciting developments in {topic} technology are creating new possibilities for enterprise solutions. Early adopters are already seeing competitive advantages. #Innovation #Technology",
                "author": "David Kim, CTO",
                "company": "Enterprise Solutions Inc"
            }
        ]
        
        for i, topic in enumerate(topics[:4]):  # Increased to 4
            template = linkedin_templates[i % len(linkedin_templates)]
            posts.append({
                "title": template["title"].format(topic=topic),
                "content": template["content"].format(topic=topic),
                "author": template["author"],
                "company": template["company"],
                "engagement": {
                    "likes": 147 + i*23 + (hash(topic) % 100), 
                    "comments": 18 + i*7 + (hash(topic) % 20), 
                    "shares": 12 + i*4 + (hash(topic) % 15)
                },
                "timestamp": datetime.now().isoformat(),
                "url": f"https://linkedin.com/posts/expert_{i}",
                "source": "linkedin",
                "simulated": True
            })
        return posts
    
    def _generate_telegram_messages(self, topics: List[str]) -> List[Dict[str, Any]]:
        """Generate simulated Telegram messages with diverse content"""
        messages = []
        
        telegram_templates = [
            {
                "channel": "@breaking_alerts",
                "text": "🚨 BREAKING: Major {topic} development confirmed by multiple sources. This could have significant implications. Details emerging... #Breaking #Alert"
            },
            {
                "channel": "@global_intel", 
                "text": "📊 ANALYSIS: {topic} trends show accelerating momentum. Intelligence reports suggest this is part of larger strategic shift. Monitor closely. #Intelligence #Analysis"
            },
            {
                "channel": "@insider_updates",
                "text": "💼 INSIDER: Sources close to {topic} developments indicate major announcements coming soon. Industry insiders already positioning for impact. #Insider #Update"
            },
            {
                "channel": "@market_signals",
                "text": "📈 MARKET: {topic} related assets showing unusual activity. Smart money appears to be moving. Technical indicators suggest momentum building. #Market #Trading"
            },
            {
                "channel": "@expert_network",
                "text": "🎯 EXPERT: Leading {topic} specialist shares exclusive insights on current situation. Key factors to watch in coming 48 hours. #Expert #Insights"
            }
        ]
        
        for i, topic in enumerate(topics[:5]):  # Increased to 5
            template = telegram_templates[i % len(telegram_templates)]
            messages.append({
                "channel": template["channel"],
                "text": template["text"].format(topic=topic),
                "timestamp": datetime.now().isoformat(),
                "views": 2150 + i*340 + (hash(topic) % 1000),  # More varied engagement
                "forwards": 67 + i*15 + (hash(topic) % 50),
                "reactions": {
                    "👍": 45 + (hash(topic) % 30),
                    "🔥": 23 + (hash(topic) % 20),
                    "💯": 12 + (hash(topic) % 15)
                },
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
        """Generate topic-specific analysis based on available content"""
        
        # Count real vs simulated articles
        news_articles = content.get('news_articles', [])
        real_articles = [a for a in news_articles if not a.get('simulated', False)]
        simulated_articles = [a for a in news_articles if a.get('simulated', False)]
        
        primary_topic = topics[0].lower() if topics else "general"
        
        # Generate topic-specific insights
        sentiment = self._analyze_topic_sentiment(primary_topic)
        trends = self._identify_emerging_trends(primary_topic, topics)
        implications = self._generate_market_implications(primary_topic)
        focus_areas = self._identify_focus_areas(primary_topic)
        risk_factors = self._identify_risk_factors(primary_topic)
        opportunities = self._identify_opportunities(primary_topic)
        
        return {
            "key_themes": topics[:3],
            "sentiment_analysis": sentiment,
            "emerging_trends": trends,
            "market_implications": implications,
            "technology_focus": focus_areas,
            "risk_assessment": risk_factors,
            "strategic_opportunities": opportunities,
            "content_summary": {
                "reddit_discussions": len(content.get('reddit_posts', [])),
                "professional_insights": len(content.get('linkedin_posts', [])),
                "breaking_alerts": len(content.get('telegram_messages', [])),
                "news_coverage": len(real_articles)
            },
            "data_quality": {
                "real_news_articles": len(real_articles),
                "simulated_social_posts": len(content.get('reddit_posts', [])) + len(content.get('linkedin_posts', [])) + len(content.get('telegram_messages', [])),
                "total_sources": len([k for k, v in content.items() if v]),
                "coverage_depth": "comprehensive" if len(real_articles) > 5 else "moderate" if len(real_articles) > 0 else "limited"
            }
        }
    
    def _analyze_topic_sentiment(self, topic: str) -> str:
        """Analyze sentiment for specific topics"""
        sentiment_map = {
            'israel': 'mixed_tending_negative',
            'politics': 'polarized',
            'ukraine': 'concerned',
            'ai': 'optimistic_cautious',
            'technology': 'positive',
            'crypto': 'volatile_optimistic',
            'climate': 'urgent_hopeful',
            'health': 'cautiously_positive',
            'economy': 'mixed',
            'security': 'vigilant'
        }
        return sentiment_map.get(topic, 'neutral_positive')
    
    def _identify_emerging_trends(self, primary_topic: str, topics: List[str]) -> List[str]:
        """Identify emerging trends for specific topics"""
        trend_map = {
            'israel': [
                "Regional security cooperation increasing",
                "Diplomatic normalization efforts expanding",
                "Technology sector resilience amid challenges"
            ],
            'ai': [
                "Enterprise AI adoption accelerating",
                "Regulatory frameworks emerging globally",
                "Open-source AI models gaining traction"
            ],
            'technology': [
                "Quantum computing breakthroughs",
                "Edge computing deployment",
                "Sustainable tech solutions"
            ],
            'politics': [
                "Digital governance initiatives",
                "Policy transparency demands",
                "Citizen engagement platforms"
            ],
            'crypto': [
                "Institutional adoption patterns",
                "Regulatory clarity improving",
                "DeFi integration mainstream"
            ]
        }
        return trend_map.get(primary_topic, [f"{topic} innovation acceleration" for topic in topics[:3]])
    
    def _generate_market_implications(self, topic: str) -> str:
        """Generate market implications for specific topics"""
        implications_map = {
            'israel': "Regional stability factors influencing global energy markets and tech innovation hubs",
            'ai': "Massive productivity gains expected across sectors, with significant investment flowing to AI infrastructure",
            'technology': "Digital transformation driving competitive advantages and new business models",
            'politics': "Policy uncertainty creating both risks and opportunities for strategic positioning",
            'crypto': "Financial infrastructure evolution accelerating, traditional banking adaptation required",
            'health': "Healthcare innovation driving cost reduction and improved patient outcomes",
            'climate': "Green transition creating trillion-dollar market opportunities and regulatory pressures"
        }
        return implications_map.get(topic, "Market dynamics shifting toward innovation and adaptation strategies")
    
    def _identify_focus_areas(self, topic: str) -> str:
        """Identify key focus areas for specific topics"""
        focus_map = {
            'israel': "Geopolitical stability, technology sector growth, and regional economic partnerships",
            'ai': "Responsible AI development, enterprise integration, and regulatory compliance",
            'technology': "Innovation acceleration, digital infrastructure, and cybersecurity enhancement",
            'politics': "Democratic institutions, policy effectiveness, and public trust building",
            'crypto': "Regulatory compliance, institutional adoption, and infrastructure scaling"
        }
        return focus_map.get(topic, "Strategic innovation and market positioning")
    
    def _identify_risk_factors(self, topic: str) -> List[str]:
        """Identify risk factors for specific topics"""
        risk_map = {
            'israel': ["Regional escalation", "Economic disruption", "Security threats"],
            'ai': ["Bias and fairness", "Job displacement", "Privacy concerns"],
            'technology': ["Cybersecurity threats", "Data breaches", "Regulatory backlash"],
            'politics': ["Polarization", "Institutional trust", "Policy gridlock"],
            'crypto': ["Regulatory crackdowns", "Market volatility", "Technical vulnerabilities"]
        }
        return risk_map.get(topic, ["Market uncertainty", "Regulatory changes", "Competitive pressures"])
    
    def _identify_opportunities(self, topic: str) -> List[str]:
        """Identify strategic opportunities for specific topics"""
        opportunity_map = {
            'israel': ["Tech innovation partnerships", "Regional trade expansion", "Security technology exports"],
            'ai': ["Productivity enhancement", "New business models", "Competitive differentiation"],
            'technology': ["Digital transformation", "Automation benefits", "New market creation"],
            'politics': ["Policy innovation", "Democratic renewal", "Civic engagement"],
            'crypto': ["Financial inclusion", "Payment innovation", "Investment diversification"]
        }
        return opportunity_map.get(topic, ["Innovation leadership", "Market expansion", "Strategic partnerships"])

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
    """Health check endpoint with detailed diagnostics"""
    
    # Environment variables check
    env_status = {
        "REDDIT_CLIENT_ID": "✅ Set" if os.getenv('REDDIT_CLIENT_ID') else "❌ Missing",
        "REDDIT_CLIENT_SECRET": "✅ Set" if os.getenv('REDDIT_CLIENT_SECRET') else "❌ Missing", 
        "TELEGRAM_BOT_TOKEN": "✅ Set" if os.getenv('TELEGRAM_BOT_TOKEN') else "❌ Missing",
        "OPENAI_API_KEY": "✅ Set" if os.getenv('OPENAI_API_KEY') else "❌ Missing"
    }
    
    # Dependency check
    dependencies = {}
    try:
        import requests
        dependencies["requests"] = "✅ Available"
    except ImportError:
        dependencies["requests"] = "❌ Missing"
        
    try:
        import bs4
        dependencies["beautifulsoup4"] = "✅ Available"
    except ImportError:
        dependencies["beautifulsoup4"] = "❌ Missing"
        
    try:
        import feedparser
        dependencies["feedparser"] = "✅ Available"
    except ImportError:
        dependencies["feedparser"] = "❌ Missing"
        
    try:
        import praw
        dependencies["praw"] = "✅ Available"
    except ImportError:
        dependencies["praw"] = "❌ Missing"
    
    # Scraper status
    scraper_status = "unknown"
    scraper_error = None
    if news_gatherer:
        scraper_status = news_gatherer.scraper_type
        scraper_error = getattr(news_gatherer, 'initialization_error', None)
    
    return jsonify({
        "status": "healthy",
        "service": "synapse-hybrid-news-agents",
        "timestamp": datetime.now().isoformat(),
        "initialized": news_gatherer is not None,
        "mode": "hybrid",
        "real_news_enabled": news_gatherer.real_news_available if news_gatherer else False,
        "scraper_type": scraper_status,
        "scraper_error": scraper_error,
        "environment_variables": env_status,
        "dependencies": dependencies,
        "working_directory": os.getcwd(),
        "files_in_directory": os.listdir('.'),
        "python_path": os.environ.get('PYTHONPATH', 'Not set')
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

@app.route('/test-simple-scraper', methods=['GET'])
def test_simple_scraper():
    """Test the simple news scraper directly"""
    
    if not news_gatherer or not news_gatherer.real_news_available:
        return jsonify({
            "success": False,
            "error": "News scraper not available",
            "scraper_type": getattr(news_gatherer, 'scraper_type', 'none') if news_gatherer else 'none',
            "initialization_error": getattr(news_gatherer, 'initialization_error', 'Unknown') if news_gatherer else 'News gatherer not initialized'
        })
    
    try:
        # Test simple scraper directly
        topics = "technology"
        result_json = news_gatherer.news_scraper.scrape_news(topics)
        result = json.loads(result_json)
        
        return jsonify({
            "success": True,
            "scraper_type": news_gatherer.scraper_type,
            "test_topics": topics,
            "articles_found": len(result.get('articles', [])),
            "sample_articles": result.get('articles', [])[:2],  # Show first 2 articles
            "full_result": result
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "scraper_type": news_gatherer.scraper_type
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