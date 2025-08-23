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

  // Synapse brain logo SVG fallback (matches the actual logo design)
  const DefaultFallback = () => (
    <motion.svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))' }}
    >
      <defs>
        <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      
      {/* Brain outline */}
      <motion.path 
        d="M25 30 Q35 15 50 20 Q65 10 75 25 Q85 35 80 50 Q85 65 75 75 Q65 85 50 80 Q45 85 40 80 Q30 85 25 75 Q15 65 20 50 Q15 35 25 30 Z" 
        stroke="url(#brainGradient)" 
        strokeWidth="3" 
        fill="none"
        animate={{ 
          strokeWidth: clickPulse ? [3, 4, 3] : (isPlaying ? [3, 3.5, 3] : 3),
          opacity: clickPulse ? [1, 0.8, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      
      {/* Internal circuit pathways */}
      <motion.path 
        d="M30 35 Q40 40 45 35 T60 40 Q70 45 65 55" 
        stroke="url(#brainGradient)" 
        strokeWidth="2" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.5, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      
      <motion.path 
        d="M35 50 Q50 45 55 50 Q65 55 60 65 Q50 70 45 65" 
        stroke="url(#brainGradient)" 
        strokeWidth="2" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 3, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.3 }}
      />
      
      <motion.path 
        d="M40 25 Q50 30 60 25 M30 60 Q40 65 50 60 M55 70 Q65 65 70 70" 
        stroke="url(#brainGradient)" 
        strokeWidth="2" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.2, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.6 }}
      />
      
      {/* Circuit nodes */}
      <motion.circle 
        cx="35" cy="35" r="2" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.8, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      <motion.circle 
        cx="50" cy="30" r="2" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.1, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.2 }}
      />
      <motion.circle 
        cx="65" cy="40" r="2" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.9, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.4 }}
      />
      <motion.circle 
        cx="45" cy="55" r="2" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.3, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.6 }}
      />
      <motion.circle 
        cx="60" cy="65" r="2" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.0, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.8 }}
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
      animate={{
        boxShadow: clickPulse
          ? [
              '0 0 8px rgba(59, 130, 246, 0.3)',
              '0 0 32px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4)',
              '0 0 8px rgba(59, 130, 246, 0.3)'
            ]
          : isPlaying 
            ? [
                '0 0 8px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.1)',
                '0 0 16px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.2)',
                '0 0 24px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.15)',
                '0 0 16px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.2)',
                '0 0 8px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.1)'
              ]
            : '0 0 8px rgba(59, 130, 246, 0.3)'
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
                'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)) brightness(1)',
                'drop-shadow(0 0 12px rgba(59, 130, 246, 0.6)) brightness(1.1)',
                'drop-shadow(0 0 16px rgba(59, 130, 246, 0.5)) brightness(1.05)',
                'drop-shadow(0 0 12px rgba(59, 130, 246, 0.6)) brightness(1.1)',
                'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4)) brightness(1)'
              ]
            : 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3)) brightness(1)'
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