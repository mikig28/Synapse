#!/usr/bin/env python3
"""
Test script to explore OpenAI SDK structure and find ResponseTextConfig
"""

import sys

def test_openai_structure():
    """Test OpenAI SDK structure"""
    try:
        import openai
        print(f"OpenAI version: {openai.__version__}")
        
        # Try to find ResponseTextConfig in different locations
        locations_to_try = [
            "openai.types.responses.response",
            "openai.types.response", 
            "openai.types.shared",
            "openai.types.chat.chat_completion",
            "openai",
        ]
        
        for location in locations_to_try:
            try:
                module = __import__(location, fromlist=['ResponseTextConfig'])
                if hasattr(module, 'ResponseTextConfig'):
                    print(f"✅ Found ResponseTextConfig in {location}")
                    return True
                else:
                    print(f"❌ No ResponseTextConfig in {location}")
                    print(f"   Available: {[attr for attr in dir(module) if 'Response' in attr or 'Config' in attr][:10]}")
            except ImportError as e:
                print(f"❌ Cannot import {location}: {e}")
        
        # Try to find any Response-related types
        try:
            import openai.types as types
            response_attrs = [attr for attr in dir(types) if 'Response' in attr or 'response' in attr]
            print(f"Response-related attributes in openai.types: {response_attrs}")
            
            # Check shared module
            try:
                import openai.types.shared as shared
                shared_attrs = [attr for attr in dir(shared) if 'Response' in attr or 'Config' in attr]
                print(f"Config/Response attributes in shared: {shared_attrs}")
            except ImportError:
                print("No shared module")
                
        except Exception as e:
            print(f"Error exploring types: {e}")
            
        return False
        
    except ImportError as e:
        print(f"Cannot import openai: {e}")
        return False

if __name__ == "__main__":
    test_openai_structure()