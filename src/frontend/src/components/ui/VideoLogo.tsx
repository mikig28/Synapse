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
  const [clickPulse, setClickPulse] = useState(false);
  
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
    // Trigger neural firing animation
    setClickPulse(true);
    setTimeout(() => setClickPulse(false), 600);
    
    // Try to play video on click if not already playing
    if (videoRef.current && isLoaded && !isPlaying && !prefersReducedMotion) {
      videoRef.current.play().catch(() => {});
    }
    
    if (onClick) {
      onClick();
    }
  };

  // Neural network-inspired fallback SVG icon
  const DefaultFallback = () => (
    <motion.svg 
      width={width} 
      height={height} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-purple-400"
      style={{ filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.4))' }}
    >
      {/* Neural network nodes */}
      <motion.circle 
        cx="12" cy="6" r="2" 
        fill="currentColor" 
        animate={{ 
          scale: clickPulse ? [1, 1.4, 1] : (isPlaying ? [1, 1.2, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.5, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      <motion.circle 
        cx="6" cy="12" r="1.5" 
        fill="currentColor" 
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.6, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.8, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: clickPulse ? 0.1 : 0.3 }}
      />
      <motion.circle 
        cx="18" cy="12" r="1.5" 
        fill="currentColor" 
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.6, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.8, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: clickPulse ? 0.2 : 0.6 }}
      />
      <motion.circle 
        cx="12" cy="18" r="2" 
        fill="currentColor" 
        animate={{ 
          scale: clickPulse ? [1, 1.4, 1] : (isPlaying ? [1, 1.2, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.5, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: clickPulse ? 0.3 : 0.9 }}
      />
      
      {/* Neural connections */}
      <motion.path 
        d="M12 8L6 10.5M12 8L18 10.5M6 13.5L12 16M18 13.5L12 16" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
        opacity={0.6}
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.6, 1, 0.6, 1, 0.6] : (isPlaying ? [0.3, 0.8, 0.3] : 0.6),
          strokeWidth: clickPulse ? [1.5, 2.5, 1.5] : 1.5
        }}
        transition={{ duration: clickPulse ? 0.6 : 2, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
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
      animate={{
        boxShadow: clickPulse
          ? [
              '0 0 8px rgba(168, 85, 247, 0.3)',
              '0 0 32px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.4)',
              '0 0 8px rgba(168, 85, 247, 0.3)'
            ]
          : isPlaying 
            ? [
                '0 0 8px rgba(168, 85, 247, 0.3), 0 0 20px rgba(168, 85, 247, 0.1)',
                '0 0 16px rgba(168, 85, 247, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)',
                '0 0 24px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.15)',
                '0 0 16px rgba(168, 85, 247, 0.5), 0 0 30px rgba(168, 85, 247, 0.2)',
                '0 0 8px rgba(168, 85, 247, 0.3), 0 0 20px rgba(168, 85, 247, 0.1)'
              ]
            : '0 0 8px rgba(168, 85, 247, 0.3)'
      }}
      transition={{
        duration: clickPulse ? 0.6 : 3,
        repeat: clickPulse ? 0 : (isPlaying ? Infinity : 0),
        ease: clickPulse ? "easeOut" : "easeInOut"
      }}
    >
      <motion.video
        ref={videoRef}
        width={width}
        height={height}
        muted={muted}
        loop={loop}
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        style={{ 
          borderRadius: '50%'
        }}
        animate={{
          filter: isPlaying 
            ? [
                'drop-shadow(0 0 8px rgba(168, 85, 247, 0.4)) brightness(1)',
                'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6)) brightness(1.1)',
                'drop-shadow(0 0 16px rgba(168, 85, 247, 0.5)) brightness(1.05)',
                'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6)) brightness(1.1)',
                'drop-shadow(0 0 8px rgba(168, 85, 247, 0.4)) brightness(1)'
              ]
            : 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3)) brightness(1)'
        }}
        transition={{
          duration: 3,
          repeat: isPlaying ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        <source src="/videos/synapse-logo-nerve-system.mp4?v=1" type="video/mp4" />
        Your browser does not support the video tag.
      </motion.video>
      
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