"""
Simple CrewAI test implementation for debugging dashboard functionality
This creates a working crew that generates mock data to test the progress tracking
"""

import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Callable
from crewai import Agent, Task, Crew, Process

logger = logging.getLogger(__name__)

class SimpleTestCrew:
    """Simple crew for testing dashboard functionality with mock data"""
    
    def __init__(self):
        self.agents = self._create_simple_agents()
        
    def _create_simple_agents(self) -> Dict[str, Agent]:
        """Create simple test agents"""
        
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        # Simple News Researcher
        news_researcher = Agent(
            role='News Research Specialist',
            goal=f'Generate sample news data for testing. Current date: {current_date}',
            backstory=f'You create realistic sample news articles for testing purposes. Today is {current_date}.',
            verbose=True,
            allow_delegation=False
        )
        
        # Simple Content Analyst
        content_analyst = Agent(
            role='Content Quality Analyst',
            goal=f'Analyze and format the sample news data. Current date: {current_date}',
            backstory=f'You review and format sample news data for quality. Today is {current_date}.',
            verbose=True,
            allow_delegation=False
        )
        
        # Simple Trend Analyst
        trend_analyst = Agent(
            role='Trend Analysis Expert',
            goal=f'Identify trends in the sample data. Current date: {current_date}',
            backstory=f'You analyze sample data for trending topics. Today is {current_date}.',
            verbose=True,
            allow_delegation=False
        )
        
        return {
            'news_researcher': news_researcher,
            'content_analyst': content_analyst,
            'trend_analyst': trend_analyst
        }
    
    def research_news_simple(self, topics: List[str], sources: Dict[str, bool] = None, progress_callback: Callable = None) -> Dict[str, Any]:
        """Execute simple crew with mock data generation"""
        
        if not sources:
            sources = {'reddit': True, 'linkedin': True, 'telegram': True}
        
        current_date = datetime.now().strftime('%Y-%m-%d')
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
        
        # Progress tracking setup
        progress_steps = [
            {'agent': 'News Research Specialist', 'step': 'Generating sample news articles', 'status': 'pending'},
            {'agent': 'Content Quality Analyst', 'step': 'Analyzing sample content quality', 'status': 'pending'},
            {'agent': 'Trend Analysis Expert', 'step': 'Identifying sample trends', 'status': 'pending'},
            {'agent': 'Crew', 'step': 'Generating final report', 'status': 'pending'}
        ]
        
        def update_progress(step_index: int, status: str, message: str = None):
            if step_index < len(progress_steps):
                progress_steps[step_index]['status'] = status
                if message:
                    progress_steps[step_index]['message'] = message
                    
                agent = progress_steps[step_index]['agent']
                step = progress_steps[step_index]['step']
                logger.info(f"🔄 [{agent}] {step} - {status.upper()}")
                if message:
                    logger.info(f"📝 [{agent}] {message}")
                    
                if progress_callback:
                    progress_callback({
                        'step': step_index + 1,
                        'total_steps': len(progress_steps),
                        'agent': agent,
                        'description': step,
                        'status': status,
                        'message': message,
                        'timestamp': datetime.now().isoformat()
                    })
        
        try:
            logger.info(f"🚀 Starting simple crew test for topics: {topics}")
            
            # Task 1: Generate sample data
            update_progress(0, 'in_progress', 'Creating sample news articles...')
            
            sample_task = Task(
                description=f"Create 5 sample news articles about: {', '.join(topics)}. "
                           f"Make them realistic but clearly marked as test data. "
                           f"Include titles, descriptions, and mock URLs.",
                agent=self.agents['news_researcher'],
                expected_output="A list of 5 sample news articles as structured data."
            )
            
            # Task 2: Format the data
            formatting_task = Task(
                description="Format the sample news articles with quality scores and metadata. "
                           "Ensure each article has proper structure for display.",
                agent=self.agents['content_analyst'],
                context=[sample_task],
                expected_output="Formatted news articles with quality scores and metadata."
            )
            
            # Task 3: Analyze trends
            trend_task = Task(
                description="Identify 2-3 trending topics from the sample articles. "
                           "Create a brief trend analysis report.",
                agent=self.agents['trend_analyst'],
                context=[formatting_task],
                expected_output="A trend analysis report with key topics and insights."
            )
            
            # Create crew
            crew = Crew(
                agents=list(self.agents.values()),
                tasks=[sample_task, formatting_task, trend_task],
                process=Process.sequential,
                verbose=True
            )
            
            # Execute with progress tracking
            logger.info("🎯 Executing simple crew tasks...")
            
            # Simulate step-by-step execution
            update_progress(0, 'in_progress', 'News Research Specialist working...')
            time.sleep(2)  # Simulate work
            
            update_progress(0, 'completed', 'Sample articles generated successfully')
            update_progress(1, 'in_progress', 'Content Quality Analyst reviewing...')
            time.sleep(2)  # Simulate work
            
            update_progress(1, 'completed', 'Content analysis completed')
            update_progress(2, 'in_progress', 'Trend Analysis Expert working...')
            time.sleep(2)  # Simulate work
            
            update_progress(2, 'completed', 'Trend analysis completed')
            update_progress(3, 'in_progress', 'Generating final report...')
            
            # Execute the crew
            result = crew.kickoff()
            
            update_progress(3, 'completed', 'Final report generated successfully')
            
            # Generate mock articles for the backend to process
            mock_articles = self._generate_mock_articles(topics, sources)
            
            logger.info(f"✅ Simple crew test completed successfully")
            
            # Create validated_articles by combining all organized content
            all_articles = []
            all_articles.extend(mock_articles.get("reddit", []))
            all_articles.extend(mock_articles.get("linkedin", []))
            all_articles.extend(mock_articles.get("telegram", []))
            all_articles.extend(mock_articles.get("news", []))
            
            return {
                "status": "success",
                "result": {
                    "organized_content": {
                        "reddit_posts": mock_articles.get("reddit", []),
                        "linkedin_posts": mock_articles.get("linkedin", []),
                        "telegram_messages": mock_articles.get("telegram", []),
                        "news_articles": mock_articles.get("news", [])
                    },
                    "validated_articles": all_articles,  # Add this field that TypeScript expects
                    "executive_summary": [
                        f"Generated {len(mock_articles.get('reddit', []))} Reddit posts about {', '.join(topics)}",
                        f"Created {len(mock_articles.get('linkedin', []))} LinkedIn posts about {', '.join(topics)}",
                        f"Produced {len(mock_articles.get('telegram', []))} Telegram messages about {', '.join(topics)}"
                    ],
                    "trending_topics": [
                        {"topic": topics[0] if topics else "AI", "mentions": 15, "trending_score": 0.85},
                        {"topic": topics[1] if len(topics) > 1 else "Technology", "mentions": 12, "trending_score": 0.78}
                    ]
                },
                "progress_steps": progress_steps,
                "total_steps_completed": len([s for s in progress_steps if s['status'] == 'completed']),
                "current_date": current_date,
                "execution_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Simple crew test failed: {str(e)}")
            update_progress(0, 'failed', f"Error: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "progress_steps": progress_steps,
                "failed_at": datetime.now().isoformat()
            }
    
    def _generate_mock_articles(self, topics: List[str], sources: Dict[str, bool]) -> Dict[str, List[Dict]]:
        """Generate mock articles for testing"""
        
        mock_data = {}
        
        if sources.get('reddit', True):
            mock_data['reddit'] = [
                {
                    "id": f"test_reddit_{i}",
                    "title": f"Test Reddit Post about {topics[0] if topics else 'AI'} #{i+1}",
                    "content": f"This is a test Reddit post about {topics[0] if topics else 'AI'}. Generated for dashboard testing.",
                    "url": f"https://reddit.com/r/technology/comments/test_{i}",
                    "author": f"test_user_{i}",
                    "score": 100 + i * 10,
                    "num_comments": 25 + i * 5,
                    "subreddit": "technology",
                    "created_utc": int(datetime.now().timestamp()) - (i * 3600),
                    "published_date": datetime.now().isoformat(),
                    "simulated": True
                }
                for i in range(3)
            ]
        
        if sources.get('linkedin', True):
            mock_data['linkedin'] = [
                {
                    "id": f"test_linkedin_{i}",
                    "title": f"Test LinkedIn Post about {topics[0] if topics else 'AI'} #{i+1}",
                    "content": f"Professional insights on {topics[0] if topics else 'AI'}. This is test data for dashboard testing.",
                    "url": f"https://linkedin.com/posts/test-user-{i}",
                    "author": f"Test Professional {i}",
                    "engagement": {"likes": 50 + i * 10, "comments": 10 + i * 2},
                    "published_date": datetime.now().isoformat(),
                    "simulated": True
                }
                for i in range(2)
            ]
        
        if sources.get('telegram', True):
            mock_data['telegram'] = [
                {
                    "id": f"test_telegram_{i}",
                    "title": f"Test Telegram Message about {topics[0] if topics else 'AI'} #{i+1}",
                    "content": f"Telegram discussion about {topics[0] if topics else 'AI'}. Test message for dashboard functionality.",
                    "url": f"https://t.me/test_channel/{i+100}",
                    "channel": "test_channel",
                    "views": 200 + i * 50,
                    "message_id": i + 100,
                    "published_date": datetime.now().isoformat(),
                    "simulated": True
                }
                for i in range(2)
            ]
        
        return mock_data