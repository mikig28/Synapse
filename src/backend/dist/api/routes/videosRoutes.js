"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videosController_1 = require("../controllers/videosController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming you have this
const router = express_1.default.Router();
// POST /api/v1/videos/telegram - Create a video item from a telegram context (Manual trigger for now)
router.post('/telegram', authMiddleware_1.protect, videosController_1.createVideoFromTelegram);
// GET /api/v1/videos - Get all videos for the authenticated user
router.get('/', authMiddleware_1.protect, videosController_1.getVideos);
// PUT /api/v1/videos/:id/status - Update the watchedStatus of a video
router.put('/:id/status', authMiddleware_1.protect, videosController_1.updateVideoStatus);
// DELETE /api/v1/videos/:id - Delete a specific video
router.delete('/:id', authMiddleware_1.protect, videosController_1.deleteVideo);
exports.default = router;
