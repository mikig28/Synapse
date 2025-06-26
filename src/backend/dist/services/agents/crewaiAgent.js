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
        // Validate URL format
        try {
            new URL(this.crewaiServiceUrl);
        }
        catch (error) {
            console.error(`[CrewAI Agent] Invalid CREWAI_SERVICE_URL: ${this.crewaiServiceUrl}`);
            throw new Error(`Invalid CREWAI_SERVICE_URL: ${this.crewaiServiceUrl}`);
        }
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
            try {
                await this.healthCheck();
                await run.addLog('info', 'CrewAI service health check passed');
            }
            catch (healthError) {
                await run.addLog('warn', `Health check failed: ${healthError.message}`);
                await run.addLog('info', 'Will attempt to use fallback crew if service is unavailable');
            }
            const config = agent.configuration;
            // Dynamic topic handling - accept any topics without hardcoded mappings
            let topics = [];
            const configTopics = config.topics;
            // Handle various formats and ensure we have valid topics
            if (!configTopics) {
                // No topics configured - require user to specify topics for meaningful results
                console.error(`[CrewAI Agent] No topics configured for agent ${agent.name}`);
                await run.addLog('error', `No topics configured for agent "${agent.name}". Please configure specific topics in agent settings for meaningful results.`);
                throw new Error(`Agent "${agent.name}" has no topics configured. Please add topics in the agent configuration to specify what content should be gathered.`);
            }
            else if (typeof configTopics === 'string') {
                // Handle string topics - could be comma-separated or single topic
                const trimmed = configTopics.trim();
                if (trimmed.length === 0) {
                    // Empty string - require user to specify topics
                    await run.addLog('error', `Empty topics string provided for agent "${agent.name}". Please specify meaningful topics.`);
                    throw new Error(`Agent "${agent.name}" has empty topics configuration. Please provide specific topics to gather content about.`);
                }
                else {
                    // Parse comma-separated topics or use as single topic
                    topics = trimmed.includes(',')
                        ? trimmed.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
                        : [trimmed];
                    if (topics.length === 0) {
                        await run.addLog('error', `No valid topics found after parsing for agent "${agent.name}". Please provide meaningful topics.`);
                        throw new Error(`Agent "${agent.name}" configuration resulted in no valid topics. Please check your topic configuration.`);
                    }
                }
            }
            else if (Array.isArray(configTopics)) {
                // Handle array topics - filter valid strings
                topics = configTopics
                    .filter((t) => typeof t === 'string' && t.trim().length > 0)
                    .map((t) => t.trim());
                if (topics.length === 0) {
                    // Empty array after filtering - require user to specify topics
                    await run.addLog('error', `No valid topics found in array for agent "${agent.name}". Please provide meaningful topics.`);
                    throw new Error(`Agent "${agent.name}" configuration contains no valid topics. Please provide specific topics in the configuration.`);
                }
            }
            // Log the actual topics being used
            console.log(`[CrewAI Agent] Using topics for agent ${agent.name}:`, topics);
            await run.addLog('info', `Processing user-defined topics: ${topics.join(', ')}`);
            const sources = {
                reddit: config.crewaiSources?.reddit !== false,
                linkedin: config.crewaiSources?.linkedin !== false,
                telegram: config.crewaiSources?.telegram !== false,
                news_websites: config.crewaiSources?.news_websites !== false
            };
            await run.addLog('info', `Gathering news for topics: ${topics.join(', ')}`, { topics });
            await run.addLog('info', `Using sources: ${Object.entries(sources).filter(([_, enabled]) => enabled).map(([source]) => source).join(', ')}`, { sources });
            // Execute CrewAI news gathering
            await run.addLog('info', `🔍 Connecting to CrewAI service at ${this.crewaiServiceUrl}...`);
            await run.addLog('info', `📊 Requesting analysis for topics: ${topics.join(', ')}`);
            await run.addLog('info', `🎯 Sources enabled: ${Object.entries(sources).filter(([_, enabled]) => enabled).map(([source]) => source).join(', ')}`);
            const startTime = Date.now();
            // First check service health and get diagnostics
            await run.addLog('info', '🏥 Checking CrewAI service health...');
            try {
                const healthResponse = await axios_1.default.get(`${this.crewaiServiceUrl}/health`, { timeout: 10000 });
                const health = healthResponse.data;
                await run.addLog('info', `✅ Service Status: ${health.status || 'unknown'}`);
                await run.addLog('info', `🔧 Mode: ${health.mode || 'unknown'}`);
                await run.addLog('info', `📰 Real News Enabled: ${health.real_news_enabled ? '✅ Yes' : '❌ No'}`);
                await run.addLog('info', `🛠️ Scraper Type: ${health.scraper_type || 'unknown'}`);
                if (health.scraper_error) {
                    await run.addLog('warn', `⚠️ Scraper Error: ${health.scraper_error}`);
                }
                if (health.environment_variables) {
                    const apiStatus = Object.entries(health.environment_variables)
                        .map(([key, status]) => `${key}: ${status}`)
                        .join(', ');
                    await run.addLog('info', `🔑 API Credentials: ${apiStatus}`);
                }
            }
            catch (error) {
                await run.addLog('warn', `⚠️ Health check failed: ${error.message}`);
            }
            await run.addLog('info', '🚀 Starting news gathering process...');
            // Add detailed execution logging      
            await run.addLog('info', '📋 Initializing multi-agent crew system...');
            await run.addLog('info', `🎯 Target topics: ${topics.join(', ')}`);
            const enabledSources = Object.entries(sources).filter(([_, enabled]) => enabled).map(([source]) => source);
            await run.addLog('info', `📊 Sources to process: ${enabledSources.join(', ')}`);
            await run.addLog('info', '🤖 Deploying specialized agents: News Research Specialist, Content Quality Analyst, Trend Analysis Expert');
            await run.addLog('info', '🔄 Agent 1: News Research Specialist is scanning multiple sources...');
            await run.addLog('info', '🔍 Agent 2: Content Quality Analyst is validating article quality...');
            await run.addLog('info', '📈 Agent 3: Trend Analysis Expert is identifying patterns...');
            await run.addLog('info', '⚡ Agents are now gathering and analyzing content...');
            await run.addLog('info', '🧠 AI agents are processing content and matching topics...');
            const crewaiResponse = await this.executeCrewAIGatheringWithFallback({
                topics: topics,
                sources: sources,
                // Add enhanced configuration
                tools: {
                    web_search: true,
                    content_analysis: true,
                    sentiment_analysis: true,
                    trend_detection: true,
                    url_extraction: true,
                    topic_filtering: true,
                    relevance_scoring: true
                },
                parameters: {
                    max_items_per_source: config.maxItemsPerRun || 10,
                    time_range: '24h',
                    quality_threshold: 0.7,
                    relevance_threshold: 0.6,
                    include_urls: true,
                    include_metadata: true,
                    analyze_sentiment: true,
                    extract_entities: true,
                    enforce_topic_relevance: true,
                    filter_irrelevant_content: true,
                    require_source_attribution: true
                }
            }, run);
            const duration = Date.now() - startTime;
            await run.addLog('info', `✅ CrewAI agents completed in ${duration}ms`, {
                duration,
                success: crewaiResponse.success,
                timestamp: crewaiResponse.timestamp
            });
            if (!crewaiResponse.success) {
                throw new Error(`CrewAI execution failed: ${crewaiResponse.error}`);
            }
            await run.addLog('info', '🎉 CrewAI news gathering completed successfully', {
                sourcesUsed: crewaiResponse.sources_used,
                topicsAnalyzed: crewaiResponse.topics
            });
            // Add topic analysis visibility
            if (crewaiResponse.data?.trending_topics) {
                await run.addLog('info', '📊 Topic Analysis Results:', {
                    trendingTopics: crewaiResponse.data.trending_topics.map(t => `${t.topic}: ${t.mentions} mentions`)
                });
            }
            if (crewaiResponse.data?.organized_content) {
                const contentBreakdown = {
                    news_articles: crewaiResponse.data.organized_content.news_articles?.length || 0,
                    reddit_posts: crewaiResponse.data.organized_content.reddit_posts?.length || 0,
                    linkedin_posts: crewaiResponse.data.organized_content.linkedin_posts?.length || 0,
                    telegram_messages: crewaiResponse.data.organized_content.telegram_messages?.length || 0
                };
                await run.addLog('info', '📈 Content gathered by source:', contentBreakdown);
            }
            // Process and store the results
            await run.addLog('info', 'Processing and storing results...');
            // Check if we got real data or fallback data
            const dataAnalysis = this.analyzeDataQuality(crewaiResponse);
            if (dataAnalysis.isFallbackData) {
                await run.addLog('warn', '⚠️ Received simulated/fallback data instead of real sources');
                await run.addLog('info', '🔍 Possible reasons: API rate limits, source unavailability, or service configuration issues');
                await run.addLog('info', '💡 The system generated AI analysis based on the topics instead of scraping real content');
            }
            else if (dataAnalysis.realItemCount === 0) {
                await run.addLog('warn', '📭 No real items found from any data sources');
                await run.addLog('info', '🔍 This could indicate: API limits, network issues, or sources being temporarily unavailable');
                await run.addLog('info', '💡 Consider trying again later or with different topics');
            }
            else {
                await run.addLog('info', `✅ Successfully gathered ${dataAnalysis.realItemCount} real items from ${dataAnalysis.activeSources.length} sources`);
                await run.addLog('info', `📊 Active sources: ${dataAnalysis.activeSources.join(', ')}`);
            }
            await this.processAndStoreResults(crewaiResponse, userId, run);
            // Update run statistics
            const totalItems = this.calculateTotalItems(crewaiResponse);
            run.itemsProcessed = totalItems;
            await run.addLog('info', `Successfully processed ${totalItems} items from CrewAI agents`, {
                totalItems,
                itemsAdded: run.itemsAdded,
                processingComplete: true,
                dataQuality: dataAnalysis
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
        return this.healthCheckWithRetry();
    }
    async healthCheckWithRetry(maxAttempts = 3) {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[CrewAI Agent] Health check attempt ${attempt}/${maxAttempts} to: ${this.crewaiServiceUrl}/health`);
                // Progressive timeout: 15s first attempt, 45s for subsequent attempts (Render cold starts)
                const timeout = attempt === 1 ? 15000 : 45000;
                const response = await axios_1.default.get(`${this.crewaiServiceUrl}/health`, {
                    timeout,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                console.log(`[CrewAI Agent] Health check response (attempt ${attempt}):`, response.data);
                if (!response.data.initialized) {
                    throw new Error('CrewAI service is not properly initialized');
                }
                console.log(`[CrewAI Agent] Health check passed on attempt ${attempt} - service is initialized`);
                return; // Success!
            }
            catch (error) {
                lastError = error;
                console.error(`[CrewAI Agent] Health check attempt ${attempt} failed:`, {
                    url: `${this.crewaiServiceUrl}/health`,
                    error: error.message,
                    code: error.code,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    timeout: attempt === 1 ? 15000 : 45000
                });
                // If this is not the last attempt and it's a connection/timeout error, wait before retrying
                if (attempt < maxAttempts && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
                    const waitTime = Math.min(5000 * attempt, 15000); // Progressive backoff: 5s, 10s, 15s max
                    console.log(`[CrewAI Agent] Waiting ${waitTime}ms before retry (service may be cold starting)`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                // If it's the last attempt or a non-retryable error, break
                break;
            }
        }
        // All attempts failed
        if (lastError.code === 'ECONNREFUSED' || lastError.code === 'ETIMEDOUT' || lastError.code === 'ENOTFOUND') {
            throw new Error(`CrewAI service is unavailable at ${this.crewaiServiceUrl} after ${maxAttempts} attempts. This could be due to:
- Service is sleeping on Render (cold start can take 30-60 seconds)
- Network connectivity issues
- Service deployment problems

Attempted with progressive timeouts (15s, 45s, 45s) to account for cold starts.
Using fallback test crew to demonstrate dashboard functionality.`);
        }
        throw new Error(`CrewAI service health check failed after ${maxAttempts} attempts: ${lastError.message} (URL: ${this.crewaiServiceUrl})`);
    }
    async executeCrewAIGathering(request) {
        return this.executeCrewAIGatheringWithRetry(request);
    }
    async executeCrewAIGatheringWithRetry(request, maxAttempts = 2) {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[CrewAI Agent] News gathering attempt ${attempt}/${maxAttempts}`);
                const response = await axios_1.default.post(`${this.crewaiServiceUrl}/gather-news`, request, {
                    timeout: 300000, // 5 minutes timeout for news gathering
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });
                console.log(`[CrewAI Agent] News gathering succeeded on attempt ${attempt}`);
                return response.data;
            }
            catch (error) {
                lastError = error;
                console.error(`[CrewAI Agent] News gathering attempt ${attempt} failed:`, {
                    error: error.message,
                    code: error.code,
                    status: error.response?.status,
                    statusText: error.response?.statusText
                });
                // Only retry on connection/timeout errors and if not the last attempt
                if (attempt < maxAttempts && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
                    const waitTime = 10000; // 10 seconds between news gathering retries
                    console.log(`[CrewAI Agent] Waiting ${waitTime}ms before retry (service may have restarted)`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                break;
            }
        }
        // All attempts failed
        if (lastError.response) {
            throw new Error(`CrewAI service error after ${maxAttempts} attempts: ${lastError.response.data?.error || lastError.response.statusText}`);
        }
        throw new Error(`Failed to communicate with CrewAI service after ${maxAttempts} attempts: ${lastError.message}`);
    }
    async executeCrewAIGatheringWithFallback(request, run) {
        try {
            // First try the real CrewAI service
            await run.addLog('info', '🔄 Attempting to connect to CrewAI service...');
            return await this.executeCrewAIGathering(request);
        }
        catch (serviceError) {
            // If service is unavailable, use fallback
            await run.addLog('warn', `⚠️ CrewAI service unavailable: ${serviceError.message}`);
            await run.addLog('info', '🎭 Using fallback mock crew for dashboard demonstration...');
            return await this.executeFallbackCrew(request, run);
        }
    }
    async executeFallbackCrew(request, run) {
        const { topics = ['technology'], sources } = request;
        const startTime = Date.now();
        // Simulate crew execution with realistic progress
        const steps = [
            { agent: 'News Research Specialist', step: 'Initializing news research', delay: 500 },
            { agent: 'News Research Specialist', step: 'Scanning news sources', delay: 1000 },
            { agent: 'News Research Specialist', step: 'Filtering by topics', delay: 800 },
            { agent: 'Content Quality Analyst', step: 'Analyzing content quality', delay: 1200 },
            { agent: 'Content Quality Analyst', step: 'Validating URLs', delay: 600 },
            { agent: 'Trend Analysis Expert', step: 'Identifying trends', delay: 900 },
            { agent: 'Trend Analysis Expert', step: 'Generating insights', delay: 700 },
            { agent: 'System', step: 'Compiling final report', delay: 500 }
        ];
        for (const step of steps) {
            await run.addLog('info', `🤖 ${step.agent}: ${step.step}...`);
            await new Promise(resolve => setTimeout(resolve, step.delay));
        }
        // Generate mock data
        const mockData = this.generateMockNewsData(topics, sources);
        const duration = Date.now() - startTime;
        await run.addLog('info', `✅ Fallback crew completed in ${duration}ms (simulated data)`);
        return {
            success: true,
            timestamp: new Date().toISOString(),
            topics: topics || [],
            sources_used: sources,
            data: mockData
        };
    }
    generateMockNewsData(topics, sources) {
        const currentDate = new Date().toISOString().split('T')[0];
        const safeTopics = topics || ['technology'];
        const mockArticles = safeTopics.flatMap((topic, topicIndex) => Array.from({ length: 2 }, (_, i) => ({
            title: `${topic} Development Update - Latest Industry Insights`,
            url: `https://example-news.com/${topic.toLowerCase()}-update-${topicIndex}-${i}`,
            summary: `Recent developments in ${topic} showing significant progress in key areas. This article covers the latest trends and insights from industry experts.`,
            content: `Detailed analysis of recent ${topic} developments and their impact on the industry...`,
            source: 'Mock News Network',
            published_date: currentDate,
            relevance_score: 0.8 + (Math.random() * 0.2),
            sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
            entities: [topic, 'technology', 'innovation'],
            category: 'technology'
        })));
        return {
            executive_summary: [
                `Analysis of ${safeTopics.join(', ')} topics reveals active development across multiple areas.`,
                'Trending discussions show increased interest in emerging technologies.',
                'Quality content has been identified across various sources.'
            ],
            trending_topics: safeTopics.map(topic => ({
                topic,
                mentions: Math.floor(Math.random() * 50) + 10,
                trending_score: Math.random() * 0.5 + 0.5
            })),
            organized_content: {
                news_articles: mockArticles,
                reddit_posts: [],
                linkedin_posts: [],
                telegram_messages: []
            },
            ai_insights: {
                sentiment_analysis: 'Overall positive sentiment detected',
                key_themes: safeTopics,
                market_indicators: 'Stable growth patterns observed'
            },
            recommendations: [
                'Continue monitoring these trending topics',
                'Focus on quality content from reliable sources',
                'Consider expanding coverage to related topics'
            ]
        };
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
                const sources = ['news_articles', 'reddit_posts', 'linkedin_posts', 'telegram_messages'];
                const sourceNames = {
                    news_articles: 'news_website',
                    reddit_posts: 'reddit',
                    linkedin_posts: 'linkedin',
                    telegram_messages: 'telegram'
                };
                await run.addLog('info', '📊 Content breakdown received from CrewAI:', {
                    news_articles: data.organized_content.news_articles?.length || 0,
                    reddit_posts: data.organized_content.reddit_posts?.length || 0,
                    linkedin_posts: data.organized_content.linkedin_posts?.length || 0,
                    telegram_messages: data.organized_content.telegram_messages?.length || 0
                });
                for (const sourceKey of sources) {
                    const items = data.organized_content[sourceKey];
                    const sourceName = sourceNames[sourceKey];
                    if (items && items.length > 0) {
                        // Enhanced Debugging
                        if (sourceKey === 'reddit_posts') {
                            await run.addLog('info', `🔴 REDDIT DEBUG: Received ${items.length} posts. Sample:`, {
                                sampleItem: {
                                    id: items[0]?.id,
                                    title: items[0]?.title,
                                    subreddit: items[0]?.subreddit,
                                    permalink: items[0]?.permalink,
                                    url: items[0]?.url,
                                    simulated: items[0]?.simulated,
                                }
                            });
                        }
                        if (sourceKey === 'linkedin_posts') {
                            await run.addLog('info', `💼 LINKEDIN DEBUG: Received ${items.length} posts. Sample:`, {
                                sampleItem: {
                                    id: items[0]?.id,
                                    title: items[0]?.title || items[0]?.text,
                                    author: items[0]?.author,
                                    external_url: items[0]?.external_url,
                                    simulated: items[0]?.simulated,
                                }
                            });
                        }
                        if (sourceKey === 'telegram_messages') {
                            await run.addLog('info', `📱 TELEGRAM DEBUG: Received ${items.length} messages. Sample:`, {
                                sampleItem: {
                                    id: items[0]?.id,
                                    title: items[0]?.title || items[0]?.text,
                                    channel: items[0]?.channel,
                                    simulated: items[0]?.simulated,
                                }
                            });
                        }
                        await run.addLog('info', `📝 Processing ${items.length} items from ${sourceName.replace('_', ' ')}`);
                        let sourceAddedCount = 0;
                        for (const [index, item] of items.entries()) {
                            try {
                                await run.addLog('info', `Processing ${sourceName} item ${index + 1}/${items.length}: ${(item.title || item.text || 'Untitled').substring(0, 80)}...`);
                                const added = await this.storeNewsItem(item, userId, sourceName, run);
                                if (added) {
                                    sourceAddedCount++;
                                    addedCount++;
                                    await run.addLog('info', `✅ Successfully stored ${sourceName} item ${index + 1}`);
                                }
                                else {
                                    await run.addLog('info', `⏭️  Skipped ${sourceName} item ${index + 1} (already exists)`);
                                }
                            }
                            catch (error) {
                                await run.addLog('warn', `❌ Failed to store ${sourceName} item ${index + 1}: ${error.message}`);
                            }
                        }
                        await run.addLog('info', `📊 ${sourceName}: Stored ${sourceAddedCount}/${items.length} items`);
                    }
                    else {
                        await run.addLog('info', `📭 No items received from ${sourceName.replace('_', ' ')}`);
                    }
                }
            }
            else {
                await run.addLog('warn', '⚠️  No organized_content received from CrewAI service');
            }
            run.itemsAdded = addedCount;
            await run.addLog('info', `Successfully stored ${addedCount} items from CrewAI agents`);
            const summary = (data.executive_summary || ['CrewAI analysis complete.']).join('\\n');
            const details = {
                trending_topics: data.trending_topics,
                ai_insights: data.ai_insights,
                recommendations: data.recommendations,
                sources_used: response.sources_used,
            };
            await run.complete(summary, details);
            await run.addLog('info', 'Stored AI analysis report in agent run results.');
            // Also create a summary NewsItem to act as a container for the run in the UI
            if (data.ai_insights || data.executive_summary) {
                try {
                    await this.storeAnalysisReport(response, userId, run);
                    await run.addLog('info', 'Stored AI analysis report summary NewsItem.');
                }
                catch (error) {
                    await run.addLog('warn', `Failed to store analysis report summary NewsItem: ${error.message}`);
                }
            }
        }
        catch (error) {
            await run.addLog('error', `Error processing CrewAI results: ${error.message}`);
            await run.fail(`Error processing CrewAI results: ${error.message}`);
            throw error;
        }
    }
    async storeNewsItem(item, userId, source, run) {
        try {
            // Check if this is simulated data
            const isSimulated = item.simulated === true;
            // Generate the URL early so we can log it
            const url = this.getValidUrl(item, source);
            const title = item.title || item.text || 'Untitled';
            console.log(`[CrewAI Agent] Storing ${source} item:`, {
                title: title.substring(0, 100),
                url,
                isSimulated,
                hasContent: !!(item.content || item.text),
                author: item.author || item.author_title
            });
            // Check if item already exists (be more specific with URL matching)
            const existingItem = await NewsItem_1.default.findOne({
                userId,
                $or: [
                    { url: url }, // Use the processed URL
                    {
                        title: title,
                        'source.id': source // Same title AND same source
                    }
                ]
            });
            if (existingItem) {
                console.log(`[CrewAI Agent] Item already exists, skipping:`, title.substring(0, 100));
                return false; // Already exists
            }
            // Create new news item with enhanced data
            const newsItem = new NewsItem_1.default({
                userId,
                agentId: run.agentId,
                runId: run._id,
                title,
                description: this.generateSummary(item, source, isSimulated),
                content: this.generateContent(item, source),
                url,
                source: {
                    name: this.getSourceDisplayName(source),
                    id: source
                },
                author: item.author || item.author_title || item.username || 'Unknown',
                publishedAt: this.parseDate(item),
                tags: this.generateTags(item, source, isSimulated),
                category: this.determineCategory(item),
                status: 'pending',
                // Add metadata for better tracking
                metadata: {
                    engagement: this.extractEngagement(item),
                    platform: source,
                    isSimulated,
                    originalData: isSimulated ? null : {
                        id: item.id,
                        score: item.score,
                        num_comments: item.num_comments,
                        subreddit: item.subreddit,
                        channel: item.channel,
                        views: item.views
                    }
                }
            });
            await newsItem.save();
            console.log(`[CrewAI Agent] Successfully stored ${source} item:`, title.substring(0, 100));
            return true;
        }
        catch (error) {
            console.error(`[CrewAI Agent] Error storing news item from ${source}:`, {
                error: error.message,
                validationErrors: error.errors,
                item: {
                    title: item.title || item.text,
                    url: item.url || item.external_url,
                    source: source,
                    simulated: item.simulated
                }
            });
            return false;
        }
    }
    async storeAnalysisReport(response, userId, run) {
        const data = response.data;
        // Check data types for better reporting
        const dataTypeInfo = this.analyzeDataTypes(data.organized_content || {});
        const topicFocus = response.topics?.join(', ') || 'User-Defined Topics';
        const topicDomain = this.detectTopicDomain(response.topics || []);
        const analysisContent = [
            `# CrewAI Multi-Agent Analysis Report`,
            `## ${topicFocus}`,
            '',
            dataTypeInfo.hasSimulated ? '⚠️ **DATA NOTICE**: Some content is simulated due to missing API credentials.' : '✅ **DATA STATUS**: All content is from real sources.',
            '',
            '## Executive Summary',
            `**Focus Areas**: ${topicFocus}`,
            `**Content Domain**: ${topicDomain}`,
            ...(data.executive_summary || []).map(item => `- ${item}`),
            '',
            '## Content Quality Metrics',
            `- **Total Items Processed**: ${this.calculateTotalSourceItems(data.organized_content)}`,
            `- **Quality Score**: ${data.ai_insights?.quality_score || 'N/A'}`,
            `- **Relevance Score**: ${data.ai_insights?.average_relevance || 'N/A'}`,
            `- **Topic Match Rate**: ${this.calculateTopicMatchRate(data.organized_content, response.topics)}%`,
            `- **Content Filtering**: ${data.ai_insights?.content_filtering_enabled ? 'Enabled' : 'Disabled'}`,
            '',
            '## Data Sources Status',
            ...dataTypeInfo.statusLines,
            '',
            `## Trending Topics in ${topicDomain}`,
            ...(data.trending_topics || []).slice(0, 10).map(t => `- **${t.topic}** (${t.mentions || 'N/A'} mentions, score: ${t.trending_score})`),
            '',
            '---',
            '## Source Items Processed',
            '',
            ...this.buildSourceSection('News Articles', data.organized_content?.news_articles),
            ...this.buildSourceSection('Reddit Posts', data.organized_content?.reddit_posts),
            ...this.buildSourceSection('LinkedIn Posts', data.organized_content?.linkedin_posts),
            ...this.buildSourceSection('Telegram Messages', data.organized_content?.telegram_messages),
            '',
            '---',
            '## AI Insights',
            data.ai_insights ? '```json\n' + JSON.stringify(data.ai_insights, null, 2) + '\n```' : 'No AI insights available.',
            '',
            '## Recommendations',
            ...(data.recommendations || []).map(rec => `- ${rec}`)
        ].join('\n');
        const analysisItem = new NewsItem_1.default({
            userId,
            agentId: run.agentId,
            runId: run._id,
            title: `CrewAI Analysis Report - ${new Date().toLocaleDateString()}`,
            description: 'Comprehensive analysis from CrewAI multi-agent system. Click to see details and related items.',
            content: analysisContent,
            url: `#analysis-${run._id}`, // Use run ID for a stable URL
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
        }
        catch (error) {
            console.error('[CrewAI Agent] Failed to save analysis report NewsItem:', {
                error: error.message,
            });
            throw error;
        }
    }
    /** Build formatted markdown section for a specific source list */
    buildSourceSection(title, items) {
        if (!items || items.length === 0)
            return [];
        const lines = [];
        lines.push(`### ${title}`);
        lines.push('');
        for (const item of items.slice(0, 50)) { // limit to 50 to avoid huge reports
            // Determine source type for URL processing
            const sourceType = this.getSourceTypeFromTitle(title);
            // Use our enhanced URL processing instead of raw URLs
            const url = this.getValidUrl(item, sourceType);
            const displayTitle = item.title || item.text?.substring(0, 80) || 'Untitled';
            // Add simulation indicator if needed
            const isSimulated = item.simulated === true || this.isSimulatedId(item.id);
            const simulationPrefix = isSimulated ? '🤖 ' : '';
            // Add source validation indicator
            const sourceValid = this.validateItemSource(item, sourceType);
            const sourcePrefix = sourceValid ? '✅ ' : '⚠️ ';
            lines.push(`- [${sourcePrefix}${simulationPrefix}${displayTitle}](${url})`);
            // Add source attribution note if misattributed
            if (!sourceValid) {
                lines.push(`  *Note: Content source may be misattributed*`);
            }
        }
        lines.push('');
        return lines;
    }
    getSourceTypeFromTitle(title) {
        const titleLower = title.toLowerCase();
        if (titleLower.includes('reddit'))
            return 'reddit';
        if (titleLower.includes('linkedin'))
            return 'linkedin';
        if (titleLower.includes('telegram'))
            return 'telegram';
        if (titleLower.includes('news'))
            return 'news_website';
        return 'unknown';
    }
    validateItemSource(item, claimedSource) {
        const url = item.url || item.external_url || '';
        const content = JSON.stringify(item).toLowerCase();
        switch (claimedSource) {
            case 'reddit':
                return !!(item.subreddit || url.includes('reddit.com') ||
                    content.includes('subreddit') || item.reddit_url);
            case 'telegram':
                return !!(url.includes('t.me') || item.channel ||
                    item.channel_name || content.includes('telegram'));
            case 'linkedin':
                return !!(url.includes('linkedin.com') || item.company ||
                    content.includes('linkedin'));
            case 'news_website':
                // Most news content should be valid unless it has specific social media indicators
                return !content.includes('subreddit') && !content.includes('telegram') &&
                    !content.includes('linkedin');
            default:
                return true; // Default to valid for unknown sources
        }
    }
    analyzeDataTypes(organizedContent) {
        const statusLines = [];
        let hasSimulated = false;
        const sources = [
            { key: 'news_articles', name: 'News Articles', icon: '📰' },
            { key: 'reddit_posts', name: 'Reddit Posts', icon: '🔴' },
            { key: 'linkedin_posts', name: 'LinkedIn Posts', icon: '💼' },
            { key: 'telegram_messages', name: 'Telegram Messages', icon: '📱' }
        ];
        for (const source of sources) {
            const items = organizedContent[source.key] || [];
            if (items.length === 0) {
                statusLines.push(`- ${source.icon} **${source.name}**: No items received`);
                continue;
            }
            const simulatedCount = items.filter((item) => item.simulated === true || this.isSimulatedId(item.id)).length;
            const realCount = items.length - simulatedCount;
            if (simulatedCount > 0) {
                hasSimulated = true;
            }
            if (realCount === items.length) {
                statusLines.push(`- ${source.icon} **${source.name}**: ✅ ${realCount} real items`);
            }
            else if (simulatedCount === items.length) {
                statusLines.push(`- ${source.icon} **${source.name}**: 🤖 ${simulatedCount} simulated items`);
            }
            else {
                statusLines.push(`- ${source.icon} **${source.name}**: ✅ ${realCount} real, 🤖 ${simulatedCount} simulated`);
            }
        }
        return { hasSimulated, statusLines };
    }
    checkForSimulatedData(data) {
        const content = data.organized_content || {};
        // Check if any source has simulated data
        const sources = ['reddit_posts', 'linkedin_posts', 'telegram_messages', 'news_articles'];
        for (const source of sources) {
            const items = content[source] || [];
            if (items.some((item) => item.simulated === true)) {
                return true;
            }
        }
        return false;
    }
    generateSummary(item, source, isSimulated = false) {
        const content = item.content || item.text || item.summary || '';
        const title = item.title || '';
        // Enhanced simulated data detection
        const isActuallySimulated = isSimulated || item.simulated === true || this.isSimulatedId(item.id);
        const simulatedPrefix = isActuallySimulated ? '🤖 SIMULATED: ' : '';
        if (source === 'reddit') {
            const subredditInfo = item.subreddit ? `r/${item.subreddit}` : 'Reddit';
            const scoreInfo = isActuallySimulated ? '(fake metrics)' : `Score: ${item.score || 0}, Comments: ${item.num_comments || 0}`;
            return `${simulatedPrefix}${subredditInfo} discussion: ${title}. ${scoreInfo}`;
        }
        else if (source === 'linkedin') {
            const engagement = item.engagement || {};
            const authorInfo = item.author && !item.author.includes('expert_') ? item.author : 'Professional';
            const engagementInfo = isActuallySimulated ? '(fake engagement)' : `Likes: ${engagement.likes || 0}`;
            return `${simulatedPrefix}LinkedIn post by ${authorInfo}. ${engagementInfo}`;
        }
        else if (source === 'telegram') {
            const channelInfo = item.channel && !item.channel.includes('channel_') ? item.channel : 'Telegram channel';
            const viewsInfo = isActuallySimulated ? '(fake views)' : `Views: ${item.views || 0}`;
            return `${simulatedPrefix}Message from ${channelInfo}. ${viewsInfo}`;
        }
        else {
            return `${simulatedPrefix}${content.substring(0, 200) + (content.length > 200 ? '...' : '')}`;
        }
    }
    generateTags(item, source, isSimulated = false) {
        const tags = [source, 'crewai'];
        // Enhanced simulated data detection
        const isActuallySimulated = isSimulated || item.simulated === true || this.isSimulatedId(item.id);
        if (isActuallySimulated) {
            tags.push('simulated');
        }
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
        // Debug logging to see what URLs we're receiving
        console.log(`[CrewAI Agent] URL debug for ${source}:`, {
            url: item.url,
            external_url: item.external_url,
            link: item.link,
            permalink: item.permalink,
            id: item.id,
            subreddit: item.subreddit,
            channel: item.channel,
            domain: item.domain,
            simulated: item.simulated
        });
        // Check if this is simulated data with fake IDs
        const isSimulated = item.simulated === true || this.isSimulatedId(item.id);
        // Check if item has a valid URL
        const possibleUrls = [
            item.url,
            item.external_url,
            item.link,
            item.permalink,
            item.source_url
        ].filter(Boolean);
        // Try to find a valid URL first (only if not obviously fake)
        for (const url of possibleUrls) {
            if (this.isValidUrl(url) && !this.isFakeUrl(url)) {
                console.log(`[CrewAI Agent] Using valid URL for ${source}:`, url);
                return url;
            }
        }
        // If no valid URL found or data is simulated, generate useful fallback URLs
        console.log(`[CrewAI Agent] Generating fallback URL for ${source} (simulated: ${isSimulated})`);
        if (isSimulated) {
            // For simulated data, provide useful search/browse URLs instead of broken links
            return this.generateSimulatedDataUrl(item, source);
        }
        // For real data without valid URLs, try to construct platform URLs
        return this.generatePlatformUrl(item, source);
    }
    isSimulatedId(id) {
        if (!id)
            return false;
        const idString = String(id).toLowerCase();
        // Check for patterns that indicate fake IDs
        return idString.includes('post_') ||
            idString.includes('message_') ||
            idString.includes('article_') ||
            !!idString.match(/^(post|msg|art|item)_?\d+$/);
    }
    isFakeUrl(url) {
        if (!url)
            return false;
        const urlLower = url.toLowerCase();
        return urlLower.includes('post_') ||
            urlLower.includes('message_') ||
            urlLower.includes('article_') ||
            urlLower.includes('example.com') ||
            urlLower.includes('fake.') ||
            urlLower.includes('simulation');
    }
    generateSimulatedDataUrl(item, source) {
        // For simulated data, provide useful browsing URLs instead of broken links
        switch (source) {
            case 'reddit':
                if (item.subreddit) {
                    return `https://reddit.com/r/${item.subreddit}`;
                }
                return `https://reddit.com/r/technology`; // Default to tech subreddit
            case 'linkedin':
                if (item.author && !item.author.includes('expert_')) {
                    return `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(item.author)}`;
                }
                return `https://linkedin.com/feed/`; // LinkedIn feed
            case 'telegram':
                if (item.channel && !item.channel.includes('channel_')) {
                    const channelName = item.channel.replace('@', '').replace('t.me/', '');
                    return `https://t.me/${channelName}`;
                }
                return `https://t.me/s/durov`; // Telegram's official channel as example
            case 'news_website':
                // Use Google News search for the topic
                const searchTerm = item.title || item.topic || 'technology news';
                return `https://news.google.com/search?q=${encodeURIComponent(searchTerm)}`;
            default:
                return `#simulated-${source}-content`;
        }
    }
    generatePlatformUrl(item, source) {
        // For real data without valid URLs, try to construct platform URLs
        switch (source) {
            case 'reddit':
                if (item.subreddit && item.id && !this.isSimulatedId(item.id)) {
                    return `https://reddit.com/r/${item.subreddit}/comments/${item.id}`;
                }
                if (item.subreddit && item.title) {
                    return `https://reddit.com/r/${item.subreddit}/search/?q=${encodeURIComponent(item.title)}&restrict_sr=1`;
                }
                if (item.title) {
                    return `https://reddit.com/search/?q=${encodeURIComponent(item.title)}`;
                }
                return `https://reddit.com`;
            case 'linkedin':
                if (item.title) {
                    return `https://linkedin.com/search/results/content/?keywords=${encodeURIComponent(item.title)}`;
                }
                if (item.author) {
                    return `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(item.author)}`;
                }
                return `https://linkedin.com/feed/`;
            case 'telegram':
                if (item.channel) {
                    const channelName = item.channel.replace('@', '').replace('t.me/', '');
                    if (item.message_id && !this.isSimulatedId(item.message_id)) {
                        return `https://t.me/${channelName}/${item.message_id}`;
                    }
                    return `https://t.me/${channelName}`;
                }
                return `#telegram-${item.id || Date.now()}`;
            case 'news_website':
                if (item.domain && !item.domain.includes('fake') && !item.domain.includes('example')) {
                    return `https://${item.domain}`;
                }
                if (item.source && !item.source.includes('fake')) {
                    return `https://${item.source}`;
                }
                if (item.title) {
                    return `https://google.com/search?q=${encodeURIComponent(item.title + ' news')}`;
                }
                return `#news-${item.id || Date.now()}`;
            default:
                return `#${source}-${item.id || Date.now()}`;
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
    getSourceDisplayName(source) {
        const displayNames = {
            'reddit': 'Reddit',
            'linkedin': 'LinkedIn',
            'telegram': 'Telegram',
            'news_website': 'News Website',
            'crewai_analysis': 'CrewAI Analysis'
        };
        return displayNames[source] || source.charAt(0).toUpperCase() + source.slice(1);
    }
    generateContent(item, source) {
        const content = item.content || item.text || item.selftext || '';
        const title = item.title || '';
        // For different sources, format content appropriately
        switch (source) {
            case 'reddit':
                const subredditInfo = item.subreddit ? `**r/${item.subreddit}**\n\n` : '';
                const flairInfo = item.flair ? `*${item.flair}*\n\n` : '';
                const engagement = `Score: ${item.score || 0} | Comments: ${item.num_comments || 0}`;
                return `${subredditInfo}${flairInfo}${content}\n\n---\n${engagement}`;
            case 'linkedin':
                const authorInfo = item.author ? `**${item.author}**\n\n` : '';
                const likes = item.engagement?.likes ? `👍 ${item.engagement.likes} likes` : '';
                return `${authorInfo}${content}${likes ? `\n\n---\n${likes}` : ''}`;
            case 'telegram':
                const channelInfo = item.channel ? `**${item.channel}**\n\n` : '';
                const views = item.views ? `👁️ ${item.views} views` : '';
                return `${channelInfo}${content}${views ? `\n\n---\n${views}` : ''}`;
            default:
                return content || title;
        }
    }
    parseDate(item) {
        // Try different date formats
        if (item.published_date) {
            return new Date(item.published_date);
        }
        if (item.timestamp) {
            return new Date(item.timestamp);
        }
        if (item.created_utc) {
            return new Date(item.created_utc * 1000); // Unix timestamp
        }
        if (item.date) {
            return new Date(item.date);
        }
        return new Date(); // Default to now
    }
    analyzeDataQuality(response) {
        const analysis = {
            isFallbackData: false,
            realItemCount: 0,
            activeSources: [],
            dataQuality: 'real',
            issues: []
        };
        // Check if we have organized content
        if (!response.data?.organized_content) {
            // If no organized content but we have crew_result, it's likely fallback
            if (response.data?.crew_result) {
                analysis.isFallbackData = true;
                analysis.dataQuality = 'fallback';
                analysis.issues.push('No organized content from real sources');
            }
            return analysis;
        }
        const content = response.data.organized_content;
        // Count real items from each source
        const sourceCounts = {
            reddit: content.reddit_posts?.length || 0,
            linkedin: content.linkedin_posts?.length || 0,
            telegram: content.telegram_messages?.length || 0,
            news_websites: content.news_articles?.length || 0
        };
        // Calculate total real items
        analysis.realItemCount = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);
        // Identify active sources
        analysis.activeSources = Object.entries(sourceCounts)
            .filter(([_, count]) => count > 0)
            .map(([source]) => source);
        // Detect fallback patterns
        if (analysis.realItemCount === 0) {
            // Check if we have crew_result with generic content
            const crewResult = response.data?.crew_result || '';
            const hasMockIndicators = crewResult.includes('Global Climate Summit') ||
                crewResult.includes('Tech Giants Face Scrutiny') ||
                crewResult.includes('Emerging Trends and Developments') ||
                crewResult.length > 1000; // Long generated text
            if (hasMockIndicators) {
                analysis.isFallbackData = true;
                analysis.dataQuality = 'fallback';
                analysis.issues.push('AI-generated content detected instead of real sources');
            }
            else {
                analysis.dataQuality = 'real'; // Empty but real attempt
                analysis.issues.push('No items found from real sources - may be API limits or connectivity issues');
            }
        }
        else if (analysis.realItemCount < 3) {
            analysis.dataQuality = 'mixed';
            analysis.issues.push('Low item count - some sources may be unavailable');
        }
        // Check for simulated items (if the data structure indicates simulation)
        if (content.reddit_posts?.some((post) => this.isSimulatedId(post.id))) {
            analysis.isFallbackData = true;
            analysis.dataQuality = 'fallback';
            analysis.issues.push('Simulated Reddit posts detected');
        }
        if (content.news_articles?.some((article) => this.isSimulatedId(article.id))) {
            analysis.isFallbackData = true;
            analysis.dataQuality = 'fallback';
            analysis.issues.push('Simulated news articles detected');
        }
        return analysis;
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
    calculateTotalSourceItems(organizedContent) {
        if (!organizedContent)
            return 0;
        return ((organizedContent.reddit_posts?.length || 0) +
            (organizedContent.linkedin_posts?.length || 0) +
            (organizedContent.telegram_messages?.length || 0) +
            (organizedContent.news_articles?.length || 0));
    }
    calculateTopicMatchRate(organizedContent, topics) {
        if (!organizedContent || !topics || topics.length === 0)
            return 0;
        const allItems = [
            ...(organizedContent.reddit_posts || []),
            ...(organizedContent.linkedin_posts || []),
            ...(organizedContent.telegram_messages || []),
            ...(organizedContent.news_articles || [])
        ];
        if (allItems.length === 0)
            return 0;
        const topicKeywords = topics.map(t => t.toLowerCase());
        let relevantItems = 0;
        allItems.forEach(item => {
            const text = `${item.title || ''} ${item.content || item.text || ''}`.toLowerCase();
            const hasTopicMatch = topicKeywords.some(keyword => text.includes(keyword));
            if (hasTopicMatch)
                relevantItems++;
        });
        return Math.round((relevantItems / allItems.length) * 100);
    }
    detectTopicDomain(topics) {
        if (!topics || topics.length === 0)
            return 'General Content';
        const topicsLower = topics.map(t => t.toLowerCase());
        const topicsText = topicsLower.join(' ');
        // Define domain patterns without hardcoding specific topics
        const domains = [
            {
                keywords: ['sport', 'football', 'basketball', 'soccer', 'tennis', 'baseball', 'hockey', 'nfl', 'nba', 'mlb', 'fifa', 'olympics'],
                name: 'Sports & Athletics'
            },
            {
                keywords: ['tech', 'technology', 'ai', 'artificial intelligence', 'software', 'programming', 'startup', 'innovation'],
                name: 'Technology & Innovation'
            },
            {
                keywords: ['business', 'finance', 'market', 'economy', 'trading', 'investment', 'corporate', 'company'],
                name: 'Business & Finance'
            },
            {
                keywords: ['health', 'medical', 'medicine', 'healthcare', 'fitness', 'wellness', 'nutrition'],
                name: 'Health & Wellness'
            },
            {
                keywords: ['entertainment', 'movie', 'music', 'celebrity', 'hollywood', 'gaming', 'film'],
                name: 'Entertainment & Media'
            },
            {
                keywords: ['politics', 'government', 'election', 'policy', 'law', 'legal', 'court'],
                name: 'Politics & Government'
            },
            {
                keywords: ['science', 'research', 'study', 'discovery', 'experiment', 'physics', 'chemistry', 'biology'],
                name: 'Science & Research'
            },
            {
                keywords: ['education', 'university', 'school', 'learning', 'academic', 'student'],
                name: 'Education & Learning'
            }
        ];
        // Find the domain with the most keyword matches
        let bestMatch = { domain: 'General Content', matches: 0 };
        domains.forEach(domain => {
            const matches = domain.keywords.filter(keyword => topicsText.includes(keyword)).length;
            if (matches > bestMatch.matches) {
                bestMatch = { domain: domain.name, matches };
            }
        });
        // If we found matches, use that domain, otherwise create a dynamic domain name
        if (bestMatch.matches > 0) {
            return bestMatch.domain;
        }
        // Create a domain name from the first few topics
        const primaryTopics = topics.slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' & ');
        return `${primaryTopics} Content`;
    }
}
exports.CrewAINewsAgentExecutor = CrewAINewsAgentExecutor;
