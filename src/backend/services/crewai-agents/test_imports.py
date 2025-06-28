#!/usr/bin/env python3
"""
Test script to verify imports and basic functionality
"""

print("Testing imports...")

try:
    import os
    print("✅ os imported")
except ImportError as e:
    print(f"❌ Failed to import os: {e}")

try:
    import json
    print("✅ json imported")
except ImportError as e:
    print(f"❌ Failed to import json: {e}")

try:
    from typing import Dict, Any
    print("✅ typing imported")
except ImportError as e:
    print(f"❌ Failed to import typing: {e}")

try:
    from datetime import datetime, timedelta
    print("✅ datetime imported")
except ImportError as e:
    print(f"❌ Failed to import datetime: {e}")

try:
    from flask import Flask, request, jsonify
    print("✅ flask imported")
except ImportError as e:
    print(f"❌ Failed to import flask: {e}")

try:
    from flask_cors import CORS
    print("✅ flask_cors imported")
except ImportError as e:
    print(f"❌ Failed to import flask_cors: {e}")

try:
    from dotenv import load_dotenv
    print("✅ dotenv imported")
except ImportError as e:
    print(f"❌ Failed to import dotenv: {e}")

try:
    import logging
    print("✅ logging imported")
except ImportError as e:
    print(f"❌ Failed to import logging: {e}")

try:
    import threading
    print("✅ threading imported")
except ImportError as e:
    print(f"❌ Failed to import threading: {e}")

try:
    import time
    print("✅ time imported")
except ImportError as e:
    print(f"❌ Failed to import time: {e}")

try:
    from crewai import Agent, Task, Crew, Process
    print("✅ crewai imported")
except ImportError as e:
    print(f"❌ Failed to import crewai: {e}")

try:
    from langchain_community.tools import DuckDuckGoSearchRun
    print("✅ DuckDuckGoSearchRun imported")
except ImportError as e:
    print(f"❌ Failed to import DuckDuckGoSearchRun: {e}")

try:
    from crewai_tools import FirecrawlSearchTool
    print("✅ FirecrawlSearchTool imported")
except ImportError as e:
    print(f"❌ Failed to import FirecrawlSearchTool: {e}")

print("\nTesting environment variables...")
load_dotenv()

anthropic_key = os.getenv("ANTHROPIC_API_KEY")
openai_key = os.getenv("OPENAI_API_KEY")
firecrawl_key = os.getenv("FIRECRAWL_API_KEY")

print(f"ANTHROPIC_API_KEY: {'Set' if anthropic_key else 'Not Set'}")
print(f"OPENAI_API_KEY: {'Set' if openai_key else 'Not Set'}")
print(f"FIRECRAWL_API_KEY: {'Set' if firecrawl_key else 'Not Set'}")

if not anthropic_key and not openai_key:
    print("❌ ERROR: Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set!")
else:
    print("✅ At least one AI API key is configured")

print("\nTesting basic tool initialization...")
try:
    if firecrawl_key:
        search_tool = FirecrawlSearchTool()
        print("✅ FirecrawlSearchTool initialized successfully")
    else:
        search_tool = DuckDuckGoSearchRun()
        print("✅ DuckDuckGoSearchRun initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize search tool: {e}")

print("\nAll tests completed!")