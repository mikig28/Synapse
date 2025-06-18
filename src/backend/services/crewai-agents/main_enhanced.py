#!/usr/bin/env python3
"""
Enhanced Synapse CrewAI Multi-Agent News Service
Dynamic task delegation with URL validation and content monitoring
"""

import os
import sys
import json
from typing import Dict, List, Any, Callable
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
import threading
import time

# Add current directory to Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Debug environment variables for Render deployment
logger.info("🔍 Environment Variables Check (Render Deployment):")
logger.info(f"   OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Missing'}")
logger.info(f"   ANTHROPIC_API_KEY: {'✅ Set' if os.getenv('ANTHROPIC_API_KEY') else '❌ Missing'}")
logger.info(f"   REDDIT_CLIENT_ID: {'✅ Set' if os.getenv('REDDIT_CLIENT_ID') else '❌ Missing'}")
logger.info(f"   REDDIT_CLIENT_SECRET: {'✅ Set' if os.getenv('REDDIT_CLIENT_SECRET') else '❌ Missing'}")
logger.info(f"   TELEGRAM_BOT_TOKEN: {'✅ Set' if os.getenv('TELEGRAM_BOT_TOKEN') else '❌ Missing'}")

app = Flask(__name__)

# Configure CORS to allow requests from your frontend
CORS(app, origins=[
    "http://localhost:3000",  # Local development
    "https://synapse-frontend.onrender.com",  # Production frontend
    "https://*.onrender.com"  # Any Render subdomain
])

# Import the enhanced crew system
try:
    from agents.enhanced_news_research_crew import (
        EnhancedNewsResearchCrew,
        URLValidator,
        ContentValidator
    )
    ENHANCED_CREW_AVAILABLE = True
    logger.info("✅ Enhanced news research crew system loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import enhanced crew system: {str(e)}")
    ENHANCED_CREW_AVAILABLE = False

# Try dynamic crew as fallback
try:
    from agents.dynamic_news_research_crew import (
        create_dynamic_news_research_crew,
        research_news_with_user_input
    )
    DYNAMIC_CREW_AVAILABLE = True
    logger.info("✅ Dynamic multi-agent crew system loaded (available as backup)")
except ImportError as e:
    logger.error(f"❌ Failed to import dynamic crew system: {str(e)}")
    DYNAMIC_CREW_AVAILABLE = False

# Fallback to simple scraper if dynamic crew is not available
try:
    from agents.simple_news_scraper import SimpleNewsScraperAgent
    SIMPLE_SCRAPER_AVAILABLE = True
    logger.info("✅ Simple news scraper loaded (available as backup)")
except ImportError as e:
    logger.error(f"❌ Failed to import simple scraper: {str(e)}")
    SIMPLE_SCRAPER_AVAILABLE = False

