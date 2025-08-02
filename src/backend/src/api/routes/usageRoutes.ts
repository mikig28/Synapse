import express from 'express';
import {
  getUserUsage,
  checkUsageLimit,
  trackUsageEvent,
  getUsageAnalytics,
  getUserUsageHistory,
  getTierPricing,
  simulateTierUpgrade
} from '../controllers/usageController';
import { authenticateToken } from '../../middleware/auth';

const router = express.Router();

// Public routes
router.get('/pricing', getTierPricing);

// Protected routes (require authentication)
router.use(authenticateToken);

// User usage routes
router.get('/my-usage', getUserUsage);
router.get('/my-usage/history', getUserUsageHistory);
router.post('/check-limit', checkUsageLimit);
router.post('/track-event', trackUsageEvent);

// Beta testing routes
router.post('/simulate-upgrade', simulateTierUpgrade);

// Analytics routes (admin access)
router.get('/analytics', getUsageAnalytics);

export default router;