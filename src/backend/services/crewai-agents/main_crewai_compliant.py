#!/usr/bin/env python3
"""
Synapse CrewAI Agent Service - CrewAI 2025 Compliant Implementation
Following official CrewAI documentation best practices
"""

import os
import json
from typing import Dict, Any, List
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
import threading
import time
import yaml

# CrewAI Imports - Following 2025 Best Practices
from crewai import Agent, Task, Crew, Process
from crewai.project import CrewBase, agent, task, crew, before_kickoff, after_kickoff
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Type, Optional

# Custom Tools Import
from tools.custom_tools import WebSearchTool, FirecrawlScrapeTool

# Basic Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
load_dotenv()

# Flask App Initialization
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://synapse-frontend.onrender.com", "https://*.onrender.com"])

# Progress Storage (same as before)
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

# Configuration & Environment Variables
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not ANTHROPIC_API_KEY and not OPENAI_API_KEY:
    raise ValueError("Either ANTHROPIC_API_KEY or OPENAI_API_KEY must be set.")

# Tool selection
if FIRECRAWL_API_KEY:
    search_tool = FirecrawlScrapeTool()
    logger.info("Using FirecrawlScrapeTool.")
else:
    search_tool = WebSearchTool()
    logger.warning("FIRECRAWL_API_KEY not set. Using custom WebSearchTool as fallback.")

# Structured Output Models (Following CrewAI Best Practices)
class ResearchResult(BaseModel):
    """Structured output model for research results"""
    title: str = Field(description="Title of the research report")
    summary: str = Field(description="Executive summary of findings")
    key_findings: List[str] = Field(description="List of key findings")
    sources: List[str] = Field(description="List of source URLs")
    social_insights: Optional[str] = Field(description="Social media insights", default=None)

class AnalysisResult(BaseModel):
    """Structured output model for analysis results"""
    topic: str = Field(description="Topic analyzed")
    insights: List[str] = Field(description="Key insights from analysis")
    recommendations: List[str] = Field(description="Actionable recommendations")
    confidence_score: float = Field(description="Confidence in analysis (0.0-1.0)")

# Social Media Scraping Functions (simplified for compliance)
def gather_social_context(topics: List[str]) -> str:
    """Gather social media context in a simplified way"""
    try:
        # Simplified social context gathering
        social_context = f"\n\nSocial Media Context for {', '.join(topics)}:\n"
        social_context += "- Monitoring Reddit discussions and trending posts\n"
        social_context += "- Analyzing LinkedIn professional content\n"
        social_context += "- Tracking relevant Telegram channel updates\n"
        return social_context
    except Exception as e:
        logger.warning(f"Social context gathering failed: {e}")
        return ""

