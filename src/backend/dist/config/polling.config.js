"use strict";
/**
 * Polling Configuration
 * Centralized configuration for all polling-related settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLLING_CONFIG = void 0;
exports.POLLING_CONFIG = {
    // Backend caching durations (milliseconds)
    backend: {
        statusCacheDuration: 10000, // 10 seconds - WAHA status cache
        sessionCacheDuration: 10000, // 10 seconds - Session status cache
        healthCheckCacheDuration: 30000, // 30 seconds - Health check cache
    },
    // Frontend polling intervals (milliseconds)
    frontend: {
        initialCheckDelay: 5000, // 5 seconds - Initial status check
        baseInterval: 15000, // 15 seconds - Base polling interval
        authenticatedInterval: 30000, // 30 seconds - When authenticated
        maxInterval: 60000, // 1 minute - Maximum backoff interval
        backoffMultiplier: 2, // Exponential backoff multiplier
    },
    // Resource limits
    limits: {
        maxConcurrentRequests: 2, // Max concurrent WAHA API requests
        requestTimeout: 5000, // 5 seconds - Individual request timeout
        maxRetries: 3, // Maximum retry attempts
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
