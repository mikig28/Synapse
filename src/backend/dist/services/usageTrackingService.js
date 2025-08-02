"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageTrackingService = exports.UsageTrackingService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Usage_1 = require("../models/Usage");
const date_fns_1 = require("date-fns");
class UsageTrackingService {
    static getInstance() {
        if (!UsageTrackingService.instance) {
            UsageTrackingService.instance = new UsageTrackingService();
        }
        return UsageTrackingService.instance;
    }
    /**
     * Track a usage event for a user
     */
    async trackUsage(data) {
        try {
            const userId = new mongoose_1.default.Types.ObjectId(data.userId);
            const now = new Date();
            // Get or create usage records for different periods
            await Promise.all([
                this.updateUsageRecord(userId, 'daily', now, data),
                this.updateUsageRecord(userId, 'weekly', now, data),
                this.updateUsageRecord(userId, 'monthly', now, data)
            ]);
            console.log(`[Usage Tracking] Tracked ${data.feature}:${data.action} for user ${data.userId}`);
        }
        catch (error) {
            console.error('[Usage Tracking] Error tracking usage:', error);
            // Don't throw - usage tracking shouldn't break the main flow
        }
    }
    /**
     * Get or create usage record for a specific period
     */
    async updateUsageRecord(userId, periodType, date, data) {
        const { start, end } = this.getPeriodBounds(date, periodType);
        // Find existing record or create new one
        let usage = await Usage_1.Usage.findOne({
            userId,
            'period.start': start,
            'period.end': end,
            'period.type': periodType
        });
        if (!usage) {
            usage = new Usage_1.Usage({
                userId,
                period: { start, end, type: periodType },
                features: {
                    searches: { count: 0, uniqueQueries: 0, avgResponseTime: 0, totalResultsReturned: 0 },
                    agents: { executionsCount: 0, totalExecutionTime: 0, uniqueAgentsUsed: 0, scheduledAgentsCount: 0 },
                    data: { documentsUploaded: 0, documentsAnalyzed: 0, totalStorageUsed: 0, exportJobsCreated: 0 },
                    integrations: { whatsappMessages: 0, telegramMessages: 0, calendarEvents: 0, newsArticlesProcessed: 0 },
                    content: { notesCreated: 0, ideasCreated: 0, tasksCreated: 0, meetingsCreated: 0, bookmarksAdded: 0 },
                    advanced: { vectorSearchQueries: 0, aiSummariesGenerated: 0, videoTranscriptions: 0, ttsGenerations: 0 }
                },
                api: { totalRequests: 0, averageRequestsPerHour: 0, peakHourRequests: 0, errorRate: 0, avgResponseTime: 0 },
                patterns: { mostActiveHours: [], mostUsedFeatures: [], sessionDuration: 0, loginFrequency: 0 },
                resources: { computeTime: 0, bandwidthUsed: 0, apiCallsExternal: 0, storageOperations: 0 },
                billing: {
                    estimatedCost: 0,
                    tier: 'free',
                    overageFlags: [],
                    credits: { used: 0, remaining: 1000, type: 'api_calls' }
                },
                metadata: {
                    platform: data.platform || 'web',
                    userAgent: data.userAgent || '',
                    deviceInfo: { type: 'desktop', os: '', browser: '' }
                },
                flags: { isPowerUser: false, isNewUser: true, isChurnRisk: false, hasHitLimits: false }
            });
        }
        // Update usage based on feature and action
        this.incrementUsageCounters(usage, data);
        // Update API metrics
        usage.api.totalRequests += 1;
        if (data.responseTime) {
            usage.api.avgResponseTime = (usage.api.avgResponseTime + data.responseTime) / 2;
        }
        // Update resource consumption
        if (data.computeTime) {
            usage.resources.computeTime += data.computeTime;
        }
        if (data.storageUsed) {
            usage.resources.storageOperations += 1;
        }
        // Update patterns
        const currentHour = new Date().getHours();
        if (!usage.patterns.mostActiveHours.includes(currentHour)) {
            usage.patterns.mostActiveHours.push(currentHour);
        }
        // Update most used features
        const featureKey = `${data.feature}:${data.action}`;
        if (!usage.patterns.mostUsedFeatures.includes(featureKey)) {
            usage.patterns.mostUsedFeatures.push(featureKey);
        }
        // Calculate estimated cost (manual calculation)
        this.calculateCost(usage);
        // Check usage limits (manual check)
        this.checkLimits(usage);
        // Update flags
        await this.updateUserFlags(usage);
        await usage.save();
        return usage;
    }
    /**
     * Increment specific usage counters based on feature and action
     */
    incrementUsageCounters(usage, data) {
        const { feature, action, metadata } = data;
        switch (feature) {
            case 'search':
                usage.features.searches.count += 1;
                if (metadata?.unique)
                    usage.features.searches.uniqueQueries += 1;
                if (metadata?.resultsCount)
                    usage.features.searches.totalResultsReturned += metadata.resultsCount;
                if (metadata?.isVector)
                    usage.features.advanced.vectorSearchQueries += 1;
                break;
            case 'agent':
                usage.features.agents.executionsCount += 1;
                if (data.computeTime)
                    usage.features.agents.totalExecutionTime += data.computeTime;
                if (metadata?.agentId && !metadata.counted)
                    usage.features.agents.uniqueAgentsUsed += 1;
                if (action === 'schedule')
                    usage.features.agents.scheduledAgentsCount += 1;
                break;
            case 'document':
                if (action === 'upload')
                    usage.features.data.documentsUploaded += 1;
                if (action === 'analyze')
                    usage.features.data.documentsAnalyzed += 1;
                if (data.storageUsed)
                    usage.features.data.totalStorageUsed += data.storageUsed;
                break;
            case 'export':
                usage.features.data.exportJobsCreated += 1;
                break;
            case 'whatsapp':
                usage.features.integrations.whatsappMessages += 1;
                break;
            case 'telegram':
                usage.features.integrations.telegramMessages += 1;
                break;
            case 'calendar':
                usage.features.integrations.calendarEvents += 1;
                break;
            case 'news':
                usage.features.integrations.newsArticlesProcessed += 1;
                break;
            case 'note':
                if (action === 'create')
                    usage.features.content.notesCreated += 1;
                break;
            case 'idea':
                if (action === 'create')
                    usage.features.content.ideasCreated += 1;
                break;
            case 'task':
                if (action === 'create')
                    usage.features.content.tasksCreated += 1;
                break;
            case 'meeting':
                if (action === 'create')
                    usage.features.content.meetingsCreated += 1;
                break;
            case 'bookmark':
                if (action === 'add')
                    usage.features.content.bookmarksAdded += 1;
                break;
            case 'ai':
                if (action === 'summarize')
                    usage.features.advanced.aiSummariesGenerated += 1;
                break;
            case 'transcription':
                usage.features.advanced.videoTranscriptions += 1;
                break;
            case 'tts':
                usage.features.advanced.ttsGenerations += 1;
                break;
            case 'external_api':
                usage.resources.apiCallsExternal += 1;
                break;
        }
    }
    /**
     * Manual cost calculation
     */
    calculateCost(usage) {
        const pricing = {
            searchCost: 0.001, // $0.001 per search
            agentExecutionCost: 0.01, // $0.01 per agent execution
            storageCost: 0.000001, // $0.000001 per byte per month
            apiRequestCost: 0.0001, // $0.0001 per API request
            aiSummaryCost: 0.05 // $0.05 per AI summary
        };
        const cost = ((usage.features.searches.count * pricing.searchCost) +
            (usage.features.agents.executionsCount * pricing.agentExecutionCost) +
            (usage.features.data.totalStorageUsed * pricing.storageCost) +
            (usage.api.totalRequests * pricing.apiRequestCost) +
            (usage.features.advanced.aiSummariesGenerated * pricing.aiSummaryCost));
        usage.billing.estimatedCost = Math.round(cost * 100) / 100; // Round to 2 decimal places
    }
    /**
     * Manual limits checking
     */
    checkLimits(usage) {
        const limits = this.getTierLimits(usage.billing.tier);
        const overages = [];
        // Check various limits based on tier
        if (usage.features.searches.count > limits.searches) {
            overages.push('searches');
        }
        if (usage.features.agents.executionsCount > limits.agentExecutions) {
            overages.push('agent_executions');
        }
        if (usage.features.data.totalStorageUsed > limits.storage) {
            overages.push('storage');
        }
        if (usage.api.totalRequests > limits.apiRequests) {
            overages.push('api_requests');
        }
        usage.billing.overageFlags = overages;
        usage.flags.hasHitLimits = overages.length > 0;
    }
    /**
     * Get tier limits
     */
    getTierLimits(tier) {
        const tierLimits = {
            free: {
                searches: 100,
                agentExecutions: 10,
                storage: 100 * 1024 * 1024, // 100MB
                apiRequests: 1000,
                exportJobs: 3
            },
            starter: {
                searches: 1000,
                agentExecutions: 100,
                storage: 1024 * 1024 * 1024, // 1GB
                apiRequests: 10000,
                exportJobs: 10
            },
            pro: {
                searches: 10000,
                agentExecutions: 1000,
                storage: 10 * 1024 * 1024 * 1024, // 10GB
                apiRequests: 100000,
                exportJobs: 50
            },
            enterprise: {
                searches: Infinity,
                agentExecutions: Infinity,
                storage: Infinity,
                apiRequests: Infinity,
                exportJobs: Infinity
            }
        };
        return tierLimits[tier] || tierLimits.free;
    }
    /**
     * Update user behavior flags
     */
    async updateUserFlags(usage) {
        // Check if power user (high usage across multiple features)
        const totalScore = usage.totalUsageScore;
        usage.flags.isPowerUser = totalScore > 100; // Threshold for power user
        // Check if new user (first 30 days)
        const accountAge = Date.now() - usage.createdAt.getTime();
        usage.flags.isNewUser = accountAge < (30 * 24 * 60 * 60 * 1000);
        // Check churn risk (declining usage pattern)
        if (usage.period.type === 'weekly') {
            const previousWeekUsage = await this.getPreviousPeriodUsage(usage.userId, 'weekly', usage.period.start);
            if (previousWeekUsage && totalScore < previousWeekUsage.totalUsageScore * 0.5) {
                usage.flags.isChurnRisk = true;
            }
        }
    }
    /**
     * Get usage data for previous period
     */
    async getPreviousPeriodUsage(userId, periodType, currentStart) {
        const previousStart = new Date(currentStart);
        switch (periodType) {
            case 'daily':
                previousStart.setDate(previousStart.getDate() - 1);
                break;
            case 'weekly':
                previousStart.setDate(previousStart.getDate() - 7);
                break;
            case 'monthly':
                previousStart.setMonth(previousStart.getMonth() - 1);
                break;
        }
        const { start, end } = this.getPeriodBounds(previousStart, periodType);
        return await Usage_1.Usage.findOne({
            userId,
            'period.start': start,
            'period.end': end,
            'period.type': periodType
        });
    }
    /**
     * Get period boundaries for date and type
     */
    getPeriodBounds(date, periodType) {
        switch (periodType) {
            case 'daily':
                return { start: (0, date_fns_1.startOfDay)(date), end: (0, date_fns_1.endOfDay)(date) };
            case 'weekly':
                return { start: (0, date_fns_1.startOfWeek)(date, { weekStartsOn: 1 }), end: (0, date_fns_1.endOfWeek)(date, { weekStartsOn: 1 }) };
            case 'monthly':
                return { start: (0, date_fns_1.startOfMonth)(date), end: (0, date_fns_1.endOfMonth)(date) };
        }
    }
    /**
     * Get user's current usage for a period
     */
    async getUserUsage(userId, periodType = 'monthly', date = new Date()) {
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const { start, end } = this.getPeriodBounds(date, periodType);
        return await Usage_1.Usage.findOne({
            userId: userObjectId,
            'period.start': start,
            'period.end': end,
            'period.type': periodType
        });
    }
    /**
     * Get usage analytics for admin dashboard
     */
    async getUsageAnalytics(startDate, endDate) {
        const matchConditions = {};
        if (startDate && endDate) {
            matchConditions['period.start'] = { $gte: startDate, $lte: endDate };
        }
        const [totalUsersResult, activeUsersResult, tierDistribution, topFeatures, flagsStats] = await Promise.all([
            // Total users
            Usage_1.Usage.aggregate([
                { $match: matchConditions },
                { $group: { _id: '$userId' } },
                { $count: 'totalUsers' }
            ]),
            // Active users (users with usage > 0)
            Usage_1.Usage.aggregate([
                { $match: matchConditions },
                { $group: {
                        _id: '$userId',
                        totalUsage: { $sum: { $add: [
                                    '$features.searches.count',
                                    '$features.agents.executionsCount',
                                    '$features.content.notesCreated'
                                ] } }
                    } },
                { $match: { totalUsage: { $gt: 0 } } },
                { $count: 'activeUsers' }
            ]),
            // Tier distribution
            Usage_1.Usage.aggregate([
                { $match: matchConditions },
                { $group: {
                        _id: '$billing.tier',
                        count: { $sum: 1 }
                    } }
            ]),
            // Top features by usage
            Usage_1.Usage.aggregate([
                { $match: matchConditions },
                {
                    $project: {
                        features: {
                            searches: '$features.searches.count',
                            agents: '$features.agents.executionsCount',
                            documents: '$features.data.documentsUploaded',
                            notes: '$features.content.notesCreated',
                            ideas: '$features.content.ideasCreated',
                            tasks: '$features.content.tasksCreated'
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSearches: { $sum: '$features.searches' },
                        totalAgents: { $sum: '$features.agents' },
                        totalDocuments: { $sum: '$features.documents' },
                        totalNotes: { $sum: '$features.notes' },
                        totalIdeas: { $sum: '$features.ideas' },
                        totalTasks: { $sum: '$features.tasks' }
                    }
                }
            ]),
            // User flags statistics
            Usage_1.Usage.aggregate([
                { $match: matchConditions },
                {
                    $group: {
                        _id: null,
                        powerUsers: { $sum: { $cond: ['$flags.isPowerUser', 1, 0] } },
                        churnRisk: { $sum: { $cond: ['$flags.isChurnRisk', 1, 0] } },
                        averageCost: { $avg: '$billing.estimatedCost' }
                    }
                }
            ])
        ]);
        // Process results
        const totalUsers = totalUsersResult[0]?.totalUsers || 0;
        const activeUsers = activeUsersResult[0]?.activeUsers || 0;
        const tierDist = {};
        tierDistribution.forEach(tier => {
            tierDist[tier._id] = tier.count;
        });
        const topFeaturesData = topFeatures[0] || {};
        const topFeaturesArray = [
            { feature: 'searches', usage: topFeaturesData.totalSearches || 0 },
            { feature: 'agents', usage: topFeaturesData.totalAgents || 0 },
            { feature: 'documents', usage: topFeaturesData.totalDocuments || 0 },
            { feature: 'notes', usage: topFeaturesData.totalNotes || 0 },
            { feature: 'ideas', usage: topFeaturesData.totalIdeas || 0 },
            { feature: 'tasks', usage: topFeaturesData.totalTasks || 0 }
        ].sort((a, b) => b.usage - a.usage);
        const flagsData = flagsStats[0] || {};
        const averageCost = flagsData.averageCost || 0;
        // Simple revenue projection (monthly recurring revenue estimate)
        const revenueProjection = ((tierDist.starter || 0) * 29 + // $29/month for starter
            (tierDist.pro || 0) * 99 + // $99/month for pro
            (tierDist.enterprise || 0) * 299 // $299/month for enterprise
        );
        return {
            totalUsers,
            activeUsers,
            totalUsage: topFeaturesArray.reduce((sum, f) => sum + f.usage, 0),
            topFeatures: topFeaturesArray.slice(0, 5),
            tierDistribution: tierDist,
            churnRisk: flagsData.churnRisk || 0,
            powerUsers: flagsData.powerUsers || 0,
            averageCost,
            revenueProjection
        };
    }
    /**
     * Check if user can perform action based on their tier limits
     */
    async canUserPerformAction(userId, action, feature) {
        const usage = await this.getUserUsage(userId, 'monthly');
        if (!usage) {
            return { allowed: true }; // No usage record = new user, allow action
        }
        const limits = usage.getTierLimits();
        switch (feature) {
            case 'search':
                if (usage.features.searches.count >= limits.searches) {
                    return {
                        allowed: false,
                        reason: 'Monthly search limit exceeded',
                        upgradeRequired: true
                    };
                }
                break;
            case 'agent':
                if (usage.features.agents.executionsCount >= limits.agentExecutions) {
                    return {
                        allowed: false,
                        reason: 'Monthly agent execution limit exceeded',
                        upgradeRequired: true
                    };
                }
                break;
            case 'export':
                if (usage.features.data.exportJobsCreated >= limits.exportJobs) {
                    return {
                        allowed: false,
                        reason: 'Monthly export limit exceeded',
                        upgradeRequired: true
                    };
                }
                break;
            case 'storage':
                if (usage.features.data.totalStorageUsed >= limits.storage) {
                    return {
                        allowed: false,
                        reason: 'Storage limit exceeded',
                        upgradeRequired: true
                    };
                }
                break;
            case 'api':
                if (usage.api.totalRequests >= limits.apiRequests) {
                    return {
                        allowed: false,
                        reason: 'Monthly API request limit exceeded',
                        upgradeRequired: true
                    };
                }
                break;
        }
        return { allowed: true };
    }
    /**
     * Quick tracking methods for common actions
     */
    async trackSearch(userId, responseTime, resultsCount, isVector = false) {
        await this.trackUsage({
            userId,
            feature: 'search',
            action: 'query',
            responseTime,
            metadata: { resultsCount, unique: true, isVector }
        });
    }
    async trackAgentExecution(userId, agentId, computeTime) {
        await this.trackUsage({
            userId,
            feature: 'agent',
            action: 'execute',
            computeTime,
            metadata: { agentId }
        });
    }
    async trackContentCreation(userId, contentType) {
        await this.trackUsage({
            userId,
            feature: contentType,
            action: 'create'
        });
    }
    async trackIntegrationMessage(userId, platform) {
        await this.trackUsage({
            userId,
            feature: platform,
            action: 'message'
        });
    }
    async trackExport(userId, format, itemCount) {
        await this.trackUsage({
            userId,
            feature: 'export',
            action: 'create',
            metadata: { format, itemCount }
        });
    }
}
exports.UsageTrackingService = UsageTrackingService;
exports.usageTrackingService = UsageTrackingService.getInstance();
exports.default = exports.usageTrackingService;
