import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Beautiful top-loading progress bar for route transitions
 * Shows during navigation to give visual feedback
 */
export const NavigationProgress: React.FC = () => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Show progress bar on route change
    setIsNavigating(true);

    // Hide after a short delay (route should be loaded by then)
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-gradient-to-r from-primary via-accent to-primary"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{
            scaleX: [0, 0.7, 0.9, 1],
            opacity: [0, 1, 1, 0]
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
            times: [0, 0.5, 0.8, 1]
          }}
          style={{ transformOrigin: 'left' }}
        />
      )}
    </AnimatePresence>
  );
};
