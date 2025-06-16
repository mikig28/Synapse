"""
CrewAI Tool Wrapper
Converts custom tools to CrewAI-compatible tool format
"""

import json
from typing import Any, Dict, List, Optional

# Try different import paths for CrewAI tools
try:
    from crewai_tools import BaseTool as CrewAIBaseTool
except ImportError:
    try:
        from crewai.tools import BaseTool as CrewAIBaseTool
    except ImportError:
        # Create a minimal base tool if neither works
        class CrewAIBaseTool:
            def __init__(self):
                self.name = ""
                self.description = ""
            
            def _run(self, **kwargs) -> str:
                return ""

from custom_tools import AVAILABLE_TOOLS, get_tool, BaseTool

class CrewAIToolWrapper(CrewAIBaseTool):
    """Wrapper to make custom tools compatible with CrewAI agents"""
    
    def __init__(self, custom_tool: BaseTool):
        self.custom_tool = custom_tool
        # Set CrewAI tool properties
        self.name = custom_tool.name
        self.description = custom_tool.description
        try:
            super().__init__()
        except Exception:
            # If super().__init__() fails, just set the basic properties
            pass
    
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
    
    def run(self, **kwargs) -> str:
        """Alternative run method in case _run doesn't work"""
        return self._run(**kwargs)

# Create CrewAI-compatible versions of all custom tools
def get_crewai_tools() -> Dict[str, CrewAIToolWrapper]:
    """Get all custom tools wrapped for CrewAI compatibility"""
    crewai_tools = {}
    
    try:
        for tool_name, custom_tool in AVAILABLE_TOOLS.items():
            try:
                crewai_tools[tool_name] = CrewAIToolWrapper(custom_tool)
            except Exception as e:
                print(f"Failed to wrap tool {tool_name}: {str(e)}")
    except Exception as e:
        print(f"Error accessing AVAILABLE_TOOLS: {str(e)}")
        # Return empty dict if AVAILABLE_TOOLS is not accessible
        return {}
    
    return crewai_tools

def get_crewai_tool(tool_name: str) -> Optional[CrewAIToolWrapper]:
    """Get a specific CrewAI-compatible tool by name"""
    custom_tool = get_tool(tool_name)
    if custom_tool:
        return CrewAIToolWrapper(custom_tool)
    return None

# Pre-create all wrapped tools for easy access
try:
    CREWAI_TOOLS = get_crewai_tools()
except Exception as e:
    print(f"Failed to initialize CREWAI_TOOLS: {str(e)}")
    CREWAI_TOOLS = {}

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