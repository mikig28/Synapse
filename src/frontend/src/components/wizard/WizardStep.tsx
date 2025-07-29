import React from 'react';
import { motion } from 'framer-motion';
import {
  typography,
  spacing,
  agentColors
} from '@/utils/designSystem';
import {
  slideVariants
} from '@/utils/animations';

interface WizardStepProps {
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  children: React.ReactNode;
}

export const WizardStep: React.FC<WizardStepProps> = ({
  title,
  description,
  stepNumber,
  totalSteps,
  children,
}) => {
  return (
    <motion.div
      variants={slideVariants}
      initial="hidden"
      animate="visible"
      className="h-full flex flex-col"
    >
      {/* Step Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 text-center md:text-left"
      >
        <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm"
            style={{
              backgroundColor: agentColors.running.primary,
              color: 'white'
            }}
          >
            {stepNumber}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-medium"
            style={{
              color: agentColors.running.text,
              ...typography.small
            }}
          >
            Step {stepNumber} of {totalSteps}
          </motion.div>
        </div>
        
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-2"
          style={{
            ...typography.heading,
            color: agentColors.running.text
          }}
        >
          {title}
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground max-w-2xl"
          style={{
            ...typography.body,
            color: agentColors.idle.text,
            opacity: 0.8
          }}
        >
          {description}
        </motion.p>
      </motion.div>

      {/* Step Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex-1"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};