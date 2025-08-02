import React from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Lock } from 'lucide-react';

export const OnboardingProgress: React.FC = () => {
  const { steps, currentStep, progress } = useOnboardingStore();

  const completionPercentage = (progress.completedSteps.length / steps.length) * 100;

  return (
    <div className="w-full max-w-md">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Progress
          </span>
          <span className="text-sm text-muted-foreground">
            {progress.completedSteps.length} / {steps.length} completed
          </span>
        </div>
        <Progress 
          value={completionPercentage} 
          className="h-2 bg-muted"
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isCompleted = step.completed;
          const isCurrent = index === currentStep;
          const isUnlocked = step.unlocked;
          const isPast = index < currentStep;

          return (
            <motion.div
              key={step.id}
              className="flex flex-col items-center min-w-0 flex-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Step Circle */}
              <motion.div
                className={`
                  relative w-8 h-8 rounded-full flex items-center justify-center mb-2
                  transition-all duration-300 ease-in-out
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                    : isUnlocked
                    ? 'bg-muted text-muted-foreground border-2 border-border'
                    : 'bg-muted/50 text-muted-foreground/50'
                  }
                `}
                whileHover={isUnlocked ? { scale: 1.1 } : {}}
                whileTap={isUnlocked ? { scale: 0.95 } : {}}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : !isUnlocked ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}

                {/* Pulse animation for current step */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {/* Step Title */}
              <div className="text-center min-w-0">
                <div 
                  className={`
                    text-xs font-medium truncate max-w-20
                    ${isCurrent
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-green-600'
                      : isUnlocked
                      ? 'text-foreground'
                      : 'text-muted-foreground/50'
                    }
                  `}
                  title={step.title}
                >
                  {step.title}
                </div>
                
                {step.optional && (
                  <div className="text-xs text-muted-foreground/70 mt-1">
                    (Optional)
                  </div>
                )}
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute top-4 left-8 w-full">
                  <div 
                    className={`
                      h-0.5 
                      ${isPast || isCompleted
                        ? 'bg-green-500'
                        : 'bg-border'
                      }
                    `}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current Step Info */}
      {steps[currentStep] && (
        <motion.div
          className="mt-4 p-3 bg-muted/30 rounded-lg border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-medium text-foreground mb-1">
            {steps[currentStep].title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </motion.div>
      )}
    </div>
  );
};