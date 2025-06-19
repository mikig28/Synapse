#!/usr/bin/env python3
"""
Test Tesla and Elon-specific subreddits to verify content availability
"""

import json
import urllib.request
import urllib.error
import random

def test_tesla_subreddits():
    """Test Tesla and Elon-specific subreddits"""
    
    print("🔋 Testing Tesla and Elon-specific subreddits...")
    print("=" * 60)
    
    # Tesla and Elon-specific subreddits to test
    tesla_subreddits = [
        'https://www.reddit.com/r/teslamotors/hot.json?limit=5',
        'https://www.reddit.com/r/tesla/hot.json?limit=5', 
        'https://www.reddit.com/r/elonmusk/hot.json?limit=5',
        'https://www.reddit.com/r/spacex/hot.json?limit=5',
        'https://www.reddit.com/r/teslainvestorsclub/hot.json?limit=5',
        'https://www.reddit.com/r/electricvehicles/hot.json?limit=5'
    ]
    
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]
    
    total_posts_found = 0
    working_subreddits = []
    
    for endpoint in tesla_subreddits:
        subreddit_name = endpoint.split('/r/')[1].split('/')[0]
        print(f"\n🔍 Testing r/{subreddit_name}")
        
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
                        total_posts_found += len(posts)
                        working_subreddits.append(f"r/{subreddit_name}")
                        
                        # Show sample post titles
                        for i, post in enumerate(posts[:3]):
                            try:
                                post_data = post['data']
                                title = post_data.get('title', 'No title')
                                score = post_data.get('score', 0)
                                print(f"      {i+1}. [{score} pts] {title[:70]}...")
                            except Exception:
                                continue
                                
                    else:
                        print("   ❌ INVALID JSON structure")
                else:
                    print(f"   ❌ HTTP {response.status}")
                    
        except urllib.error.HTTPError as e:
            print(f"   ❌ HTTP Error {e.code}: {e.reason}")
            if e.code == 404:
                print(f"      💡 Subreddit r/{subreddit_name} doesn't exist or is private")
            elif e.code == 429:
                print(f"      💡 Rate limited")
            elif e.code == 403:
                print(f"      💡 Access forbidden")
        except urllib.error.URLError as e:
            print(f"   ❌ URL Error: {e.reason}")
        except Exception as e:
            print(f"   ❌ Unexpected error: {e}")
    
    print("\n" + "=" * 60)
    print("🔍 TESLA SUBREDDIT ANALYSIS:")
    print(f"📊 Working subreddits: {len(working_subreddits)}/{len(tesla_subreddits)}")
    print(f"📊 Total posts found: {total_posts_found}")
    print(f"📊 Average posts per working subreddit: {total_posts_found/len(working_subreddits) if working_subreddits else 0:.1f}")
    
    if working_subreddits:
        print(f"\n✅ WORKING SUBREDDITS:")
        for subreddit in working_subreddits:
            print(f"   - {subreddit}")
        
        print(f"\n💡 RECOMMENDATION:")
        print(f"Add these subreddits to the Reddit agent for Tesla/Elon topics:")
        print(f"This should provide {total_posts_found} posts instead of 0!")
    else:
        print(f"\n❌ NO WORKING SUBREDDITS:")
        print(f"All Tesla-specific subreddits failed - may be network/rate limiting issue")

if __name__ == "__main__":
    test_tesla_subreddits()