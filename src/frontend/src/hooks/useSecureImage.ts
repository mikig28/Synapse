import { useState, useEffect } from 'react';
import axiosInstance from '../services/axiosConfig';

interface UseSecureImageOptions {
  imageId?: string;
  messageId?: string;
  source?: 'telegram' | 'whatsapp';
}

export const useSecureImage = (options: UseSecureImageOptions | string | undefined) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Support both legacy string format and new options format
  const config: UseSecureImageOptions = typeof options === 'string' 
    ? { imageId: options, source: 'telegram' }
    : options || {};

  const { imageId, messageId, source = 'telegram' } = config;

  useEffect(() => {
    const id = imageId || messageId;
    if (!id) {
      return;
    }

    let objectUrl: string | null = null;
    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Determine the correct endpoint based on source
        const endpoint = source === 'whatsapp'
          ? `/whatsapp/images/${encodeURIComponent(id)}/file`
          : `/media/${id}`;

        const response = await axiosInstance.get(endpoint, {
          responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err: any) {
        console.error(`Failed to fetch ${source} image:`, err);
        setError(err.message || 'Error loading image');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId, messageId, source]);

  return { imageUrl, isLoading, error };
}; 