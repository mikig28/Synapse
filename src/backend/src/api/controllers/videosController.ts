import { Request, Response } from 'express';
import VideoItem, { IVideoItem } from '../../models/VideoItem';
import KeywordSubscription from '../../models/KeywordSubscription';
import Video from '../../models/Video';
import { fetchForUser } from '../../services/fetchVideos';
import mongoose from 'mongoose';
import axios from 'axios'; // For oEmbed
import { summarizeYouTubeVideo } from '../../services/videoSummarizationService';
import { AuthenticatedRequest } from '../../types/express';
import { checkVideoIndexExists, indexVideoCaptions, searchVideoCaptions } from '../../services/upstashVideoSearchService';

// Define the oEmbed response interface
interface YouTubeOEmbedResponse {
  title?: string;
  author_name?: string;
  author_url?: string;
  type?: string;
  height?: number;
  width?: number;
  version?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_height?: number;
  thumbnail_width?: number;
  thumbnail_url?: string;
  html?: string;
}

const extractYouTubeVideoId = (url: string): string | null => {
  let videoId: string | null = null;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.substring(1);
    } else if (parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        videoId = parsedUrl.searchParams.get('v');
      } else if (parsedUrl.pathname.startsWith('/embed/')) {
        videoId = parsedUrl.pathname.substring(7);
      } else if (parsedUrl.pathname.startsWith('/shorts/')) {
        videoId = parsedUrl.pathname.substring(8);
      }
    }
  } catch (error) {
    console.error('[VideoController] Error parsing YouTube URL:', error);
    return null;
  }
  // Further validation for video ID format (optional, e.g., regex)
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return videoId;
  }
  return null;
};

export const processAndCreateVideoItem = async (
  userIdString: string,
  originalUrl: string,
  telegramItemId?: string // Optional: if triggered from Telegram capture
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
    const userId = new mongoose.Types.ObjectId(userIdString);
    if (telegramItemId && !mongoose.Types.ObjectId.isValid(telegramItemId)){
      console.warn('[VideoController] Invalid TelegramItem ID provided:', telegramItemId);
      telegramItemId = undefined; // ignore if invalid
    }
    const telegramMessageId = telegramItemId ? new mongoose.Types.ObjectId(telegramItemId) : undefined;

    // Check if this video already exists for this user
    const existingVideo = await VideoItem.findOne({ userId, videoId });
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
      const oEmbedResponse = await axios.get<YouTubeOEmbedResponse>(oEmbedUrl);
      
      if (oEmbedResponse.data) {
        title = oEmbedResponse.data.title || title;
        thumbnailUrl = oEmbedResponse.data.thumbnail_url; // This can be undefined
        channelTitle = oEmbedResponse.data.author_name;   // This can be undefined
      }
    } catch (oembedError) {
      console.error(`[VideoController] Failed to fetch oEmbed data for ${originalUrl}:`, oembedError);
      // Proceed with saving basic info even if oEmbed fails
    }

    const newVideoData: Partial<IVideoItem> = {
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

    const newVideo = new VideoItem(newVideoData);
    await newVideo.save();
    console.log(`[VideoController] New video ${videoId} saved for user ${userIdString}. Title: ${title}`);
    return newVideo;

  } catch (error) {
    console.error('[VideoController] Error processing and creating video item:', error);
    // Type guard for error code
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) { // Duplicate key error
        console.warn(`[VideoController] Attempted to save duplicate video for user ${userIdString} and videoId ${videoId}`);
        // Optionally fetch and return the existing item
        return VideoItem.findOne({ userId: new mongoose.Types.ObjectId(userIdString), videoId });
    }
    return null;
  }
};

// Endpoint to be called by Telegram service or other internal triggers
export const createVideoFromTelegram = async (req: AuthenticatedRequest, res: Response) => {
  const { originalUrl, telegramItemId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  if (!originalUrl) {
    return res.status(400).json({ message: 'originalUrl is required' });
  }

  const videoItem = await processAndCreateVideoItem(userId, originalUrl, telegramItemId);

  if (videoItem) {
    return res.status(201).json(videoItem);
  } else {
    // Specific error might have been logged in processAndCreateVideoItem
    return res.status(500).json({ message: 'Failed to process or save video item' });
  }
};

export const getVideos = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const { source, status, subscriptionId, q, page = '1', pageSize = '20', from, to } = req.query as Record<string, string>;

    // Maintain backwards compatibility: if no source param, return legacy VideoItem list
    if (!source) {
      const legacyVideos = await VideoItem.find({ userId }).sort({ createdAt: -1 });
      return res.status(200).json(legacyVideos);
    }

    // New YouTube recommendations listing
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (source) filter.source = source;
    if (status) filter.status = status;
    if (subscriptionId && mongoose.Types.ObjectId.isValid(subscriptionId)) filter.subscriptionId = new mongoose.Types.ObjectId(subscriptionId);
    if (from || to) {
      filter.publishedAt = {};
      if (from) filter.publishedAt.$gte = new Date(from);
      if (to) filter.publishedAt.$lte = new Date(to);
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);

    const mongoQuery = Video.find(filter).sort({ publishedAt: -1, relevance: -1, createdAt: -1 });
    if (q) {
      // Use text search if index exists; fallback to regex
      mongoQuery.find({ $text: { $search: q } });
    }

    const total = await Video.countDocuments(mongoQuery.getFilter());
    const items = await mongoQuery.skip((pageNum - 1) * sizeNum).limit(sizeNum).lean();
    return res.status(200).json({ items, total, page: pageNum, pageSize: sizeNum });
  } catch (error) {
    console.error('[VideoController] Error fetching videos:', error);
    const message = error instanceof Error ? error.message : 'Unknown error fetching videos';
    res.status(500).json({ message: 'Error fetching videos', error: message });
  }
};

