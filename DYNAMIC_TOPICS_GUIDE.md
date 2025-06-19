# Dynamic Topic Handling in Synapse Agents

## Overview

Synapse agents now support **fully dynamic topic handling** - they can gather news and content about ANY topic requested by users, without relying on hardcoded mappings or predefined categories.

## Key Changes

### 1. No More Hardcoded Topic Mappings

**Before:**
```javascript
// Old approach - limited to predefined topics
if (agentNameLower.includes('sport')) {
  topics = ['sports', 'football', 'basketball', 'soccer'];
} else if (agentNameLower.includes('tech')) {
  topics = ['technology', 'AI', 'startups'];
}
// ... more hardcoded mappings
```

**Now:**
```javascript
// New approach - accepts any user-defined topics
topics = config.topics; // Whatever the user provides
// Generic fallback if no topics: ['news', 'trending', 'latest']
```

### 2. Dynamic RSS Feed Discovery

The system now intelligently matches RSS feeds based on topic keywords:

```python
# Specialized feeds are used as hints, not requirements
specialized_feeds = {
    'https://techcrunch.com/feed/': ['tech', 'technology', 'ai'],
    'https://www.espn.com/espn/rss/news': ['sport', 'sports', 'game'],
    # ... more feeds with keyword hints
}

# Dynamically match feeds based on ANY topic
for topic in topics:
    # Check keyword relevance
    # If no matches, use general news feeds
    # Always ensures coverage for any topic
```

### 3. Dynamic Reddit Subreddit Discovery

The Reddit agent now discovers relevant subreddits for ANY topic:

1. **Exact name search** - Looks for subreddits with the exact topic name
2. **Topic search** - Searches subreddit descriptions for the topic
3. **Variations** - Tries different variations (plurals, underscores, etc.)
4. **r/all search** - Finds where the topic is being discussed
5. **Activity check** - Ensures subreddits are active with recent posts

### 4. Examples of Dynamic Topics

The system can now handle any topic, including:

- **Niche interests**: "vintage typewriters", "urban gardening", "fermentation"
- **Specific events**: "2024 olympics", "taylor swift tour", "climate summit"
- **Local topics**: "seattle weather", "london transport", "tokyo food"
- **Emerging trends**: "prompt engineering", "regenerative agriculture", "web5"
- **Complex queries**: "sustainable fashion in asia", "indie game development"
- **Any combination**: Users can mix any topics they want

## How to Use

### 1. Creating an Agent with Custom Topics

```javascript
// Via API
const agent = {
  name: "My Custom Agent",
  type: "crewai_news",
  configuration: {
    topics: ["vintage cameras", "film photography", "darkroom techniques"],
    crewaiSources: {
      reddit: true,
      news_websites: true,
      linkedin: true,
      telegram: true
    }
  }
};
```

### 2. Agent Behavior

- **No topic restrictions** - Any string can be a topic
- **Intelligent matching** - System finds relevant content sources
- **Fallback strategy** - General news feeds ensure coverage
- **Learning capability** - Discovers new sources dynamically

### 3. Best Practices

1. **Be specific** - More specific topics yield better results
   - Good: "electric vehicle batteries"
   - Less effective: "cars"

2. **Use natural language** - Topics can be phrases
   - "climate change solutions"
   - "remote work productivity"

3. **Combine related topics** - Group similar interests
   - ["sustainable fashion", "ethical clothing", "slow fashion"]

4. **No limits** - Add as many topics as needed

## Technical Implementation

### Frontend (TypeScript)
- Removed all hardcoded topic validation
- Topics passed directly from user input
- Generic fallbacks: `['news', 'trending', 'latest']`

### Backend (Python)
- Dynamic RSS feed matching
- Intelligent keyword extraction
- General news feeds as baseline
- No topic-specific requirements

### Benefits
1. **Flexibility** - Handle any user interest
2. **Future-proof** - No code changes for new topics
3. **User-driven** - Topics defined by actual needs
4. **Discoverable** - System learns about new sources

## Migration Guide

If you have existing agents with hardcoded topics:

1. **No action required** - Existing agents continue to work
2. **Update topics** - Edit agent configuration with any new topics
3. **Remove name-based logic** - Agent names no longer determine topics

## Examples

### Sports Fan Agent
```javascript
topics: ["formula 1", "motogp", "rally racing", "motorsports"]
```

### Hobby Enthusiast Agent
```javascript
topics: ["woodworking", "diy furniture", "hand tools", "joinery"]
```

### Local News Agent
```javascript
topics: ["san francisco tech scene", "bay area startups", "silicon valley news"]
```

### Research Agent
```javascript
topics: ["quantum computing breakthroughs", "quantum algorithms", "quantum hardware"]
```

## Troubleshooting

### No results for a topic?
- Check spelling
- Try variations or related terms
- The system will always return general news as fallback

### Want more specific results?
- Use more descriptive topics
- Combine multiple related topics
- Enable all content sources

### Performance tips
- Limit topics to 5-10 for best performance
- More specific topics = faster results
- Broader topics may return more general content

## Future Enhancements

- Topic suggestion based on trending content
- Learning from user feedback
- Custom source addition by users
- Topic clustering and relationships

---

The system is now truly dynamic and can handle ANY topic a user wants to track! 