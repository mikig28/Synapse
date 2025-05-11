import express from 'express';
import { getBookmarks } from '../controllers/bookmarksController';
import { protect } from '../middleware/authMiddleware'; // Assuming you have this

const router = express.Router();

// GET /api/v1/bookmarks
router.get('/', protect, getBookmarks);

export default router; 