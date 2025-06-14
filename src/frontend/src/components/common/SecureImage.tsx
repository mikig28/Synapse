import React from 'react';
import { useSecureImage } from '../../hooks/useSecureImage';
import { Loader2, AlertTriangle } from 'lucide-react';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageId: string | undefined;
}

export const SecureImage: React.FC<SecureImageProps> = ({ imageId, className, alt, ...props }) => {
  const { imageUrl, isLoading, error } = useSecureImage(imageId);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-black/20 ${className}`}>
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center w-full h-full bg-red-900/50 ${className}`}>
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <span className="text-xs text-red-300 mt-2">Error</span>
      </div>
    );
  }

  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={className} {...props} />;
  }

  return null; // or a placeholder
}; 