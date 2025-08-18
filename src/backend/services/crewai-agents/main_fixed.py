#!/usr/bin/env python3
"""
CrewAI Service with Direct Fix for ResponseTextConfig Issue
"""

import os
import sys
import logging

# Set up logging early
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CRITICAL: Apply the fix BEFORE any other imports that might use CrewAI
logger.info("🔧 Applying ResponseTextConfig fix...")
try:
    from fix_response_config import apply_fix
    fix_applied = apply_fix()
    
    if not fix_applied:
        logger.error("❌ Could not apply ResponseTextConfig fix")
        sys.exit(1)
    
    logger.info("✅ ResponseTextConfig fix applied successfully")
    
except Exception as e:
    logger.error(f"❌ Fix failed: {e}")
    sys.exit(1)

# NOW import the rest - after the fix is applied
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List
import time
import threading

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Flask imports
from flask import Flask, request, jsonify
from flask_cors import CORS

# NOW try CrewAI imports - should work after the fix
try:
    from crewai import Agent, Task, Crew, Process
    logger.info("✅ CrewAI imports successful after fix!")
    CREWAI_WORKING = True
except Exception as e:
    logger.error(f"❌ CrewAI still failing after fix: {e}")
    CREWAI_WORKING = False
    sys.exit(1)

# Initialize Flask
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://synapse-frontend.onrender.com", "https://*.onrender.com"])

# Progress Storage
class ProgressStore:
    def __init__(self):
        self.store = {}
        self.lock = threading.Lock()

    def set(self, key: str, data: Dict[str, Any]):
        with self.lock:
            self.store[key] = data

    def get(self, key: str) -> Dict[str, Any]:
        with self.lock:
            return self.store.get(key, {})

progress_store = ProgressStore()

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not OPENAI_API_KEY and not ANTHROPIC_API_KEY:
    logger.warning("⚠️ No API keys found - functionality will be limited")