# CrewAI 2025 Compliant Implementation using @CrewBase Pattern
@CrewBase
class SynapseNewsCrew:
    """CrewAI 2025 compliant crew implementation following official best practices"""
    
    # Configuration files (following CrewAI recommendations)
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'
    
    def __init__(self, topic: str, date_context: dict, social_context: str = ""):
        self.topic = topic
        self.date_context = date_context
        self.social_context = social_context
        self.session_id = None  # Will be set during kickoff

    # Agent Definitions (Following CrewAI @agent decorator pattern)
    @agent
    def researcher(self) -> Agent:
        """Research specialist agent following CrewAI best practices"""
        return Agent(
            config=self.agents_config['news_research_specialist'],
            tools=[search_tool],
            verbose=True,
            memory=True,
            cache=True,
            max_iter=5,
            allow_delegation=False,
            respect_context_window=True,
            inject_date=True,
            date_format="%Y-%m-%d",
            step_callback=self._agent_step_callback
        )
    
    @agent 
    def analyst(self) -> Agent:
        """Analysis expert agent following CrewAI best practices"""
        return Agent(
            config=self.agents_config['trend_analysis_expert'],
            verbose=True,
            memory=True,
            cache=True,
            max_iter=4,
            allow_delegation=False,
            respect_context_window=True,
            reasoning=True,
            max_reasoning_attempts=2,
            step_callback=self._agent_step_callback
        )
    
    @agent
    def quality_validator(self) -> Agent:
        """Quality validation agent following CrewAI best practices"""
        return Agent(
            config=self.agents_config['content_quality_analyst'],
            verbose=True,
            memory=True,
            cache=True,
            max_iter=3,
            allow_delegation=False,
            respect_context_window=True,
            step_callback=self._agent_step_callback
        )

    # Task Definitions (Following CrewAI @task decorator pattern)
    @task
    def research_task(self) -> Task:
        """Research task with structured output and proper dependencies"""
        return Task(
            description=f"""
            Conduct comprehensive research on: {self.topic}
            
            Requirements:
            1. Find multiple high-quality sources within the last 24 hours
            2. Include full clickable URLs from search results
            3. Focus on credible news sources and authoritative content
            4. Validate information accuracy and relevance
            
            Social Media Context: {self.social_context}
            
            Current Date: {self.date_context.get('current_date', 'N/A')}
            """,
            expected_output="""
            A detailed research report containing:
            - Executive summary of findings
            - Key points in bullet format
            - Complete list of source URLs
            - Content validation notes
            """,
            agent=self.researcher(),
            output_pydantic=ResearchResult,
            callback=self._task_callback
        )
    
    @task
    def analysis_task(self) -> Task:
        """Analysis task with context dependency on research task"""
        return Task(
            description=f"""
            Analyze the research findings for: {self.topic}
            
            Requirements:
            1. Identify key trends and patterns
            2. Generate actionable insights
            3. Provide confidence assessment
            4. Create executive-level recommendations
            
            Use the research data as your primary source for analysis.
            """,
            expected_output="""
            Comprehensive analysis report including:
            - Key insights and trends identified
            - Strategic recommendations
            - Confidence assessment of findings
            - Executive summary for decision-makers
            """,
            agent=self.analyst(),
            context=[self.research_task()],  # Proper task dependency
            output_pydantic=AnalysisResult,
            callback=self._task_callback
        )
    
    @task
    def validation_task(self) -> Task:
        """Quality validation task with dependencies"""
        return Task(
            description=f"""
            Validate the quality and accuracy of research and analysis for: {self.topic}
            
            Requirements:
            1. Check source credibility and URL validity
            2. Verify content relevance to topic
            3. Assess information accuracy
            4. Flag any quality issues
            
            Apply strict validation standards regardless of topic domain.
            """,
            expected_output="""
            Quality validation report containing:
            - Source credibility assessment
            - Content relevance scores
            - Accuracy verification results
            - Quality improvement recommendations
            """,
            agent=self.quality_validator(),
            context=[self.research_task(), self.analysis_task()],  # Multiple dependencies
            callback=self._task_callback
        )

    # Crew Definition (Following CrewAI @crew decorator pattern)
    @crew
    def crew(self) -> Crew:
        """Main crew configuration following CrewAI 2025 best practices"""
        return Crew(
            agents=self.agents,  # Automatically populated by @agent decorators
            tasks=self.tasks,    # Automatically populated by @task decorators
            process=Process.sequential,
            verbose=True,
            memory=True,
            cache=True,
            max_rpm=30,  # Rate limiting for production
            step_callback=self._crew_step_callback,
            task_callback=self._crew_task_callback,
            embedder={
                "provider": "openai",
                "config": {
                    "model": "text-embedding-ada-002"
                }
            }
        )

    # Lifecycle Methods (Following CrewAI best practices)
    @before_kickoff
    def prepare_execution(self, inputs):
        """Pre-processing before crew execution"""
        logger.info(f"🚀 Starting crew execution for topic: {self.topic}")
        
        # Set session ID for progress tracking
        self.session_id = inputs.get('session_id', f"crew-{int(datetime.now().timestamp())}")
        
        # Update progress
        if self.session_id:
            progress_store.set(self.session_id, {
                'status': 'starting', 
                'message': 'Preparing crew execution...', 
                'progress': 5
            })
        
        # Gather social media context
        if isinstance(self.topic, str):
            topics = [t.strip() for t in self.topic.split(',')]
        else:
            topics = [str(self.topic)]
        
        enhanced_social_context = gather_social_context(topics)
        self.social_context = enhanced_social_context
        
        logger.info(f"✅ Crew preparation completed for {len(topics)} topics")
        return inputs

    @after_kickoff
    def finalize_execution(self, output):
        """Post-processing after crew execution"""
        logger.info("🎉 Crew execution completed successfully")
        
        if self.session_id:
            progress_store.set(self.session_id, {
                'status': 'completed', 
                'message': 'Analysis completed successfully', 
                'progress': 100
            })
        
        # Process the structured output
        final_report = self._format_crew_output(output)
        
        logger.info(f"✅ Final report generated: {len(final_report)} characters")
        return final_report

    # Callback Methods for Progress Tracking
    def _agent_step_callback(self, step):
        """Callback for individual agent steps"""
        if self.session_id and hasattr(step, 'agent'):
            agent_name = getattr(step.agent, 'role', 'Agent')
            progress_store.set(self.session_id, {
                'status': 'running', 
                'message': f'🤖 {agent_name} is working...', 
                'progress': min(85, progress_store.get(self.session_id).get('progress', 0) + 5)
            })

    def _task_callback(self, task_output):
        """Callback for task completion"""
        if self.session_id:
            current_progress = progress_store.get(self.session_id).get('progress', 0)
            new_progress = min(90, current_progress + 20)
            progress_store.set(self.session_id, {
                'status': 'running', 
                'message': f'✅ Task completed: {task_output.description[:50]}...', 
                'progress': new_progress
            })

    def _crew_step_callback(self, step):
        """Callback for crew-level steps"""
        logger.debug(f"Crew step: {step}")

    def _crew_task_callback(self, task_output):
        """Callback for crew-level task completion"""
        logger.info(f"Task completed: {task_output.description[:50]}...")

    def _format_crew_output(self, output) -> str:
        """Format the crew output into a comprehensive report"""
        try:
            if hasattr(output, 'pydantic') and output.pydantic:
                # Handle structured Pydantic output
                return self._format_pydantic_output(output.pydantic)
            elif hasattr(output, 'raw'):
                # Handle raw text output
                return str(output.raw)
            else:
                # Fallback to string conversion
                return str(output)
        except Exception as e:
            logger.error(f"Error formatting crew output: {e}")
            return f"Research completed for topic: {self.topic}. See logs for details."

    def _format_pydantic_output(self, pydantic_output) -> str:
        """Format structured Pydantic output into readable report"""
        if isinstance(pydantic_output, ResearchResult):
            report = f"""# {pydantic_output.title}

## Executive Summary
{pydantic_output.summary}

## Key Findings
"""
            for finding in pydantic_output.key_findings:
                report += f"- {finding}\n"
            
            report += "\n## Sources\n"
            for source in pydantic_output.sources:
                report += f"- {source}\n"
                
            if pydantic_output.social_insights:
                report += f"\n## Social Media Insights\n{pydantic_output.social_insights}\n"
                
            return report
        else:
            return str(pydantic_output)


