"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBookmark = exports.processAndCreateBookmark = exports.getBookmarks = void 0;
const BookmarkItem_1 = __importDefault(require("../../models/BookmarkItem")); // Import Mongoose model and interface
const mongodb_1 = require("mongodb"); // Still needed for casting string IDs to ObjectId for synapseUserId
const mongoose_1 = __importDefault(require("mongoose")); // Import mongoose for delete operation
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));

const fetchRedditMetadata = async (url) => {
    try {
        const { data: htmlResponseData } = await axios_1.default.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000,
            responseType: 'text'
        });
        if (typeof htmlResponseData !== 'string') {
            throw new Error('Fetched content is not a string');
        }
        const $ = cheerio.load(htmlResponseData);
        const title = $('meta[property="og:title"]').attr('content') || $('title').text();
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        const image = $('meta[property="og:image"]').attr('content');
        const video = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:url"]').attr('content');
        return { title: title && title.trim(), description: description && description.trim(), image: image && image.trim(), video: video && video.trim() };
    }
    catch (error) {
        console.error(`[fetchRedditMetadata] Error fetching or parsing Reddit URL ${url}:`, error.message || error);
        throw error;
    }
};
const getBookmarks = async (req, res) => {
    try {
        // @ts-ignore // TODO: Fix this once auth is in place and req.user is properly typed
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const bookmarks = await BookmarkItem_1.default.find({ userId: new mongodb_1.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .lean(); // Use .lean() for faster queries if you don't need Mongoose documents
        res.status(200).json(bookmarks);
    }
    catch (error) {
        console.error('Error fetching bookmarks:', error);
        res.status(500).json({ message: 'Failed to fetch bookmarks', error: error.message });
    }
};
exports.getBookmarks = getBookmarks;
const processAndCreateBookmark = async (userIdString, originalUrl, sourcePlatform, telegramMessageIdString) => {
    try {
        const userId = new mongodb_1.ObjectId(userIdString);
        // Check for existing bookmark first
        const existingBookmark = await BookmarkItem_1.default.findOne({ userId, originalUrl });
        if (existingBookmark) {
            console.warn(`[BookmarkController] Bookmark already exists for URL: ${originalUrl} and user: ${userIdString}. Skipping creation.`);
            return existingBookmark._id; // Return existing ID
        }
        const newBookmarkData = {
            userId: userId,
            originalUrl,
            sourcePlatform,
            ...(telegramMessageIdString && mongoose_1.default.Types.ObjectId.isValid(telegramMessageIdString) && { telegramMessageId: new mongoose_1.default.Types.ObjectId(telegramMessageIdString) }),
            title: '', // Standard fields remain empty initially
            summary: '',
            tags: [],
            status: 'pending_summary', // Default status
            // Initialize fetched fields as undefined
            fetchedTitle: undefined,
            fetchedDescription: undefined,
            fetchedImageUrl: undefined,
            fetchedVideoUrl: undefined,
        };
        // --- Metadata Fetching Logic --- 
        if (sourcePlatform === 'LinkedIn') {
            console.log(`[BookmarkController] Attempting to fetch metadata for LinkedIn URL: ${originalUrl}`);
            // ** Placeholder for actual metadata fetching **
            // try {
            //   const metadata = await fetchMetadata(originalUrl); // Replace with actual fetching call
            //   newBookmarkData.fetchedTitle = metadata.title;
            //   newBookmarkData.fetchedDescription = metadata.description;
            //   newBookmarkData.fetchedImageUrl = metadata.image;
            //   newBookmarkData.status = 'metadata_fetched';
            // } catch (metaError) {
            //   console.error(`[BookmarkController] Failed to fetch metadata for ${originalUrl}:`, metaError);
            //   newBookmarkData.status = 'error'; // Mark as error if fetch fails
            // }
            // ** Temporary Placeholder Implementation **
            newBookmarkData.fetchedTitle = `LinkedIn Post: ${originalUrl.substring(0, 50)}...`; // Placeholder title
            newBookmarkData.fetchedDescription = "Placeholder description - Metadata fetching needs implementation."; // Placeholder desc
            // newBookmarkData.fetchedImageUrl = 'path/to/default/linkedin/image.png'; // Optional: Placeholder image
            newBookmarkData.status = 'metadata_fetched'; // Set status to indicate attempt (even if placeholder)
            console.log(`[BookmarkController] Using placeholder metadata for LinkedIn URL: ${originalUrl}`);
        }
        else if (sourcePlatform === 'Reddit') {
            console.log(`[BookmarkController] Attempting to fetch metadata for Reddit URL: ${originalUrl}`);
            try {
                const metadata = await fetchRedditMetadata(originalUrl);
                newBookmarkData.fetchedTitle = metadata.title;
                newBookmarkData.fetchedDescription = metadata.description;
                newBookmarkData.fetchedImageUrl = metadata.image;
                newBookmarkData.fetchedVideoUrl = metadata.video;
                newBookmarkData.status = 'metadata_fetched';
                console.log(`[BookmarkController] Successfully fetched metadata for Reddit URL: ${originalUrl}`);
            }
            catch (metaError) {
                console.error(`[BookmarkController] Failed to fetch metadata for ${originalUrl}:`, metaError.message || metaError);
                newBookmarkData.status = 'error';
                newBookmarkData.fetchedTitle = `Reddit Post: ${originalUrl.substring(0, 50)}...`;
                newBookmarkData.fetchedDescription = 'Could not fetch details. Link saved.';
            }
        }
        else if (sourcePlatform === 'Other') {
            // Optional: Add metadata fetching for 'Other' links here too if desired
            console.log(`[BookmarkController] Skipping metadata fetch for 'Other' URL: ${originalUrl}`);
        } // X platform likely relies on tweet embedding, not generic metadata
        // Use Mongoose model to create a new document
        const createdBookmark = await BookmarkItem_1.default.create(newBookmarkData);
        console.log('Bookmark created with ID:', createdBookmark._id);
        return createdBookmark._id;
    }
    catch (error) {
        // Check for duplicate key error (code 11000)
        if (error.code === 11000) {
            console.warn(`Bookmark already exists for URL: ${originalUrl} and user: ${userIdString}. Skipping creation.`);
            // Optionally, you could fetch and return the existing bookmark ID
            const existingBookmark = await BookmarkItem_1.default.findOne({ originalUrl, userId: new mongodb_1.ObjectId(userIdString) });
            return existingBookmark?._id;
        }
        else {
            console.error('Error processing and creating bookmark:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }
};
exports.processAndCreateBookmark = processAndCreateBookmark;
// Function to delete a bookmark
const deleteBookmark = async (req, res) => {
    try {
        const bookmarkId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(bookmarkId)) {
            return res.status(400).json({ message: 'Invalid bookmark ID' });
        }
        const bookmark = await BookmarkItem_1.default.findOne({ _id: bookmarkId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (!bookmark) {
            return res.status(404).json({ message: 'Bookmark not found or user not authorized to delete' });
        }
        await BookmarkItem_1.default.deleteOne({ _id: bookmarkId }); // Using deleteOne
        res.status(200).json({ message: 'Bookmark deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting bookmark:', error);
        // Check if the error is a known type, otherwise use a generic message
        if (error instanceof Error) {
            return res.status(500).json({ message: 'Server error while deleting bookmark', error: error.message });
        }
        res.status(500).json({ message: 'Server error while deleting bookmark' });
    }
};
exports.deleteBookmark = deleteBookmark;
