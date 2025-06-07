import express from 'express';
import { getBookmarks, processAndCreateBookmark, deleteBookmark, summarizeBookmarkController, summarizeLatestBookmarksController } from '../controllers/bookmarksController';
import { protect } from '../middleware/authMiddleware'; // Assuming you have auth middleware
import BookmarkItem from '../../models/BookmarkItem';

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

// TEST ENDPOINT - Add test bookmark manually
router.post('/test-create', protect, async (req: any, res: any) => {
  const { url, platform } = req.body;
  const userId = req.user?.id;
  
  if (!userId || !url || !platform) {
    return res.status(400).json({ message: 'Missing required fields: url, platform' });
  }
  
  try {
    console.log(`[TEST ENDPOINT] Creating bookmark - URL: ${url}, Platform: ${platform}`);
    const bookmarkId = await processAndCreateBookmark(userId, url, platform as any);
    const bookmark = await BookmarkItem.findById(bookmarkId);
    console.log(`[TEST ENDPOINT] Created bookmark:`, bookmark);
    res.status(200).json({ message: 'Test bookmark created', bookmark });
  } catch (error) {
    console.error('[TEST ENDPOINT] Error:', error);
    res.status(500).json({ message: 'Failed to create test bookmark', error: error instanceof Error ? error.message : error });
  }
});

export default router; 