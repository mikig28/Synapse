import express from 'express';
import { getBookmarks, processAndCreateBookmark, deleteBookmark, summarizeBookmarkController, summarizeLatestBookmarksController } from '../controllers/bookmarksController';
import { protect } from '../middleware/authMiddleware'; // Assuming you have auth middleware

const router = express.Router();

// Route to get all bookmarks for the authenticated user
router.get('/', protect, getBookmarks);

// Potentially a route to manually create a bookmark if needed, though primary creation is via Telegram
// router.post('/', protect, processAndCreateBookmark); // This might need adjustments if used directly

// Route to delete a specific bookmark
router.delete('/:id', protect, deleteBookmark);

// Route to summarize a specific bookmark
router.post('/:id/summarize', protect, summarizeBookmarkController);

// Route to summarize the latest N bookmarks
router.post('/summarize-latest', protect, summarizeLatestBookmarksController);

export default router; 