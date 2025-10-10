import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingTipsProps {
  isVisible: boolean;
  tip?: string;
  onClose: () => void;
}

export const OnboardingTips: React.FC<OnboardingTipsProps> = ({
  isVisible,
  tip,
  onClose
}) => {
  if (!tip) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-6 right-6 z-50 max-w-sm cursor-grab active:cursor-grabbing"
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={{
            top: -window.innerHeight + 200,
            left: -window.innerWidth + 300,
            right: window.innerWidth - 300,
            bottom: window.innerHeight - 200,
          }}
          whileDrag={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
        >
          <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {/* Draggable Header */}
            <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                </motion.div>
                <span className="font-medium text-foreground">Tip</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-destructive/10 z-10"
                aria-label="Close tip"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tip}
              </p>
            </div>

            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 rounded-lg border border-primary/20 pointer-events-none"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(59, 130, 246, 0)",
                  "0 0 0 4px rgba(59, 130, 246, 0.1)",
                  "0 0 0 0 rgba(59, 130, 246, 0)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};