/**
 * MongoDB Cleanup Routes
 * Admin routes for database cleanup management
 */

import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getCleanupStats,
  runCleanup,
  runEmergencyCleanup,
  getCollectionSizes
} from '../controllers/mongoCleanupController';

const router = express.Router();

// All cleanup routes require authentication (admin check done in admin routes)
router.use(authMiddleware);

/**
 * @route   GET /api/v1/admin/cleanup/stats
 * @desc    Get cleanup statistics and status
 * @access  Admin only
 */
router.get('/stats', getCleanupStats);

/**
 * @route   GET /api/v1/admin/cleanup/collection-sizes
 * @desc    Get database collection sizes
 * @access  Admin only
 */
router.get('/collection-sizes', getCollectionSizes);

/**
 * @route   POST /api/v1/admin/cleanup/run
 * @desc    Trigger manual cleanup (30-day retention)
 * @access  Admin only
 */
router.post('/run', runCleanup);

/**
 * @route   POST /api/v1/admin/cleanup/emergency
 * @desc    Trigger emergency cleanup (7-day retention)
 * @access  Admin only
 * @note    Requires confirmCode in body
 */
router.post('/emergency', runEmergencyCleanup);

export default router;