export const updateVideoStatus = async (req: AuthenticatedRequest, res: Response) => {
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

    const updatedVideo = await VideoItem.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), _id: new mongoose.Types.ObjectId(videoId) }, // Use _id (PK) for updating
      { watchedStatus: status },
      { new: true } // Return the updated document
    );

    if (!updatedVideo) {
      return res.status(404).json({ message: 'Video not found or user mismatch' });
    }
    res.status(200).json(updatedVideo);
  } catch (error) {
    console.error('[VideoController] Error updating video status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error updating video status';
    res.status(500).json({ message: 'Server error while updating video status' });
  }
};

// Function to delete a video
export const deleteVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const video = await VideoItem.findOne({ _id: videoId, userId: new mongoose.Types.ObjectId(userId) });

    if (!video) {
      return res.status(404).json({ message: 'Video not found or user not authorized to delete' });
    }

    // Optional: If videos have associated files (e.g., downloaded thumbnails not from URL), handle their deletion here
    // For example: if (video.localThumbnailPath) { fs.unlinkSync(video.localThumbnailPath); }

    await VideoItem.deleteOne({ _id: videoId });

    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    if (error instanceof Error) {
        return res.status(500).json({ message: 'Server error while deleting video', error: error.message });
    }
    res.status(500).json({ message: 'Server error while deleting video' });
  }
};

// Function to summarize a video
export const summarizeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    // Find the video
    const video = await VideoItem.findOne({ 
      _id: videoId, 
      userId: new mongoose.Types.ObjectId(userId) 
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found or user not authorized' });
    }

    // Generate summary using Gemini AI (always generate, even if exists)
    console.log(`[VideoController] Generating summary for video ${video.videoId} (${video.title})`);
    const summary = await summarizeYouTubeVideo(video.videoId);

    // Update the video with the generated summary
    const updatedVideo = await VideoItem.findByIdAndUpdate(
      videoId,
      { summary },
      { new: true }
    );

    if (!updatedVideo) {
      return res.status(500).json({ message: 'Failed to save summary' });
    }

    console.log(`[VideoController] Summary generated and saved for video ${video.videoId}`);
    res.status(200).json({ 
      message: 'Summary generated successfully', 
      summary,
      video: updatedVideo 
    });

  } catch (error) {
    console.error('[VideoController] Error summarizing video:', error);
    const message = error instanceof Error ? error.message : 'Unknown error generating summary';
    res.status(500).json({ 
      message: 'Failed to generate video summary', 
      error: message 
    });
  }
};

export const checkVideoIndex = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const videoId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const video = await VideoItem.findOne({ _id: videoId, userId: new mongoose.Types.ObjectId(userId) });
    if (!video) {
      return res.status(404).json({ message: 'Video not found or user not authorized' });
    }

    const exists = await checkVideoIndexExists(video.videoId);
    return res.status(200).json({ exists });
  } catch (error) {
    console.error('[VideoController] Error checking video index:', error);
    return res.status(500).json({ message: 'Failed to check video index' });
  }
};

export const indexVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const videoId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const video = await VideoItem.findOne({ _id: videoId, userId: new mongoose.Types.ObjectId(userId) });
    if (!video) {
      return res.status(404).json({ message: 'Video not found or user not authorized' });
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    await indexVideoCaptions(canonicalUrl, video.videoId);

    return res.status(200).json({ message: 'Video indexed successfully' });
  } catch (error) {
    console.error('[VideoController] Error indexing video captions:', error);
    return res.status(500).json({ message: 'Failed to index video captions' });
  }
};

export const searchVideoMoments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const videoId = req.params.id;
    const { query } = req.body as { query?: string };

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Query is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const video = await VideoItem.findOne({ _id: videoId, userId: new mongoose.Types.ObjectId(userId) });
    if (!video) {
      return res.status(404).json({ message: 'Video not found or user not authorized' });
    }

    const results = await searchVideoCaptions(video.videoId, query);
    return res.status(200).json({ results });
  } catch (error) {
    console.error('[VideoController] Error searching video moments:', error);
    return res.status(500).json({ message: 'Failed to search video moments' });
  }
}; 

// Subscriptions: GET list, POST create
export const listSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'User not authenticated' });
  const subs = await KeywordSubscription.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
  return res.status(200).json(subs);
};

export const createSubscription = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'User not authenticated' });
  const { keywords, includeShorts = true, freshnessDays = 14, maxPerFetch = 20, isActive = true } = req.body || {};

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ message: 'keywords[] is required' });
  }

  const doc = await KeywordSubscription.create({
    userId: new mongoose.Types.ObjectId(userId),
    keywords,
    includeShorts: !!includeShorts,
    freshnessDays,
    maxPerFetch,
    isActive: !!isActive,
  });
  return res.status(201).json(doc);
};

// Trigger: POST /fetch to run fetchForUser across active subscriptions
export const triggerFetch = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'User not authenticated' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'YouTube API key not configured' });

  const { subscriptionId } = req.body || {};
  try {
    const result = await fetchForUser({ userId, apiKey, subscriptionId });
    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    const msg = error?.response?.data || error?.message || 'Fetch failed';
    return res.status(500).json({ success: false, error: msg });
  }
};

// Moderation: PATCH /videos/:id -> { status }
export const updateModerationStatus = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'User not authenticated' });
  const id = req.params.id;
  const { status } = req.body as { status?: 'pending' | 'approved' | 'hidden' };
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
  if (!status || !['pending', 'approved', 'hidden'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const doc = await Video.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
    { status },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Not found' });
  return res.status(200).json(doc);
};