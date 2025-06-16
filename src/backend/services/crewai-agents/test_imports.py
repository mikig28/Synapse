#!/usr/bin/env python3
"""
Test imports to debug URLValidator issue
"""

import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

print(f"Python path: {sys.path}")
print(f"Current directory: {current_dir}")
print(f"Files in directory: {os.listdir(current_dir)}")

try:
    print("Testing enhanced_news_research_crew import...")
    from agents.enhanced_news_research_crew import URLValidator, ContentValidator, EnhancedNewsResearchCrew
    print("✅ Enhanced crew imported successfully")
    
    # Test URLValidator
    print("Testing URLValidator...")
    test_url = "https://example.com"
    is_valid = URLValidator.is_valid_url(test_url)
    cleaned = URLValidator.clean_url(test_url)
    print(f"✅ URLValidator working: {test_url} -> valid: {is_valid}, cleaned: {cleaned}")
    
except ImportError as e:
    print(f"❌ Enhanced crew import failed: {str(e)}")
    import traceback
    traceback.print_exc()

try:
    print("Testing dynamic_news_research_crew import...")
    from agents.dynamic_news_research_crew import create_dynamic_news_research_crew
    print("✅ Dynamic crew imported successfully")
except ImportError as e:
    print(f"❌ Dynamic crew import failed: {str(e)}")

try:
    print("Testing simple_news_scraper import...")
    from agents.simple_news_scraper import SimpleNewsScraperAgent
    print("✅ Simple scraper imported successfully")
except ImportError as e:
    print(f"❌ Simple scraper import failed: {str(e)}")

print("Import test complete.")