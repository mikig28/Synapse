"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Your JWT protection middleware
const router = express_1.default.Router();
// @route   POST /api/v1/users/me/telegram-chats
// @desc    Add a Telegram chat ID to the authenticated user's monitored list
// @access  Private (requires JWT)
router.post('/me/telegram-chats', authMiddleware_1.protect, userController_1.addMonitoredTelegramChat);
// @route   PUT /api/v1/users/me/telegram-report-settings
// @desc    Update user's Telegram report settings
// @access  Private (requires JWT)
router.put('/me/telegram-report-settings', authMiddleware_1.protect, userController_1.updateTelegramReportSettings);
// You can add other user-specific routes here, e.g.:
// router.get('/me', protect, getMyProfile);
// router.put('/me', protect, updateMyProfile);
exports.default = router;
