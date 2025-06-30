import axiosInstance from './axiosConfig';

export interface ImageResult {
  url: string;
  source: 'unsplash' | 'replicate';
  attribution?: string;
}

export interface ImageEnhancementStats {
  total: number;
  withImages: number;
  withoutImages: number;
  unsplashImages: number;
  replicateImages: number;
  enhancementPercentage: number;
}

export interface EnhancementResult {
  enhanced: number;
  failed: number;
  skipped: number;
}

/**
 * Enhance a specific news item with an image
 */
export const enhanceNewsItemWithImage = async (
  newsId: string, 
  force: boolean = false
): Promise<any> => {
  const response = await axiosInstance.post(`/news/${newsId}/enhance-image`, {
    force
  });
  return response.data;
};

/**
 * Enhance recent news items with images
 */
export const enhanceRecentNewsItems = async (options: {
  hoursBack?: number;
  batchSize?: number;
  skipExisting?: boolean;
} = {}): Promise<EnhancementResult> => {
  const response = await axiosInstance.post('/news/enhance/recent', options);
  return response.data.data;
};

/**
 * Get image enhancement statistics
 */
export const getImageEnhancementStats = async (): Promise<ImageEnhancementStats> => {
  const response = await axiosInstance.get('/news/images/stats');
  return response.data.data;
};

/**
 * Generate a test image for a given prompt
 */
export const generateTestImage = async (prompt: string): Promise<ImageResult> => {
  const response = await axiosInstance.post('/news/images/test', {
    prompt
  });
  return response.data.data;
}; 