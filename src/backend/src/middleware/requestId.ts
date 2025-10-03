/**
 * Request Correlation ID Middleware
 *
 * Generates unique IDs for each request and passes them to external services.
 * Critical for distributed tracing across microservices (Backend → WAHA, CrewAI).
 *
 * Flow:
 * 1. User request → Generate/extract X-Request-ID
 * 2. Attach to all logs via Winston child logger
 * 3. Pass to external services in headers
 * 4. Include in error responses for support tickets
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from '../config/logger';

// Extend Express Request type to include requestId and logger
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: ReturnType<typeof createRequestLogger>;
    }
  }
}

/**
 * Middleware to add request correlation ID
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if client provided a request ID (for client-side correlation)
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Attach to request object
  req.requestId = requestId;

  // Create request-scoped logger with correlation ID
  req.logger = createRequestLogger(requestId);

  // Add to response headers for client-side tracking
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  req.logger.http('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  // Log when response is finished
  res.on('finish', () => {
    req.logger.http('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      requestId,
    });
  });

  next();
};

/**
 * Helper function to get headers with request ID for external service calls
 */
export const getRequestHeaders = (req: Request, additionalHeaders: Record<string, string> = {}) => {
  return {
    'X-Request-ID': req.requestId,
    'User-Agent': 'Synapse-Backend',
    ...additionalHeaders,
  };
};

/**
 * Helper to create axios config with request ID
 */
export const createAxiosConfig = (req: Request, config: any = {}) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Request-ID': req.requestId,
    },
  };
};

export default requestIdMiddleware;
