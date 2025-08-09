import { VideoItemType } from '../types/video';
import axiosInstance, { BACKEND_ROOT_URL } from './axiosConfig';

export const getVideosService = async (): Promise<VideoItemType[]> => {
  try {
    const response = await axiosInstance.get<VideoItemType[]>(`/videos`);
    return response.data;
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
    // Ensure videoIdParam is just the ID, not part of a longer string
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