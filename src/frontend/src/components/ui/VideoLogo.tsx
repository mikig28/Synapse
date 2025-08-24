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
        <linearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4C1D95" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      
      {/* Brain outline */}
      <motion.path 
        d="M20 25 Q35 10 50 15 Q65 5 80 20 Q90 30 85 50 Q90 70 80 80 Q65 90 50 85 Q35 90 20 80 Q10 70 15 50 Q10 30 20 25 Z" 
        stroke="url(#brainGradient)" 
        strokeWidth="3" 
        fill="none"
        animate={{ 
          strokeWidth: clickPulse ? [3, 4, 3] : (isPlaying ? [3, 3.5, 3] : 3),
          opacity: clickPulse ? [1, 0.8, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      
      {/* Neural network nodes - 7 circular nodes as described */}
      <motion.circle 
        cx="25" cy="35" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.8, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      <motion.circle 
        cx="40" cy="25" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.1, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.2 }}
      />
      <motion.circle 
        cx="60" cy="20" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.9, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.4 }}
      />
      <motion.circle 
        cx="75" cy="35" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.2, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.6 }}
      />
      <motion.circle 
        cx="70" cy="55" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.0, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.8 }}
      />
      <motion.circle 
        cx="50" cy="70" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.3, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 1.0 }}
      />
      <motion.circle 
        cx="30" cy="65" r="2.5" 
        fill="url(#brainGradient)"
        animate={{ 
          scale: clickPulse ? [1, 1.5, 1] : (isPlaying ? [1, 1.3, 1] : 1),
          opacity: clickPulse ? [1, 0.7, 1] : 1
        }}
        transition={{ duration: clickPulse ? 0.6 : 1.7, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 1.2 }}
      />
      
      {/* Connecting lines between nodes to form neural network */}
      <motion.path 
        d="M25 35 L40 25 L60 20 L75 35" 
        stroke="url(#brainGradient)" 
        strokeWidth="1.5" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.5, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0 }}
      />
      <motion.path 
        d="M75 35 L70 55 L50 70" 
        stroke="url(#brainGradient)" 
        strokeWidth="1.5" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.8, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.3 }}
      />
      <motion.path 
        d="M50 70 L30 65 L25 35" 
        stroke="url(#brainGradient)" 
        strokeWidth="1.5" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 3.0, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.6 }}
      />
      <motion.path 
        d="M40 25 L30 65" 
        stroke="url(#brainGradient)" 
        strokeWidth="1.5" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.2, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 0.9 }}
      />
      <motion.path 
        d="M60 20 L70 55" 
        stroke="url(#brainGradient)" 
        strokeWidth="1.5" 
        fill="none"
        animate={{ 
          pathLength: clickPulse ? [1, 0, 1] : (isPlaying ? [0, 1, 0] : 1),
          opacity: clickPulse ? [0.8, 1, 0.8] : (isPlaying ? [0.6, 1, 0.6] : 0.8)
        }}
        transition={{ duration: clickPulse ? 0.6 : 2.6, repeat: (clickPulse || isPlaying) ? (clickPulse ? 0 : Infinity) : 0, delay: 1.2 }}
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

  // For now, always show the SVG logo instead of video
  return (
    <motion.div
      className={`inline-flex items-center justify-center cursor-pointer ${className}`}
      style={{ width, height }}
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
          : '0 0 8px rgba(59, 130, 246, 0.3)'
      }}
      transition={{
        duration: clickPulse ? 0.6 : 0.3,
        ease: clickPulse ? "easeOut" : "easeInOut"
      }}
    >
      <DefaultFallback />
    </motion.div>
  );
};

export default VideoLogo;