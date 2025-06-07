import { useState, useEffect } from 'react';
import axiosInstance from '../services/axiosConfig';

export const useSecureImage = (imageId: string | undefined) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      return;
    }

    let objectUrl: string | null = null;
    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/media/${imageId}`, {
          responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err: any) {
        console.error('Failed to fetch secure image:', err);
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
  }, [imageId]);

  return { imageUrl, isLoading, error };
}; 