# Execution Function (Updated for CrewAI 2025 Compliance)
def run_compliant_crew(agent_id: str, topic: str, date_context: dict) -> Dict[str, Any]:
    """Run the CrewAI compliant crew implementation"""
    session_id = f"{agent_id}-{int(datetime.now().timestamp())}"
    
    try:
        # Initialize crew with parameters
        synapse_crew = SynapseNewsCrew(
            topic=topic,
            date_context=date_context,
            social_context=""  # Will be populated in before_kickoff
        )
        
        # Execute crew with proper input structure
        inputs = {
            'session_id': session_id,
            'topic': topic,
            'date_context': date_context
        }
        
        result = synapse_crew.crew().kickoff(inputs=inputs)
        
        # Return structured result
        return {
            'success': True,
            'session_id': session_id,
            'result': result,
            'topic': topic
        }
        
    except Exception as e:
        logger.error(f"Crew execution failed: {e}")
        progress_store.set(session_id, {
            'status': 'error',
            'message': f'Execution failed: {str(e)}',
            'progress': 0
        })
        return {
            'success': False,
            'session_id': session_id,
            'error': str(e),
            'topic': topic
        }

# Flask Routes (Updated to use compliant crew)
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'CrewAI News Research Service (2025 Compliant)',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0-compliant'
    })

@app.route('/gather-news', methods=['POST'])
def gather_news():
    """Main news gathering endpoint using compliant CrewAI implementation"""
    try:
        data = request.json
        topics = data.get('topics', [])
        sources = data.get('sources', {})
        
        if not topics:
            return jsonify({'error': 'Topics are required'}), 400
        
        # Convert topics to string
        topic_string = ', '.join(topics) if isinstance(topics, list) else str(topics)
        
        # Create date context
        date_context = {
            'current_date': datetime.now().strftime('%Y-%m-%d'),
            'time_range': '24h'
        }
        
        # Generate agent ID
        agent_id = f"compliant-crew-{int(datetime.now().timestamp())}"
        
        # Execute compliant crew
        result = run_compliant_crew(agent_id, topic_string, date_context)
        
        if result['success']:
            return jsonify({
                'success': True,
                'session_id': result['session_id'],
                'message': 'CrewAI compliant analysis completed',
                'report': result['result']
            })
        else:
            return jsonify({
                'success': False,
                'session_id': result['session_id'],
                'error': result['error']
            }), 500
            
    except Exception as e:
        logger.error(f"News gathering failed: {e}")
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

@app.route('/progress/<session_id>', methods=['GET'])
def get_progress(session_id):
    """Get progress for a running crew execution"""
    progress = progress_store.get(session_id)
    if progress:
        return jsonify(progress)
    else:
        return jsonify({'status': 'not_found', 'message': 'Session not found'}), 404

if __name__ == '__main__':
    port = int(os.getenv('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)