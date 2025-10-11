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
  triggerWhatsAppCleanup,
  getWhatsAppCleanupConfig,
} from '../controllers/adminController';
import {
  getCleanupStats,
  runCleanup,
  runEmergencyCleanup,
  getCollectionSizes
} from '../controllers/mongoCleanupController';

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

/**
 * @route   POST /api/v1/admin/whatsapp-cleanup
 * @desc    Manually trigger WhatsApp message cleanup
 * @access  Admin only
 */
router.post('/whatsapp-cleanup', protect, isAdmin, triggerWhatsAppCleanup);

/**
 * @route   GET /api/v1/admin/whatsapp-cleanup/config
 * @desc    Get WhatsApp cleanup service configuration
 * @access  Admin only
 */
router.get('/whatsapp-cleanup/config', protect, isAdmin, getWhatsAppCleanupConfig);

/**
 * MongoDB Cleanup Routes
 */

/**
 * @route   GET /api/v1/admin/cleanup/stats
 * @desc    Get MongoDB cleanup statistics and status
 * @access  Admin only
 */
router.get('/cleanup/stats', protect, isAdmin, getCleanupStats);

/**
 * @route   GET /api/v1/admin/cleanup/collection-sizes
 * @desc    Get database collection sizes
 * @access  Admin only
 */
router.get('/cleanup/collection-sizes', protect, isAdmin, getCollectionSizes);

/**
 * @route   POST /api/v1/admin/cleanup/run
 * @desc    Trigger manual MongoDB cleanup (30-day retention)
 * @access  Admin only
 */
router.post('/cleanup/run', protect, isAdmin, runCleanup);

/**
 * @route   POST /api/v1/admin/cleanup/emergency
 * @desc    Trigger emergency MongoDB cleanup (7-day retention)
 * @access  Admin only
 * @note    Requires confirmCode: "EMERGENCY_CLEANUP_CONFIRMED" in body
 */
router.post('/cleanup/emergency', protect, isAdmin, runEmergencyCleanup);

export default router;
