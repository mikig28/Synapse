"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const captureController_1 = require("../controllers/captureController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // We'll create this middleware next
const router = express_1.default.Router();
// @route   GET api/v1/capture/telegram
// @desc    Get captured telegram items for the logged-in user
// @access  Private
router.get('/telegram', authMiddleware_1.protect, captureController_1.getTelegramItems);
// @route   DELETE api/v1/capture/telegram/:itemId
// @desc    Delete a specific telegram item for the logged-in user
// @access  Private
router.delete('/telegram/:itemId', authMiddleware_1.protect, captureController_1.deleteTelegramItem);
exports.default = router;
