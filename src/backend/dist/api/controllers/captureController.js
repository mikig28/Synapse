"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTelegramItem = exports.getTelegramItems = exports.processTelegramItemForBookmarks = void 0;
const TelegramItem_1 = __importDefault(require("../../models/TelegramItem")); // Ensure TelegramItemDocument is not imported here
const fs_1 = __importDefault(require("fs")); // <-- Import fs for file deletion
const path_1 = __importDefault(require("path")); // <-- Import path for constructing file paths
const bookmarksController_1 = require("./bookmarksController"); // Import the new function
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
        X: /https?:\/\/(twitter\.com|x\.com)/i,
        LinkedIn: /https?:\/\/linkedin\.com/i,
    };
    for (const url of telegramItem.urls) {
        let platform = null;
        if (socialMediaPatterns.X.test(url)) {
            platform = 'X';
        }
        else if (socialMediaPatterns.LinkedIn.test(url)) {
            platform = 'LinkedIn';
        }
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
        // If the item has a local media file, delete it from the server
        if (item.mediaLocalUrl) {
            // Construct the absolute path to the file on the server
            // mediaLocalUrl is stored as /public/uploads/telegram_media/filename.jpg
            // We need to get to src/backend/public/uploads/telegram_media/filename.jpg
            const relativePath = item.mediaLocalUrl.startsWith('/public/')
                ? item.mediaLocalUrl.substring('/public'.length)
                : item.mediaLocalUrl;
            const filePath = path_1.default.join(__dirname, '..', '..', 'public', relativePath);
            fs_1.default.unlink(filePath, (err) => {
                if (err) {
                    // Log the error, but don't necessarily block DB deletion if file deletion fails
                    // It could be that the file was already manually deleted or path is incorrect
                    console.error(`[DELETE_TELEGRAM_ITEM_FILE_ERROR] Failed to delete local file ${filePath}:`, err);
                }
            });
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
