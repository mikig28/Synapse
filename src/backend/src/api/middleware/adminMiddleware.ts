import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import User from '../../models/User';
import logger from '../../config/logger';

/**
 * Admin authorization middleware
 * Checks if the authenticated user has admin role
 * Must be used after the `protect` (auth) middleware
 */
export const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const log = req.logger || logger;

  try {
    // Ensure user is authenticated first
    if (!req.user?.id) {
      log.warn('Admin middleware called without authentication');
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Fetch user from database to check role
    const user = await User.findById(req.user.id);

    if (!user) {
      log.warn('Admin middleware: User not found', { userId: req.user.id });
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      log.warn('Unauthorized admin access attempt', {
        userId: user._id,
        email: user.email,
        role: user.role,
        endpoint: req.path
      });

      res.status(403).json({
        success: false,
        message: 'Admin access required. You do not have permission to access this resource.'
      });
      return;
    }

    // Attach full user object to request for admin routes
    req.adminUser = user;

    log.info('Admin access granted', {
      userId: user._id,
      email: user.email,
      endpoint: req.path
    });

    next();
  } catch (error: any) {
    log.error('Admin middleware error', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Error verifying admin access'
    });
    return;
  }
};

/**
 * Optional admin middleware - allows both regular users and admins
 * Attaches isAdmin flag to request for conditional logic
 */
export const optionalAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      next();
      return;
    }

    const user = await User.findById(req.user.id);

    if (user && user.role === 'admin') {
      req.adminUser = user;
      (req as any).isAdmin = true;
    } else {
      (req as any).isAdmin = false;
    }

    next();
  } catch (error) {
    // Silently fail for optional middleware
    (req as any).isAdmin = false;
    next();
  }
};
