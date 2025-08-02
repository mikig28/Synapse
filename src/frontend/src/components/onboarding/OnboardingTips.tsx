import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
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
          className="fixed bottom-6 right-6 z-40 max-w-sm"
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
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
                onClick={onClose}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Content */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tip}
            </p>

            {/* Animated Border */}
            <motion.div
              className="absolute inset-0 rounded-lg border border-primary/20"
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