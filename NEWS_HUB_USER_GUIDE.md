# News Hub - User Guide

## Overview

News Hub is your personalized news aggregation system that fetches articles from RSS feeds based on your interests. It's completely free and doesn't require any API keys.

## Quick Start

### First Time Setup

1. **Navigate to News Hub**
   - Click on "News Hub" in the sidebar menu

2. **Setup Your Interests**
   - On first visit, you'll see an onboarding screen
   - Add topics you're interested in (e.g., "AI", "Blockchain", "Space")
   - Add keywords to filter articles (e.g., "startup", "innovation", "climate")
   - Add categories (e.g., "technology", "business", "sports")

3. **Fetch Your First Articles**
   - Click the "Get Started" button
   - Click the "Refresh" button to fetch articles
   - Wait a few seconds for articles to load

## Managing Your Interests

### Topics
Topics are broad subject areas you're interested in.

**Examples:**
- Artificial Intelligence
- Blockchain
- Space Exploration
- Climate Change
- Sports

**How to add:**
1. Click "Manage Interests" button
2. Type topic name in the "Topics" input field
3. Press Enter or click the + button

### Keywords
Keywords are specific terms you want to see in articles.

**Examples:**
- ChatGPT
- Bitcoin
- Tesla
- Olympics
- Startup funding

**How to add:**
1. Click "Manage Interests" button
2. Type keyword in the "Keywords" input field
3. Press Enter or click the + button

### Categories
Categories determine which RSS feeds to use.

**Available Categories:**
- General
- Technology
- Business
- Science
- Sports ⚽🏀🏈
- Entertainment
- Health
- Politics
- Finance

**How to add:**
1. Click "Manage Interests" button
2. Type category name in the "Categories" input field
3. Press Enter or click the + button

## Custom RSS Feeds (NEW!)

You can now add your own RSS feed URLs to fetch news from specific websites.

### Why Use Custom Feeds?
- Add niche blogs and news sites
- Follow specific authors or publications
- Get news from regional sources
- Subscribe to industry-specific feeds

### How to Add Custom Feeds

1. **Find an RSS Feed URL**
   - Most blogs and news sites have RSS feeds
   - Look for an orange RSS icon (📡) on websites
   - Common RSS URLs:
     - `https://website.com/feed`
     - `https://website.com/rss`
     - `https://website.com/feed.xml`
     - `https://website.com/rss.xml`

2. **Add the Feed**
   - Click "Manage Interests"
   - Scroll to "Custom RSS Feeds" section
   - Enter a name for the feed (e.g., "My Tech Blog")
   - Paste the RSS feed URL
   - Select a category
   - Click "Add Feed"

3. **Manage Your Feeds**
   - **Enable/Disable**: Click the checkbox next to the feed name
   - **Remove**: Click the red X button
   - Disabled feeds won't be fetched but remain in your list

### Example RSS Feeds to Try

**Technology:**
- Hacker News: `https://news.ycombinator.com/rss`
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`

**Business:**
- Business Insider: `https://www.businessinsider.com/rss`
- Entrepreneur: `https://www.entrepreneur.com/latest.rss`

**Science:**
- NASA: `https://www.nasa.gov/rss/dyn/breaking_news.rss`
- Scientific American: `http://rss.sciam.com/ScientificAmerican-Global`

**Sports (NEW!):**
- BBC Sport: `http://feeds.bbci.co.uk/sport/rss.xml`
- ESPN: `https://www.espn.com/espn/rss/news`
- Bleacher Report: `https://bleacherreport.com/articles/feed`

## Sports News (NEW!)

Sports news is now fully supported with 6 major sports outlets:

### Available Sports Sources
1. **BBC Sport** - General sports coverage
2. **ESPN** - American sports focus
3. **Bleacher Report** - Sports news and analysis
4. **Sky Sports** - UK sports coverage
5. **Goal.com** - Football/soccer focused
6. **The Athletic** - In-depth sports journalism

### Getting Sports News
1. Click "Manage Interests"
2. Add "sports" as a category OR add specific sports as topics:
   - Football
   - Basketball
   - Tennis
   - Soccer
   - Cricket
   - Formula 1
3. Click "Refresh" to fetch articles

## Using the News Feed

### Reading Articles
- Click on article title or "Open" icon to read in new tab
- Articles are automatically marked as read when opened

