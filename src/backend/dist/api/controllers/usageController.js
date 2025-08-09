"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateTierUpgrade = exports.getTierPricing = exports.getUserUsageHistory = exports.getUsageAnalytics = exports.trackUsageEvent = exports.checkUsageLimit = exports.getUserUsage = void 0;
const usageTrackingService_1 = require("../../services/usageTrackingService");
/**
 * Get current user's usage statistics
 */
const getUserUsage = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { period = 'monthly' } = req.query;
        const periodType = period;
        const usage = await usageTrackingService_1.usageTrackingService.getUserUsage(userId, periodType);
        if (!usage) {
            return res.json({
                success: true,
                data: {
                    period: { type: periodType, start: new Date(), end: new Date() },
                    features: {
                        searches: { count: 0, uniqueQueries: 0, avgResponseTime: 0, totalResultsReturned: 0 },
                        agents: { executionsCount: 0, totalExecutionTime: 0, uniqueAgentsUsed: 0, scheduledAgentsCount: 0 },
                        data: { documentsUploaded: 0, documentsAnalyzed: 0, totalStorageUsed: 0, exportJobsCreated: 0 },
                        integrations: { whatsappMessages: 0, telegramMessages: 0, calendarEvents: 0, newsArticlesProcessed: 0 },
                        content: { notesCreated: 0, ideasCreated: 0, tasksCreated: 0, meetingsCreated: 0, bookmarksAdded: 0 },
                        advanced: { vectorSearchQueries: 0, aiSummariesGenerated: 0, videoTranscriptions: 0, ttsGenerations: 0 }
                    },
                    billing: {
                        estimatedCost: 0,
                        tier: 'free',
                        overageFlags: [],
                        credits: { used: 0, remaining: 1000, type: 'api_calls' }
                    },
                    flags: { isPowerUser: false, isNewUser: true, isChurnRisk: false, hasHitLimits: false }
                },
                message: 'No usage data found - new user'
            });
        }
        res.json({
            success: true,
            data: usage,
            message: 'Usage data retrieved successfully'
        });
    }
    catch (error) {
        console.error('Get user usage error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve usage data'
        });
    }
};
exports.getUserUsage = getUserUsage;
/**
 * Check if user can perform a specific action
 */
const checkUsageLimit = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { action, feature } = req.body;
        if (!action || !feature) {
            return res.status(400).json({
                success: false,
                error: 'Action and feature are required'
            });
        }
        const result = await usageTrackingService_1.usageTrackingService.canUserPerformAction(userId, action, feature);
        res.json({
            success: true,
            data: result,
            message: result.allowed ? 'Action allowed' : 'Action not allowed'
        });
    }
    catch (error) {
        console.error('Check usage limit error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check usage limit'
        });
    }
};
exports.checkUsageLimit = checkUsageLimit;
/**
 * Track a usage event (for manual tracking if needed)
 */
const trackUsageEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { feature, action, metadata, computeTime, storageUsed, responseTime } = req.body;
        if (!feature || !action) {
            return res.status(400).json({
                success: false,
                error: 'Feature and action are required'
            });
        }
        await usageTrackingService_1.usageTrackingService.trackUsage({
            userId,
            feature,
            action,
            metadata,
            computeTime,
            storageUsed,
            responseTime,
            userAgent: req.headers['user-agent'],
            platform: 'web'
        });
        res.json({
            success: true,
            message: 'Usage event tracked successfully'
        });
    }
    catch (error) {
        console.error('Track usage event error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track usage event'
        });
    }
};
exports.trackUsageEvent = trackUsageEvent;
/**
 * Get usage analytics (admin only)
 */
const getUsageAnalytics = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // TODO: Add admin role check when user roles are implemented
        // For now, allow all authenticated users to see analytics for beta
        // if (!req.user?.roles?.includes('admin')) {
        //   return res.status(403).json({
        //     success: false,
        //     error: 'Admin access required'
        //   });
        // }
        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const analytics = await usageTrackingService_1.usageTrackingService.getUsageAnalytics(start, end);
        res.json({
            success: true,
            data: analytics,
            message: 'Usage analytics retrieved successfully'
        });
    }
    catch (error) {
        console.error('Get usage analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve usage analytics'
        });
    }
};
exports.getUsageAnalytics = getUsageAnalytics;
/**
 * Get user's usage history across different periods
 */
const getUserUsageHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { period = 'monthly', limit = 12 } = req.query;
        const periodType = period;
        const limitNum = parseInt(limit, 10);
        // Get usage history for the past periods
        const history = [];
        const now = new Date();
        for (let i = 0; i < limitNum; i++) {
            const date = new Date(now);
            switch (periodType) {
                case 'daily':
                    date.setDate(date.getDate() - i);
                    break;
                case 'weekly':
                    date.setDate(date.getDate() - (i * 7));
                    break;
                case 'monthly':
                    date.setMonth(date.getMonth() - i);
                    break;
            }
            const usage = await usageTrackingService_1.usageTrackingService.getUserUsage(userId, periodType, date);
            if (usage) {
                const totalUsage = (usage.features.searches.count +
                    usage.features.agents.executionsCount +
                    usage.features.data.documentsUploaded +
                    usage.features.integrations.whatsappMessages +
                    usage.features.integrations.telegramMessages +
                    usage.features.content.notesCreated +
                    usage.features.content.ideasCreated +
                    usage.features.content.tasksCreated +
                    usage.features.advanced.vectorSearchQueries +
                    usage.features.advanced.aiSummariesGenerated);
                history.push({
                    period: usage.period,
                    totalUsage,
                    features: usage.features,
                    billing: usage.billing,
                    flags: usage.flags
                });
            }
            else {
                // Add empty period for consistency
                history.push({
                    period: {
                        start: date,
                        end: date,
                        type: periodType
                    },
                    totalUsage: 0,
                    features: null,
                    billing: null,
                    flags: null
                });
            }
        }
        res.json({
            success: true,
            data: {
                history: history.reverse(), // Reverse to show oldest first
                period: periodType,
                limit: limitNum
            },
            message: 'Usage history retrieved successfully'
        });
    }
    catch (error) {
        console.error('Get user usage history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve usage history'
        });
    }
};
exports.getUserUsageHistory = getUserUsageHistory;
/**
 * Get tier pricing information and upgrade options
 */
const getTierPricing = async (req, res) => {
    try {
        const pricing = {
            tiers: [
                {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    period: 'month',
                    features: {
                        searches: 100,
                        agentExecutions: 10,
                        storage: '100MB',
                        apiRequests: 1000,
                        exportJobs: 3,
                        support: 'Community'
                    },
                    popular: false
                },
                {
                    id: 'starter',
                    name: 'Starter',
                    price: 29,
                    period: 'month',
                    features: {
                        searches: 1000,
                        agentExecutions: 100,
                        storage: '1GB',
                        apiRequests: 10000,
                        exportJobs: 10,
                        support: 'Email'
                    },
                    popular: true
                },
                {
                    id: 'pro',
                    name: 'Pro',
                    price: 99,
                    period: 'month',
                    features: {
                        searches: 10000,
                        agentExecutions: 1000,
                        storage: '10GB',
                        apiRequests: 100000,
                        exportJobs: 50,
                        support: 'Priority'
                    },
                    popular: false
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise',
                    price: 299,
                    period: 'month',
                    features: {
                        searches: 'Unlimited',
                        agentExecutions: 'Unlimited',
                        storage: 'Unlimited',
                        apiRequests: 'Unlimited',
                        exportJobs: 'Unlimited',
                        support: 'Dedicated'
                    },
                    popular: false
                }
            ],
            features: [
                { name: 'Universal Search', description: 'Search across all your content' },
                { name: 'AI Agents', description: 'Automated task execution' },
                { name: 'Data Export', description: 'Export your data in multiple formats' },
                { name: 'Integrations', description: 'WhatsApp, Telegram, Calendar' },
                { name: 'Content Management', description: 'Notes, Ideas, Tasks, Meetings' },
                { name: 'Vector Search', description: 'Semantic search capabilities' },
                { name: 'AI Summaries', description: 'Automatic content summarization' },
                { name: 'Video Transcription', description: 'Audio/video to text conversion' }
            ]
        };
        res.json({
            success: true,
            data: pricing,
            message: 'Pricing information retrieved successfully'
        });
    }
    catch (error) {
        console.error('Get tier pricing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve pricing information'
        });
    }
};
exports.getTierPricing = getTierPricing;
/**
 * Simulate tier upgrade (for beta testing)
 */
const simulateTierUpgrade = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        const { tier } = req.body;
        if (!tier || !['free', 'starter', 'pro', 'enterprise'].includes(tier)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tier specified'
            });
        }
        // For beta testing, we'll just update the current month's usage record
        const usage = await usageTrackingService_1.usageTrackingService.getUserUsage(userId, 'monthly');
        if (usage) {
            usage.billing.tier = tier;
            // Reset overage flags and limits
            usage.billing.overageFlags = [];
            usage.flags.hasHitLimits = false;
            // Update credits based on tier
            const creditsMap = {
                free: 1000,
                starter: 10000,
                pro: 100000,
                enterprise: 1000000
            };
            usage.billing.credits.remaining = creditsMap[tier];
            await usage.save();
        }
        res.json({
            success: true,
            data: { tier, upgraded: true },
            message: `Successfully upgraded to ${tier} tier (simulated for beta)`
        });
    }
    catch (error) {
        console.error('Simulate tier upgrade error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to simulate tier upgrade'
        });
    }
};
exports.simulateTierUpgrade = simulateTierUpgrade;
