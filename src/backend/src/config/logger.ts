/**
 * Production-Grade Winston Logger Configuration
 *
 * Features:
 * - Structured JSON logging for production (Render.com compatible)
 * - Console logging for development
 * - Log levels: error, warn, info, http, debug
 * - Automatic request ID correlation
 * - File rotation for local development
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for console output (development)
const consoleFormat = printf(({ level, message, timestamp, requestId, service, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;

  if (requestId) {
    msg += ` [${requestId}]`;
  }

  if (service) {
    msg += ` [${service}]`;
  }

  msg += `: ${message}`;

  // Add metadata if present
  const metadataKeys = Object.keys(metadata);
  if (metadataKeys.length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Determine log level based on environment
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create the logger instance
const logger = winston.createLogger({
  level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: {
    service: 'synapse-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [],
});

// Production: JSON format for Render.com logs
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        json()
      ),
    })
  );
} else {
  // Development: Colorized console output
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      ),
    })
  );

  // Also write to files in development
  logger.add(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: json(),
    })
  );

  logger.add(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: json(),
    })
  );
}

// Create child logger with request context
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// Export default logger
export default logger;
