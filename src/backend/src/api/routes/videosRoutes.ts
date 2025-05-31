import express from 'express';
import {
  createVideoFromTelegram,
  getVideos,
  updateVideoStatus,
  deleteVideo,
  summarizeVideo
} from '../controllers/videosController';
import { protect } from '../middleware/authMiddleware'; // Assuming you have this

const router = express.Router();

// POST /api/v1/videos/telegram - Create a video item from a telegram context (Manual trigger for now)
router.post('/telegram', protect, createVideoFromTelegram);

// GET /api/v1/videos - Get all videos for the authenticated user
router.get('/', protect, getVideos);

// PUT /api/v1/videos/:id/status - Update the watchedStatus of a video
router.put('/:id/status', protect, updateVideoStatus);

// POST /api/v1/videos/:id/summarize - Generate AI summary for a video
router.post('/:id/summarize', protect, summarizeVideo);

// DELETE /api/v1/videos/:id - Delete a specific video
router.delete('/:id', protect, deleteVideo);

export default router; 