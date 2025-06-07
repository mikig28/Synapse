import { useState, useEffect } from 'react';
import { useAuthAxios } from '../hooks/useAuthAxios'; // Assuming useAuthAxios is set up for authenticated requests

export const useSecureImage = (imageId: string | undefined) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const authAxios = useAuthAxios();

  useEffect(() => {
    if (!imageId) {
      return;
    }

    let objectUrl: string | null = null;
    const fetchImage = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authAxios.get(`/media/${imageId}`, {
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
  }, [imageId, authAxios]);

  return { imageUrl, isLoading, error };
}; 