import { VideoItemType } from '../types/video';
import axiosInstance, { BACKEND_ROOT_URL } from './axiosConfig';

const API_BASE_URL = `${BACKEND_ROOT_URL}/api/v1`;

export const getVideosService = async (): Promise<VideoItemType[]> => {
  try {
    const response = await axiosInstance.get<VideoItemType[]>(`${API_BASE_URL}/videos`);
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
      `${API_BASE_URL}/videos/${videoIdParam}/status`, 
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
    const response = await axiosInstance.delete<{ message: string }>(`${API_BASE_URL}/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    throw error;
  }
}; 