import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';
import {
  getPlatformAnalytics,
  getAllUsers,
  getUserAnalytics,
  updateUserRole,
  getRealtimeStats,
  getSystemHealth,
} from '../controllers/adminController';

const router = Router();

/**
 * All admin routes require authentication (protect) AND admin role (isAdmin)
 */

/**
 * @route   GET /api/v1/admin/analytics
 * @desc    Get comprehensive platform analytics
 * @access  Admin only
 */
router.get('/analytics', protect, isAdmin, getPlatformAnalytics);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with analytics and pagination
 * @query   page, limit, role, tier, search, isPowerUser, isChurnRisk
 * @access  Admin only
 */
router.get('/users', protect, isAdmin, getAllUsers);

/**
 * @route   GET /api/v1/admin/users/:userId
 * @desc    Get specific user analytics
 * @access  Admin only
 */
router.get('/users/:userId', protect, isAdmin, getUserAnalytics);

/**
 * @route   PATCH /api/v1/admin/users/:userId/role
 * @desc    Update user role (admin/user)
 * @body    { role: 'admin' | 'user' }
 * @access  Admin only
 */
router.patch('/users/:userId/role', protect, isAdmin, updateUserRole);

/**
 * @route   GET /api/v1/admin/realtime-stats
 * @desc    Get real-time platform statistics
 * @access  Admin only
 */
router.get('/realtime-stats', protect, isAdmin, getRealtimeStats);

/**
 * @route   GET /api/v1/admin/system-health
 * @desc    Get system health metrics
 * @access  Admin only
 */
router.get('/system-health', protect, isAdmin, getSystemHealth);

export default router;
