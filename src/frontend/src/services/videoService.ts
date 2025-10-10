import { VideoItemType } from '../types/video';
import axiosInstance, { BACKEND_ROOT_URL } from './axiosConfig';

// Interface for YouTube recommendations from backend
interface YouTubeVideo {
  _id: string;
  userId: string;
  source: 'youtube';
  videoId: string;
  subscriptionId?: string;
  title: string;
  channelTitle?: string;
  description?: string;
  thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
  publishedAt?: string;
  relevance?: number;
  status: 'pending' | 'approved' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

// Convert YouTube Video to VideoItemType format
const convertYouTubeVideoToVideoItem = (video: YouTubeVideo): VideoItemType => {
  // Get the best thumbnail URL (prefer high quality, fallback to default)
  const thumbnailUrl = video.thumbnails?.high?.url || 
                      video.thumbnails?.medium?.url || 
                      video.thumbnails?.default?.url;

  // Map status to watchedStatus
  const statusMap: Record<string, VideoItemType['watchedStatus']> = {
    'pending': 'unwatched',
    'approved': 'unwatched', // New recommendations start as unwatched
    'hidden': 'unwatched'    // Hidden videos still show as unwatched in main list
  };

  return {
    _id: video._id,
    userId: video.userId,
    originalUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    videoId: video.videoId,
    title: video.title,
    thumbnailUrl,
    channelTitle: video.channelTitle,
    sourcePlatform: 'YouTube',
    watchedStatus: statusMap[video.status] || 'unwatched',
    createdAt: video.createdAt,
    updatedAt: video.updatedAt
  };
};

export const getVideosService = async (): Promise<VideoItemType[]> => {
  try {
    // Fetch both legacy VideoItem videos and YouTube recommendations
    const [legacyVideos, youtubeRecommendations] = await Promise.all([
      axiosInstance.get<VideoItemType[]>(`/videos`),
      axiosInstance.get<{ items: YouTubeVideo[] }>(`/videos?source=youtube`)
    ]);
    
    // Convert YouTube videos to VideoItemType format
    const convertedYouTubeVideos = youtubeRecommendations.data.items.map(convertYouTubeVideoToVideoItem);
    
    // Combine both types of videos
    const allVideos = [...legacyVideos.data, ...convertedYouTubeVideos];
    
    // Sort by creation date (newest first)
    allVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return allVideos;
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
};

export const updateVideoStatusService = async (
  videoIdParam: string, // This should be the _id of the VideoItem document
  status: 'unwatched' | 'watching' | 'watched'
): Promise<VideoItemType> => {
  try {
    // For now, only update legacy VideoItem videos
    // YouTube recommendations don't support status updates in the same way
    const response = await axiosInstance.put<VideoItemType>(
      `/videos/${videoIdParam}/status`, 
      { status }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating video status for ${videoIdParam}:`, error);
    throw error;
  }
};

export const deleteVideoService = async (videoId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.delete<{ message: string }>(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    throw error;
  }
};

export const summarizeVideoService = async (videoId: string): Promise<{ message: string; summary: string; video: VideoItemType }> => {
  try {
    const response = await axiosInstance.post<{ message: string; summary: string; video: VideoItemType }>(`/videos/${videoId}/summarize`);
    return response.data;
  } catch (error) {
    console.error(`Error summarizing video ${videoId}:`, error);
    throw error;
  }
};

export interface VideoMomentResult {
  id: string;
  content: { text: string };
  metadata: { start_time: number };
}

export const checkVideoIndexService = async (videoId: string): Promise<boolean> => {
  const response = await axiosInstance.get<{ exists: boolean }>(`/videos/${videoId}/index`);
  return response.data.exists;
};

export const indexVideoCaptionsService = async (videoId: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post<{ message: string }>(`/videos/${videoId}/index`);
  return response.data;
};

export const searchVideoMomentsService = async (videoId: string, query: string): Promise<VideoMomentResult[]> => {
  const response = await axiosInstance.post<{ results: VideoMomentResult[] }>(`/videos/${videoId}/search`, { query });
  return response.data.results;
}; 