"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTelegramItem = exports.getTelegramItems = exports.processTelegramItemForBookmarks = void 0;
const TelegramItem_1 = __importDefault(require("../../models/TelegramItem")); // Ensure TelegramItemDocument is not imported here
const bookmarksController_1 = require("./bookmarksController"); // Import the new function
const mongodb_1 = require("mongodb");
const gridfs_1 = require("../../config/gridfs");
// Assuming you have a way to get authenticated user ID from request, e.g., from a JWT middleware
// For now, we'll assume req.user.id exists after authentication middleware.
// New function to process a saved Telegram item for bookmarks
const processTelegramItemForBookmarks = async (telegramItem) => {
    if (!telegramItem.synapseUserId) {
        console.error('[BOOKMARK_CREATION_ERROR] synapseUserId is missing for TelegramItem ID:', telegramItem._id, 'Skipping bookmark creation.');
        return; // Cannot create bookmark without a user
    }
    if (!telegramItem.urls || telegramItem.urls.length === 0) {
        return; // No URLs to process
    }
    const socialMediaPatterns = {
        X: /https?:\/\/(twitter\.com|x\.com)\/.+\/status\/\d+/i,
        LinkedIn: /https?:\/\/(?:www\.)?linkedin\.com\/(posts|feed\/update|pulse)\//i,
        Reddit: /https?:\/\/(?:www\.)?reddit\.com\/r\//i,
    };
    console.log('[processTelegramItemForBookmarks] Starting URL processing for TelegramItem ID:', telegramItem._id);
    for (const url of telegramItem.urls) {
        let platform = null;
        console.log(`[processTelegramItemForBookmarks] Evaluating URL: ${url}`);
        if (socialMediaPatterns.X.test(url)) {
            platform = 'X';
        }
        else if (socialMediaPatterns.LinkedIn.test(url)) {
            platform = 'LinkedIn';
        }
        else if (socialMediaPatterns.Reddit.test(url)) {
            platform = 'Reddit';
        }
        else {
            // It's a URL, but doesn't match a specific social media pattern
            platform = 'Other';
        }
        console.log(`[processTelegramItemForBookmarks] Assigned Platform: ${platform} for URL: ${url}`);
        if (platform) {
            try {
                console.log(`Found ${platform} link: ${url}. Creating bookmark...`);
                // Ensure _id is treated as ObjectId before converting to string
                const telegramMessageIdString = telegramItem._id.toString();
                await (0, bookmarksController_1.processAndCreateBookmark)(telegramItem.synapseUserId.toString(), // Now checked for existence
                url, platform, telegramMessageIdString);
            }
            catch (error) {
                console.error(`Failed to create bookmark for ${url}:`, error);
                // Decide on error handling: maybe log and continue, or mark item for retry
            }
        }
    }
};
exports.processTelegramItemForBookmarks = processTelegramItemForBookmarks;
const getTelegramItems = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const items = await TelegramItem_1.default.find({ synapseUserId: req.user.id })
            .sort({ receivedAt: -1 }) // Sort by most recent first
            .limit(50); // Add pagination later
        res.json(items);
    }
    catch (error) {
        console.error('[GET_TELEGRAM_ITEMS_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getTelegramItems = getTelegramItems;
const deleteTelegramItem = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const { itemId } = req.params;
        const item = await TelegramItem_1.default.findOne({ _id: itemId, synapseUserId: req.user.id });
        if (!item) {
            return res.status(404).json({ message: 'Telegram item not found or not authorized to delete' });
        }
        // If the item has a media file in GridFS, delete it
        if (item.mediaGridFsId) {
            try {
                const bucket = (0, gridfs_1.getBucket)();
                await bucket.delete(new mongodb_1.ObjectId(item.mediaGridFsId));
                console.log(`[DELETE_TELEGRAM_ITEM_FILE] Deleted GridFS file: ${item.mediaGridFsId}`);
            }
            catch (gridfsError) {
                // Log the error, but don't block DB deletion if GridFS deletion fails.
                // It could be that the file ID is invalid or file doesn't exist.
                console.error(`[DELETE_TELEGRAM_ITEM_FILE_ERROR] Failed to delete GridFS file ${item.mediaGridFsId}:`, gridfsError);
                if (gridfsError.message.includes('not found')) {
                    // This isn't a server error if the file is just not there, so don't throw.
                }
                else {
                    // For other errors (e.g., DB connection), still log but proceed.
                }
            }
        }
        await TelegramItem_1.default.findByIdAndDelete(itemId);
        // Or: await item.deleteOne(); if you prefer using the instance method
        res.status(200).json({ message: 'Telegram item deleted successfully' });
    }
    catch (error) {
        console.error('[DELETE_TELEGRAM_ITEM_ERROR]', error);
        if (error.name === 'CastError') { // Handle invalid ObjectId format
            return res.status(400).json({ message: 'Invalid item ID format' });
        }
        res.status(500).json({ message: error.message || 'Failed to delete telegram item' });
    }
};
exports.deleteTelegramItem = deleteTelegramItem;
