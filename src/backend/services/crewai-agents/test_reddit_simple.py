#!/usr/bin/env python3
"""
Simple test to check Reddit JSON endpoints directly
"""

import json
import sys

def test_reddit_json():
    """Test Reddit JSON endpoints without dependencies"""
    
    try:
        # Try to import urllib instead of requests since requests is not available
        import urllib.request
        import urllib.error
        import random
        
        print("🔍 Testing Reddit JSON endpoints directly...")
        print("=" * 60)
        
        # Test endpoints
        test_endpoints = [
            'https://www.reddit.com/r/worldnews/hot.json?limit=5',
            'https://www.reddit.com/r/all/hot.json?limit=5',
            'https://www.reddit.com/r/technology/hot.json?limit=5'
        ]
        
        # User agents to rotate
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]
        
        for endpoint in test_endpoints:
            print(f"\n📡 Testing: {endpoint}")
            
            try:
                # Create request with headers
                req = urllib.request.Request(endpoint)
                req.add_header('User-Agent', random.choice(user_agents))
                req.add_header('Accept', 'application/json')
                
                # Fetch data
                with urllib.request.urlopen(req, timeout=10) as response:
                    if response.status == 200:
                        data = json.loads(response.read())
                        
                        if data and 'data' in data and 'children' in data['data']:
                            posts = data['data']['children']
                            print(f"   ✅ SUCCESS: {len(posts)} posts found")
                            
                            # Check for Tesla/Elon content
                            tesla_posts = []
                            elon_posts = []
                            
                            for post in posts:
                                try:
                                    post_data = post['data']
                                    title = post_data.get('title', '').lower()
                                    
                                    if 'tesla' in title:
                                        tesla_posts.append(post_data.get('title', ''))
                                    
                                    if 'elon' in title or 'musk' in title:
                                        elon_posts.append(post_data.get('title', ''))
                                    
                                    # Show first few titles as examples
                                    if len(tesla_posts) + len(elon_posts) < 3:
                                        print(f"      📋 Sample: {post_data.get('title', 'No title')[:60]}...")
                                        
                                except Exception as e:
                                    continue
                            
                            print(f"   🎯 Tesla-related posts: {len(tesla_posts)}")
                            print(f"   🎯 Elon-related posts: {len(elon_posts)}")
                            
                            if tesla_posts:
                                print(f"      🔋 Tesla posts found:")
                                for i, title in enumerate(tesla_posts[:2]):
                                    print(f"         {i+1}. {title[:80]}...")
                            
                            if elon_posts:
                                print(f"      🚀 Elon posts found:")
                                for i, title in enumerate(elon_posts[:2]):
                                    print(f"         {i+1}. {title[:80]}...")
                        else:
                            print("   ❌ INVALID JSON structure")
                    else:
                        print(f"   ❌ HTTP {response.status}")
                        
            except urllib.error.HTTPError as e:
                print(f"   ❌ HTTP Error {e.code}: {e.reason}")
                if e.code == 429:
                    print(f"      💡 Rate limited - this is a common issue")
                elif e.code == 403:
                    print(f"      💡 Forbidden - Reddit may be blocking requests")
            except urllib.error.URLError as e:
                print(f"   ❌ URL Error: {e.reason}")
            except json.JSONDecodeError as e:
                print(f"   ❌ JSON decode error: {e}")
            except Exception as e:
                print(f"   ❌ Unexpected error: {e}")
        
        print("\n" + "=" * 60)
        print("🔍 SUMMARY:")
        print("- If you see 'SUCCESS' messages, Reddit JSON endpoints are working")
        print("- If you see Tesla/Elon posts, the content filtering should work")
        print("- If you see rate limit (429) errors, that explains why no posts are found")
        print("- If you see 403 errors, Reddit is blocking the requests")
        
    except ImportError as e:
        print(f"❌ Missing required modules: {e}")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_reddit_json()