### Organizing Articles
- **Heart Icon** ❤️ - Mark as favorite
- **Bookmark Icon** 🔖 - Save for later
- **Eye Icon** 👁️ - Shows read/unread status

### Filtering Articles
- **Search Bar**: Type keywords to filter articles
- **Sort By**: Choose between:
  - Relevance (AI-ranked based on your interests)
  - Date (newest first)
  - None (as fetched)

### Statistics Dashboard
View your reading stats at the top:
- **Total Articles**: All articles fetched for you
- **Unread**: Articles you haven't opened yet
- **Saved**: Articles bookmarked for later
- **Favorites**: Articles you've liked
- **Last 24h**: Recent articles from last day

## Refreshing Your Feed

### Manual Refresh
Click the "Refresh" button to fetch new articles from all your sources.

**What happens:**
- Fetches latest articles from all RSS feeds
- Checks custom feeds you've added
- Ranks articles by relevance
- Removes duplicates
- Saves new articles to your database

### Auto-Refresh
By default, News Hub automatically fetches articles every 30 minutes.

**To change:**
- Currently managed in settings (future feature)
- Can be disabled in user interests (future feature)

## Tips & Best Practices

### Getting Better Results
1. **Be Specific with Keywords**: Use specific terms rather than generic ones
2. **Mix Topics and Keywords**: Combine broad topics with specific keywords
3. **Use Multiple Categories**: Don't limit yourself to one category
4. **Add Custom Feeds**: Include niche sources for specialized content

### Managing Information Overload
1. **Start Small**: Begin with 2-3 topics and gradually add more
2. **Use Favorites**: Mark important articles to read later
3. **Regular Cleanup**: Remove topics you're no longer interested in
4. **Disable Feeds**: Temporarily disable feeds instead of deleting them

### Finding RSS Feeds
- **Look for RSS icons** on websites (usually in header or footer)
- **Try common URLs**: Add `/feed`, `/rss`, or `/feed.xml` to website URL
- **Check website footer**: Often has links to RSS feeds
- **Use RSS directories**: Sites like Feedly or Feedspot list RSS feeds
- **Browser extensions**: Use RSS feed finders for Chrome/Firefox

## Troubleshooting

### No Articles Found
**Possible causes:**
- No interests configured
- RSS feeds are temporarily down
- Topics/keywords too specific

**Solutions:**
1. Check if you have topics, keywords, or categories set
2. Try broader keywords
3. Add custom feeds from reliable sources
4. Wait a few minutes and click Refresh again

### Custom Feed Not Working
**Possible causes:**
- Invalid RSS feed URL
- Feed requires authentication
- Feed format not supported

**Solutions:**
1. Verify the URL is correct
2. Test the feed URL in a browser
3. Try a different RSS feed from the same site
4. Check if the feed requires login (not supported)

### Articles Not Relevant
**Solutions:**
1. Add more specific keywords
2. Remove broad topics
3. Use exclude keywords (future feature)
4. Focus on specific categories

## Advanced Features (Coming Soon)

### Planned Enhancements
- **Feed Validation**: Test RSS feeds before adding
- **Feed Preview**: See sample articles before subscribing
- **Import/Export**: Share feed lists with others
- **Exclude Keywords**: Filter out unwanted content
- **Per-Feed Settings**: Individual refresh intervals
- **AI Summarization**: Get AI-generated summaries of articles
- **Topic Clustering**: Automatic grouping of related articles
- **Read Later Integration**: Export to Pocket, Instapaper, etc.

## Privacy & Data

### What We Store
- Your topic, keyword, and category preferences
- Custom RSS feed URLs and names
- Article read/favorite/saved status
- Article content and metadata

### What We Don't Store
- Your reading habits outside the app
- Personal browsing history
- Data from RSS feeds beyond articles

### Data Deletion
- Remove topics/keywords anytime
- Delete custom feeds instantly
- Article data can be cleared (future feature)

## Support

### Getting Help
- Check this guide first
- Review the News Hub Improvements document
- Report issues through the app feedback system
- Contact support for technical issues

### Known Limitations
- Some RSS feeds may be blocked by CORS policies
- Paywalled content won't be fully accessible
- Feed refresh is manual (auto-refresh coming soon)
- Some feeds may have delayed updates

---

**Version**: 1.0  
**Last Updated**: October 3, 2025  
**Feature Status**: ✅ Sports News Added | ✅ Custom RSS Feeds Added
