import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  mode?: 'slide' | 'fade' | 'scale';
}

const pageVariants = {
  slide: {
    initial: { opacity: 0, x: -10 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: 10 }
  },
  fade: {
    initial: { opacity: 0, y: 4 }, // Subtle vertical shift for polish
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -4 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.98 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 0.98 }
  }
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.1, 0.25, 1], // Custom cubic-bezier for smooth, professional feel
  duration: 0.2 // Sweet spot: fast but still visible and smooth
};

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  mode = 'slide' 
}) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants[mode]}
        transition={pageTransition}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Export a higher-order component for easy page wrapping
export const withPageTransition = <P extends object>(
  Component: React.ComponentType<P>,
  mode?: 'slide' | 'fade' | 'scale'
) => {
  return (props: P) => (
    <PageTransition mode={mode}>
      <Component {...props} />
    </PageTransition>
  );
}; 