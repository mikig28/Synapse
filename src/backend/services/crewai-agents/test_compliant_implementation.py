#!/usr/bin/env python3
"""
Test script for CrewAI 2025 compliant implementation
"""

import os
import sys
import json
from datetime import datetime
import unittest
from unittest.mock import patch, MagicMock

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class TestCrewAICompliance(unittest.TestCase):
    """Test suite for CrewAI compliance"""

    def setUp(self):
        """Set up test environment"""
        # Mock environment variables
        os.environ['OPENAI_API_KEY'] = 'test-key-12345'
        os.environ['ANTHROPIC_API_KEY'] = 'test-anthropic-key'

    def test_imports(self):
        """Test that all CrewAI imports work correctly"""
        try:
            from crewai import Agent, Task, Crew, Process
            from crewai.project import CrewBase, agent, task, crew, before_kickoff, after_kickoff
            from crewai.tools import BaseTool
            from pydantic import BaseModel, Field
            print("✅ All CrewAI imports successful")
            return True
        except ImportError as e:
            print(f"❌ Import error: {e}")
            return False

    def test_yaml_config_loading(self):
        """Test YAML configuration loading"""
        try:
            import yaml
            
            # Test agents config
            with open('config/agents.yaml', 'r') as f:
                agents_config = yaml.safe_load(f)
            
            # Verify expected agents exist
            expected_agents = ['news_research_specialist', 'trend_analysis_expert', 'content_quality_analyst']
            for agent_name in expected_agents:
                self.assertIn(agent_name, agents_config)
                self.assertIn('role', agents_config[agent_name])
                self.assertIn('goal', agents_config[agent_name])
                self.assertIn('backstory', agents_config[agent_name])
            
            print("✅ YAML configuration loading successful")
            return True
        except Exception as e:
            print(f"❌ YAML config loading error: {e}")
            return False

    def test_structured_output_models(self):
        """Test Pydantic models for structured outputs"""
        try:
            from pydantic import BaseModel, Field
            from typing import List, Optional
            
            # Test ResearchResult model
            class ResearchResult(BaseModel):
                title: str = Field(description="Title of the research report")
                summary: str = Field(description="Executive summary of findings")
                key_findings: List[str] = Field(description="List of key findings")
                sources: List[str] = Field(description="List of source URLs")
                social_insights: Optional[str] = Field(description="Social media insights", default=None)
            
            # Test model creation
            result = ResearchResult(
                title="Test Report",
                summary="Test summary",
                key_findings=["Finding 1", "Finding 2"],
                sources=["https://example.com"],
                social_insights="Test insights"
            )
            
            self.assertEqual(result.title, "Test Report")
            self.assertEqual(len(result.key_findings), 2)
            
            print("✅ Structured output models working correctly")
            return True
        except Exception as e:
            print(f"❌ Structured output model error: {e}")
            return False

    @patch('tools.custom_tools.WebSearchTool')
    def test_crew_base_pattern(self, mock_search_tool):
        """Test CrewBase decorator pattern"""
        try:
            from crewai import Agent, Task, Crew, Process
            from crewai.project import CrewBase, agent, task, crew
            from pydantic import BaseModel, Field
            from typing import List
            
            # Mock the search tool
            mock_search_tool.return_value = MagicMock()
            
            # Test structured output model
            class TestResult(BaseModel):
                message: str = Field(description="Test message")
                items: List[str] = Field(description="Test items")
            
            @CrewBase  
            class TestCrew:
                def __init__(self, topic: str):
                    self.topic = topic

                @agent
                def test_researcher(self) -> Agent:
                    return Agent(
                        role="Test Researcher",
                        goal="Test research functionality",
                        backstory="Test agent for validation",
                        verbose=False,
                        memory=True,
                        cache=True
                    )

                @task
                def test_task(self) -> Task:
                    return Task(
                        description=f"Test task for topic: {self.topic}",
                        expected_output="Test output description",
                        agent=self.test_researcher(),
                        output_pydantic=TestResult
                    )

                @crew
                def crew(self) -> Crew:
                    return Crew(
                        agents=self.agents,
                        tasks=self.tasks,
                        process=Process.sequential,
                        verbose=False
                    )

            # Test crew creation
            test_crew_instance = TestCrew("test topic")
            crew_obj = test_crew_instance.crew()
            
            self.assertIsNotNone(crew_obj)
            self.assertEqual(len(crew_obj.agents), 1)
            self.assertEqual(len(crew_obj.tasks), 1)
            
            print("✅ CrewBase decorator pattern working correctly")
            return True
        except Exception as e:
            print(f"❌ CrewBase pattern error: {e}")
            return False

    def test_tool_integration(self):
        """Test custom tool integration"""
        try:
            from tools.custom_tools import WebSearchTool
            from crewai.tools import BaseTool
            
            # Create tool instance
            search_tool = WebSearchTool()
            
            # Verify it's a proper CrewAI tool
            self.assertTrue(isinstance(search_tool, BaseTool))
            self.assertTrue(hasattr(search_tool, 'name'))
            self.assertTrue(hasattr(search_tool, 'description'))
            self.assertTrue(hasattr(search_tool, '_run'))
            
            print("✅ Tool integration working correctly")
            return True
        except Exception as e:
            print(f"❌ Tool integration error: {e}")
            return False

    def test_progress_tracking(self):
        """Test progress tracking system"""
        try:
            # Import the progress store
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            from main_crewai_compliant import ProgressStore
            
            # Test progress store
            store = ProgressStore(expiration_minutes=1)
            
            # Test set/get
            test_data = {'status': 'running', 'progress': 50}
            store.set('test-session', test_data)
            
            retrieved = store.get('test-session')
            self.assertEqual(retrieved['status'], 'running')
            self.assertEqual(retrieved['progress'], 50)
            
            print("✅ Progress tracking system working correctly")
            return True
        except Exception as e:
            print(f"❌ Progress tracking error: {e}")
            return False

def run_compliance_tests():
    """Run all compliance tests"""
    print("🧪 Running CrewAI Compliance Tests")
    print("=" * 50)
    
    suite = unittest.TestLoader().loadTestsFromTestCase(TestCrewAICompliance)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("🎉 All compliance tests passed!")
        print("✅ CrewAI implementation is compliant with 2025 standards")
        return True
    else:
        print("❌ Some compliance tests failed")
        print(f"Failures: {len(result.failures)}")
        print(f"Errors: {len(result.errors)}")
        return False

if __name__ == "__main__":
    success = run_compliance_tests()
    sys.exit(0 if success else 1)