"""
CrewAI Tool Wrapper
Converts custom tools to CrewAI-compatible tool format
"""

import json
from typing import Any, Dict, List, Optional
from crewai_tools import BaseTool as CrewAIBaseTool
from custom_tools import AVAILABLE_TOOLS, get_tool, BaseTool

class CrewAIToolWrapper(CrewAIBaseTool):
    """Wrapper to make custom tools compatible with CrewAI agents"""
    
    def __init__(self, custom_tool: BaseTool):
        self.custom_tool = custom_tool
        # Set CrewAI tool properties
        self.name = custom_tool.name
        self.description = custom_tool.description
        super().__init__()
    
    def _run(self, **kwargs) -> str:
        """Execute the custom tool and return results as JSON string"""
        try:
            result = self.custom_tool.execute(**kwargs)
            return json.dumps(result, indent=2, default=str)
        except Exception as e:
            error_result = {
                "success": False,
                "error": str(e),
                "tool": self.custom_tool.name
            }
            return json.dumps(error_result, indent=2)

# Create CrewAI-compatible versions of all custom tools
def get_crewai_tools() -> Dict[str, CrewAIToolWrapper]:
    """Get all custom tools wrapped for CrewAI compatibility"""
    crewai_tools = {}
    
    for tool_name, custom_tool in AVAILABLE_TOOLS.items():
        try:
            crewai_tools[tool_name] = CrewAIToolWrapper(custom_tool)
        except Exception as e:
            print(f"Failed to wrap tool {tool_name}: {str(e)}")
    
    return crewai_tools

def get_crewai_tool(tool_name: str) -> Optional[CrewAIToolWrapper]:
    """Get a specific CrewAI-compatible tool by name"""
    custom_tool = get_tool(tool_name)
    if custom_tool:
        return CrewAIToolWrapper(custom_tool)
    return None

# Pre-create all wrapped tools for easy access
CREWAI_TOOLS = get_crewai_tools()

def get_tools_for_agent(agent_type: str) -> List[CrewAIToolWrapper]:
    """Get recommended tools for specific agent types"""
    
    tool_recommendations = {
        'news_researcher': ['web_search', 'firecrawl_scrape', 'url_validator'],
        'content_analyst': ['news_analysis', 'firecrawl_scrape'],
        'url_validator': ['url_validator', 'web_scrape'],
        'trend_analyst': ['news_analysis', 'web_search'],
        'social_monitor': ['web_search', 'web_scrape']
    }
    
    recommended_tools = tool_recommendations.get(agent_type, ['web_search', 'web_scrape'])
    
    tools = []
    for tool_name in recommended_tools:
        tool = CREWAI_TOOLS.get(tool_name)
        if tool:
            tools.append(tool)
    
    return tools

def list_available_crewai_tools() -> List[str]:
    """List all available CrewAI-compatible tool names"""
    return list(CREWAI_TOOLS.keys())