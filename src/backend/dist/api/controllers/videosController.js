"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchVideoMoments = exports.indexVideo = exports.checkVideoIndex = exports.summarizeVideo = exports.deleteVideo = exports.updateVideoStatus = exports.getVideos = exports.createVideoFromTelegram = exports.processAndCreateVideoItem = void 0;
const VideoItem_1 = __importDefault(require("../../models/VideoItem"));
const mongoose_1 = __importDefault(require("mongoose"));
const axios_1 = __importDefault(require("axios")); // For oEmbed
const videoSummarizationService_1 = require("../../services/videoSummarizationService");
const upstashVideoSearchService_1 = require("../../services/upstashVideoSearchService");
const extractYouTubeVideoId = (url) => {
    let videoId = null;
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === 'youtu.be') {
            videoId = parsedUrl.pathname.substring(1);
        }
        else if (parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com') {
            if (parsedUrl.pathname === '/watch') {
                videoId = parsedUrl.searchParams.get('v');
            }
            else if (parsedUrl.pathname.startsWith('/embed/')) {
                videoId = parsedUrl.pathname.substring(7);
            }
            else if (parsedUrl.pathname.startsWith('/shorts/')) {
                videoId = parsedUrl.pathname.substring(8);
            }
        }
    }
    catch (error) {
        console.error('[VideoController] Error parsing YouTube URL:', error);
        return null;
    }
    // Further validation for video ID format (optional, e.g., regex)
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
    }
    return null;
};
const processAndCreateVideoItem = async (userIdString, originalUrl, telegramItemId // Optional: if triggered from Telegram capture
) => {
    if (!userIdString) {
        console.error('[VideoController] User ID is required to process video item.');
        return null; // Or throw error
    }
    const videoId = extractYouTubeVideoId(originalUrl);
    if (!videoId) {
        console.log(`[VideoController] Could not extract YouTube videoId from URL: ${originalUrl}`);
        return null;
    }
    try {
        const userId = new mongoose_1.default.Types.ObjectId(userIdString);
        if (telegramItemId && !mongoose_1.default.Types.ObjectId.isValid(telegramItemId)) {
            console.warn('[VideoController] Invalid TelegramItem ID provided:', telegramItemId);
            telegramItemId = undefined; // ignore if invalid
        }
        const telegramMessageId = telegramItemId ? new mongoose_1.default.Types.ObjectId(telegramItemId) : undefined;
        // Check if this video already exists for this user
        const existingVideo = await VideoItem_1.default.findOne({ userId, videoId });
        if (existingVideo) {
            console.log(`[VideoController] Video ${videoId} already exists for user ${userIdString}.`);
            return existingVideo;
        }
        // Fetch metadata from YouTube oEmbed
        let title = 'Untitled YouTube Video';
        let thumbnailUrl;
        let channelTitle;
        try {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`;
            // Type the axios call
            const oEmbedResponse = await axios_1.default.get(oEmbedUrl);
            if (oEmbedResponse.data) {
                title = oEmbedResponse.data.title || title;
                thumbnailUrl = oEmbedResponse.data.thumbnail_url; // This can be undefined
                channelTitle = oEmbedResponse.data.author_name; // This can be undefined
            }
        }
        catch (oembedError) {
            console.error(`[VideoController] Failed to fetch oEmbed data for ${originalUrl}:`, oembedError);
            // Proceed with saving basic info even if oEmbed fails
        }
        const newVideoData = {
            userId,
            originalUrl,
            videoId,
            title,
            thumbnailUrl,
            channelTitle,
            sourcePlatform: 'YouTube',
            watchedStatus: 'unwatched',
        };
        if (telegramMessageId) {
            newVideoData.telegramMessageId = telegramMessageId;
        }
        const newVideo = new VideoItem_1.default(newVideoData);
        await newVideo.save();
        console.log(`[VideoController] New video ${videoId} saved for user ${userIdString}. Title: ${title}`);
        return newVideo;
    }
    catch (error) {
        console.error('[VideoController] Error processing and creating video item:', error);
        // Type guard for error code
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) { // Duplicate key error
            console.warn(`[VideoController] Attempted to save duplicate video for user ${userIdString} and videoId ${videoId}`);
            // Optionally fetch and return the existing item
            return VideoItem_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userIdString), videoId });
        }
        return null;
    }
};
exports.processAndCreateVideoItem = processAndCreateVideoItem;
// Endpoint to be called by Telegram service or other internal triggers
const createVideoFromTelegram = async (req, res) => {
    const { originalUrl, telegramItemId } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!originalUrl) {
        return res.status(400).json({ message: 'originalUrl is required' });
    }
    const videoItem = await (0, exports.processAndCreateVideoItem)(userId, originalUrl, telegramItemId);
    if (videoItem) {
        return res.status(201).json(videoItem);
    }
    else {
        // Specific error might have been logged in processAndCreateVideoItem
        return res.status(500).json({ message: 'Failed to process or save video item' });
    }
};
exports.createVideoFromTelegram = createVideoFromTelegram;
const getVideos = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const videos = await VideoItem_1.default.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(videos);
    }
    catch (error) {
        console.error('[VideoController] Error fetching videos:', error);
        const message = error instanceof Error ? error.message : 'Unknown error fetching videos';
        res.status(500).json({ message: 'Error fetching videos', error: message });
    }
};
exports.getVideos = getVideos;
const updateVideoStatus = async (req, res) => {
    try {
        const videoId = req.params.id;
        const { status } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!['unwatched', 'watching', 'watched'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        const updatedVideo = await VideoItem_1.default.findOneAndUpdate({ userId: new mongoose_1.default.Types.ObjectId(userId), _id: new mongoose_1.default.Types.ObjectId(videoId) }, // Use _id (PK) for updating
        { watchedStatus: status }, { new: true } // Return the updated document
        );
        if (!updatedVideo) {
            return res.status(404).json({ message: 'Video not found or user mismatch' });
        }
        res.status(200).json(updatedVideo);
    }
    catch (error) {
        console.error('[VideoController] Error updating video status:', error);
        const message = error instanceof Error ? error.message : 'Unknown error updating video status';
        res.status(500).json({ message: 'Server error while updating video status' });
    }
};
exports.updateVideoStatus = updateVideoStatus;
// Function to delete a video
const deleteVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }
        const video = await VideoItem_1.default.findOne({ _id: videoId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (!video) {
            return res.status(404).json({ message: 'Video not found or user not authorized to delete' });
        }
        // Optional: If videos have associated files (e.g., downloaded thumbnails not from URL), handle their deletion here
        // For example: if (video.localThumbnailPath) { fs.unlinkSync(video.localThumbnailPath); }
        await VideoItem_1.default.deleteOne({ _id: videoId });
        res.status(200).json({ message: 'Video deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting video:', error);
        if (error instanceof Error) {
            return res.status(500).json({ message: 'Server error while deleting video', error: error.message });
        }
        res.status(500).json({ message: 'Server error while deleting video' });
    }
};
exports.deleteVideo = deleteVideo;
// Function to summarize a video
const summarizeVideo = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }
        // Find the video
        const video = await VideoItem_1.default.findOne({
            _id: videoId,
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!video) {
            return res.status(404).json({ message: 'Video not found or user not authorized' });
        }
        // Generate summary using Gemini AI (always generate, even if exists)
        console.log(`[VideoController] Generating summary for video ${video.videoId} (${video.title})`);
        const summary = await (0, videoSummarizationService_1.summarizeYouTubeVideo)(video.videoId);
        // Update the video with the generated summary
        const updatedVideo = await VideoItem_1.default.findByIdAndUpdate(videoId, { summary }, { new: true });
        if (!updatedVideo) {
            return res.status(500).json({ message: 'Failed to save summary' });
        }
        console.log(`[VideoController] Summary generated and saved for video ${video.videoId}`);
        res.status(200).json({
            message: 'Summary generated successfully',
            summary,
            video: updatedVideo
        });
    }
    catch (error) {
        console.error('[VideoController] Error summarizing video:', error);
        const message = error instanceof Error ? error.message : 'Unknown error generating summary';
        res.status(500).json({
            message: 'Failed to generate video summary',
            error: message
        });
    }
};
exports.summarizeVideo = summarizeVideo;
const checkVideoIndex = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const videoId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }
        const video = await VideoItem_1.default.findOne({ _id: videoId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (!video) {
            return res.status(404).json({ message: 'Video not found or user not authorized' });
        }
        const exists = await (0, upstashVideoSearchService_1.checkVideoIndexExists)(video.videoId);
        return res.status(200).json({ exists });
    }
    catch (error) {
        console.error('[VideoController] Error checking video index:', error);
        return res.status(500).json({ message: 'Failed to check video index' });
    }
};
exports.checkVideoIndex = checkVideoIndex;
const indexVideo = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const videoId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }
        const video = await VideoItem_1.default.findOne({ _id: videoId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (!video) {
            return res.status(404).json({ message: 'Video not found or user not authorized' });
        }
        const canonicalUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        await (0, upstashVideoSearchService_1.indexVideoCaptions)(canonicalUrl, video.videoId);
        return res.status(200).json({ message: 'Video indexed successfully' });
    }
    catch (error) {
        console.error('[VideoController] Error indexing video captions:', error);
        return res.status(500).json({ message: 'Failed to index video captions' });
    }
};
exports.indexVideo = indexVideo;
const searchVideoMoments = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const videoId = req.params.id;
        const { query } = req.body;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ message: 'Query is required' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(videoId)) {
            return res.status(400).json({ message: 'Invalid video ID' });
        }
        const video = await VideoItem_1.default.findOne({ _id: videoId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (!video) {
            return res.status(404).json({ message: 'Video not found or user not authorized' });
        }
        const results = await (0, upstashVideoSearchService_1.searchVideoCaptions)(video.videoId, query);
        return res.status(200).json({ results });
    }
    catch (error) {
        console.error('[VideoController] Error searching video moments:', error);
        return res.status(500).json({ message: 'Failed to search video moments' });
    }
};
exports.searchVideoMoments = searchVideoMoments;
