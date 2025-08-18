#!/usr/bin/env python3
"""
Test script to verify CrewAI imports work with fixed versions
"""

import sys
import traceback

def test_imports():
    """Test all the imports that were failing"""
    try:
        print("Testing basic imports...")
        import os
        import json
        from datetime import datetime, timedelta
        from flask import Flask, request, jsonify
        from flask_cors import CORS
        from dotenv import load_dotenv
        import logging
        print("✅ Basic imports successful")
        
        print("\nTesting OpenAI SDK import...")
        import openai
        print(f"✅ OpenAI SDK version: {openai.__version__}")
        
        print("\nTesting LiteLLM import...")
        import litellm
        print(f"✅ LiteLLM version: {litellm.__version__ if hasattr(litellm, '__version__') else 'Unknown'}")
        
        print("\nTesting OpenAI ResponseTextConfig import (this was failing)...")
        from openai.types.responses.response import ResponseTextConfig
        print("✅ ResponseTextConfig import successful")
        
        print("\nTesting CrewAI import (this was the main failure point)...")
        from crewai import Agent, Task, Crew, Process
        print("✅ CrewAI imports successful")
        
        print("\n🎉 ALL IMPORTS SUCCESSFUL! The fix is working.")
        return True
        
    except ImportError as e:
        print(f"\n❌ ImportError: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("\nFull traceback:")
        traceback.print_exc()
        return False

def test_specific_openai_types():
    """Test specific OpenAI types that were causing issues"""
    try:
        print("\nTesting specific OpenAI types...")
        from openai.types.responses.response import ResponseTextConfig
        print("✅ ResponseTextConfig found")
        
        # Test if the old name still exists
        try:
            from openai.types.responses.response import ResponseFormatTextConfig
            print("✅ ResponseFormatTextConfig also found (newer name)")
        except ImportError:
            print("ℹ️  ResponseFormatTextConfig not found (expected in older versions)")
            
        return True
    except ImportError as e:
        print(f"❌ Failed to import OpenAI types: {e}")
        return False

if __name__ == "__main__":
    print("CrewAI Import Compatibility Test")
    print("=" * 40)
    
    success = test_imports()
    test_specific_openai_types()
    
    if success:
        print("\n✅ Test passed! The requirements fix should work.")
        sys.exit(0)
    else:
        print("\n❌ Test failed! Need to investigate further.")
        sys.exit(1)