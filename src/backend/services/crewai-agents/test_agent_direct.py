#!/usr/bin/env python3
"""
Direct agent testing to debug the actual vs fake content issue
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_reddit_agent():
    """Test Reddit agent directly"""
    print("🔴 Testing Reddit Agent...")
    try:
        from agents.reddit_agent import RedditScraperTool
        tool = RedditScraperTool()
        result = tool._run('tesla,elon musk')
        data = json.loads(result)
        
        print(f"✅ Reddit result: success={data.get('success')}")
        print(f"📊 Posts found: {data.get('posts_found', 0)}")
        
        if data.get('posts'):
            for i, post in enumerate(data['posts'][:3]):
                print(f"   Post {i+1}: {post.get('title', 'No title')[:60]}...")
                print(f"   URL: {post.get('url', 'No URL')}")
                print(f"   Simulated: {post.get('simulated', False)}")
                print()
        
        return data
    except Exception as e:
        print(f"❌ Reddit test failed: {e}")
        return None

def test_news_scraper():
    """Test news scraper directly"""
    print("📰 Testing News Scraper...")
    try:
        from agents.enhanced_news_research_crew import EnhancedNewsScraperAgent, URLValidator, ContentValidator
        
        url_validator = URLValidator()
        content_validator = ContentValidator(url_validator)
        scraper = EnhancedNewsScraperAgent(url_validator, content_validator)
        
        # Test the crew method instead
        from agents.enhanced_news_research_crew import EnhancedNewsResearchCrew
        crew = EnhancedNewsResearchCrew()
        articles = crew._scrape_real_news_websites(['tesla', 'elon musk'])
        
        print(f"✅ News scraper result: {len(articles)} articles")
        
        for i, article in enumerate(articles[:3]):
            print(f"   Article {i+1}: {article.get('title', 'No title')[:60]}...")
            print(f"   URL: {article.get('url', 'No URL')}")
            print(f"   Source: {article.get('source', 'No source')}")
            print(f"   Simulated: {article.get('simulated', False)}")
            print()
        
        return articles
    except Exception as e:
        print(f"❌ News scraper test failed: {e}")
        return None

def test_telegram_agent():
    """Test Telegram agent directly"""
    print("📱 Testing Telegram Agent...")
    try:
        from agents.telegram_agent import TelegramMonitorTool
        tool = TelegramMonitorTool()
        result = tool._run('tesla,elon musk')
        data = json.loads(result)
        
        print(f"✅ Telegram result: success={data.get('success')}")
        print(f"📊 Messages found: {data.get('messages_found', 0)}")
        
        if data.get('messages'):
            for i, msg in enumerate(data['messages'][:3]):
                print(f"   Message {i+1}: {msg.get('title', 'No title')[:60]}...")
                print(f"   URL: {msg.get('url', 'No URL')}")
                print(f"   Simulated: {msg.get('simulated', False)}")
                print()
        
        return data
    except Exception as e:
        print(f"❌ Telegram test failed: {e}")
        return None

def main():
    """Run all tests"""
    print("🔬 Direct Agent Testing - Debug Real vs Fake Content")
    print("=" * 60)
    
    # Test individual agents
    reddit_data = test_reddit_agent()
    print("-" * 40)
    
    news_data = test_news_scraper()
    print("-" * 40)
    
    telegram_data = test_telegram_agent()
    print("-" * 40)
    
    # Summary
    print("📋 SUMMARY:")
    
    # Check Reddit
    if reddit_data and reddit_data.get('success') and reddit_data.get('posts'):
        real_reddit = [p for p in reddit_data['posts'] if not p.get('simulated', False)]
        fake_reddit = [p for p in reddit_data['posts'] if p.get('simulated', False)]
        print(f"🔴 Reddit: {len(real_reddit)} real, {len(fake_reddit)} fake posts")
    else:
        print("🔴 Reddit: No posts or failed")
    
    # Check News
    if news_data:
        real_news = [a for a in news_data if not a.get('simulated', False)]
        fake_news = [a for a in news_data if a.get('simulated', False)]
        print(f"📰 News: {len(real_news)} real, {len(fake_news)} fake articles")
        
        # Check for suspicious patterns
        suspicious = [a for a in news_data if 'Development Update' in a.get('title', '')]
        if suspicious:
            print(f"⚠️  Found {len(suspicious)} suspicious 'Development Update' articles!")
            for s in suspicious:
                print(f"     - {s.get('title')} from {s.get('source')}")
    else:
        print("📰 News: No articles or failed")
    
    # Check Telegram
    if telegram_data and telegram_data.get('success') and telegram_data.get('messages'):
        real_telegram = [m for m in telegram_data['messages'] if not m.get('simulated', False)]
        fake_telegram = [m for m in telegram_data['messages'] if m.get('simulated', False)]
        print(f"📱 Telegram: {len(real_telegram)} real, {len(fake_telegram)} fake messages")
    else:
        print("📱 Telegram: No messages or failed")
    
    print("\n🎯 RECOMMENDATION:")
    print("If you see 'Development Update' articles or many simulated entries,")
    print("the agents are falling back to fake data instead of real scraping.")

if __name__ == '__main__':
    main() 