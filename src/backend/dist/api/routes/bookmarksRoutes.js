"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookmarksController_1 = require("../controllers/bookmarksController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming you have auth middleware
const BookmarkItem_1 = __importDefault(require("../../models/BookmarkItem"));
const router = express_1.default.Router();
// Route to get all bookmarks for the authenticated user
router.get('/', authMiddleware_1.protect, bookmarksController_1.getBookmarks);
// Potentially a route to manually create a bookmark if needed, though primary creation is via Telegram
// router.post('/', protect, processAndCreateBookmark); // This might need adjustments if used directly
// Route to delete a specific bookmark
router.delete('/:id', authMiddleware_1.protect, bookmarksController_1.deleteBookmark);
// Route to summarize a specific bookmark
router.post('/:id/summarize', authMiddleware_1.protect, bookmarksController_1.summarizeBookmarkController);
// Route to summarize the latest N bookmarks
router.post('/summarize-latest', authMiddleware_1.protect, bookmarksController_1.summarizeLatestBookmarksController);
// TEST ENDPOINT - Add test bookmark manually
router.post('/test-create', authMiddleware_1.protect, async (req, res) => {
    const { url, platform } = req.body;
    const userId = req.user?.id;
    if (!userId || !url || !platform) {
        return res.status(400).json({ message: 'Missing required fields: url, platform' });
    }
    try {
        console.log(`[TEST ENDPOINT] Creating bookmark - URL: ${url}, Platform: ${platform}`);
        const bookmarkId = await (0, bookmarksController_1.processAndCreateBookmark)(userId, url, platform);
        const bookmark = await BookmarkItem_1.default.findById(bookmarkId);
        console.log(`[TEST ENDPOINT] Created bookmark:`, bookmark);
        res.status(200).json({ message: 'Test bookmark created', bookmark });
    }
    catch (error) {
        console.error('[TEST ENDPOINT] Error:', error);
        res.status(500).json({ message: 'Failed to create test bookmark', error: error instanceof Error ? error.message : error });
    }
});
exports.default = router;
