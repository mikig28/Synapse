/**
 * Bottom Sheet Component
 * iOS/Android-style bottom sheet with gesture support
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Minus } from 'lucide-react';
import { useTouchGestures } from '@/hooks/useTouchGestures';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  enableSwipeToClose?: boolean;
  preventBodyScroll?: boolean;
  className?: string;
}

const heightVariants = {
  auto: 'max-h-[80vh]',
  half: 'h-[50vh]',
  full: 'h-[90vh]',
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  showHandle = true,
  enableSwipeToClose = true,
  preventBodyScroll = true,
  className = '',
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when open
  useEffect(() => {
    if (!preventBodyScroll) return;

    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, preventBodyScroll]);

  // Touch gesture handlers
  const { triggerHaptic } = useTouchGestures({
    onSwipe: (gesture) => {
      if (enableSwipeToClose && gesture.direction === 'down' && gesture.distance > 100) {
        triggerHaptic('light');
        onClose();
      }
    },
  });

  const handlePanStart = () => {
    setIsDragging(true);
  };

  const handlePan = (event: any, info: PanInfo) => {
    if (!enableSwipeToClose) return;
    
    // Only allow downward dragging
    const newDragY = Math.max(0, info.offset.y);
    setDragY(newDragY);
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (!enableSwipeToClose) {
      setDragY(0);
      return;
    }

    // Close if dragged down more than 150px or with sufficient velocity
    if (info.offset.y > 150 || info.velocity.y > 500) {
      triggerHaptic('medium');
      onClose();
    } else {
      // Snap back to position
      setDragY(0);
    }
  };

  const sheetVariants = {
    hidden: {
      y: '100%',
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
      },
    },
    exit: {
      y: '100%',
      opacity: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    },
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={enableSwipeToClose ? "y" : false}
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragStart={handlePanStart}
            onDrag={handlePan}
            onDragEnd={handlePanEnd}
            style={{
              y: dragY,
            }}
            className={`
              relative w-full bg-background rounded-t-3xl shadow-2xl
              border-t border-border/50
              ${heightVariants[height]}
              ${className}
            `}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <h2 className="text-xl font-semibold text-foreground">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div
              ref={contentRef}
              className={`
                flex-1 overflow-auto
                ${title ? 'px-6 pb-6' : 'p-6'}
                ${height === 'auto' ? 'max-h-[calc(80vh-120px)]' : ''}
              `}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default BottomSheet;