import express from 'express';
import {
  createVideoFromTelegram,
  getVideos,
  updateVideoStatus,
  deleteVideo,
  summarizeVideo,
  checkVideoIndex,
  indexVideo,
  searchVideoMoments
} from '../controllers/videosController';
import { listSubscriptions, createSubscription, triggerFetch, updateModerationStatus, updateSubscription, deleteSubscription, deleteRecommendationVideo, bulkDeleteRecommendations } from '../controllers/videosController';
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

// POST /api/v1/videos/:id/index - Index video captions into Upstash Search
router.post('/:id/index', protect, indexVideo);

// GET /api/v1/videos/:id/index - Check if video captions are indexed
router.get('/:id/index', protect, checkVideoIndex);

// POST /api/v1/videos/:id/search - Search moments in a video's captions
router.post('/:id/search', protect, searchVideoMoments);

// DELETE /api/v1/videos/:id - Delete a specific video
router.delete('/:id', protect, deleteVideo);

// New YouTube Recommendations APIs (MongoDB edition)
router.get('/subscriptions', protect, listSubscriptions);
router.post('/subscriptions', protect, createSubscription);
router.patch('/subscriptions/:id', protect, updateSubscription);
router.delete('/subscriptions/:id', protect, deleteSubscription);
router.post('/fetch', protect, triggerFetch);
router.patch('/:id', protect, updateModerationStatus);
router.delete('/:id/recommendation', protect, deleteRecommendationVideo);
router.delete('/recommendations', protect, bulkDeleteRecommendations);

export default router; 