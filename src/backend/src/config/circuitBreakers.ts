/**
 * Circuit Breaker Configuration for External Services
 *
 * Prevents cascading failures when external services (WAHA, CrewAI) are down.
 *
 * Circuit Breaker States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Service is down, requests fail fast without calling service
 * - HALF_OPEN: Testing if service recovered, allows limited requests
 *
 * Benefits:
 * - Prevents hanging requests when services are down
 * - Automatic recovery detection
 * - Fail-fast behavior reduces resource consumption
 * - Protects against Render cold start cascades
 */

import CircuitBreaker from 'opossum';
import logger from './logger';

// Circuit breaker options for different service types
export const circuitBreakerOptions = {
  // WAHA Service (Railway.app) - WhatsApp functionality
  waha: {
    timeout: 15000,              // 15 seconds max wait
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000,          // Try to close circuit after 30 seconds
    rollingCountTimeout: 10000,   // 10 second window for error calculation
    rollingCountBuckets: 10,      // Track errors in 10 buckets
    volumeThreshold: 5,           // Minimum 5 requests before opening circuit
    name: 'WAHA Service',
  },

  // CrewAI Service (Render.com) - AI agent processing
  crewai: {
    timeout: 60000,               // 60 seconds max wait (AI processing takes time)
    errorThresholdPercentage: 60, // More tolerant due to cold starts
    resetTimeout: 45000,          // 45 seconds before retry (allow cold start)
    rollingCountTimeout: 20000,   // 20 second window
    rollingCountBuckets: 10,
    volumeThreshold: 3,           // Open faster (AI calls are expensive)
    name: 'CrewAI Service',
  },

  // Generic HTTP service
  generic: {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 20000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 5,
    volumeThreshold: 5,
    name: 'Generic Service',
  },
};

/**
 * Create a circuit breaker for a service
 */
export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: typeof circuitBreakerOptions.waha
): CircuitBreaker<T, R> {
  const breaker = new CircuitBreaker(fn, options);

  // Event logging for monitoring
  breaker.on('open', () => {
    logger.error(`Circuit breaker OPENED for ${options.name}`, {
      service: options.name,
      state: 'OPEN',
      message: 'Too many failures detected. Requests will fail fast.',
    });
  });

  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker HALF-OPEN for ${options.name}`, {
      service: options.name,
      state: 'HALF_OPEN',
      message: 'Testing if service recovered...',
    });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${options.name}`, {
      service: options.name,
      state: 'CLOSED',
      message: 'Service recovered. Normal operation resumed.',
    });
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker TIMEOUT for ${options.name}`, {
      service: options.name,
      timeout: options.timeout,
      message: 'Request exceeded timeout threshold',
    });
  });

  breaker.on('reject', () => {
    logger.debug(`Circuit breaker REJECTED request for ${options.name}`, {
      service: options.name,
      state: breaker.opened ? 'OPEN' : 'UNKNOWN',
      message: 'Request rejected due to open circuit',
    });
  });

  breaker.on('failure', (error) => {
    logger.error(`Circuit breaker FAILURE for ${options.name}`, {
      service: options.name,
      error: error.message,
      stack: error.stack,
    });
  });

  breaker.on('success', () => {
    logger.debug(`Circuit breaker SUCCESS for ${options.name}`, {
      service: options.name,
      state: 'CLOSED',
    });
  });

  return breaker;
}

/**
 * Helper function to wrap axios calls with circuit breaker
 */
export function wrapWithCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  serviceName: 'waha' | 'crewai' | 'generic' = 'generic'
): CircuitBreaker<T, R> {
  const options = circuitBreakerOptions[serviceName];
  return createCircuitBreaker(fn, options);
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(breaker: CircuitBreaker<any, any>) {
  const stats = breaker.stats;
  return {
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    failures: stats.failures,
    fallbacks: stats.fallbacks,
    successes: stats.successes,
    rejects: stats.rejects,
    timeouts: stats.timeouts,
    fires: stats.fires,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    latencyMean: stats.latencyMean,
    percentiles: stats.percentiles,
  };
}

export default {
  createCircuitBreaker,
  wrapWithCircuitBreaker,
  getCircuitBreakerStats,
  options: circuitBreakerOptions,
};
