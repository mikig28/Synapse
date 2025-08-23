"use strict";
/**
 * Polling Configuration
 * Centralized configuration for all polling-related settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLLING_CONFIG = void 0;
exports.POLLING_CONFIG = {
    // Backend caching durations (milliseconds) - MEMORY OPTIMIZED
    backend: {
        statusCacheDuration: 30000, // 30 seconds - Increased for memory efficiency
        sessionCacheDuration: 20000, // 20 seconds - Increased cache duration
        healthCheckCacheDuration: 60000, // 1 minute - Longer health check cache
    },
    // Frontend polling intervals (milliseconds) - MEMORY OPTIMIZED
    frontend: {
        initialCheckDelay: 10000, // 10 seconds - Delayed start
        baseInterval: 30000, // 30 seconds - Reduced frequency
        authenticatedInterval: 60000, // 1 minute - Less frequent when working
        maxInterval: 300000, // 5 minutes - Much longer backoff
        backoffMultiplier: 1.5, // Gentler backoff multiplier
    },
    // Resource limits - MEMORY OPTIMIZED
    limits: {
        maxConcurrentRequests: 1, // Only 1 concurrent request
        requestTimeout: 15000, // 15 seconds - Longer for stability
        maxRetries: 2, // Fewer retries to reduce load
        maxChatsPerRequest: 50, // Limit chats per request
        maxMessagesPerRequest: 100, // Limit messages per request
    }
};
// Environment variable overrides
if (process.env.WAHA_STATUS_CACHE_DURATION) {
    exports.POLLING_CONFIG.backend.statusCacheDuration = parseInt(process.env.WAHA_STATUS_CACHE_DURATION);
}
if (process.env.WAHA_POLLING_INTERVAL) {
    exports.POLLING_CONFIG.frontend.baseInterval = parseInt(process.env.WAHA_POLLING_INTERVAL);
}
if (process.env.WAHA_MAX_POLLING_INTERVAL) {
    exports.POLLING_CONFIG.frontend.maxInterval = parseInt(process.env.WAHA_MAX_POLLING_INTERVAL);
}
exports.default = exports.POLLING_CONFIG;
