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

# CrewAI Implementation (should work now)
def run_fixed_crew(session_id: str, topic: str) -> Dict[str, Any]:
    """Run CrewAI with the ResponseTextConfig fix applied"""
    
    progress_store.set(session_id, {
        'status': 'starting',
        'message': 'Starting CrewAI research with fix applied...',
        'progress': 10
    })
    
    try:
        logger.info(f"🚀 Starting CrewAI research for: {topic}")
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Creating research agents...',
            'progress': 30
        })
        
        # Create researcher agent with tools if available
        researcher = Agent(
            role="Senior Research Analyst",
            goal=f"Conduct comprehensive research on {topic} and provide detailed insights",
            backstory=f"""You are a senior research analyst with expertise in {topic}. 
            You have access to various information sources and excel at:
            - Finding credible and up-to-date information
            - Analyzing trends and patterns
            - Providing structured, actionable insights
            - Citing reliable sources and evidence
            
            Your research is thorough, well-organized, and provides real value to decision makers.""",
            verbose=True,
            allow_delegation=False,
            memory=True
        )
        
        # Create analysis agent
        analyst = Agent(
            role="Strategic Analyst",
            goal=f"Analyze research findings about {topic} and provide strategic recommendations",
            backstory="""You are a strategic analyst who excels at synthesizing research 
            into actionable insights. You can identify key trends, implications, and 
            provide strategic recommendations based on research findings.""",
            verbose=True,
            allow_delegation=False,
            memory=True
        )
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Creating research tasks...',
            'progress': 50
        })
        
        # Research task
        research_task = Task(
            description=f"""
            Conduct comprehensive research on: {topic}
            
            Your research should cover:
            1. Current state and recent developments
            2. Key trends and patterns
            3. Important statistics and data points
            4. Expert opinions and analysis
            5. Future implications and opportunities
            6. Relevant case studies or examples
            
            Focus on credible sources and provide a well-structured analysis.
            Include specific examples and evidence to support your findings.
            """,
            expected_output=f"""
            A comprehensive research report on {topic} including:
            - Executive summary with key findings
            - Detailed analysis with supporting evidence
            - Current trends and developments
            - Statistical insights and data points
            - Expert perspectives and opinions
            - Future outlook and implications
            - Actionable recommendations
            """,
            agent=researcher
        )
        
        # Analysis task
        analysis_task = Task(
            description=f"""
            Based on the research findings about {topic}, provide strategic analysis:
            
            1. Synthesize the key findings into actionable insights
            2. Identify the most important trends and implications  
            3. Assess opportunities and challenges
            4. Provide strategic recommendations
            5. Highlight areas requiring further attention
            
            Your analysis should be strategic, forward-looking, and practical.
            """,
            expected_output=f"""
            Strategic analysis report including:
            - Key insights and implications
            - Strategic opportunities identified
            - Potential challenges and risks
            - Actionable recommendations
            - Priority areas for focus
            - Next steps and considerations
            """,
            agent=analyst,
            context=[research_task]  # This task depends on research_task
        )
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Executing research crew...',
            'progress': 70
        })
        
        # Create and run the crew
        research_crew = Crew(
            agents=[researcher, analyst],
            tasks=[research_task, analysis_task],
            process=Process.sequential,
            verbose=False,
            memory=True
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
            'implementation': 'full_crewai_fixed'
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
    """Health check with fix status"""
    return jsonify({
        'status': 'healthy',
        'service': 'CrewAI Service (ResponseTextConfig Fixed)',
        'timestamp': datetime.now().isoformat(),
        'crewai_working': CREWAI_WORKING,
        'fix_applied': True,
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