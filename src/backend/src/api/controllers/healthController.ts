/**
 * Comprehensive Health Check Controller
 *
 * Provides detailed health status for monitoring and debugging:
 * - Database connectivity
 * - External service status (WAHA, CrewAI)
 * - Circuit breaker states
 * - Memory usage
 * - Uptime
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import logger from '../../config/logger';
import { config } from '../../config/env';
import axios from 'axios';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'connecting' | 'disconnected' | 'disconnecting';
      readyState: number;
      poolSize?: number;
    };
    waha?: {
      status: 'available' | 'unavailable' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
    crewai?: {
      status: 'available' | 'unavailable' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
  };
  system: {
    memory: NodeJS.MemoryUsage;
    nodeVersion: string;
    platform: string;
  };
}

/**
 * Quick health check - for load balancers
 * Returns 200 if database is connected
 */
export const quickHealthCheck = async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState;

  if (dbStatus === 1) {
    // Connected
    return res.status(200).json({ status: 'ok' });
  } else {
    // Not connected
    return res.status(503).json({ status: 'unavailable' });
  }
};

/**
 * Detailed health check - for monitoring and debugging
 */
export const detailedHealthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check database
  const dbReadyState = mongoose.connection.readyState;
  let dbStatus: 'connected' | 'connecting' | 'disconnected' | 'disconnecting' = 'disconnected';

  switch (dbReadyState) {
    case 0:
      dbStatus = 'disconnected';
      overallStatus = 'unhealthy';
      break;
    case 1:
      dbStatus = 'connected';
      break;
    case 2:
      dbStatus = 'connecting';
      overallStatus = 'degraded';
      break;
    case 3:
      dbStatus = 'disconnecting';
      overallStatus = 'degraded';
      break;
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.nodeEnv,
    services: {
      database: {
        status: dbStatus,
        readyState: dbReadyState,
      },
    },
    system: {
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  // Check WAHA service if configured
  if (config.services.waha.url && config.services.waha.apiKey) {
    try {
      const wahaStartTime = Date.now();
      await axios.get(`${config.services.waha.url}/health`, {
        timeout: 5000,
        headers: { 'X-Api-Key': config.services.waha.apiKey },
      });
      const wahaResponseTime = Date.now() - wahaStartTime;

      healthStatus.services.waha = {
        status: 'available',
        responseTime: wahaResponseTime,
      };
    } catch (error: any) {
      healthStatus.services.waha = {
        status: 'unavailable',
        error: error.message,
      };
      overallStatus = 'degraded';
    }
  } else {
    healthStatus.services.waha = {
      status: 'not_configured',
    };
  }

  // Check CrewAI service if configured
  if (config.services.crewai) {
    try {
      const crewaiStartTime = Date.now();
      await axios.get(`${config.services.crewai}/health`, {
        timeout: 5000,
      });
      const crewaiResponseTime = Date.now() - crewaiStartTime;

      healthStatus.services.crewai = {
        status: 'available',
        responseTime: crewaiResponseTime,
      };
    } catch (error: any) {
      healthStatus.services.crewai = {
        status: 'unavailable',
        error: error.message,
      };
      overallStatus = 'degraded';
    }
  } else {
    healthStatus.services.crewai = {
      status: 'not_configured',
    };
  }

  // Update final status
  healthStatus.status = overallStatus;

  // Log health check
  const log = req.logger || logger;
  log.info('Health check completed', {
    status: overallStatus,
    duration: Date.now() - startTime,
  });

  // Return appropriate HTTP status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return res.status(statusCode).json(healthStatus);
};

/**
 * Readiness check - for Kubernetes/deployment systems
 * Returns 200 when the service is ready to accept traffic
 */
export const readinessCheck = async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState;

  // Service is ready if database is connected
  if (dbStatus === 1) {
    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(503).json({
      status: 'not_ready',
      reason: 'Database not connected',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Liveness check - for Kubernetes/deployment systems
 * Returns 200 as long as the process is running
 */
export const livenessCheck = async (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

/**
 * Email service health check - for debugging SMTP configuration
 * Shows whether email service is properly configured
 */
export const healthCheck = async (req: Request, res: Response) => {
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  );

  const emailConfig = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
    services: {
      email: {
        configured: smtpConfigured,
        host: process.env.SMTP_HOST || 'NOT_SET',
        port: process.env.SMTP_PORT || 'NOT_SET',
        user: process.env.SMTP_USER ? '***' + process.env.SMTP_USER.slice(-10) : 'NOT_SET',
        fromName: process.env.SMTP_FROM_NAME || 'NOT_SET',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'NOT_SET',
      },
      frontend: {
        url: process.env.FRONTEND_URL || 'NOT_SET',
      },
      database: {
        connected: mongoose.connection.readyState === 1,
      }
    }
  };

  res.json(emailConfig);
};

export default {
  quickHealthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
  healthCheck,
};