# CrewAI Implementation (2025 compliant with fix applied)
def run_fixed_crew(session_id: str, topic: str) -> Dict[str, Any]:
    """Run CrewAI with the ResponseTextConfig fix applied - 2025 compliant"""
    
    progress_store.set(session_id, {
        'status': 'starting',
        'message': 'Starting CrewAI 2025 research with fix applied...',
        'progress': 10
    })
    
    try:
        logger.info(f"🚀 Starting CrewAI 2025 research for: {topic}")
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Creating research agents with 2025 best practices...',
            'progress': 30
        })
        
        # Create researcher agent with 2025 best practices
        researcher = Agent(
            role="Senior Research Analyst",
            goal=f"Conduct comprehensive research on {topic} and provide detailed insights with reliable sources",
            backstory=f"""You are a senior research analyst with expertise in {topic}. 
            You have access to various information sources and excel at:
            - Finding credible and up-to-date information
            - Analyzing trends and patterns from reliable sources
            - Providing structured, actionable insights
            - Citing reliable sources and evidence with full URLs
            - Following 2025 research best practices
            
            Your research is thorough, well-organized, and provides real value to decision makers.
            Always include complete source URLs in your findings.""",
            verbose=True,
            allow_delegation=False,
            memory=True,
            cache=True,  # 2025 feature
            max_iter=5,  # 2025 best practice
            respect_context_window=True  # 2025 feature
        )
        
        # Create analysis agent with 2025 features
        analyst = Agent(
            role="Strategic Analyst",
            goal=f"Analyze research findings about {topic} and provide strategic recommendations",
            backstory="""You are a strategic analyst who excels at synthesizing research 
            into actionable insights. You can identify key trends, implications, and 
            provide strategic recommendations based on research findings.
            
            You follow 2025 analysis best practices:
            - Structured reasoning approaches
            - Evidence-based recommendations
            - Confidence scoring for insights
            - Executive-level strategic thinking""",
            verbose=True,
            allow_delegation=False,
            memory=True,
            cache=True,  # 2025 feature
            max_iter=4,  # 2025 best practice
            respect_context_window=True,  # 2025 feature
            reasoning=True  # 2025 feature
        )
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Creating 2025 compliant research tasks...',
            'progress': 50
        })
        
        # Research task with 2025 best practices
        research_task = Task(
            description=f"""
            Conduct comprehensive research on: {topic}
            
            2025 Research Requirements:
            1. Current state and recent developments (within 24-48 hours)
            2. Key trends and patterns with supporting data
            3. Important statistics and data points with sources
            4. Expert opinions and analysis from credible sources
            5. Future implications and opportunities
            6. Relevant case studies or examples
            7. Complete source URLs for all information
            8. Fact-checking and source validation
            
            Focus on credible sources and provide a well-structured analysis.
            Include specific examples and evidence to support your findings.
            Always include complete, clickable URLs in your source list.
            
            Current date context: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}
            """,
            expected_output=f"""
            A comprehensive 2025-standard research report on {topic} including:
            - Executive summary with key findings
            - Detailed analysis with supporting evidence and full source URLs
            - Current trends and developments with timestamps
            - Statistical insights and data points with source attribution
            - Expert perspectives and opinions with proper citations
            - Future outlook and implications based on evidence
            - Actionable recommendations with confidence levels
            - Complete bibliography with working URLs
            """,
            agent=researcher,
            callback=lambda step: progress_store.set(session_id, {
                'status': 'running', 
                'message': f'Research in progress: {step.action if hasattr(step, "action") else "processing"}',
                'progress': 60
            })
        )
        
        # Analysis task with 2025 features
        analysis_task = Task(
            description=f"""
            Based on the research findings about {topic}, provide strategic analysis using 2025 best practices:
            
            2025 Analysis Requirements:
            1. Synthesize the key findings into actionable insights
            2. Identify the most important trends and implications with confidence scoring
            3. Assess opportunities and challenges with risk assessment
            4. Provide strategic recommendations with implementation roadmap
            5. Highlight areas requiring further attention with priority ranking
            6. Use structured reasoning and evidence-based conclusions
            7. Include executive summary for decision-makers
            
            Your analysis should be strategic, forward-looking, and practical.
            Apply 2025 analytical frameworks and reasoning approaches.
            """,
            expected_output=f"""
            Strategic analysis report (2025 standard) including:
            - Executive summary for leadership
            - Key insights and implications with confidence scores
            - Strategic opportunities identified with feasibility assessment
            - Potential challenges and risks with mitigation strategies
            - Actionable recommendations with implementation timeline
            - Priority areas for focus with resource requirements
            - Next steps and considerations with success metrics
            - Reasoning trace showing analytical methodology
            """,
            agent=analyst,
            context=[research_task],  # Proper task dependency
            callback=lambda step: progress_store.set(session_id, {
                'status': 'running', 
                'message': f'Analysis in progress: {step.action if hasattr(step, "action") else "synthesizing"}',
                'progress': 80
            })
        )
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Executing 2025 research crew...',
            'progress': 70
        })
        
        # Create and run the crew with 2025 best practices
        research_crew = Crew(
            agents=[researcher, analyst],
            tasks=[research_task, analysis_task],
            process=Process.sequential,
            verbose=False,
            memory=True,
            cache=True,  # 2025 feature
            max_rpm=30,  # 2025 rate limiting
            language="en",  # 2025 explicit language setting
            full_output=True,  # 2025 feature for complete results
            step_callback=lambda step: logger.info(f"Crew step: {step}") if hasattr(step, 'action') else None
        )
        
        logger.info("🔄 Executing CrewAI crew...")
        result = research_crew.kickoff()
        
        progress_store.set(session_id, {
            'status': 'completed',
            'message': 'Research and analysis completed successfully',
            'progress': 100
        })
        
        logger.info("✅ CrewAI execution completed successfully")
        
        return {
            'success': True,
            'result': str(result),
            'session_id': session_id,
            'topic': topic,
            'implementation': 'crewai_2025_fixed',
            'version': 'CrewAI 2025 with ResponseTextConfig fix',
            'features_enabled': ['memory', 'cache', 'reasoning', 'context_awareness', 'rate_limiting']
        }
        
    except Exception as e:
        logger.error(f"❌ CrewAI execution failed: {e}")
        progress_store.set(session_id, {
            'status': 'error',
            'message': f'Execution failed: {str(e)}',
            'progress': 0
        })
        
        return {
            'success': False,
            'error': str(e),
            'session_id': session_id,
            'topic': topic,
            'implementation': 'execution_failed'
        }

