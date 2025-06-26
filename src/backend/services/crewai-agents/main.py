import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from crewai import Crew, Process

# Load environment variables from .env file
load_dotenv()

# Import agents and tools
from agents.news_scraper_agent import NewsScraperAgent
from agents.reddit_agent import RedditScraperAgent
from agents.linkedin_agent import LinkedInScraperAgent
from agents.telegram_agent import TelegramMonitorAgent
from agents.news_analyst_agent import NewsAnalystAgent

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

class NewsGatheringCrew:
    def __init__(self):
        # Initialize agents
        self.news_scraper = NewsScraperAgent().agent
        self.reddit_scraper = RedditScraperAgent().agent
        self.linkedin_scraper = LinkedInScraperAgent().agent
        self.telegram_monitor = TelegramMonitorAgent().agent
        self.analyst = NewsAnalystAgent().agent

    def run(self, topics: str):
        """Run the news gathering and analysis crew."""
        logging.info(f"Starting news gathering crew for topics: {topics}")

        # Define tasks for each agent
        tasks = {
            'news': self.news_scraper.tools[0]._run(topics=topics),
            'reddit': self.reddit_scraper.tools[0]._run(topics=topics),
            'linkedin': self.linkedin_scraper.tools[0]._run(topics=topics),
            'telegram': self.telegram_monitor.tools[0]._run(topics=topics)
        }

        # Aggregate results from all scrapers
        aggregated_data = {}
        for source, result_json in tasks.items():
            try:
                aggregated_data[source] = json.loads(result_json)
            except json.JSONDecodeError:
                logging.error(f"Failed to decode JSON from {source}")
                aggregated_data[source] = {'success': False, 'error': 'Invalid JSON response'}

        # Final analysis task
        analysis_input = json.dumps(aggregated_data)
        final_report_json = self.analyst.tools[0]._run(news_data=analysis_input, topics=topics)
        
        try:
            return json.loads(final_report_json)
        except json.JSONDecodeError:
            logging.error("Failed to decode the final analysis report.")
            return {'success': False, 'error': 'Failed to generate the final report.'}

# Initialize the crew
news_crew = NewsGatheringCrew()

@app.route('/gather-news', methods=['POST'])
def gather_news_endpoint():
    data = request.get_json()
    if not data or 'topics' not in data:
        return jsonify({'error': 'Missing "topics" in request body'}), 400
    
    topics = ",".join(data['topics'])
    
    try:
        result = news_crew.run(topics)
        return jsonify(result)
    except Exception as e:
        logging.error(f"An error occurred during the news gathering process: {e}", exc_info=True)
        return jsonify({'error': f'An internal error occurred: {e}'}), 500

@app.route('/test-agents', methods=['POST'])
def test_agents_endpoint():
    """Endpoint to test each data-gathering agent individually."""
    data = request.get_json()
    if not data or 'topics' not in data:
        return jsonify({'error': 'Missing "topics" in request body'}), 400
    
    topics = ",".join(data['topics'])
    
    results = {}
    agents_to_test = {
        "news_scraper": NewsScraperAgent(),
        "reddit_scraper": RedditScraperAgent(),
        "linkedin_scraper": LinkedInScraperAgent(),
        "telegram_monitor": TelegramMonitorAgent()
    }

    for name, agent_instance in agents_to_test.items():
        try:
            tool_output = agent_instance.tool._run(topics=topics)
            results[name] = json.loads(tool_output)
        except Exception as e:
            results[name] = {'success': False, 'error': str(e)}
            
    return jsonify(results)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)