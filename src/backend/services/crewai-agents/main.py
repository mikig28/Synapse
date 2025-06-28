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
from langchain_community.tools import DuckDuckGoSearchRun
from crewai_tools import FirecrawlSearchTool

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

if not ANTHROPIC_API_KEY and not OPENAI_API_KEY:
    raise ValueError("Either ANTHROPIC_API_KEY or OPENAI_API_KEY must be set.")

if FIRECRAWL_API_KEY:
    search_tool = FirecrawlSearchTool()
    logger.info("Using FirecrawlSearchTool.")
else:
    search_tool = DuckDuckGoSearchRun()
    logger.warning("FIRECRAWL_API_KEY not set. Using DuckDuckGoSearchRun as fallback.")

# --- AGENTS ---
researcher_agent = Agent(
    role="Expert Researcher",
    goal="Find the most relevant and up-to-date information on any given topic using available web search tools.",
    backstory=(
        "You are a master of the internet, capable of finding, extracting, and summarizing "
        "information from any website. You are skilled in using search tools to quickly "
        "identify the most credible and relevant sources. You are thorough and meticulous, "
        "ensuring that the information you provide is accurate and comprehensive."
    ),
    tools=[search_tool],
    allow_delegation=False,
    verbose=True
)

analyst_agent = Agent(
    role="Senior News Analyst",
    goal="Analyze the research findings to produce a concise, insightful, and engaging report.",
    backstory=(
        "You are an experienced news analyst with a talent for identifying key trends, "
        "synthesizing complex information, and crafting compelling narratives. "
        "You transform raw data into a clear, executive-level summary that is both informative and easy to digest."
    ),
    allow_delegation=False,
    verbose=True
)


# --- TASKS ---
def create_research_task(topic: str, date_context: dict) -> Task:
    """Creates a research task for a given topic and date context."""
    time_range_hours = date_context.get('time_range', '24h').replace('h','')
    return Task(
        description=(
            f"Conduct a comprehensive search for the topic: '{topic}'. "
            "Use your search tool to find multiple high-quality articles, posts, and discussions. "
            f"Focus on information published within the last {time_range_hours} hours, "
            f"relative to the current date: {date_context.get('current_date', 'N/A')}. "
            "Synthesize the findings to provide a comprehensive overview. "
            "Your final output must be a detailed report with key points and include the URLs of the sources used."
        ),
        expected_output=(
            "A detailed report on the topic, including an introduction, key findings with bullet points, "
            "and a conclusion. The report must include at least 5 URLs to the most relevant sources found."
        ),
        agent=researcher_agent,
    )

def create_analysis_task(topic: str) -> Task:
    """Creates an analysis task to summarize the research."""
    return Task(
        description=f"Analyze the research report on '{topic}' and create a final, polished executive summary.",
        expected_output=(
            "A concise and insightful summary of the research findings. It should be well-structured, "
            "engaging, and easy to read for a busy executive. Include a title, a brief introduction, "
            "bullet points for key insights, and a concluding sentence."
        ),
        agent=analyst_agent,
    )


# --- CREW ---
def run_crew(agent_id: str, topic: str, date_context: dict) -> Dict[str, Any]:
    """Runs the research and analysis crew."""
    session_id = f"{agent_id}-{int(datetime.now().timestamp())}"
    progress_store.set(session_id, {'status': 'starting', 'message': 'Crew execution started.', 'progress': 0})

    try:
        research_task = create_research_task(topic, date_context)
        analysis_task = create_analysis_task(topic)

        news_crew = Crew(
            agents=[researcher_agent, analyst_agent],
            tasks=[research_task, analysis_task],
            process=Process.sequential,
            verbose=True,
        )

        progress_store.set(session_id, {'status': 'running', 'message': 'Crew is researching and analyzing.', 'progress': 25})
        result = news_crew.kickoff()
        progress_store.set(session_id, {'status': 'completed', 'message': 'Crew finished execution.', 'progress': 100})

        final_report = str(result) if result is not None else "No content was generated."
        return {"status": "success", "sessionId": session_id, "report": final_report}

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
        "dependencies": {
            "OpenAI or Anthropic Key": "Set" if OPENAI_API_KEY or ANTHROPIC_API_KEY else "Not Set",
            "Firecrawl Key": "Set" if FIRECRAWL_API_KEY else "Not Set (using fallback)"
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
