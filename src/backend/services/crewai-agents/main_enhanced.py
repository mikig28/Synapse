#!/usr/bin/env python3
"""
Enhanced Synapse CrewAI Multi-Agent News Service
Dynamic task delegation with URL validation and content monitoring
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
    logger.info("✅ Dynamic multi-agent crew system loaded as fallback")
except ImportError as e:
    logger.error(f"❌ Failed to import dynamic crew system: {str(e)}")
    DYNAMIC_CREW_AVAILABLE = False

# Fallback to simple scraper if dynamic crew is not available
try:
    from agents.simple_news_scraper import SimpleNewsScraperAgent
    SIMPLE_SCRAPER_AVAILABLE = True
    logger.info("✅ Simple news scraper loaded as fallback")
except ImportError as e:
    logger.error(f"❌ Failed to import simple scraper: {str(e)}")
    SIMPLE_SCRAPER_AVAILABLE = False

class EnhancedNewsGatherer:
    """Enhanced news gathering with dynamic multi-agent system"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
        self.initialization_error = None
        
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
        
        # Try to initialize dynamic crew as fallback (always try if available)
        if DYNAMIC_CREW_AVAILABLE:
            try:
                self.dynamic_crew = create_dynamic_news_research_crew()
                if self.mode == "fallback":  # Only change mode if not already set to enhanced
                    self.mode = "dynamic_multi_agent"
                    logger.info("✅ Dynamic multi-agent crew initialized as fallback")
            except Exception as e:
                logger.error(f"❌ Dynamic crew initialization failed: {str(e)}")
                self.dynamic_crew = None
                if not hasattr(self, 'initialization_error'):
                    self.initialization_error = str(e)
        
        # Initialize simple scraper as fallback
        if SIMPLE_SCRAPER_AVAILABLE:
            try:
                self.simple_scraper = SimpleNewsScraperAgent()
                logger.info("✅ Simple scraper initialized as fallback")
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
                    result = self.enhanced_crew.research_news(topics, sources)
                    
                    if result.get('success'):
                        logger.info("✅ Enhanced multi-agent research completed successfully")
                        return self._format_enhanced_result(result, topics, sources)
                    else:
                        logger.warning(f"Enhanced crew returned error: {result.get('error')}")
                        # Fall back to dynamic crew
                        return self._try_dynamic_crew(user_input, topics, sources)
                        
                except Exception as e:
                    logger.error(f"Enhanced crew execution failed: {str(e)}")
                    # Fall back to dynamic crew
                    return self._try_dynamic_crew(user_input, topics, sources)
            
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
    
    def _format_enhanced_result(self, result: Dict[str, Any], topics: List[str], sources: Dict[str, Any]) -> Dict[str, Any]:
        """Format the enhanced result from dynamic crew"""
        
        data = result.get('data', {})
        
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "topics": topics,
            "sources_used": sources,
            "mode": "enhanced_dynamic_multi_agent",
            "enhanced_features": {
                "url_validation": True,
                "content_quality_scoring": True,
                "dynamic_task_delegation": True,
                "multi_agent_coordination": True
            },
            "data": {
                "executive_summary": data.get('executive_summary', []),
                "trending_topics": data.get('trending_topics', []),
                "organized_content": {
                    "validated_articles": data.get('validated_articles', []),
                    "quality_metrics": data.get('ai_insights', {}).get('quality_metrics', {}),
                    "source_distribution": data.get('ai_insights', {}).get('source_distribution', {}),
                    "url_validation_stats": data.get('ai_insights', {}).get('url_validation_stats', {})
                },
                "ai_insights": data.get('ai_insights', {}),
                "task_execution_summary": data.get('task_execution_summary', {}),
                "recommendations": data.get('recommendations', [])
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
    
    # Current mode
    current_mode = news_gatherer.mode if news_gatherer else "not_initialized"
    
    return jsonify({
        "status": "healthy",
        "service": "synapse-enhanced-multi-agent-news",
        "timestamp": datetime.now().isoformat(),
        "initialized": news_gatherer is not None,
        "current_mode": current_mode,
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
