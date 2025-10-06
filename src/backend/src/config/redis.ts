/**
 * Redis Configuration for Production Scalability
 *
 * Purpose: Enable horizontal scaling of Socket.io across multiple server instances
 *
 * What Redis Does:
 * - Acts as a message broker (Pub/Sub) between server instances
 * - Enables WebSocket events to reach users on ANY server instance
 * - Provides caching layer for expensive operations (AI, embeddings, search)
 *
 * Without Redis:
 * - Single server can only handle ~10k concurrent WebSocket connections
 * - Events only reach users connected to the SAME server instance
 * - No horizontal scaling possible
 *
 * With Redis:
 * - Unlimited servers can be added behind a load balancer
 * - Events reach ALL users regardless of which server they're connected to
 * - Production-ready architecture for 100k+ concurrent users
 */

import { createClient } from 'redis';
import logger from './logger';
import { config as envConfig } from './env';

// Redis connection options
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  retryStrategy?: (retries: number) => number | Error;
}

// Get Redis configuration from environment variables
const getRedisConfig = (): RedisConfig | null => {
  // Support multiple Redis URL formats:
  // 1. Full URL: redis://username:password@host:port/db
  // 2. Individual env vars: REDIS_HOST, REDIS_PORT, etc.

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;

  if (redisUrl) {
    // Parse Redis URL
    logger.info('[Redis] Using Redis URL configuration');
    return null; // Will use URL directly in createClient
  }

  // Fallback to individual environment variables
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME;
  const db = parseInt(process.env.REDIS_DB || '0', 10);

  logger.info('[Redis] Using individual env var configuration', { host, port, db });

  return {
    host,
    port,
    password,
    username,
    db,
    retryStrategy: (retries: number) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, max 3000ms
      if (retries > 10) {
        logger.error('[Redis] Max retry attempts reached');
        return new Error('Max Redis retry attempts reached');
      }
      const delay = Math.min(50 * Math.pow(2, retries), 3000);
      logger.warn(`[Redis] Retry attempt ${retries}, waiting ${delay}ms`);
      return delay;
    }
  };
};

/**
 * Create Redis client for Socket.io adapter
 */
export const createRedisClient = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    const config = getRedisConfig();

    // Create Redis client
    const client = createClient({
      url: redisUrl || undefined,
      socket: config ? {
        host: config.host,
        port: config.port,
        reconnectStrategy: config.retryStrategy
      } : undefined,
      password: config?.password,
      username: config?.username,
      database: config?.db,
    });

    // Error handler
    client.on('error', (err) => {
      logger.error('[Redis] Client error', { error: err.message });
    });

    // Connection events
    client.on('connect', () => {
      logger.info('[Redis] Client connecting...');
    });

    client.on('ready', () => {
      logger.info('[Redis] Client ready');
    });

    client.on('reconnecting', () => {
      logger.warn('[Redis] Client reconnecting...');
    });

    client.on('end', () => {
      logger.warn('[Redis] Client connection closed');
    });

    // Connect to Redis
    await client.connect();

    logger.info('[Redis] ✅ Connected successfully', {
      host: config?.host || 'from URL',
      port: config?.port,
      db: config?.db
    });

    return client;

  } catch (error) {
    logger.error('[Redis] ❌ Failed to connect', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // In development, allow server to start without Redis
    if (envConfig.app.isDevelopment) {
      logger.warn('[Redis] ⚠️  Running in development mode without Redis');
      logger.warn('[Redis] ⚠️  Socket.io will NOT scale across multiple instances');
      return null;
    }

    // In production, Redis is required for scalability
    throw error;
  }
};

/**
 * Create a separate Redis client for caching operations
 * (separate from Socket.io adapter to avoid connection pool conflicts)
 */
export const createCacheClient = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
    const config = getRedisConfig();

    const client = createClient({
      url: redisUrl || undefined,
      socket: config ? {
        host: config.host,
        port: config.port,
        reconnectStrategy: config.retryStrategy
      } : undefined,
      password: config?.password,
      username: config?.username,
      database: config?.db,
    });

    client.on('error', (err) => {
      logger.error('[Redis Cache] Client error', { error: err.message });
    });

    await client.connect();

    logger.info('[Redis Cache] ✅ Cache client connected');

    return client;

  } catch (error) {
    logger.error('[Redis Cache] ❌ Failed to connect cache client', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Allow server to continue without cache in development
    if (envConfig.app.isDevelopment) {
      logger.warn('[Redis Cache] ⚠️  Running without cache layer');
      return null;
    }

    throw error;
  }
};

/**
 * Test Redis connection
 */
export const testRedisConnection = async (client: ReturnType<typeof createClient>) => {
  try {
    if (!client) {
      logger.warn('[Redis] No client provided for testing');
      return false;
    }

    // Test PING command
    await client.ping();
    logger.info('[Redis] ✅ PING test successful');

    // Test SET/GET
    await client.set('test:connection', 'ok', { EX: 10 }); // 10 second TTL
    const value = await client.get('test:connection');

    if (value === 'ok') {
      logger.info('[Redis] ✅ SET/GET test successful');
      return true;
    }

    logger.error('[Redis] ❌ SET/GET test failed');
    return false;

  } catch (error) {
    logger.error('[Redis] ❌ Connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

// Export types
export type RedisClientType = ReturnType<typeof createClient>;
