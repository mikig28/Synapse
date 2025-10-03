import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../../models/User'; // Adjust path as necessary
import { AuthenticatedRequest } from '../../types/express';
import { config } from '../../config/env'; // Use validated config
import logger from '../../config/logger'; // Use Winston logger

// Export AuthenticatedRequest interface for use in other modules
export { AuthenticatedRequest };

interface JwtPayload extends jwt.JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Use request-scoped logger if available, otherwise use default logger
  const log = req.logger || logger;

  log.debug('Processing authentication request', {
    method: req.method,
    path: req.path,
    hasAuth: !!req.headers.authorization,
  });

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // SECURITY FIX: Use validated JWT secret from config (no fallback)
      const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
      log.info('Token verified successfully', {
        userId: decoded.id,
        exp: decoded.exp,
      });

      // Check if user still exists in database
      const user = await User.findById(decoded.id);
      if (!user) {
        log.warn('User not found in database', { userId: decoded.id });
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }

      // Attach user to request object
      req.user = { id: decoded.id, email: decoded.email || '' };

      next();
    } catch (error: any) {
      log.error('Token verification failed', {
        error: error.message,
        name: error.name,
        expiredAt: error.expiredAt,
      });

      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }
  }

  if (!token) {
    log.warn('No token provided', {
      method: req.method,
      path: req.path,
    });

    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }
};

// Export as authMiddleware for compatibility
export const authMiddleware = protect;

// Export auth as an alias to protect for compatibility
export const auth = protect;