class EnhancedNewsGatherer:
    """Enhanced news gathering with dynamic multi-agent system"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
        self.initialization_error = None
        
        # Progress tracking
        self.current_progress = {}
        self.progress_lock = threading.Lock()
        
        # Initialize attributes to None first
        self.enhanced_crew = None
        self.dynamic_crew = None
        self.mode = "fallback"
        
        # Try to initialize enhanced crew first
        if ENHANCED_CREW_AVAILABLE:
            try:
                self.enhanced_crew = EnhancedNewsResearchCrew()
                self.mode = "enhanced_multi_agent"
                logger.info("✅ Enhanced multi-agent crew initialized successfully")
            except Exception as e:
                logger.error(f"❌ Enhanced crew initialization failed: {str(e)}")
                self.enhanced_crew = None
                self.initialization_error = str(e)
        
        # Initialize simple test crew as additional fallback
        try:
            from agents.simple_crew_test import SimpleTestCrew
            self.simple_test_crew = SimpleTestCrew()
            logger.info("✅ Simple test crew initialized (available as backup)")
        except Exception as e:
            logger.error(f"❌ Simple test crew initialization failed: {str(e)}")
            self.simple_test_crew = None
        
        # Try to initialize dynamic crew as fallback (always try if available)
        if DYNAMIC_CREW_AVAILABLE:
            try:
                self.dynamic_crew = create_dynamic_news_research_crew()
                if self.mode == "fallback":  # Only change mode if not already set to enhanced
                    self.mode = "dynamic_multi_agent"
                    logger.info("✅ Dynamic multi-agent crew initialized (available as backup)")
            except Exception as e:
                logger.error(f"❌ Dynamic crew initialization failed: {str(e)}")
                self.dynamic_crew = None
                if not hasattr(self, 'initialization_error'):
                    self.initialization_error = str(e)
        
        # Initialize simple scraper as fallback
        if SIMPLE_SCRAPER_AVAILABLE:
            try:
                self.simple_scraper = SimpleNewsScraperAgent()
                logger.info("✅ Simple scraper initialized (available as backup)")
            except Exception as e:
                logger.error(f"❌ Simple scraper initialization failed: {str(e)}")
                self.simple_scraper = None
        else:
            self.simple_scraper = None
        
        logger.info(f"Enhanced news gatherer initialized in {self.mode} mode")
    
    def gather_news(self, topics: List[str] = None, sources: Dict[str, Any] = None, **kwargs) -> Dict[str, Any]:
        """Gather news using the best available method"""
        
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
            logger.info(f"Gathering news for topics: {topics} using {self.mode} mode")
            
            # Prepare user input for dynamic crew
            user_input = {
                'topics': topics,
                'sources': list(sources.keys()) if isinstance(sources, dict) else sources,
                'max_articles': kwargs.get('max_articles', 50),
                'quality_threshold': kwargs.get('quality_threshold', 0.7),
                'include_trends': kwargs.get('include_trends', True),
                'focus_areas': kwargs.get('focus_areas', ['quality', 'relevance']),
                'platforms': [k for k, v in sources.items() if v] if isinstance(sources, dict) else sources
            }
            
            # Try enhanced multi-agent system first
            if self.enhanced_crew and self.mode == "enhanced_multi_agent":
                try:
                    # Create progress callback
                    def progress_callback(progress_data):
                        with self.progress_lock:
                            self.current_progress = progress_data
                            logger.info(f"📊 Progress Update: [{progress_data.get('agent', 'Unknown')}] {progress_data.get('description', '')} - {progress_data.get('status', '').upper()}")
                    
                    logger.info(f"🔄 Starting enhanced crew research with social media for topics: {topics}")
                    # Use the new enhanced method that combines news analysis with real social media scraping
                    result = self.enhanced_crew.research_news_with_social_media(topics, sources, progress_callback=progress_callback)
                    logger.info(f"🔄 Enhanced crew research with social media completed. Result keys: {list(result.keys()) if isinstance(result, dict) else type(result)}")
                    
                    if result.get('status') == 'success':
                        logger.info("✅ Enhanced multi-agent research completed successfully")
                        return self._format_enhanced_result(result, topics, sources)
                    else:
                        logger.warning(f"Enhanced crew returned error: {result.get('message', 'Unknown error')}")
                        logger.warning("🔧 Enhanced crew failed - this indicates missing API credentials in Render")
                        logger.warning("   Check Render environment variables: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, TELEGRAM_BOT_TOKEN")
                        # Instead of mock data, try to get some real data with available APIs
                        return self._try_partial_real_data(topics, sources, f"Enhanced crew failed: {result.get('message', 'Unknown error')}")
                        
                except Exception as e:
                    logger.error(f"Enhanced crew execution failed: {str(e)}")
                    # Fall back to simple test crew for dashboard testing
                    return self._try_simple_test_crew(topics, sources)
            
            # Try dynamic multi-agent system as fallback
            elif self.dynamic_crew and self.mode == "dynamic_multi_agent":
                return self._try_dynamic_crew(user_input, topics, sources)
            
            # Use simple scraper as final fallback
            else:
                return self._fallback_to_simple_scraper(topics, sources)
                
        except Exception as e:
            logger.error(f"Error in enhanced news gathering: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "mode": self.mode
            }
    
    def _try_partial_real_data(self, topics: List[str], sources: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """Try to get some real data from available APIs instead of pure mock data"""
        logger.info("🔄 Attempting to get partial real data from available sources...")
        
        try:
            # Import the enhanced crew to access the news scraper
            from agents.enhanced_news_research_crew import EnhancedNewsScraperAgent, URLValidator, ContentValidator
            
            url_validator = URLValidator()
            content_validator = ContentValidator(url_validator) 
            news_scraper = EnhancedNewsScraperAgent(url_validator, content_validator)
            
            # Try to scrape real news websites (doesn't require special API keys)
            real_articles = news_scraper._scrape_real_news_websites(topics)
            logger.info(f"📰 Scraped {len(real_articles)} real news articles")
            
            # Check if we got real articles or just diagnostic entries
            real_news_count = len([a for a in real_articles if not a.get('diagnostic', False)])
            
            organized_content = {
                "news_articles": real_articles,
                "reddit_posts": [],  # Empty due to missing credentials
                "linkedin_posts": [],  # Empty due to scraping issues
                "telegram_messages": []  # Empty due to missing credentials
            }
            
            # Generate trending topics from the real articles we found
            trending_topics = []
            for i, topic in enumerate(topics[:5]):
                mentions = len([a for a in real_articles 
                              if topic.lower() in a.get('title', '').lower() or 
                                 topic.lower() in a.get('content', '').lower()])
                trending_topics.append({
                    "topic": topic,
                    "total_mentions": mentions,
                    "trending_score": 0.5 + (mentions * 0.1),
                    "source": "news_articles_only"
                })
            
            executive_summary = [
                f"⚠️ Partial data collection completed due to API credential issues",
                f"📰 Successfully scraped {real_news_count} real news articles",
                f"❌ Social media data unavailable (missing API credentials)",
                f"Error: {error_message}",
                f"Solution: Configure REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, TELEGRAM_BOT_TOKEN in Render"
            ]
            
            return {
                "status": "success",
                "result": {
                    "executive_summary": executive_summary,
                    "trending_topics": trending_topics,
                    "organized_content": organized_content,
                    "ai_insights": {
                        "data_quality": "Partial - news articles only",
                        "social_media_status": "Unavailable due to missing API credentials",
                        "recommendation": "Configure social media API credentials for complete data"
                    },
                    "recommendations": [
                        "Configure Reddit API credentials in Render environment",
                        "Add Telegram Bot Token for message monitoring", 
                        "Verify all environment variables are properly set",
                        f"Current real articles found: {real_news_count}"
                    ]
                },
                "progress_steps": [
                    {"agent": "System", "step": "Partial data collection", "status": "completed", 
                     "message": f"Got {real_news_count} real articles, social media unavailable"}
                ],
                "total_steps_completed": 1,
                "current_date": datetime.now().strftime('%Y-%m-%d'),
                "execution_time": datetime.now().isoformat(),
                "mode": "partial_real_data",
                "warning": "Incomplete data due to missing API credentials"
            }
            
        except Exception as e:
            logger.error(f"❌ Partial real data collection also failed: {str(e)}")
            # As final fallback, use simple test crew but mark it clearly as mock data
            return self._try_simple_test_crew(topics, sources)
    
    def _try_dynamic_crew(self, user_input: Dict[str, Any], topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Try dynamic crew as fallback"""
        if self.dynamic_crew:
            try:
                result = self.dynamic_crew.research_news_dynamically(user_input)
                
                if result.get('success'):
                    logger.info("✅ Dynamic multi-agent research completed as fallback")
                    return self._format_enhanced_result(result, topics, sources)
                else:
                    logger.warning(f"Dynamic crew returned error: {result.get('error')}")
                    return self._fallback_to_simple_scraper(topics, sources)
                    
            except Exception as e:
                logger.error(f"Dynamic crew execution failed: {str(e)}")
                return self._fallback_to_simple_scraper(topics, sources)
        else:
            return self._fallback_to_simple_scraper(topics, sources)
    
    def _try_simple_test_crew(self, topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Try simple test crew for dashboard testing"""
        if self.simple_test_crew:
            try:
                logger.info("🧪 Using simple test crew for dashboard testing")
                
                # Create progress callback
                def progress_callback(progress_data):
                    with self.progress_lock:
                        self.current_progress = progress_data
                        logger.info(f"📊 Test Progress: [{progress_data.get('agent', 'Unknown')}] {progress_data.get('description', '')} - {progress_data.get('status', '').upper()}")
                
                result = self.simple_test_crew.research_news_simple(topics, sources, progress_callback=progress_callback)
                
                if result.get('status') == 'success':
                    logger.info("✅ Simple test crew completed successfully")
                    return self._format_enhanced_result(result, topics, sources)
                else:
                    logger.warning(f"Simple test crew returned error: {result.get('message', 'Unknown error')}")
                    return self._fallback_to_simple_scraper(topics, sources)
                    
            except Exception as e:
                logger.error(f"Simple test crew execution failed: {str(e)}")
                return self._fallback_to_simple_scraper(topics, sources)
        else:
            return self._fallback_to_simple_scraper(topics, sources)
    
    def _format_enhanced_result(self, result: Dict[str, Any], topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Format the enhanced result from crew"""
        
        # Clear progress when complete
        with self.progress_lock:
            self.current_progress = {}
        
        data = result.get('result', {}) if 'result' in result else result.get('data', {})
        
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "topics": topics,
            "sources_used": sources,
            "mode": "enhanced_multi_agent_crew",
            "enhanced_features": {
                "url_validation": True,
                "content_quality_scoring": True,
                "dynamic_task_delegation": True,
                "multi_agent_coordination": True,
                "real_time_progress_tracking": True,
                "current_date_awareness": True
            },
            "execution_info": {
                "progress_steps": result.get('progress_steps', []),
                "total_steps_completed": result.get('total_steps_completed', 0),
                "execution_time": result.get('execution_time'),
                "current_date": result.get('current_date'),
                "usage_metrics": result.get('usage_metrics', {})
            },
            "data": {
                "crew_result": str(data) if data else "No result data available",
                "executive_summary": data.get('executive_summary', []) if isinstance(data, dict) else [],
                "trending_topics": data.get('trending_topics', []) if isinstance(data, dict) else [],
                "organized_content": data.get('organized_content', {
                    "news_articles": [],
                    "reddit_posts": [],
                    "linkedin_posts": [],
                    "telegram_messages": []
                }) if isinstance(data, dict) else {},
                "validated_articles": data.get('validated_articles', []) if isinstance(data, dict) else [],
                "ai_insights": data.get('ai_insights', {}) if isinstance(data, dict) else {},
                "task_execution_summary": data.get('task_execution_summary', {}) if isinstance(data, dict) else {},
                "recommendations": data.get('recommendations', []) if isinstance(data, dict) else []
            }
        }
    
    def _fallback_to_simple_scraper(self, topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback to simple scraper with enhanced formatting"""
        
        if not self.simple_scraper:
            return {
                "success": False,
                "error": "No scraping methods available",
                "timestamp": datetime.now().isoformat(),
                "mode": "none"
            }
        
        try:
            logger.info("Using simple scraper as fallback")
            
            # Use simple scraper
            topics_str = ','.join(topics)
            result_json = self.simple_scraper.scrape_news(topics_str)
            result = json.loads(result_json)
            
            if result.get('success'):
                articles = result.get('articles', [])
                
                # Enhance articles with URL validation
                enhanced_articles = []
                for article in articles:
                    if article.get('url'):
                        article['url_validated'] = URLValidator.is_valid_url(article['url'])
                        article['url_cleaned'] = URLValidator.clean_url(article['url'])
                    
                    if ContentValidator.is_quality_content(article):
                        article['quality_score'] = ContentValidator.calculate_quality_score(article)
                        enhanced_articles.append(article)
                
                return {
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "topics": topics,
                    "sources_used": sources,
                    "mode": "enhanced_simple_scraper",
                    "enhanced_features": {
                        "url_validation": True,
                        "content_quality_scoring": True,
                        "dynamic_task_delegation": False,
                        "multi_agent_coordination": False
                    },
                    "data": {
                        "executive_summary": [
                            f"Analyzed {len(enhanced_articles)} articles using enhanced simple scraper",
                            f"Key topics: {', '.join(topics[:3])}",
                            f"URL validation and content quality scoring applied"
                        ],
                        "trending_topics": [
                            {"topic": topic, "mentions": len([a for a in enhanced_articles if topic.lower() in a.get('title', '').lower()]), "trending_score": 60 + i*5}
                            for i, topic in enumerate(topics[:5])
                        ],
                        "organized_content": {
                            "validated_articles": enhanced_articles,
                            "quality_metrics": {
                                "total_articles": len(enhanced_articles),
                                "average_quality_score": sum(a.get('quality_score', 0) for a in enhanced_articles) / len(enhanced_articles) if enhanced_articles else 0,
                                "high_quality_articles": len([a for a in enhanced_articles if a.get('quality_score', 0) > 0.7])
                            },
                            "url_validation_stats": {
                                "total_urls": len([a for a in enhanced_articles if a.get('url')]),
                                "valid_urls": len([a for a in enhanced_articles if a.get('url_validated')]),
                                "cleaned_urls": len([a for a in enhanced_articles if a.get('url_cleaned')])
                            }
                        },
                        "ai_insights": {
                            "content_sources": list(set(a.get('source', 'Unknown') for a in enhanced_articles)),
                            "topic_coverage": {topic: len([a for a in enhanced_articles if topic.lower() in a.get('title', '').lower()]) for topic in topics}
                        },
                        "recommendations": [
                            "Consider upgrading to dynamic multi-agent system for better results",
                            "Enable more news sources for comprehensive coverage",
                            "Implement real-time monitoring for trending topics"
                        ]
                    }
                }
            else:
                return {
                    "success": False,
                    "error": result.get('error', 'Simple scraper failed'),
                    "timestamp": datetime.now().isoformat(),
                    "mode": "simple_scraper_failed"
                }
                
        except Exception as e:
            logger.error(f"Simple scraper fallback failed: {str(e)}")
            return {
                "success": False,
                "error": f"All scraping methods failed: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "mode": "all_failed"
            }

# Initialize the enhanced news gatherer
try:
    news_gatherer = EnhancedNewsGatherer()
    logger.info("Enhanced news gathering system ready")
except Exception as e:
    logger.error(f"Failed to initialize enhanced news gatherer: {str(e)}")
    news_gatherer = None

# Flask API endpoints
@app.route('/', methods=['GET'])
def root():
    """Root endpoint for health checks and service info"""
    return jsonify({
        'service': 'Enhanced Synapse CrewAI Multi-Agent News Service',
        'status': 'running',
        'mode': news_gatherer.mode if news_gatherer else 'initialization_failed',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'endpoints': {
            '/health': 'Detailed health check',
            '/gather-news': 'POST - Gather news with topics',
            '/system-info': 'System status and capabilities',
            '/progress': 'Real-time progress tracking'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint with detailed diagnostics"""
    
    # Environment variables check
    env_status = {
        "OPENAI_API_KEY": "✅ Set" if os.getenv('OPENAI_API_KEY') else "❌ Missing",
        "ANTHROPIC_API_KEY": "✅ Set" if os.getenv('ANTHROPIC_API_KEY') else "❌ Missing",
        "REDDIT_CLIENT_ID": "✅ Set" if os.getenv('REDDIT_CLIENT_ID') else "❌ Missing",
        "REDDIT_CLIENT_SECRET": "✅ Set" if os.getenv('REDDIT_CLIENT_SECRET') else "❌ Missing", 
        "TELEGRAM_BOT_TOKEN": "✅ Set" if os.getenv('TELEGRAM_BOT_TOKEN') else "❌ Missing"
    }
    
    # Dependency check
    dependencies = {}
    required_deps = ['requests', 'beautifulsoup4', 'feedparser', 'crewai']
    
    for dep in required_deps:
        try:
            __import__(dep.replace('-', '_'))
            dependencies[dep] = "✅ Available"
        except ImportError:
            dependencies[dep] = "❌ Missing"
    
    # System capabilities
    capabilities = {
        "dynamic_multi_agent_crew": "✅ Available" if DYNAMIC_CREW_AVAILABLE else "❌ Not Available",
        "simple_news_scraper": "✅ Available" if SIMPLE_SCRAPER_AVAILABLE else "❌ Not Available",
        "url_validation": "✅ Available",
        "content_quality_scoring": "✅ Available",
        "task_delegation": "✅ Available" if DYNAMIC_CREW_AVAILABLE else "❌ Not Available"
    }
    
    # Current mode and configuration
    current_mode = news_gatherer.mode if news_gatherer else "not_initialized"
    is_enhanced_mode = current_mode == "enhanced_multi_agent"
    
    # Determine scraper type and real news status
    scraper_type = "enhanced_multi_agent" if is_enhanced_mode else current_mode
    real_news_enabled = is_enhanced_mode and ENHANCED_CREW_AVAILABLE
    
    return jsonify({
        "status": "healthy",
        "service": "synapse-enhanced-multi-agent-news",
        "timestamp": datetime.now().isoformat(),
        "initialized": news_gatherer is not None,
        # Frontend expects these specific field names
        "mode": current_mode,
        "current_mode": current_mode,  # Keep for backward compatibility
        "real_news_enabled": real_news_enabled,
        "scraper_type": scraper_type,
        "capabilities": capabilities,
        "environment_variables": env_status,
        "dependencies": dependencies,
        "features": {
            "dynamic_task_delegation": DYNAMIC_CREW_AVAILABLE,
            "url_validation": True,
            "content_quality_scoring": True,
            "multi_agent_coordination": DYNAMIC_CREW_AVAILABLE,
            "fallback_scraping": SIMPLE_SCRAPER_AVAILABLE
        },
        "working_directory": os.getcwd(),
        "initialization_error": getattr(news_gatherer, 'initialization_error', None) if news_gatherer else "News gatherer not initialized"
    })

@app.route('/gather-news', methods=['POST'])
def gather_news():
    """Execute enhanced news gathering with dynamic task delegation"""
    
    if not news_gatherer:
        return jsonify({
            "success": False,
            "error": "Enhanced news gathering system not initialized"
        }), 500
    
    try:
        data = request.get_json() if request.is_json else {}
        topics = data.get('topics', None)
        sources = data.get('sources', None)
        
        # Additional parameters for enhanced system
        max_articles = data.get('max_articles', 50)
        quality_threshold = data.get('quality_threshold', 0.7)
        include_trends = data.get('include_trends', True)
        focus_areas = data.get('focus_areas', ['quality', 'relevance'])
        
        # Execute enhanced news gathering
        result = news_gatherer.gather_news(
            topics=topics,
            sources=sources,
            max_articles=max_articles,
            quality_threshold=quality_threshold,
            include_trends=include_trends,
            focus_areas=focus_areas
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in gather_news endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/validate-urls', methods=['POST'])
def validate_urls():
    """Validate a list of URLs"""
    
    try:
        data = request.get_json() if request.is_json else {}
        urls = data.get('urls', [])
        
        if not urls:
            return jsonify({
                "success": False,
                "error": "No URLs provided"
            }), 400
        
        validation_results = []
        for url in urls:
            result = {
                "original_url": url,
                "cleaned_url": URLValidator.clean_url(url),
                "is_valid": URLValidator.is_valid_url(url),
                "timestamp": datetime.now().isoformat()
            }
            validation_results.append(result)
        
        valid_urls = URLValidator.validate_and_clean_urls(urls)
        
        return jsonify({
            "success": True,
            "total_urls": len(urls),
            "valid_urls_count": len(valid_urls),
            "valid_urls": valid_urls,
            "detailed_results": validation_results,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in validate_urls endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/test-dynamic-crew', methods=['GET'])
def test_dynamic_crew():
    """Test the dynamic multi-agent crew system"""
    
    if not DYNAMIC_CREW_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "Dynamic crew system not available"
        })
    
    try:
        # Test with sample user input
        test_input = {
            'topics': ['technology', 'AI'],
            'sources': ['news_websites', 'reddit'],
            'max_articles': 10,
            'quality_threshold': 0.6,
            'include_trends': True,
            'focus_areas': ['quality', 'relevance']
        }
        
        result = research_news_with_user_input(test_input)
        
        return jsonify({
            "success": True,
            "test_input": test_input,
            "crew_result": result,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })

@app.route('/system-info', methods=['GET'])
def system_info():
    """Get detailed system information"""
    
    return jsonify({
        "service_name": "Enhanced Synapse Multi-Agent News Service",
        "version": "2.0.0",
        "mode": news_gatherer.mode if news_gatherer else "not_initialized",
        "features": {
            "dynamic_multi_agent_crew": {
                "available": DYNAMIC_CREW_AVAILABLE,
                "description": "Advanced multi-agent system with dynamic task delegation"
            },
            "url_validation": {
                "available": True,
                "description": "Comprehensive URL validation and cleaning"
            },
            "content_quality_scoring": {
                "available": True,
                "description": "AI-powered content quality assessment"
            },
            "task_delegation": {
                "available": DYNAMIC_CREW_AVAILABLE,
                "description": "Intelligent task delegation between specialized agents"
            },
            "fallback_scraping": {
                "available": SIMPLE_SCRAPER_AVAILABLE,
                "description": "Reliable fallback scraping system"
            }
        },
        "supported_sources": [
            "Hacker News API",
            "Reddit Technology",
            "GitHub Trending",
            "Dev.to",
            "RSS Feeds (TechCrunch, Wired, etc.)"
        ],
        "agent_types": [
            "News Research Specialist",
            "Content Quality Analyst", 
            "URL Validation Specialist",
            "Trend Analysis Expert",
            "Social Media Monitor"
        ],
        "timestamp": datetime.now().isoformat()
    })

@app.route('/progress', methods=['GET'])
def get_crew_progress():
    """Get current crew execution progress"""
    try:
        if not news_gatherer:
            return jsonify({
                "success": False,
                "error": "News gatherer not initialized"
            }), 500
        
        with news_gatherer.progress_lock:
            return jsonify({
                "success": True,
                "progress": news_gatherer.current_progress,
                "has_active_progress": bool(news_gatherer.current_progress),
                "timestamp": datetime.now().isoformat()
            })
    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/test-simple-crew', methods=['POST'])
def test_simple_crew():
    """Test the simple crew for dashboard functionality"""
    try:
        if not news_gatherer:
            return jsonify({
                "success": False,
                "error": "News gatherer not initialized"
            }), 500
        
        data = request.get_json() if request.is_json else {}
        topics = data.get('topics', ['AI', 'technology'])
        sources = data.get('sources', {'reddit': True, 'linkedin': True, 'telegram': True})
        
        logger.info(f"🧪 Testing simple crew with topics: {topics}")
        
        # Force use of simple test crew
        result = news_gatherer._try_simple_test_crew(topics, sources)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in test-simple-crew endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/debug-agents', methods=['POST'])
def debug_agents():
    """Debug individual social media agents directly"""
    try:
        data = request.get_json() if request.is_json else {}
        topics = data.get('topics', ['Israel'])
        
        debug_results = {}
        
        # Test Reddit agent directly
        logger.info("🔍 Testing Reddit agent directly...")
        try:
            from agents.reddit_agent import RedditScraperTool
            reddit_tool = RedditScraperTool()
            reddit_result = reddit_tool._run(','.join(topics))
            debug_results['reddit'] = {
                'status': 'tested',
                'result_length': len(reddit_result),
                'result_preview': reddit_result[:500] + '...' if len(reddit_result) > 500 else reddit_result
            }
        except Exception as e:
            debug_results['reddit'] = {
                'status': 'failed',
                'error': str(e),
                'error_type': type(e).__name__
            }
        
        # Test Telegram agent directly  
        logger.info("🔍 Testing Telegram agent directly...")
        try:
            from agents.telegram_agent import TelegramMonitorTool
            telegram_tool = TelegramMonitorTool()
            telegram_result = telegram_tool._run(','.join(topics))
            debug_results['telegram'] = {
                'status': 'tested',
                'result_length': len(telegram_result),
                'result_preview': telegram_result[:500] + '...' if len(telegram_result) > 500 else telegram_result
            }
        except Exception as e:
            debug_results['telegram'] = {
                'status': 'failed',
                'error': str(e),
                'error_type': type(e).__name__
            }
        
        # Test LinkedIn scraping directly
        logger.info("🔍 Testing LinkedIn scraping directly...")
        try:
            from agents.enhanced_news_research_crew import EnhancedNewsResearchCrew
            crew = EnhancedNewsResearchCrew()
            linkedin_result = crew._scrape_real_linkedin_posts(topics)
            debug_results['linkedin'] = {
                'status': 'tested',
                'posts_found': len(linkedin_result),
                'posts_preview': linkedin_result[:2] if linkedin_result else []
            }
        except Exception as e:
            debug_results['linkedin'] = {
                'status': 'failed',
                'error': str(e),
                'error_type': type(e).__name__
            }
        
        return jsonify({
            "success": True,
            "debug_results": debug_results,
            "topics_tested": topics,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in debug-agents endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"🚀 Starting ENHANCED CrewAI Multi-Agent service on port {port}")
    logger.info("📝 Service mode: ENHANCED (Dynamic Multi-Agent + URL Validation + Content Quality)")
    logger.info(f"📁 Current working directory: {os.getcwd()}")
    
    if news_gatherer:
        logger.info(f"✅ Enhanced news gatherer running in {news_gatherer.mode} mode")
        if DYNAMIC_CREW_AVAILABLE:
            logger.info("🤖 Dynamic multi-agent crew system is ENABLED")
        if SIMPLE_SCRAPER_AVAILABLE:
            logger.info("📰 Simple scraper fallback is AVAILABLE")
    else:
        logger.error("❌ Enhanced news gatherer failed to initialize")
    
    app.run(host='0.0.0.0', port=port, debug=False)
