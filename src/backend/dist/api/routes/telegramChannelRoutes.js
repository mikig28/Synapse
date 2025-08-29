"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const telegramChannelController_1 = require("../controllers/telegramChannelController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All routes are protected (require authentication)
router.use(authMiddleware_1.protect);
// @route   GET /api/v1/telegram-channels
// @desc    Get all channels for authenticated user
router.get('/', telegramChannelController_1.getUserChannels);
// @route   POST /api/v1/telegram-channels
// @desc    Add new channel to monitor
router.post('/', telegramChannelController_1.addChannel);
// @route   GET /api/v1/telegram-channels/search
// @desc    Search messages across channels
router.get('/search', telegramChannelController_1.searchChannelMessages);
// @route   GET /api/v1/telegram-channels/:channelId
// @desc    Get channel details with messages
router.get('/:channelId', telegramChannelController_1.getChannelDetails);
// @route   DELETE /api/v1/telegram-channels/:channelId
// @desc    Remove channel from monitoring
router.delete('/:channelId', telegramChannelController_1.removeChannel);
// @route   PATCH /api/v1/telegram-channels/:channelId/toggle
// @desc    Toggle channel active status
router.patch('/:channelId/toggle', telegramChannelController_1.toggleChannelStatus);
// @route   PATCH /api/v1/telegram-channels/:channelId/keywords
// @desc    Update channel keywords
router.patch('/:channelId/keywords', telegramChannelController_1.updateChannelKeywords);
// @route   POST /api/v1/telegram-channels/:channelId/fetch
// @desc    Force fetch new messages for a channel
router.post('/:channelId/fetch', telegramChannelController_1.forceChannelFetch);
exports.default = router;
