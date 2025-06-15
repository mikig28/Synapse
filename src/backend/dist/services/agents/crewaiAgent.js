"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrewAINewsAgentExecutor = void 0;
const axios_1 = __importDefault(require("axios"));
const NewsItem_1 = __importDefault(require("../../models/NewsItem"));
class CrewAINewsAgentExecutor {
    constructor() {
        // CrewAI service URL - should be configurable via environment
        console.log(`[CrewAI Agent] Environment variables check:`, {
            CREWAI_SERVICE_URL: process.env.CREWAI_SERVICE_URL,
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT
        });
        this.crewaiServiceUrl = process.env.CREWAI_SERVICE_URL || 'http://localhost:5000';
        console.log(`[CrewAI Agent] Using Service URL: ${this.crewaiServiceUrl}`);
    }
    async execute(context) {
        const { agent, run, userId } = context;
        await run.addLog('info', 'Starting CrewAI multi-agent news gathering', {
            agentName: agent.name,
            serviceUrl: this.crewaiServiceUrl
        });
        try {
            // Check if CrewAI service is available
            await run.addLog('info', 'Performing health check on CrewAI service...');
            await this.healthCheck();
            await run.addLog('info', 'CrewAI service health check passed');
            const config = agent.configuration;
            const topics = config.topics || ['technology', 'AI', 'startups', 'business'];
            const sources = {
                reddit: config.crewaiSources?.reddit !== false,
                linkedin: config.crewaiSources?.linkedin !== false,
                telegram: config.crewaiSources?.telegram !== false,
                news_websites: config.crewaiSources?.news_websites !== false
            };
            await run.addLog('info', `Gathering news for topics: ${topics.join(', ')}`, { topics });
            await run.addLog('info', `Using sources: ${Object.entries(sources).filter(([_, enabled]) => enabled).map(([source]) => source).join(', ')}`, { sources });
            // Execute CrewAI news gathering
            await run.addLog('info', 'Sending request to CrewAI agents...');
            const startTime = Date.now();
            const crewaiResponse = await this.executeCrewAIGathering({
                topics,
                sources,
                // Add enhanced configuration
                tools: {
                    web_search: true,
                    content_analysis: true,
                    sentiment_analysis: true,
                    trend_detection: true,
                    url_extraction: true
                },
                parameters: {
                    max_items_per_source: config.maxItemsPerRun || 10,
                    time_range: '24h',
                    quality_threshold: 0.7,
                    include_urls: true,
                    include_metadata: true,
                    analyze_sentiment: true,
                    extract_entities: true
                }
            });
            const duration = Date.now() - startTime;
            await run.addLog('info', `CrewAI agents completed in ${duration}ms`, {
                duration,
                success: crewaiResponse.success,
                timestamp: crewaiResponse.timestamp
            });
            if (!crewaiResponse.success) {
                throw new Error(`CrewAI execution failed: ${crewaiResponse.error}`);
            }
            await run.addLog('info', 'CrewAI news gathering completed successfully', {
                sourcesUsed: crewaiResponse.sources_used,
                topicsAnalyzed: crewaiResponse.topics
            });
            // Log executive summary if available
            if (crewaiResponse.data?.executive_summary) {
                await run.addLog('info', 'Received executive summary from AI agents', {
                    summaryPoints: crewaiResponse.data.executive_summary.length
                });
            }
            // Log trending topics if available
            if (crewaiResponse.data?.trending_topics) {
                const topTrends = crewaiResponse.data.trending_topics.slice(0, 3);
                await run.addLog('info', `Top trending topics: ${topTrends.map(t => `${t.topic} (${t.mentions} mentions)`).join(', ')}`, {
                    trendingTopics: topTrends
                });
            }
            // Process and store the results
            await run.addLog('info', 'Processing and storing results...');
            await this.processAndStoreResults(crewaiResponse, userId, run);
            // Update run statistics
            const totalItems = this.calculateTotalItems(crewaiResponse);
            run.itemsProcessed = totalItems;
            await run.addLog('info', `Successfully processed ${totalItems} items from CrewAI agents`, {
                totalItems,
                itemsAdded: run.itemsAdded,
                processingComplete: true
            });
        }
        catch (error) {
            await run.addLog('error', `CrewAI agent execution failed: ${error.message}`, {
                error: error.message,
                stack: error.stack,
                serviceUrl: this.crewaiServiceUrl
            });
            throw error;
        }
    }
    async healthCheck() {
        try {
            console.log(`[CrewAI Agent] Performing health check to: ${this.crewaiServiceUrl}/health`);
            const response = await axios_1.default.get(`${this.crewaiServiceUrl}/health`, {
                timeout: 10000
            });
            console.log(`[CrewAI Agent] Health check response:`, response.data);
            if (!response.data.initialized) {
                throw new Error('CrewAI service is not properly initialized');
            }
            console.log(`[CrewAI Agent] Health check passed - service is initialized`);
        }
        catch (error) {
            console.error(`[CrewAI Agent] Health check failed:`, {
                url: `${this.crewaiServiceUrl}/health`,
                error: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`CrewAI service is not running at ${this.crewaiServiceUrl}. Please verify the service is deployed and accessible.`);
            }
            if (error.code === 'ENOTFOUND') {
                throw new Error(`CrewAI service URL not found: ${this.crewaiServiceUrl}. Please check the CREWAI_SERVICE_URL configuration.`);
            }
            throw new Error(`CrewAI service health check failed: ${error.message} (URL: ${this.crewaiServiceUrl})`);
        }
    }
    async executeCrewAIGathering(request) {
        try {
            const response = await axios_1.default.post(`${this.crewaiServiceUrl}/gather-news`, request, {
                timeout: 300000, // 5 minutes timeout for news gathering
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(`CrewAI service error: ${error.response.data?.error || error.response.statusText}`);
            }
            throw new Error(`Failed to communicate with CrewAI service: ${error.message}`);
        }
    }
    async processAndStoreResults(response, userId, run) {
        let addedCount = 0;
        try {
            const data = response.data;
            if (!data) {
                await run.addLog('warn', 'No data received from CrewAI agents');
                return;
            }
            // Store news articles from various sources
            if (data.organized_content) {
                // Process news articles
                if (data.organized_content.news_articles) {
                    await run.addLog('info', `Processing ${data.organized_content.news_articles.length} news articles`);
                    for (const article of data.organized_content.news_articles) {
                        try {
                            const added = await this.storeNewsItem(article, userId, 'news_website');
                            if (added)
                                addedCount++;
                        }
                        catch (error) {
                            await run.addLog('warn', `Failed to store news article: ${error.message}`);
                        }
                    }
                }
                // Process Reddit posts
                if (data.organized_content.reddit_posts) {
                    await run.addLog('info', `Processing ${data.organized_content.reddit_posts.length} Reddit posts`);
                    for (const post of data.organized_content.reddit_posts) {
                        try {
                            const added = await this.storeNewsItem(post, userId, 'reddit');
                            if (added)
                                addedCount++;
                        }
                        catch (error) {
                            await run.addLog('warn', `Failed to store Reddit post: ${error.message}`);
                        }
                    }
                }
                // Process LinkedIn posts
                if (data.organized_content.linkedin_posts) {
                    await run.addLog('info', `Processing ${data.organized_content.linkedin_posts.length} LinkedIn posts`);
                    for (const post of data.organized_content.linkedin_posts) {
                        try {
                            const added = await this.storeNewsItem(post, userId, 'linkedin');
                            if (added)
                                addedCount++;
                        }
                        catch (error) {
                            await run.addLog('warn', `Failed to store LinkedIn post: ${error.message}`);
                        }
                    }
                }
                // Process Telegram messages
                if (data.organized_content.telegram_messages) {
                    await run.addLog('info', `Processing ${data.organized_content.telegram_messages.length} Telegram messages`);
                    for (const message of data.organized_content.telegram_messages) {
                        try {
                            const added = await this.storeNewsItem(message, userId, 'telegram');
                            if (added)
                                addedCount++;
                        }
                        catch (error) {
                            await run.addLog('warn', `Failed to store Telegram message: ${error.message}`);
                        }
                    }
                }
            }
            // Store AI insights and analysis as a special news item
            if (data.ai_insights || data.executive_summary) {
                try {
                    await this.storeAnalysisReport(response, userId);
                    addedCount++;
                    await run.addLog('info', 'Stored AI analysis report');
                }
                catch (error) {
                    await run.addLog('warn', `Failed to store analysis report: ${error.message}`);
                }
            }
            run.itemsAdded = addedCount;
            await run.addLog('info', `Successfully stored ${addedCount} items from CrewAI agents`);
        }
        catch (error) {
            await run.addLog('error', `Error processing CrewAI results: ${error.message}`);
            throw error;
        }
    }
    async storeNewsItem(item, userId, source) {
        try {
            // Check if item already exists
            const existingItem = await NewsItem_1.default.findOne({
                userId,
                $or: [
                    { url: item.url || item.external_url || '' },
                    { title: item.title || item.text || 'Untitled' }
                ]
            });
            if (existingItem) {
                return false; // Already exists
            }
            // Create new news item
            const newsItem = new NewsItem_1.default({
                userId,
                title: item.title || item.text || 'Untitled',
                description: this.generateSummary(item, source),
                content: item.content || item.text || '',
                url: this.getValidUrl(item, source),
                source: {
                    name: source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' '),
                    id: source
                },
                author: item.author || item.author_title || 'Unknown',
                publishedAt: item.published_date ? new Date(item.published_date) :
                    item.timestamp ? new Date(item.timestamp) :
                        item.created_utc ? new Date(item.created_utc * 1000) :
                            new Date(),
                tags: this.generateTags(item, source),
                category: this.determineCategory(item),
                status: 'pending'
            });
            await newsItem.save();
            return true;
        }
        catch (error) {
            console.error(`Error storing news item from ${source}:`, {
                error: error.message,
                validationErrors: error.errors,
                item: {
                    title: item.title || item.text,
                    url: item.url || item.external_url,
                    source: source
                }
            });
            return false;
        }
    }
    async storeAnalysisReport(response, userId) {
        const data = response.data;
        const analysisContent = [
            '# CrewAI Multi-Agent News Analysis Report',
            '',
            '## Executive Summary',
            ...(data.executive_summary || []).map(item => `- ${item}`),
            '',
            '## Trending Topics',
            ...(data.trending_topics || []).slice(0, 5).map(topic => `- **${topic.topic}**: ${topic.mentions} mentions (score: ${topic.trending_score})`),
            '',
            '## AI Insights',
            data.ai_insights ? JSON.stringify(data.ai_insights, null, 2) : 'No AI insights available',
            '',
            '## Recommendations',
            ...(data.recommendations || []).map(rec => `- ${rec}`)
        ].join('\n');
        const analysisItem = new NewsItem_1.default({
            userId,
            title: `CrewAI Analysis Report - ${new Date().toLocaleDateString()}`,
            description: 'Comprehensive analysis from CrewAI multi-agent system covering Reddit, LinkedIn, Telegram, and news sources',
            content: analysisContent,
            url: `#analysis-${Date.now()}`, // Use hash to indicate it's an internal analysis
            source: {
                name: 'CrewAI Analysis',
                id: 'crewai_analysis'
            },
            author: 'CrewAI Multi-Agent System',
            publishedAt: new Date(),
            tags: ['analysis', 'crewai', 'multi-agent', 'trends'],
            category: 'analysis',
            status: 'summarized'
        });
        try {
            await analysisItem.save();
            console.log('[CrewAI Agent] Successfully saved analysis report');
        }
        catch (error) {
            console.error('[CrewAI Agent] Failed to save analysis report:', {
                error: error.message,
                validationErrors: error.errors
            });
            throw error;
        }
    }
    generateSummary(item, source) {
        const content = item.content || item.text || item.summary || '';
        const title = item.title || '';
        if (source === 'reddit') {
            return `Reddit discussion: ${title}. Score: ${item.score || 0}, Comments: ${item.num_comments || 0}`;
        }
        else if (source === 'linkedin') {
            const engagement = item.engagement || {};
            return `LinkedIn post by ${item.author || 'Professional'}. Likes: ${engagement.likes || 0}`;
        }
        else if (source === 'telegram') {
            return `Telegram message from ${item.channel || 'channel'}. Views: ${item.views || 0}`;
        }
        else {
            return content.substring(0, 200) + (content.length > 200 ? '...' : '');
        }
    }
    generateTags(item, source) {
        const tags = [source, 'crewai'];
        if (item.hashtags) {
            tags.push(...item.hashtags.map((tag) => tag.replace('#', '')));
        }
        if (item.topic) {
            tags.push(item.topic);
        }
        if (item.subreddit) {
            tags.push(`r/${item.subreddit}`);
        }
        if (item.flair) {
            tags.push(item.flair);
        }
        return tags.slice(0, 10); // Limit to 10 tags
    }
    determineCategory(item) {
        const text = `${item.title || ''} ${item.content || item.text || ''}`.toLowerCase();
        if (text.includes('ai') || text.includes('artificial intelligence') || text.includes('machine learning')) {
            return 'artificial-intelligence';
        }
        else if (text.includes('startup') || text.includes('funding') || text.includes('investment')) {
            return 'startups';
        }
        else if (text.includes('crypto') || text.includes('blockchain') || text.includes('bitcoin')) {
            return 'cryptocurrency';
        }
        else if (text.includes('programming') || text.includes('software') || text.includes('developer')) {
            return 'software-development';
        }
        else {
            return 'technology';
        }
    }
    extractEngagement(item) {
        if (item.score !== undefined) {
            // Reddit post
            return {
                upvotes: item.score,
                comments: item.num_comments || 0,
                ratio: item.upvote_ratio || 0
            };
        }
        else if (item.engagement) {
            // LinkedIn post
            return item.engagement;
        }
        else if (item.views !== undefined) {
            // Telegram message
            return {
                views: item.views,
                forwards: item.forwards || 0
            };
        }
        return {};
    }
    getValidUrl(item, source) {
        // Check if item has a valid URL
        const url = item.url || item.external_url || item.link || item.permalink;
        if (url && this.isValidUrl(url)) {
            return url;
        }
        // Generate source-specific URLs for different platforms
        switch (source) {
            case 'reddit':
                if (item.subreddit && item.id) {
                    return `https://reddit.com/r/${item.subreddit}/comments/${item.id}`;
                }
                return `https://reddit.com/search/?q=${encodeURIComponent(item.title || 'untitled')}`;
            case 'linkedin':
                if (item.author && item.title) {
                    return `https://linkedin.com/search/results/content/?keywords=${encodeURIComponent(item.title)}`;
                }
                return `https://linkedin.com/feed/`;
            case 'telegram':
                if (item.channel) {
                    return `https://t.me/${item.channel.replace('@', '')}`;
                }
                return `#telegram-${Date.now()}`;
            case 'news_website':
                if (item.domain) {
                    return `https://${item.domain}`;
                }
                return `#news-${Date.now()}`;
            default:
                return `#${source}-${Date.now()}`;
        }
    }
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        }
        catch (_) {
            return false;
        }
    }
    calculateTotalItems(response) {
        if (!response.data?.organized_content)
            return 0;
        const content = response.data.organized_content;
        return ((content.reddit_posts?.length || 0) +
            (content.linkedin_posts?.length || 0) +
            (content.telegram_messages?.length || 0) +
            (content.news_articles?.length || 0));
    }
}
exports.CrewAINewsAgentExecutor = CrewAINewsAgentExecutor;
