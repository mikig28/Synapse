/**
 * Free news sources using RSS feeds
 * All sources are completely free with no API keys required
 */

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: string;
  language: string;
  updateFrequency: number; // minutes
}

export const FREE_NEWS_SOURCES: RSSSource[] = [
  // Technology News
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'the-verge',
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'wired',
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    category: 'technology',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'ars-technica',
    name: 'Ars Technica',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    category: 'technology',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'engadget',
    name: 'Engadget',
    url: 'https://www.engadget.com/rss.xml',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'techradar',
    name: 'TechRadar',
    url: 'https://www.techradar.com/rss',
    category: 'technology',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'zdnet',
    name: 'ZDNet',
    url: 'https://www.zdnet.com/news/rss.xml',
    category: 'technology',
    language: 'en',
    updateFrequency: 60
  },

  // General News
  {
    id: 'bbc-world',
    name: 'BBC World News',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'general',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'bbc-technology',
    name: 'BBC Technology',
    url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'bbc-business',
    name: 'BBC Business',
    url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'business',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'reuters-world',
    name: 'Reuters World News',
    url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
    category: 'general',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'reuters-tech',
    name: 'Reuters Technology',
    url: 'https://www.reutersagency.com/feed/?best-topics=tech&post_type=best',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },

  // Business News
  {
    id: 'forbes-technology',
    name: 'Forbes Technology',
    url: 'https://www.forbes.com/technology/feed/',
    category: 'technology',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    url: 'https://www.entrepreneur.com/latest.rss',
    category: 'business',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'business-insider',
    name: 'Business Insider',
    url: 'https://www.businessinsider.com/rss',
    category: 'business',
    language: 'en',
    updateFrequency: 30
  },

  // Science & Innovation
  {
    id: 'mit-tech-review',
    name: 'MIT Technology Review',
    url: 'https://www.technologyreview.com/feed/',
    category: 'science',
    language: 'en',
    updateFrequency: 120
  },
  {
    id: 'scientific-american',
    name: 'Scientific American',
    url: 'http://rss.sciam.com/ScientificAmerican-Global',
    category: 'science',
    language: 'en',
    updateFrequency: 120
  },
  {
    id: 'nature-news',
    name: 'Nature News',
    url: 'http://feeds.nature.com/nature/rss/current',
    category: 'science',
    language: 'en',
    updateFrequency: 120
  },

  // Developer & Programming
  {
    id: 'dev-to',
    name: 'Dev.to',
    url: 'https://dev.to/feed',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'hackernoon',
    name: 'HackerNoon',
    url: 'https://hackernoon.com/feed',
    category: 'technology',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'medium-technology',
    name: 'Medium Technology',
    url: 'https://medium.com/feed/tag/technology',
    category: 'technology',
    language: 'en',
    updateFrequency: 30
  },

  // AI & Machine Learning
  {
    id: 'openai-blog',
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    category: 'ai',
    language: 'en',
    updateFrequency: 240
  },
  {
    id: 'google-ai-blog',
    name: 'Google AI Blog',
    url: 'http://feeds.feedburner.com/blogspot/gJZg',
    category: 'ai',
    language: 'en',
    updateFrequency: 240
  },

  // Startup & Innovation
  {
    id: 'product-hunt',
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/feed',
    category: 'startups',
    language: 'en',
    updateFrequency: 60
  },
  {
    id: 'ycombinator',
    name: 'Y Combinator',
    url: 'https://news.ycombinator.com/rss',
    category: 'startups',
    language: 'en',
    updateFrequency: 30
  },

  // Sports News
  {
    id: 'bbc-sport',
    name: 'BBC Sport',
    url: 'http://feeds.bbci.co.uk/sport/rss.xml',
    category: 'sports',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'espn',
    name: 'ESPN',
    url: 'https://www.espn.com/espn/rss/news',
    category: 'sports',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'bleacher-report',
    name: 'Bleacher Report',
    url: 'https://bleacherreport.com/articles/feed',
    category: 'sports',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'sky-sports',
    name: 'Sky Sports',
    url: 'https://www.skysports.com/rss/12040',
    category: 'sports',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'goal',
    name: 'Goal.com',
    url: 'https://www.goal.com/feeds/en/news',
    category: 'sports',
    language: 'en',
    updateFrequency: 30
  },
  {
    id: 'the-athletic',
    name: 'The Athletic',
    url: 'https://theathletic.com/feed/',
    category: 'sports',
    language: 'en',
    updateFrequency: 60
  }
];

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: string): RSSSource[] {
  return FREE_NEWS_SOURCES.filter(source => source.category === category);
}

/**
 * Get source by ID
 */
export function getSourceById(id: string): RSSSource | undefined {
  return FREE_NEWS_SOURCES.find(source => source.id === id);
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  const categories = new Set(FREE_NEWS_SOURCES.map(source => source.category));
  return Array.from(categories).sort();
}

/**
 * Get sources by user preferences
 */
export function getSourcesByPreferences(
  categories: string[] = [],
  sourceIds: string[] = []
): RSSSource[] {
  if (sourceIds.length > 0) {
    return FREE_NEWS_SOURCES.filter(source => sourceIds.includes(source.id));
  }

  if (categories.length > 0) {
    return FREE_NEWS_SOURCES.filter(source => categories.includes(source.category));
  }

  return FREE_NEWS_SOURCES;
}
