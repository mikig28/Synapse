#!/usr/bin/env python3
"""
Test the CrewAI fixes to ensure they work correctly
"""

import os
import json
import sys
from datetime import datetime

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

def test_reddit_direct():
    """Test Reddit direct JSON endpoints without auth"""
    print("\n🧪 Testing Reddit Direct JSON Endpoints...")
    
    try:
        from agents.reddit_agent import RedditScraperTool
        tool = RedditScraperTool()
        
        # Test the new direct JSON method
        posts = tool._get_reddit_json_data(['technology', 'AI'])
        
        print(f"✅ Reddit JSON fetch successful!")
        print(f"   Posts found: {len(posts)}")
        if posts:
            print(f"   Sample post: {posts[0]['title'][:60]}...")
            print(f"   Source: {posts[0]['source']}")
            
        return True
    except Exception as e:
        print(f"❌ Reddit test failed: {str(e)}")
        return False

def test_linkedin_news():
    """Test LinkedIn alternative news sources"""
    print("\n🧪 Testing LinkedIn News Sources...")
    
    try:
        from agents.enhanced_news_research_crew import EnhancedNewsResearchCrew
        crew = EnhancedNewsResearchCrew()
        
        # Test the new professional news method
        posts = crew._get_professional_news_content(['technology', 'business'])
        
        print(f"✅ LinkedIn news fetch successful!")
        print(f"   Posts found: {len(posts)}")
        if posts:
            print(f"   Sample post: {posts[0]['title'][:60]}...")
            print(f"   Source: {posts[0]['source']}")
            
        return True
    except Exception as e:
        print(f"❌ LinkedIn test failed: {str(e)}")
        return False

def test_full_crew():
    """Test the full crew execution"""
    print("\n🧪 Testing Full Crew Execution...")
    
    try:
        from agents.enhanced_news_research_crew import EnhancedNewsResearchCrew
        crew = EnhancedNewsResearchCrew()
        
        # Progress callback
        def progress_callback(data):
            print(f"   📊 [{data['agent']}] {data['description']} - {data['status'].upper()}")
        
        # Test with minimal topics
        result = crew.research_news_with_social_media(
            topics=['technology'],
            sources={'reddit': True, 'linkedin': True, 'telegram': True},
            progress_callback=progress_callback
        )
        
        if result.get('status') == 'success':
            print(f"✅ Crew execution successful!")
            
            # Check what data we got
            data = result.get('result', {})
            if isinstance(data, dict):
                org_content = data.get('organized_content', {})
                print(f"\n📊 Content Summary:")
                print(f"   Reddit posts: {len(org_content.get('reddit_posts', []))}")
                print(f"   LinkedIn posts: {len(org_content.get('linkedin_posts', []))}")
                print(f"   Telegram messages: {len(org_content.get('telegram_messages', []))}")
                print(f"   News articles: {len(org_content.get('news_articles', []))}")
            
            return True
        else:
            print(f"❌ Crew execution failed: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Crew test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🚀 Testing CrewAI Fixes...")
    print(f"📅 Current time: {datetime.now().isoformat()}")
    
    # Check environment
    print("\n📋 Environment Status:")
    print(f"   OPENAI_API_KEY: {'✅ Set' if os.getenv('OPENAI_API_KEY') else '❌ Missing'}")
    print(f"   ANTHROPIC_API_KEY: {'✅ Set' if os.getenv('ANTHROPIC_API_KEY') else '❌ Missing'}")
    print(f"   REDDIT_CLIENT_ID: {'✅ Set' if os.getenv('REDDIT_CLIENT_ID') else '⚠️ Missing (will use JSON)'}")
    print(f"   TELEGRAM_BOT_TOKEN: {'✅ Set' if os.getenv('TELEGRAM_BOT_TOKEN') else '⚠️ Missing (will use alternatives)'}")
    
    # Run tests
    results = {
        'reddit': test_reddit_direct(),
        'linkedin': test_linkedin_news(),
        'crew': test_full_crew()
    }
    
    # Summary
    print("\n📊 Test Summary:")
    for test, passed in results.items():
        print(f"   {test}: {'✅ PASSED' if passed else '❌ FAILED'}")
    
    all_passed = all(results.values())
    print(f"\n{'🎉 All tests passed!' if all_passed else '⚠️ Some tests failed'}")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 