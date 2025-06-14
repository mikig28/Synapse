import express from 'express';
import { getTelegramItems, deleteTelegramItem } from '../controllers/captureController';
import { protect } from '../middleware/authMiddleware'; // We'll create this middleware next

const router = express.Router();

// @route   GET api/v1/capture/telegram
// @desc    Get captured telegram items for the logged-in user
// @access  Private
router.get('/telegram', protect, getTelegramItems);

// @route   DELETE api/v1/capture/telegram/:itemId
// @desc    Delete a specific telegram item for the logged-in user
// @access  Private
router.delete('/telegram/:itemId', protect, deleteTelegramItem);

export default router; 