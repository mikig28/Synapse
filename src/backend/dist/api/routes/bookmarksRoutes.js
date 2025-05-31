"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookmarksController_1 = require("../controllers/bookmarksController");
const authMiddleware_1 = require("../middleware/authMiddleware"); // Assuming you have auth middleware
const router = express_1.default.Router();
// Route to get all bookmarks for the authenticated user
router.get('/', authMiddleware_1.protect, bookmarksController_1.getBookmarks);
// Potentially a route to manually create a bookmark if needed, though primary creation is via Telegram
// router.post('/', protect, processAndCreateBookmark); // This might need adjustments if used directly
// Route to delete a specific bookmark
router.delete('/:id', authMiddleware_1.protect, bookmarksController_1.deleteBookmark);
exports.default = router;
