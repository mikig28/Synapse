import React from 'react';
import { motion } from 'framer-motion';

interface FloatingParticlesProps {
  items?: number;
  className?: string;
  particleClassName?: string;
  // Allow specific styling for particles, e.g., for error states
  type?: 'default' | 'error'; 
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ 
  items = 20, 
  className = "absolute inset-0 overflow-hidden pointer-events-none", 
  particleClassName,
  type = 'default' 
}) => {
  const getParticleStyle = () => {
    if (type === 'error') {
      return "absolute w-2 h-2 bg-red-500/30 rounded-full";
    }
    // Default particle style
    return "absolute w-2 h-2 bg-white/20 rounded-full";
  };

  return (
    <div className={className}>
      {[...Array(items)].map((_, i) => (
        <motion.div
          key={i}
          className={particleClassName || getParticleStyle()}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            zIndex: -1, // Ensure particles are behind content
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            y: [Math.random() * -100 - 50, Math.random() * 100 + 50], // More varied y movement
            x: [Math.random() * -100 - 50, Math.random() * 100 + 50], // Add x movement
            opacity: [0, 0.8, 0], // Fade in and out more smoothly
            scale: [0.5, Math.random() * 1 + 0.5, 0.5], // Add scale animation
          }}
          transition={{
            duration: 5 + Math.random() * 10, // Slower and more varied duration
            repeat: Infinity,
            delay: Math.random() * 5, // More varied delay
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}; 