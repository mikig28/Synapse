/**
 * Production-Grade Rate Limiting Configuration
 *
 * Protects against:
 * - DDoS attacks
 * - API abuse
 * - Excessive AI API costs
 * - Resource exhaustion
 *
 * Strategy:
 * - Global rate limit for all requests
 * - Stricter limits for expensive operations (AI, embeddings)
 * - Per-IP tracking
 * - Custom error messages with retry-after headers
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Global rate limiter - applies to all requests
 * 100 requests per minute per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 minute',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req: Request) => req.path === '/health' || req.path === '/api/v1/health',
});

/**
 * Strict rate limiter for AI operations
 * 10 requests per minute per IP (AI calls are expensive)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  message: {
    success: false,
    error: 'Too many AI requests. Please wait before making more requests.',
    retryAfter: '1 minute',
    upgradeRequired: true,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter
 * Prevents brute force attacks
 * 5 failed login attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * WhatsApp operation rate limiter
 * Prevents flooding WAHA service
 * 30 requests per minute per IP
 */
export const whatsappRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 WhatsApp operations per minute
  message: {
    success: false,
    error: 'Too many WhatsApp requests. Please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Agent execution rate limiter
 * CrewAI calls are expensive and slow
 * 5 requests per 5 minutes per IP
 */
export const agentRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 agent executions
  message: {
    success: false,
    error: 'Too many agent execution requests. Agents require significant processing time.',
    retryAfter: '5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Document upload rate limiter
 * Prevents storage abuse
 * 20 uploads per hour
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    error: 'Upload limit exceeded. Please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search operation rate limiter
 * Vector database queries can be expensive
 * 50 searches per minute
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 searches per minute
  message: {
    success: false,
    error: 'Too many search requests. Please slow down.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Export summary rate limiter
 * Generating exports is resource-intensive
 * 10 exports per hour
 */
export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: {
    success: false,
    error: 'Export limit exceeded. Please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Custom handler for rate limit exceeded
 */
export const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: 'Rate limit exceeded',
    message: 'You have made too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

export default {
  global: globalRateLimiter,
  ai: aiRateLimiter,
  auth: authRateLimiter,
  whatsapp: whatsappRateLimiter,
  agent: agentRateLimiter,
  upload: uploadRateLimiter,
  search: searchRateLimiter,
  export: exportRateLimiter,
};
