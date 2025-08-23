import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VideoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  autoplay?: boolean;
  playOnHover?: boolean;
  loop?: boolean;
  muted?: boolean;
  fallbackIcon?: React.ReactNode;
  onClick?: () => void;
}

const sizeMap = {
  sm: { width: '24px', height: '24px' },
  md: { width: '32px', height: '32px' },
  lg: { width: '48px', height: '48px' },
  xl: { width: '64px', height: '64px' }
};

export const VideoLogo: React.FC<VideoLogoProps> = ({
  size = 'md',
  className = '',
  autoplay = false,
  playOnHover = true,
  loop = true,
  muted = true,
  fallbackIcon,
  onClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Respect user's reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  const { width, height } = sizeMap[size];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoaded(true);
      if (autoplay && !prefersReducedMotion) {
        video.play().catch(() => setHasError(true));
      }
    };

    const handleError = () => {
      setHasError(true);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [autoplay, prefersReducedMotion]);

  const handleMouseEnter = async () => {
    if (playOnHover && videoRef.current && isLoaded && !prefersReducedMotion) {
      try {
        await videoRef.current.play();
      } catch (error) {
        setHasError(true);
      }
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && videoRef.current && !autoplay) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Fallback SVG icon (current Synapse logo)
  const DefaultFallback = () => (
    <motion.svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-purple-400"
      animate={{ rotate: isPlaying ? 360 : 0 }}
      transition={{ duration: 2, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
    >
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </motion.svg>
  );

  // Show fallback if video has error, user prefers reduced motion, or video hasn't loaded
  if (hasError || prefersReducedMotion || !isLoaded) {
    return (
      <div 
        className={`inline-flex items-center justify-center cursor-pointer ${className}`}
        style={{ width, height }}
        onClick={handleClick}
      >
        {fallbackIcon || <DefaultFallback />}
      </div>
    );
  }

  return (
    <motion.div
      className={`inline-flex items-center justify-center overflow-hidden rounded-full cursor-pointer ${className}`}
      style={{ width, height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <video
        ref={videoRef}
        width={width}
        height={height}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        style={{ 
          filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3))',
          borderRadius: '50%'
        }}
      >
        <source src="/videos/synapse-logo.mp4?v=2" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {!isLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded-full"
          style={{ width, height }}
        >
          <motion.div
            className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default VideoLogo;