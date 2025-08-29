"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppHealthMonitor = exports.WhatsAppErrorClassifier = exports.WhatsAppConnectionManager = void 0;
const events_1 = require("events");
/**
 * Circuit Breaker pattern for WhatsApp connection management
 * Simplified connection logic with exponential backoff and state management
 */
class WhatsAppConnectionManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.nextAttemptTime = 0;
        // Configuration
        this.MAX_FAILURES = 5; // Reduced from 10
        this.FAILURE_THRESHOLD_MS = 60000; // 1 minute window
        this.BASE_DELAY = 2000; // 2 seconds
        this.MAX_DELAY = 60000; // 1 minute max
        this.HALF_OPEN_TIMEOUT = 30000; // 30 seconds
    }
    /**
     * Check if connection attempt is allowed
     */
    canAttemptConnection() {
        const now = Date.now();
        switch (this.state) {
            case 'CLOSED':
                return true;
            case 'OPEN':
                // Circuit is open - check if enough time has passed
                if (now >= this.nextAttemptTime) {
                    this.state = 'HALF_OPEN';
                    console.log('[ConnectionManager] 🔄 Circuit entering HALF_OPEN state');
                    return true;
                }
                return false;
            case 'HALF_OPEN':
                // Only one attempt allowed in half-open state
                return false;
            default:
                return false;
        }
    }
    /**
     * Record successful connection
     */
    onConnectionSuccess() {
        console.log('[ConnectionManager] ✅ Connection successful - resetting circuit');
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.nextAttemptTime = 0;
        this.emit('stateChange', { state: this.state, failureCount: this.failureCount });
    }
    /**
     * Record connection failure
     */
    onConnectionFailure(error) {
        const now = Date.now();
        this.lastFailureTime = now;
        this.failureCount++;
        console.log(`[ConnectionManager] ❌ Connection failure ${this.failureCount}/${this.MAX_FAILURES}: ${error.message}`);
        // Calculate next attempt time with exponential backoff
        const delay = this.calculateDelay();
        this.nextAttemptTime = now + delay;
        // Update circuit state
        if (this.failureCount >= this.MAX_FAILURES) {
            this.state = 'OPEN';
            console.log(`[ConnectionManager] 🔴 Circuit OPEN - next attempt in ${delay / 1000}s`);
        }
        else if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            console.log('[ConnectionManager] 🔴 HALF_OPEN attempt failed - circuit OPEN');
        }
        this.emit('stateChange', {
            state: this.state,
            failureCount: this.failureCount,
            nextAttemptTime: this.nextAttemptTime,
            delay
        });
    }
    /**
     * Calculate exponential backoff delay with jitter
     */
    calculateDelay() {
        const exponentialDelay = Math.min(this.BASE_DELAY * Math.pow(2, this.failureCount - 1), this.MAX_DELAY);
        // Add jitter (±25% randomization)
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        return Math.floor(exponentialDelay + jitter);
    }
    /**
     * Get current circuit state
     */
    getState() {
        const now = Date.now();
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttemptTime,
            canAttempt: this.canAttemptConnection(),
            timeUntilNextAttempt: Math.max(0, this.nextAttemptTime - now)
        };
    }
    /**
     * Force reset the circuit (for manual interventions)
     */
    reset() {
        console.log('[ConnectionManager] 🔄 Manually resetting circuit breaker');
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.nextAttemptTime = 0;
        this.emit('stateChange', { state: this.state, failureCount: this.failureCount });
    }
    /**
     * Check if too many failures in recent time window
     */
    isFailureThresholdExceeded() {
        const now = Date.now();
        return (now - this.lastFailureTime) < this.FAILURE_THRESHOLD_MS;
    }
}
exports.WhatsAppConnectionManager = WhatsAppConnectionManager;
/**
 * Error classification for different handling strategies
 */
class WhatsAppErrorClassifier {
    static isRetryableError(error) {
        const message = error.message.toLowerCase();
        // Retryable errors
        if (message.includes('timeout') ||
            message.includes('network') ||
            message.includes('connection lost') ||
            message.includes('socket')) {
            return true;
        }
        // Non-retryable errors
        if (message.includes('logged out') ||
            message.includes('unauthorized') ||
            message.includes('banned') ||
            message.includes('invalid session')) {
            return false;
        }
        // Default to retryable for unknown errors
        return true;
    }
    static getErrorType(error) {
        const message = error.message.toLowerCase();
        if (message.includes('conflict') || message.includes('replaced')) {
            return 'CONFLICT';
        }
        if (message.includes('timeout') || message.includes('timed out')) {
            return 'TIMEOUT';
        }
        if (message.includes('logged out') || message.includes('unauthorized')) {
            return 'AUTH';
        }
        if (message.includes('network') || message.includes('connection')) {
            return 'NETWORK';
        }
        return 'UNKNOWN';
    }
    static shouldClearAuth(error) {
        const errorType = this.getErrorType(error);
        return errorType === 'AUTH' || errorType === 'CONFLICT';
    }
}
exports.WhatsAppErrorClassifier = WhatsAppErrorClassifier;
/**
 * Connection health monitor
 */
class WhatsAppHealthMonitor extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.lastPingTime = 0;
        this.pingInterval = null;
        this.PING_INTERVAL = 60000; // 1 minute
        this.PING_TIMEOUT = 10000; // 10 seconds
    }
    start() {
        this.stop(); // Clear any existing interval
        console.log('[HealthMonitor] 🏥 Starting health monitoring');
        this.pingInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.PING_INTERVAL);
    }
    stop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
            console.log('[HealthMonitor] 🏥 Health monitoring stopped');
        }
    }
    async performHealthCheck() {
        const now = Date.now();
        try {
            // Simple presence update as health check
            this.emit('healthCheck', { type: 'ping', timestamp: now });
            this.lastPingTime = now;
        }
        catch (error) {
            console.log('[HealthMonitor] ❌ Health check failed:', error.message);
            this.emit('healthFailure', { error, timestamp: now });
        }
    }
    getLastPingTime() {
        return this.lastPingTime;
    }
    isHealthy() {
        const now = Date.now();
        return (now - this.lastPingTime) < (this.PING_INTERVAL * 2); // Allow 2x interval
    }
}
exports.WhatsAppHealthMonitor = WhatsAppHealthMonitor;
