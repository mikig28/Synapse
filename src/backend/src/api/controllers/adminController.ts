import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import logger from '../../config/logger';
import WhatsAppMessageCleanupService from '../../services/whatsappMessageCleanupService';

/**
 * Get platform-wide analytics
 * GET /api/v1/admin/analytics
 */
export const getPlatformAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    log.info('Fetching platform analytics', { adminId: req.user.id });

    const analytics = await adminAnalyticsService.getPlatformAnalytics();

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    log.error('Error fetching platform analytics', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform analytics',
      error: error.message,
    });
  }
};

/**
 * Get all users with analytics
 * GET /api/v1/admin/users
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      role: req.query.role as 'admin' | 'user' | undefined,
      tier: req.query.tier as string | undefined,
      search: req.query.search as string | undefined,
      isPowerUser: req.query.isPowerUser === 'true' ? true : undefined,
      isChurnRisk: req.query.isChurnRisk === 'true' ? true : undefined,
    };

    log.info('Fetching users list', {
      adminId: req.user.id,
      page,
      limit,
      filters,
    });

    const result = await adminAnalyticsService.getAllUsersWithAnalytics(page, limit, filters);

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        pages: result.pages,
        total: result.total,
      },
    });
  } catch (error: any) {
    log.error('Error fetching users list', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * Get specific user analytics
 * GET /api/v1/admin/users/:userId
 */
export const getUserAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    const { userId } = req.params;

    log.info('Fetching user analytics', {
      adminId: req.user.id,
      targetUserId: userId,
    });

    const userAnalytics = await adminAnalyticsService.getUserAnalytics(userId);

    if (!userAnalytics) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: userAnalytics,
    });
  } catch (error: any) {
    log.error('Error fetching user analytics', {
      error: error.message,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user analytics',
      error: error.message,
    });
  }
};

/**
 * Update user role
 * PATCH /api/v1/admin/users/:userId/role
 */
export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "admin" or "user"',
      });
      return;
    }

    // Prevent admin from demoting themselves
    if (userId === req.user.id && role === 'user') {
      res.status(403).json({
        success: false,
        message: 'You cannot demote yourself from admin role',
      });
      return;
    }

    log.info('Updating user role', {
      adminId: req.user.id,
      targetUserId: userId,
      newRole: role,
    });

    const updated = await adminAnalyticsService.updateUserRole(userId, role);

    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'User not found or role not updated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (error: any) {
    log.error('Error updating user role', {
      error: error.message,
      userId: req.params.userId,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message,
    });
  }
};

/**
 * Get real-time statistics
 * GET /api/v1/admin/realtime-stats
 */
export const getRealtimeStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    const stats = await adminAnalyticsService.getRealtimeStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    log.error('Error fetching realtime stats', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime statistics',
      error: error.message,
    });
  }
};

/**
 * Get system health
 * GET /api/v1/admin/system-health
 */
export const getSystemHealth = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    const analytics = await adminAnalyticsService.getPlatformAnalytics();

    res.status(200).json({
      success: true,
      data: analytics.systemHealth,
    });
  } catch (error: any) {
    log.error('Error fetching system health', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: error.message,
    });
  }
};

/**
 * Manually trigger WhatsApp message cleanup
 * POST /api/v1/admin/whatsapp-cleanup
 */
export const triggerWhatsAppCleanup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    log.info('Manually triggering WhatsApp message cleanup', { adminId: req.user.id });

    const cleanupService = WhatsAppMessageCleanupService.getInstance();
    const stats = await cleanupService.triggerManualCleanup();

    res.status(200).json({
      success: true,
      data: stats,
      message: `Cleanup complete: ${stats.messagesDeleted} messages deleted, ~${stats.spaceSavedMB} MB freed`
    });
  } catch (error: any) {
    log.error('Error triggering WhatsApp cleanup', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to trigger WhatsApp cleanup',
      error: error.message,
    });
  }
};

/**
 * Get WhatsApp cleanup service configuration
 * GET /api/v1/admin/whatsapp-cleanup/config
 */
export const getWhatsAppCleanupConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const log = req.logger || logger;

  try {
    const cleanupService = WhatsAppMessageCleanupService.getInstance();
    const config = cleanupService.getConfig();

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error: any) {
    log.error('Error fetching WhatsApp cleanup config', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp cleanup config',
      error: error.message,
    });
  }
};
