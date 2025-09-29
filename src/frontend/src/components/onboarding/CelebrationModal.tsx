import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, X } from 'lucide-react';
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
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  const confettiPieces = Array.from({ length: 45 }, (_, index) => ({
    id: index,
    color: ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#0EA5E9'][index % 5],
    delay: Math.random() * 1.8,
    distance: 280 + Math.random() * 80,
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />

              <div className="absolute inset-0 overflow-hidden">
                {confettiPieces.map((piece) => (
                  <motion.span
                    key={piece.id}
                    className="absolute h-2 w-2 rounded-sm"
                    style={{ backgroundColor: piece.color, left: `${Math.random() * 100}%`, top: '-10%' }}
                    initial={{ opacity: 0, y: -10, rotate: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], y: piece.distance, rotate: 360 }}
                    transition={{ duration: 2.4, delay: piece.delay, ease: 'easeOut' }}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute right-4 top-4 z-20 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="relative z-10 text-center space-y-4">
                <motion.div
                  className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 text-primary"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <PartyPopper className="h-8 w-8" />
                </motion.div>

                <motion.h2
                  className="text-2xl font-semibold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  Nicely done!
                </motion.h2>

                <motion.p
                  className="text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {message}
                </motion.p>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                  <Button onClick={onClose} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Continue
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

