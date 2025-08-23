import express from 'express';
import {
  getUserChannels,
  addChannel,
  removeChannel,
  toggleChannelStatus,
  updateChannelKeywords,
  searchChannelMessages,
  getChannelDetails,
  forceChannelFetch
} from '../controllers/telegramChannelController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected (require authentication)
router.use(protect);

// @route   GET /api/v1/telegram-channels
// @desc    Get all channels for authenticated user
router.get('/', getUserChannels);

// @route   POST /api/v1/telegram-channels
// @desc    Add new channel to monitor
router.post('/', addChannel);

// @route   GET /api/v1/telegram-channels/search
// @desc    Search messages across channels
router.get('/search', searchChannelMessages);

// @route   GET /api/v1/telegram-channels/:channelId
// @desc    Get channel details with messages
router.get('/:channelId', getChannelDetails);

// @route   DELETE /api/v1/telegram-channels/:channelId
// @desc    Remove channel from monitoring
router.delete('/:channelId', removeChannel);

// @route   PATCH /api/v1/telegram-channels/:channelId/toggle
// @desc    Toggle channel active status
router.patch('/:channelId/toggle', toggleChannelStatus);

// @route   PATCH /api/v1/telegram-channels/:channelId/keywords
// @desc    Update channel keywords
router.patch('/:channelId/keywords', updateChannelKeywords);

// @route   POST /api/v1/telegram-channels/:channelId/fetch
// @desc    Force fetch new messages for a channel
router.post('/:channelId/fetch', forceChannelFetch);

export default router;
