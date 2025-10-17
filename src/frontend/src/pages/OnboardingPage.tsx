import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  X,
} from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { CelebrationModal } from '@/components/onboarding/CelebrationModal';
import { OnboardingTips } from '@/components/onboarding/OnboardingTips';

import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep';
import { TelegramBotSetupStep } from '@/components/onboarding/steps/TelegramBotSetupStep';
import { ConnectDataStep } from '@/components/onboarding/steps/ConnectDataStep';
import { CreateAgentStep } from '@/components/onboarding/steps/CreateAgentStep';
import { ExploreSearchStep } from '@/components/onboarding/steps/ExploreSearchStep';
import { OrganizeContentStep } from '@/components/onboarding/steps/OrganizeContentStep';
import { CustomizeSettingsStep } from '@/components/onboarding/steps/CustomizeSettingsStep';

const stepComponents = [
  WelcomeStep,
  TelegramBotSetupStep,
  ConnectDataStep,
  CreateAgentStep,
  ExploreSearchStep,
  OrganizeContentStep,
  CustomizeSettingsStep,
];

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isOnboarding,
    onboardingDismissed,
    hasHydrated,
    currentStep,
    steps,
    progress,
    showCelebration,
    celebrationMessage,
    showTips,
    currentTip,
    nextStep,
    prevStep,
    skipStep,
    startOnboarding,
    completeOnboarding,
    hideCelebration,
    hideTips,
    initializeFromServer,
    isInitialized,
    isLoading,
    error,
    setError,
    dismissOnboarding,
  } = useOnboardingStore();

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initializeFromServer().catch((err) => {
        console.error('Failed to initialise onboarding', err);
        setError('We could not load your current progress. Some statuses may be outdated.');
      });
    }
  }, [initializeFromServer, isInitialized, setError]);

  useEffect(() => {
    // Wait for hydration before auto-starting onboarding
    // This prevents race conditions where onboarding starts before localStorage is loaded
    if (!hasHydrated) {
      return;
    }

    // Only start onboarding if user hasn't completed it and hasn't dismissed it
    // This prevents onboarding from showing on every refresh for existing users
    if (!isOnboarding && !onboardingDismissed && progress.completedSteps.length === 0) {
      startOnboarding();
    }
  }, [hasHydrated, isOnboarding, onboardingDismissed, startOnboarding, progress.completedSteps.length]);

  const CurrentStepComponent = useMemo(() => stepComponents[currentStep] ?? null, [currentStep]);
  const currentStepData = steps[currentStep];

  const isLastStep = currentStep >= steps.length - 1;
  const canGoNext = currentStepData?.optional || !!currentStepData?.completed;
  const canGoPrev = currentStep > 0;
  const canSkip = currentStepData?.optional;

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (isLastStep) {
      completeOnboarding();
      setTimeout(() => {
        navigate('/dashboard');
      }, 2200);
      setTimeout(() => setIsTransitioning(false), 500);
      return;
    }

    nextStep();
    setTimeout(() => setIsTransitioning(false), 250);
  };

  const handlePrev = () => {
    if (isTransitioning || !canGoPrev) return;
    setIsTransitioning(true);
    prevStep();
    setTimeout(() => setIsTransitioning(false), 250);
  };

  const handleSkip = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    skipStep();
    setTimeout(() => setIsTransitioning(false), 250);
  };

  const handleExit = () => {
    dismissOnboarding();
    // Give persist middleware time to save to localStorage before navigating
    // Increased timeout to ensure persistence completes
    setTimeout(() => {
      navigate('/dashboard');
    }, 500);
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
  };

  const stepVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
  };

  const navigationVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { delay: 0.15 } },
  };

  return (
    <motion.div className="relative min-h-screen bg-background" variants={pageVariants} initial="initial" animate="animate">
      <OnboardingLayout>
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Synapse onboarding</h1>
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}. You can exit or revisit steps at any time.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExit} className="text-muted-foreground hover:text-foreground">
            <X className="mr-2 h-4 w-4" />
            Exit
          </Button>
        </div>

        {error && (
          <Alert className="mt-4 border-amber-500/40 bg-amber-500/10">
            <AlertTitle>We hit a snag</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6">
          <OnboardingProgress />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="mt-8 flex-1"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {CurrentStepComponent ? <CurrentStepComponent /> : null}
          </motion.div>
        </AnimatePresence>

        <motion.div
          className="mt-10 flex flex-col gap-3 border-t border-border/40 pt-5 md:flex-row md:items-center md:justify-between"
          variants={navigationVariants}
          initial="initial"
          animate="animate"
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrev} disabled={!canGoPrev || isTransitioning}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {canSkip && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isTransitioning}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Skip this step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {progress.completedSteps.length} of {steps.length} completed
            </span>
            <Button
              onClick={handleNext}
              disabled={isTransitioning || (!canGoNext && !currentStepData?.optional)}
            >
              {isLastStep ? 'Finish' : 'Continue'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </OnboardingLayout>

      <CelebrationModal isOpen={showCelebration} onClose={hideCelebration} message={celebrationMessage} />

      <OnboardingTips isVisible={showTips} tip={currentTip} onClose={hideTips} />

      <AnimatePresence>
        {(isLoading || isTransitioning) && (
          <motion.div
            className="pointer-events-none fixed inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OnboardingPage;

