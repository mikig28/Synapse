#!/usr/bin/env python3
"""
Simple Working CrewAI Implementation
No complex decorators, just basic CrewAI functionality that should work
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import time
import threading

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Flask imports
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize Flask
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://synapse-frontend.onrender.com", "https://*.onrender.com"])

# Progress Storage (simple version)
class SimpleProgressStore:
    def __init__(self):
        self.store = {}
        self.lock = threading.Lock()

    def set(self, key: str, data: Dict[str, Any]):
        with self.lock:
            self.store[key] = data

    def get(self, key: str) -> Dict[str, Any]:
        with self.lock:
            return self.store.get(key, {})

progress_store = SimpleProgressStore()

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Test CrewAI imports
def test_crewai_imports():
    """Test if we can import CrewAI components"""
    try:
        from crewai import Agent, Task, Crew, Process
        logger.info("✅ CrewAI core imports successful")
        return True, None
    except Exception as e:
        logger.error(f"❌ CrewAI imports failed: {e}")
        return False, str(e)

# Simple CrewAI implementation
def run_simple_crew(session_id: str, topic: str) -> Dict[str, Any]:
    """Simple CrewAI implementation without complex features"""
    
    # Test imports first
    crewai_available, error = test_crewai_imports()
    
    progress_store.set(session_id, {
        'status': 'starting',
        'message': 'Initializing research crew...',
        'progress': 10
    })
    
    if not crewai_available:
        # Return error details
        return {
            'success': False,
            'error': f'CrewAI not available: {error}',
            'session_id': session_id,
            'implementation': 'import_failed'
        }
    
    try:
        # Import here after we know it works
        from crewai import Agent, Task, Crew, Process
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Creating research agent...',
            'progress': 30
        })
        
        # Create a simple researcher agent
        researcher = Agent(
            role="Senior News Researcher",
            goal=f"Research comprehensive information about {topic}",
            backstory=f"""You are an expert researcher specializing in {topic}. 
            You excel at finding credible sources, analyzing information, and 
            providing well-structured research reports.""",
            verbose=True,
            allow_delegation=False
        )
        
        progress_store.set(session_id, {
            'status': 'running', 
            'message': 'Creating research task...',
            'progress': 50
        })
        
        # Create a simple research task
        research_task = Task(
            description=f"""
            Conduct comprehensive research on: {topic}
            
            Your research should include:
            1. Key developments and recent news
            2. Important trends and patterns
            3. Relevant statistics or data points
            4. Expert opinions and analysis
            5. Future implications and outlook
            
            Provide a well-structured report with clear sections and key findings.
            """,
            expected_output=f"""
            A comprehensive research report about {topic} with:
            - Executive summary
            - Key findings (bullet points)
            - Recent developments
            - Expert insights
            - Future outlook
            """,
            agent=researcher
        )
        
        progress_store.set(session_id, {
            'status': 'running',
            'message': 'Executing research...',
            'progress': 70
        })
        
        # Create and run the crew
        research_crew = Crew(
            agents=[researcher],
            tasks=[research_task],
            process=Process.sequential,
            verbose=False
        )
        
        # Execute the crew
        result = research_crew.kickoff()
        
        progress_store.set(session_id, {
            'status': 'completed',
            'message': 'Research completed successfully',
            'progress': 100
        })
        
        return {
            'success': True,
            'result': str(result),
            'session_id': session_id,
            'topic': topic,
            'implementation': 'simple_crewai'
        }
        
    except Exception as e:
        logger.error(f"❌ Simple CrewAI execution failed: {e}")
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
    """Simple health check"""
    crewai_available, error = test_crewai_imports()
    
    return jsonify({
        'status': 'healthy',
        'service': 'Simple CrewAI Service',
        'timestamp': datetime.now().isoformat(),
        'crewai_available': crewai_available,
        'crewai_error': error,
        'api_keys': {
            'openai': bool(OPENAI_API_KEY),
            'anthropic': bool(ANTHROPIC_API_KEY)
        }
    })

@app.route('/debug', methods=['GET'])
def debug_dependencies():
    """Debug endpoint to check what's available"""
    try:
        # Run the debug script programmatically
        import subprocess
        result = subprocess.run([sys.executable, 'debug_dependencies.py'], 
                              capture_output=True, text=True, cwd=os.path.dirname(__file__))
        
        return jsonify({
            'debug_output': result.stdout,
            'debug_errors': result.stderr,
            'exit_code': result.returncode
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/gather-news', methods=['POST'])  
def gather_news():
    """Simple news gathering endpoint"""
    try:
        data = request.json
        topics = data.get('topics', [])
        
        if not topics:
            return jsonify({'error': 'Topics are required'}), 400
            
        topic_string = ', '.join(topics) if isinstance(topics, list) else str(topics)
        session_id = f"simple-{int(datetime.now().timestamp())}"
        
        # Run simple crew
        result = run_simple_crew(session_id, topic_string)
        
        if result['success']:
            return jsonify({
                'success': True,
                'session_id': result['session_id'],
                'message': f'Research completed using {result["implementation"]}',
                'report': result['result']
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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10000))
    logger.info(f"🚀 Starting simple CrewAI service on port {port}")
    
    # Test CrewAI on startup
    crewai_available, error = test_crewai_imports()
    if crewai_available:
        logger.info("✅ CrewAI is available and ready")
    else:
        logger.error(f"❌ CrewAI is not available: {error}")
        
    app.run(host='0.0.0.0', port=port, debug=False)