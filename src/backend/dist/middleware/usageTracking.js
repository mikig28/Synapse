"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackApiUsage = exports.rateLimitByUsage = exports.trackIntegration = exports.trackContentCreation = exports.trackExport = exports.trackDocumentUpload = exports.trackAgentExecution = exports.trackSearch = exports.trackUsage = void 0;
const usageTrackingService_1 = require("../services/usageTrackingService");
/**
 * Middleware to automatically track usage for API endpoints
 */
const trackUsage = (options) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        let responseTime = 0;
        let computeTime = 0;
        let storageUsed = 0;
        // Skip tracking for non-authenticated requests
        if (!req.user?.id) {
            return next();
        }
        // Override res.json to capture response details
        const originalJson = res.json;
        const originalSend = res.send;
        if (options.trackResponse) {
            res.json = function (data) {
                responseTime = Date.now() - startTime;
                // Track after response is sent
                setImmediate(async () => {
                    try {
                        await usageTrackingService_1.usageTrackingService.trackUsage({
                            userId: req.user.id,
                            feature: options.feature,
                            action: options.action || req.method.toLowerCase(),
                            responseTime,
                            computeTime: options.trackCompute ? computeTime : undefined,
                            storageUsed: options.trackStorage ? storageUsed : undefined,
                            userAgent: req.headers['user-agent'],
                            platform: 'web',
                            metadata: {
                                endpoint: req.path,
                                method: req.method,
                                statusCode: res.statusCode,
                                responseSize: JSON.stringify(data).length
                            }
                        });
                    }
                    catch (error) {
                        console.error('[Usage Tracking Middleware] Error tracking usage:', error);
                    }
                });
                return originalJson.call(this, data);
            };
        }
        // Add tracking methods to request object for manual tracking
        req.trackCompute = (time) => {
            computeTime += time;
        };
        req.trackStorage = (bytes) => {
            storageUsed += bytes;
        };
        next();
    };
};
exports.trackUsage = trackUsage;
/**
 * Specific tracking middleware for common features
 */
exports.trackSearch = (0, exports.trackUsage)({
    feature: 'search',
    action: 'query',
    trackResponse: true
});
exports.trackAgentExecution = (0, exports.trackUsage)({
    feature: 'agent',
    action: 'execute',
    trackResponse: true,
    trackCompute: true
});
exports.trackDocumentUpload = (0, exports.trackUsage)({
    feature: 'document',
    action: 'upload',
    trackResponse: true,
    trackStorage: true
});
exports.trackExport = (0, exports.trackUsage)({
    feature: 'export',
    action: 'create',
    trackResponse: true
});
const trackContentCreation = (contentType) => (0, exports.trackUsage)({
    feature: contentType,
    action: 'create',
    trackResponse: true
});
exports.trackContentCreation = trackContentCreation;
const trackIntegration = (platform) => (0, exports.trackUsage)({
    feature: platform,
    action: 'message',
    trackResponse: true
});
exports.trackIntegration = trackIntegration;
/**
 * Rate limiting middleware based on usage limits
 */
const rateLimitByUsage = (feature, action = 'request') => {
    return async (req, res, next) => {
        // Skip for non-authenticated requests
        if (!req.user?.id) {
            return next();
        }
        try {
            const canPerform = await usageTrackingService_1.usageTrackingService.canUserPerformAction(req.user.id, action, feature);
            if (!canPerform.allowed) {
                return res.status(429).json({
                    success: false,
                    error: canPerform.reason || 'Usage limit exceeded',
                    upgradeRequired: canPerform.upgradeRequired,
                    feature,
                    action
                });
            }
            next();
        }
        catch (error) {
            console.error('[Rate Limiting Middleware] Error checking usage limits:', error);
            // Allow request to proceed if usage checking fails
            next();
        }
    };
};
exports.rateLimitByUsage = rateLimitByUsage;
/**
 * Usage analytics tracking middleware for all API requests
 */
const trackApiUsage = async (req, res, next) => {
    // Skip for non-authenticated requests or non-API routes
    if (!req.user?.id || !req.path.startsWith('/api/v1/')) {
        return next();
    }
    const startTime = Date.now();
    // Override res.end to track response
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const responseTime = Date.now() - startTime;
        // Track API usage asynchronously
        setImmediate(async () => {
            try {
                await usageTrackingService_1.usageTrackingService.trackUsage({
                    userId: req.user.id,
                    feature: 'api',
                    action: 'request',
                    responseTime,
                    userAgent: req.headers['user-agent'],
                    platform: 'web',
                    metadata: {
                        endpoint: req.path,
                        method: req.method,
                        statusCode: res.statusCode,
                        userAgent: req.headers['user-agent'],
                        ip: req.ip || req.connection.remoteAddress
                    }
                });
            }
            catch (error) {
                console.error('[API Usage Tracking] Error:', error);
            }
        });
        return originalEnd.call(this, chunk, encoding);
    };
    next();
};
exports.trackApiUsage = trackApiUsage;
