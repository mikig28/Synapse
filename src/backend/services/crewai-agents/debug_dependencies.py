#!/usr/bin/env python3
"""
Debug script to understand what's actually installed and working
"""

import sys
import importlib
import traceback

def test_import(module_name, description=""):
    """Test importing a module and show details"""
    try:
        module = importlib.import_module(module_name)
        version = getattr(module, '__version__', 'Unknown')
        print(f"✅ {module_name}: v{version} {description}")
        return module
    except ImportError as e:
        print(f"❌ {module_name}: FAILED - {e}")
        return None
    except Exception as e:
        print(f"⚠️  {module_name}: ERROR - {e}")
        return None

def main():
    """Test all relevant imports"""
    print("🔍 Dependency Debug Report")
    print("=" * 50)
    
    # Test basic dependencies
    print("\n📦 Basic Dependencies:")
    test_import("flask", "(Web framework)")
    test_import("requests", "(HTTP client)")
    test_import("yaml", "(YAML parser)")
    test_import("pydantic", "(Data validation)")
    
    # Test AI/ML related
    print("\n🤖 AI/ML Dependencies:")
    openai = test_import("openai", "(OpenAI client)")
    if openai:
        print(f"   OpenAI location: {openai.__file__}")
    
    litellm = test_import("litellm", "(LiteLLM wrapper)")
    if litellm:
        print(f"   LiteLLM location: {litellm.__file__}")
        
    anthropic = test_import("anthropic", "(Anthropic client)")
    
    # Test CrewAI
    print("\n🚢 CrewAI Dependencies:")
    crewai = test_import("crewai", "(Main framework)")
    if crewai:
        print(f"   CrewAI location: {crewai.__file__}")
        
    # Test specific CrewAI components
    test_import("crewai.agent", "(Agent module)")
    test_import("crewai.task", "(Task module)")  
    test_import("crewai.crew", "(Crew module)")
    test_import("crewai.tools", "(Tools module)")
    
    # Test modern CrewAI features
    print("\n🔧 Advanced CrewAI Features:")
    test_import("crewai.project", "(Project decorators)")
    
    # Test the specific failing imports
    print("\n🔍 Specific Issue Analysis:")
    
    # Test the ResponseTextConfig issue
    try:
        from openai.types.responses.response import ResponseTextConfig
        print("✅ ResponseTextConfig: Available")
    except ImportError:
        try:
            from openai.types.responses.response import ResponseFormatTextConfig
            print("✅ ResponseFormatTextConfig: Available (newer name)")
        except ImportError:
            print("❌ Neither ResponseTextConfig nor ResponseFormatTextConfig available")
    
    # Test LiteLLM specific imports that might be failing
    try:
        from litellm.types.utils import ChatCompletionDeltaToolCall
        print("✅ LiteLLM ChatCompletionDeltaToolCall: Available")
    except ImportError as e:
        print(f"❌ LiteLLM ChatCompletionDeltaToolCall: {e}")
        
    print("\n" + "=" * 50)
    print("🎯 Summary: Check the ❌ items above for the root cause")
    
    # Show Python and pip info
    print(f"\n🐍 Python version: {sys.version}")
    print(f"📍 Python executable: {sys.executable}")

if __name__ == "__main__":
    main()