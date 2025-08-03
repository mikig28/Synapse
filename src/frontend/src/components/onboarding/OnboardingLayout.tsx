import React from 'react';
import { motion } from 'framer-motion';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      {/* Background with proper z-index */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      
      {/* Container with proper z-index */}
      <motion.div
        className="relative z-10 flex-1 container mx-auto px-4 py-6 md:py-12 max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="h-full flex flex-col space-y-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
};