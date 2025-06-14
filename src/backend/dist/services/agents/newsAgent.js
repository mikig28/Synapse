"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsAgentExecutor = void 0;
const axios_1 = __importDefault(require("axios"));
const Parser = __importStar(require("rss-parser"));
const openai_1 = __importDefault(require("openai"));
const NewsItem_1 = __importDefault(require("../../models/NewsItem"));
class NewsAgentExecutor {
    constructor() {
        this.newsApiKey = null;
        this.openaiClient = null;
        this.newsApiKey = process.env.NEWS_API_KEY || null;
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (openaiApiKey) {
            this.openaiClient = new openai_1.default({ apiKey: openaiApiKey });
        }
        this.rssParser = new Parser.default({
            timeout: 10000,
            maxRedirects: 5,
        });
    }
    async execute(context) {
        const { agent, run, userId } = context;
        await run.addLog('info', 'Starting News agent execution');
        const config = agent.configuration;
        const sources = config.newsSources || ['newsapi']; // Default to NewsAPI
        const categories = config.categories || ['technology', 'business'];
        const language = config.language || 'en';
        const maxItemsPerRun = config.maxItemsPerRun || 20;
        await run.addLog('info', `Fetching news from sources: ${sources.join(', ')}`);
        try {
            let allArticles = [];
            // Fetch from different sources
            for (const source of sources) {
                try {
                    if (source === 'newsapi') {
                        const articles = await this.fetchFromNewsAPI(categories, language, maxItemsPerRun);
                        allArticles = allArticles.concat(articles);
                        await run.addLog('info', `Fetched ${articles.length} articles from NewsAPI`);
                    }
                    else if (source.startsWith('rss:')) {
                        const rssUrl = source.substring(4); // Remove 'rss:' prefix
                        const articles = await this.fetchFromRSS(rssUrl, maxItemsPerRun);
                        allArticles = allArticles.concat(articles);
                        await run.addLog('info', `Fetched ${articles.length} articles from RSS: ${rssUrl}`);
                    }
                }
                catch (error) {
                    await run.addLog('warn', `Failed to fetch from source "${source}": ${error.message}`);
                }
            }
            // Remove duplicates
            const uniqueArticles = this.removeDuplicateArticles(allArticles);
            await run.addLog('info', `Total unique articles found: ${uniqueArticles.length}`);
            run.itemsProcessed = uniqueArticles.length;
            // Filter articles through AI analysis
            const interestingArticles = await this.filterInterestingArticles(uniqueArticles, run);
            await run.addLog('info', `AI filtered ${interestingArticles.length} interesting articles`);
            // Add interesting articles to news collection
            let addedCount = 0;
            for (const article of interestingArticles.slice(0, maxItemsPerRun)) {
                try {
                    const added = await this.addArticleToNews(article, userId, agent._id);
                    if (added) {
                        addedCount++;
                        await run.addLog('info', `Added article to news: ${article.title}`);
                    }
                    else {
                        await run.addLog('info', `Article already exists: ${article.title}`);
                    }
                }
                catch (error) {
                    await run.addLog('error', `Failed to add article: ${error.message}`);
                }
            }
            run.itemsAdded = addedCount;
            await run.addLog('info', `Successfully added ${addedCount} new articles to news`);
        }
        catch (error) {
            await run.addLog('error', `News agent execution failed: ${error.message}`);
            throw error;
        }
    }
    async fetchFromNewsAPI(categories, language, maxResults) {
        if (!this.newsApiKey) {
            throw new Error('NewsAPI key not configured. Please set NEWS_API_KEY environment variable.');
        }
        const articles = [];
        for (const category of categories) {
            try {
                const response = await axios_1.default.get('https://newsapi.org/v2/top-headlines', {
                    params: {
                        apiKey: this.newsApiKey,
                        category: category,
                        language: language,
                        pageSize: Math.min(Math.ceil(maxResults / categories.length), 100),
                    },
                    timeout: 10000,
                });
                if (response.data && response.data.articles) {
                    for (const article of response.data.articles) {
                        if (article.url && article.title) {
                            articles.push({
                                title: article.title,
                                description: article.description,
                                content: article.content,
                                url: article.url,
                                urlToImage: article.urlToImage,
                                source: {
                                    id: article.source?.id,
                                    name: article.source?.name || 'Unknown',
                                },
                                author: article.author,
                                publishedAt: new Date(article.publishedAt),
                                category: category,
                                language: language,
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error(`[NewsAgent] Error fetching from NewsAPI category ${category}:`, error);
                throw error;
            }
        }
        return articles;
    }
    async fetchFromRSS(rssUrl, maxResults) {
        try {
            const feed = await this.rssParser.parseURL(rssUrl);
            const articles = [];
            const items = feed.items.slice(0, maxResults);
            for (const item of items) {
                if (item.link && item.title) {
                    articles.push({
                        title: item.title,
                        description: item.contentSnippet || item.content,
                        content: item.content,
                        url: item.link,
                        source: {
                            name: feed.title || 'RSS Feed',
                        },
                        author: item.creator || item.author,
                        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                        category: item.categories?.[0],
                    });
                }
            }
            return articles;
        }
        catch (error) {
            console.error('[NewsAgent] Error fetching from RSS:', error);
            throw new Error(`Failed to fetch RSS feed: ${error.message}`);
        }
    }
    removeDuplicateArticles(articles) {
        const seen = new Set();
        return articles.filter(article => {
            const key = article.url.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    async filterInterestingArticles(articles, run) {
        if (!this.openaiClient || articles.length === 0) {
            return articles;
        }
        const interestingArticles = [];
        // Process articles in batches to avoid token limits
        const batchSize = 10;
        for (let i = 0; i < articles.length; i += batchSize) {
            const batch = articles.slice(i, i + batchSize);
            try {
                const batchResults = await this.analyzeArticleBatch(batch);
                interestingArticles.push(...batchResults);
            }
            catch (error) {
                await run.addLog('warn', `Failed to analyze article batch: ${error.message}`);
                // If analysis fails, include articles anyway (fallback)
                interestingArticles.push(...batch);
            }
        }
        return interestingArticles;
    }
    async analyzeArticleBatch(articles) {
        if (!this.openaiClient) {
            return articles;
        }
        const articleSummaries = articles.map((article, index) => `${index + 1}. "${article.title}" from ${article.source.name}\n` +
            `   ${article.description || 'No description available'}`).join('\n\n');
        const prompt = `
You are an AI assistant that helps curate interesting and valuable news articles. 
Analyze the following news articles and determine which ones are worth saving based on these criteria:

- Contains significant technology, business, or industry insights
- Reports on important developments or breakthroughs
- Provides valuable analysis or expert commentary
- Discusses trends that could impact the future
- Offers practical knowledge or actionable information
- NOT clickbait or low-quality content
- NOT purely promotional material
- NOT repetitive news already widely covered

For each article, respond with just the number (1, 2, 3, etc.) if it's worth saving.
If none are worth saving, respond with "NONE".

Articles to analyze:
${articleSummaries}

Worth saving (just numbers, comma-separated):`;
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 200,
            });
            const result = response.choices[0]?.message?.content?.trim();
            if (!result || result === 'NONE') {
                return [];
            }
            // Parse the response to get article indices
            const selectedIndices = result
                .split(',')
                .map(num => parseInt(num.trim()) - 1) // Convert to 0-based index
                .filter(index => index >= 0 && index < articles.length);
            return selectedIndices.map(index => articles[index]);
        }
        catch (error) {
            console.error('[NewsAgent] Error analyzing articles:', error);
            // Fallback: return all articles if analysis fails
            return articles;
        }
    }
    async addArticleToNews(article, userId, agentId) {
        try {
            // Check if article already exists
            const existingArticle = await NewsItem_1.default.findOne({
                userId,
                url: article.url,
            });
            if (existingArticle) {
                return false; // Already exists
            }
            // Generate AI summary if we have OpenAI client
            let summary = '';
            if (this.openaiClient && article.description) {
                try {
                    summary = await this.generateArticleSummary(article);
                }
                catch (error) {
                    console.warn('[NewsAgent] Failed to generate summary, using description instead');
                    summary = article.description;
                }
            }
            // Analyze sentiment if possible
            let sentiment;
            let relevanceScore;
            if (this.openaiClient) {
                try {
                    const analysis = await this.analyzeArticleSentiment(article);
                    sentiment = analysis.sentiment;
                    relevanceScore = analysis.relevanceScore;
                }
                catch (error) {
                    console.warn('[NewsAgent] Failed to analyze sentiment');
                }
            }
            // Create new news item
            const newsItem = new NewsItem_1.default({
                userId,
                agentId,
                title: article.title,
                description: article.description,
                content: article.content,
                url: article.url,
                urlToImage: article.urlToImage,
                source: article.source,
                author: article.author,
                publishedAt: article.publishedAt,
                category: article.category,
                language: article.language,
                summary: summary || article.description,
                tags: ['auto-curated', article.category].filter(Boolean),
                sentiment,
                relevanceScore,
                status: summary ? 'summarized' : 'pending',
                isRead: false,
                isFavorite: false,
            });
            await newsItem.save();
            return true;
        }
        catch (error) {
            console.error('[NewsAgent] Error adding article to news:', error);
            throw error;
        }
    }
    async generateArticleSummary(article) {
        if (!this.openaiClient) {
            return article.description || '';
        }
        const content = article.content || article.description || article.title;
        const prompt = `
Summarize this news article in 2-3 concise sentences that capture the key points and why it matters:

Title: ${article.title}
Content: ${content}

Summary:`;
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 150,
            });
            return response.choices[0]?.message?.content?.trim() || article.description || '';
        }
        catch (error) {
            throw error;
        }
    }
    async analyzeArticleSentiment(article) {
        if (!this.openaiClient) {
            return { sentiment: 'neutral', relevanceScore: 0.5 };
        }
        const content = article.description || article.title;
        const prompt = `
Analyze this news article and provide:
1. Sentiment: positive, negative, or neutral
2. Relevance score: 0.0 to 1.0 (how relevant/important this news is)

Article: "${article.title}"
Description: "${content}"

Respond in JSON format: {"sentiment": "positive/negative/neutral", "relevanceScore": 0.0-1.0}`;
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 100,
            });
            const result = response.choices[0]?.message?.content?.trim();
            if (result) {
                const parsed = JSON.parse(result);
                return {
                    sentiment: parsed.sentiment || 'neutral',
                    relevanceScore: Math.max(0, Math.min(1, parsed.relevanceScore || 0.5)),
                };
            }
        }
        catch (error) {
            console.warn('[NewsAgent] Failed to parse sentiment analysis result');
        }
        return { sentiment: 'neutral', relevanceScore: 0.5 };
    }
}
exports.NewsAgentExecutor = NewsAgentExecutor;