# Flask routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check with 2025 compliance status"""
    return jsonify({
        'status': 'healthy',
        'service': 'CrewAI 2025 Service (ResponseTextConfig Fixed)',
        'version': 'CrewAI 2025 with Comprehensive Fix',
        'timestamp': datetime.now().isoformat(),
        'crewai_working': CREWAI_WORKING,
        'fix_applied': True,
        'compliance': '2025_best_practices',
        'features': {
            'response_text_config_fix': True,
            'response_text_config_param_fix': True,
            'crewai_2025_features': True,
            'memory_enabled': True,
            'cache_enabled': True,
            'reasoning_enabled': True,
            'context_awareness': True
        },
        'api_keys': {
            'openai': bool(OPENAI_API_KEY),
            'anthropic': bool(ANTHROPIC_API_KEY),
            'reddit': bool(REDDIT_CLIENT_ID),
            'telegram': bool(TELEGRAM_BOT_TOKEN)
        }
    })

@app.route('/gather-news', methods=['POST'])  
def gather_news():
    """Main news gathering endpoint with fixed CrewAI"""
    try:
        data = request.json
        topics = data.get('topics', [])
        
        if not topics:
            return jsonify({'error': 'Topics are required'}), 400
            
        topic_string = ', '.join(topics) if isinstance(topics, list) else str(topics)
        session_id = f"fixed-{int(datetime.now().timestamp())}"
        
        # Run fixed CrewAI implementation
        result = run_fixed_crew(session_id, topic_string)
        
        if result['success']:
            return jsonify({
                'success': True,
                'session_id': result['session_id'],
                'message': f'Research completed using {result["implementation"]}',
                'report': result['result'],
                'implementation': result['implementation']
            })
        else:
            return jsonify({
                'success': False,
                'session_id': result['session_id'],
                'error': result['error'],
                'implementation': result['implementation']
            }), 500
            
    except Exception as e:
        logger.error(f"❌ Endpoint failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/progress/<session_id>', methods=['GET'])
def get_progress(session_id):
    """Get progress for a session"""
    progress = progress_store.get(session_id)
    if progress:
        return jsonify(progress)
    else:
        return jsonify({'status': 'not_found', 'message': 'Session not found'}), 404

@app.route('/test-fix', methods=['GET'])
def test_fix():
    """Test endpoint to verify the fix is working"""
    try:
        # Test the specific import that was failing
        from openai.types.responses.response import ResponseTextConfig
        
        return jsonify({
            'fix_working': True,
            'message': 'ResponseTextConfig import successful',
            'crewai_available': CREWAI_WORKING
        })
    except Exception as e:
        return jsonify({
            'fix_working': False,
            'error': str(e),
            'crewai_available': CREWAI_WORKING
        })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10000))
    logger.info(f"🚀 Starting fixed CrewAI service on port {port}")
    logger.info(f"✅ CrewAI Status: {'Working' if CREWAI_WORKING else 'Failed'}")
    
    if CREWAI_WORKING:
        logger.info("🎉 Full CrewAI functionality available!")
    else:
        logger.error("❌ CrewAI not available - check logs above")
        
    app.run(host='0.0.0.0', port=port, debug=False)