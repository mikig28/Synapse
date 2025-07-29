import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  agentColors,
  typography,
  spacing,
  borderRadius
} from '@/utils/designSystem';
import {
  badgeVariants,
  transitions
} from '@/utils/animations';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface WizardProgressProps {
  steps: readonly WizardStep[];
  currentStep: number;
  onStepClick: (stepIndex: number) => void;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full">
      {/* Mobile Progress Bar */}
      <div className="md:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <span 
            className="text-sm font-medium"
            style={{ 
              color: agentColors.running.text,
              ...typography.small 
            }}
          >
            Step {currentStep + 1} of {steps.length}
          </span>
          <span 
            className="text-sm"
            style={{ 
              color: agentColors.idle.text,
              ...typography.small,
              opacity: 0.7
            }}
          >
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        
        <div 
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: agentColors.idle.bg }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${agentColors.running.primary}, ${agentColors.completed.primary})`
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={transitions.smooth}
          />
        </div>
        
        <motion.p 
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.quick}
          className="text-center mt-3"
          style={{
            ...typography.body,
            color: agentColors.running.text
          }}
        >
          {steps[currentStep]?.title}
        </motion.p>
      </div>

      {/* Desktop Step Indicators */}
      <div 
        className="hidden md:flex items-center justify-between"
        role="tablist"
        aria-label="Wizard steps"
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <motion.button
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: isCompleted 
                    ? agentColors.completed.primary
                    : isCurrent 
                    ? agentColors.running.bg
                    : agentColors.idle.bg,
                  borderColor: isCompleted 
                    ? agentColors.completed.primary
                    : isCurrent 
                    ? agentColors.running.primary
                    : agentColors.idle.border,
                  color: isCompleted 
                    ? 'white'
                    : isCurrent 
                    ? agentColors.running.primary
                    : agentColors.idle.text
                }}
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                role="tab"
                aria-selected={isCurrent}
                aria-controls={`step-${index}-content`}
                aria-label={`${step.title}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                tabIndex={isCurrent ? 0 : -1}
              >
                {isCompleted ? (
                  <motion.div
                    variants={badgeVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.span
                    key={index}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="font-medium"
                    style={typography.small}
                  >
                    {index + 1}
                  </motion.span>
                )}
                
                {/* Current step glow effect */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      boxShadow: `0 0 20px ${agentColors.running.glow}`
                    }}
                    animate={{
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </motion.button>

              {/* Step Info */}
              <div className="ml-3 flex-1">
                <motion.p
                  id={`step-${index}-heading`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                  className="font-medium"
                  style={{
                    ...typography.small,
                    color: isCompleted 
                      ? agentColors.completed.text
                      : isCurrent 
                      ? agentColors.running.text
                      : agentColors.idle.text
                  }}
                >
                  {step.title}
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className="text-xs mt-1"
                  style={{
                    color: isCompleted 
                      ? agentColors.completed.text
                      : isCurrent 
                      ? agentColors.running.text
                      : agentColors.idle.text,
                    opacity: 0.7
                  }}
                >
                  {step.description}
                </motion.p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div 
                    className="h-0.5 w-full relative overflow-hidden rounded-full"
                    style={{ backgroundColor: agentColors.idle.bg }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${agentColors.running.primary}, ${agentColors.completed.primary})`
                      }}
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: index < currentStep ? '100%' : '0%' 
                      }}
                      transition={{
                        duration: 0.5,
                        delay: Math.max(0, (index - currentStep + 1) * 0.1)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};