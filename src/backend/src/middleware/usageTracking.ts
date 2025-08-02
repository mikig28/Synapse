import { Request, Response, NextFunction } from 'express';
import { usageTrackingService } from '../services/usageTrackingService';
import { AuthenticatedRequest } from './auth';

interface UsageTrackingOptions {
  feature: string;
  action?: string;
  trackResponse?: boolean;
  trackStorage?: boolean;
  trackCompute?: boolean;
}

/**
 * Middleware to automatically track usage for API endpoints
 */
export const trackUsage = (options: UsageTrackingOptions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
      res.json = function(data: any) {
        responseTime = Date.now() - startTime;
        
        // Track after response is sent
        setImmediate(async () => {
          try {
            await usageTrackingService.trackUsage({
              userId: req.user!.id,
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
          } catch (error) {
            console.error('[Usage Tracking Middleware] Error tracking usage:', error);
          }
        });

        return originalJson.call(this, data);
      };
    }

    // Add tracking methods to request object for manual tracking
    (req as any).trackCompute = (time: number) => {
      computeTime += time;
    };

    (req as any).trackStorage = (bytes: number) => {
      storageUsed += bytes;
    };

    next();
  };
};

/**
 * Specific tracking middleware for common features
 */
export const trackSearch = trackUsage({ 
  feature: 'search', 
  action: 'query',
  trackResponse: true
});

export const trackAgentExecution = trackUsage({ 
  feature: 'agent', 
  action: 'execute',
  trackResponse: true,
  trackCompute: true
});

export const trackDocumentUpload = trackUsage({ 
  feature: 'document', 
  action: 'upload',
  trackResponse: true,
  trackStorage: true
});

export const trackExport = trackUsage({ 
  feature: 'export', 
  action: 'create',
  trackResponse: true
});

export const trackContentCreation = (contentType: string) => 
  trackUsage({ 
    feature: contentType, 
    action: 'create',
    trackResponse: true
  });

export const trackIntegration = (platform: string) => 
  trackUsage({ 
    feature: platform, 
    action: 'message',
    trackResponse: true
  });

/**
 * Rate limiting middleware based on usage limits
 */
export const rateLimitByUsage = (feature: string, action: string = 'request') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip for non-authenticated requests
    if (!req.user?.id) {
      return next();
    }

    try {
      const canPerform = await usageTrackingService.canUserPerformAction(
        req.user.id,
        action,
        feature
      );

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
    } catch (error) {
      console.error('[Rate Limiting Middleware] Error checking usage limits:', error);
      // Allow request to proceed if usage checking fails
      next();
    }
  };
};

/**
 * Usage analytics tracking middleware for all API requests
 */
export const trackApiUsage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Skip for non-authenticated requests or non-API routes
  if (!req.user?.id || !req.path.startsWith('/api/v1/')) {
    return next();
  }

  const startTime = Date.now();

  // Override res.end to track response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    
    // Track API usage asynchronously
    setImmediate(async () => {
      try {
        await usageTrackingService.trackUsage({
          userId: req.user!.id,
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
      } catch (error) {
        console.error('[API Usage Tracking] Error:', error);
      }
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};