import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  onClose,
  message,
  autoClose = true,
  autoCloseDelay = 3000
}) => {
  
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Confetti animation
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'][i % 5],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100,
    rotation: Math.random() * 360
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full relative overflow-hidden"
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl" />

              {/* Confetti */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {confettiPieces.map((piece) => (
                  <motion.div
                    key={piece.id}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: piece.color,
                      left: `${piece.x}%`,
                      top: '-10%'
                    }}
                    initial={{ 
                      y: -20, 
                      rotation: 0,
                      opacity: 0 
                    }}
                    animate={{ 
                      y: 400, 
                      rotation: piece.rotation,
                      opacity: [0, 1, 1, 0] 
                    }}
                    transition={{
                      duration: piece.duration,
                      delay: piece.delay,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Content */}
              <div className="relative z-10 text-center">
                {/* Animated Icon */}
                <motion.div
                  className="text-6xl mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    damping: 15,
                    stiffness: 200
                  }}
                >
                  🎉
                </motion.div>

                {/* Message */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Congratulations!
                  </h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {message}
                  </p>
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    onClick={onClose}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Continue
                  </Button>
                </motion.div>
              </div>

              {/* Sparkle Effects */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute text-yellow-400"
                    style={{
                      left: `${20 + (i * 10)}%`,
                      top: `${30 + (i % 3) * 20}%`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1, 0], 
                      opacity: [0, 1, 0],
                      rotate: [0, 180, 360]
                    }}
                    transition={{
                      duration: 2,
                      delay: i * 0.2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};