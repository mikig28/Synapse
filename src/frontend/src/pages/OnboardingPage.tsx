import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { CelebrationModal } from '@/components/onboarding/CelebrationModal';
import { OnboardingTips } from '@/components/onboarding/OnboardingTips';

// Step Components
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { ConnectDataStep } from '@/components/onboarding/steps/ConnectDataStep';
import { CreateAgentStep } from '@/components/onboarding/steps/CreateAgentStep';
import { ExploreSearchStep } from '@/components/onboarding/steps/ExploreSearchStep';
import { OrganizeContentStep } from '@/components/onboarding/steps/OrganizeContentStep';
import { CustomizeSettingsStep } from '@/components/onboarding/steps/CustomizeSettingsStep';

import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  SkipForward, 
  X,
  Home
} from 'lucide-react';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isOnboarding,
    currentStep,
    steps,
    progress,
    showCelebration,
    celebrationMessage,
    showTips,
    currentTip,
    startOnboarding,
    nextStep,
    prevStep,
    skipStep,
    completeOnboarding,
    hideCelebration,
    hideTips,
    setError
  } = useOnboardingStore();

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-start onboarding if not already started
  useEffect(() => {
    if (!isOnboarding && currentStep === 0) {
      startOnboarding();
    }
  }, [isOnboarding, currentStep, startOnboarding]);

  // Step components mapping
  const stepComponents = [
    WelcomeStep,
    ConnectDataStep,
    CreateAgentStep,
    ExploreSearchStep,
    OrganizeContentStep,
    CustomizeSettingsStep
  ];

  const CurrentStepComponent = stepComponents[currentStep];
  const currentStepData = steps[currentStep];

  const handleNext = async () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    try {
      if (currentStep >= steps.length - 1) {
        // Complete onboarding
        completeOnboarding();
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000); // Show celebration for 3 seconds
      } else {
        nextStep();
      }
    } catch (error) {
      setError('Failed to proceed to next step');
    } finally {
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handlePrev = () => {
    if (isTransitioning || currentStep === 0) return;
    
    setIsTransitioning(true);
    prevStep();
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleSkip = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    skipStep();
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleExit = () => {
    navigate('/dashboard');
  };

  const isLastStep = currentStep >= steps.length - 1;
  const canGoNext = currentStepData?.completed || currentStepData?.optional;
  const canGoPrev = currentStep > 0;
  const canSkip = currentStepData?.optional;

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.05,
      transition: { 
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const stepVariants = {
    initial: { 
      opacity: 0, 
      x: 50,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: "easeOut",
        delay: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      x: -50,
      scale: 0.95,
      transition: { 
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const navigationVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        delay: 0.5
      }
    }
  };

  if (!currentStepData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          <Button onClick={() => navigate('/dashboard')}>
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 relative overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl"
          style={{ top: '10%', right: '10%' }}
          animate={{
            x: [0, -30, 0],
            y: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '10%' }}
          animate={{
            x: [0, 30, 0],
            y: [0, -15, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <OnboardingLayout>
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.h1 
              className="text-2xl md:text-3xl font-bold gradient-text"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Welcome to Synapse
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              <OnboardingProgress />
            </motion.div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="flex-1 mb-8"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {CurrentStepComponent && <CurrentStepComponent />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          className="relative z-10 flex items-center justify-between pt-6 border-t border-border/50"
          variants={navigationVariants}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={!canGoPrev || isTransitioning}
              className="min-w-[100px]"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {canSkip && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isTransitioning}
                className="text-muted-foreground hover:text-foreground"
              >
                                  <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            
            <Button
              onClick={handleNext}
              disabled={(!canGoNext && !currentStepData?.optional) || isTransitioning}
              className="min-w-[100px] bg-primary hover:bg-primary/90"
            >
              {isLastStep ? 'Complete' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </OnboardingLayout>

      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={hideCelebration}
        message={celebrationMessage}
      />

      {/* Tips */}
      <OnboardingTips
        isVisible={showTips}
        tip={currentTip}
        onClose={hideTips}
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OnboardingPage;