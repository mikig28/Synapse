/**
 * Mobile Wizard Component
 * Full-screen mobile experience with swipe navigation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Bot, 
  Sparkles,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useTouchGestures, useFramerTouchGestures, useMobileCapabilities } from '@/hooks/useTouchGestures';
import { Agent } from '@/types/agent';
import { WizardData, AgentType, AgentTemplate } from '@/components/wizard/AgentCreationWizard';
import { AgentTypeSelector } from '@/components/wizard/AgentTypeSelector';
import { TemplateSelector } from '@/components/wizard/TemplateSelector';
import { AgentConfiguration } from '@/components/wizard/AgentConfiguration';
import { ReviewAndLaunch } from '@/components/wizard/ReviewAndLaunch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '@/services/agentService';

interface MobileWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (agent: Agent) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  icon: React.ComponentType<{ className?: string }>;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'type',
    title: 'Agent Type',
    description: 'Choose your AI agent type',
    component: AgentTypeSelector,
    icon: Bot,
  },
  {
    id: 'template',
    title: 'Template',
    description: 'Select a template',
    component: TemplateSelector,
    icon: Sparkles,
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'Configure settings',
    component: AgentConfiguration,
    icon: Bot,
  },
  {
    id: 'review',
    title: 'Review & Launch',
    description: 'Review and create',
    component: ReviewAndLaunch,
    icon: Sparkles,
  },
];

const MobileWizard: React.FC<MobileWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { hasTouch, hasHaptic, isMobile } = useMobileCapabilities();

  // Wizard data state
  const [wizardData, setWizardData] = useState<WizardData>({
    type: null,
    template: null,
    configuration: {
      name: '',
      description: '',
      keywords: '',
      minLikes: 10,
      minRetweets: 5,
      excludeReplies: true,
      newsSources: '',
      categories: '',
      language: 'en',
      topics: '',
      crewaiSources: {
        reddit: true,
        linkedin: true,
        telegram: true,
        news_websites: true,
      },
      schedule: '0 */6 * * *',
      maxItemsPerRun: 10,
    },
  });

  // Touch gesture support
  const { triggerHaptic } = useTouchGestures({
    onSwipe: (gesture) => {
      if (!isDragging) {
        if (gesture.direction === 'right' && canGoPrevious()) {
          triggerHaptic('light');
          handlePrevious();
        } else if (gesture.direction === 'left' && canGoNext()) {
          triggerHaptic('light');
          handleNext();
        }
      }
    },
    onLongPress: () => {
      triggerHaptic('medium');
      // Could add context menu or shortcuts
    },
  });

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData(prev => ({
      ...prev,
      ...updates,
      configuration: {
        ...prev.configuration,
        ...(updates.configuration || {}),
      },
    }));
  }, []);

  // Navigation validation
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 0: // Type selection
        return wizardData.type !== null;
      case 1: // Template selection
        return wizardData.template !== null;
      case 2: // Configuration
        return wizardData.configuration.name.trim() !== '';
      case 3: // Review
        return true;
      default:
        return false;
    }
  }, [currentStep, wizardData]);

  const canGoPrevious = useCallback(() => {
    return currentStep > 0;
  }, [currentStep]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (canGoNext() && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, canGoNext]);

  const handlePrevious = useCallback(() => {
    if (canGoPrevious()) {
      setCurrentStep(prev => prev - 1);
    }
  }, [canGoPrevious]);

  // Pan gesture handlers
  const handlePanStart = () => {
    setIsDragging(true);
  };

  const handlePan = (event: any, info: PanInfo) => {
    // Only allow horizontal dragging
    const offset = Math.max(-300, Math.min(300, info.offset.x));
    setDragOffset(offset);
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    
    const threshold = 100;
    const velocity = Math.abs(info.velocity.x);
    
    // Navigate based on drag distance and velocity
    if (info.offset.x > threshold || velocity > 500) {
      // Swiped right - go to previous step
      if (canGoPrevious()) {
        triggerHaptic('medium');
        handlePrevious();
      }
    } else if (info.offset.x < -threshold || velocity > 500) {
      // Swiped left - go to next step
      if (canGoNext()) {
        triggerHaptic('medium');
        handleNext();
      }
    }
    
    // Reset drag offset
    setDragOffset(0);
  };

  // Create agent handler
  const handleCreateAgent = useCallback(async () => {
    if (!wizardData.type || !wizardData.template) {
      toast({
        title: 'Error',
        description: 'Please complete all wizard steps',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const agentData = {
        name: wizardData.configuration.name,
        type: wizardData.type,
        description: wizardData.configuration.description,
        configuration: {
          ...wizardData.configuration,
          keywords: wizardData.configuration.keywords ? 
            wizardData.configuration.keywords.split(',').map(k => k.trim()) : [],
          newsSources: wizardData.configuration.newsSources ? 
            wizardData.configuration.newsSources.split(',').map(s => s.trim()) : [],
          categories: wizardData.configuration.categories ? 
            wizardData.configuration.categories.split(',').map(c => c.trim()) : [],
          topics: wizardData.configuration.topics ? 
            wizardData.configuration.topics.split(',').map(t => t.trim()) : [],
        },
      };

      const createdAgent = await agentService.createAgent(agentData);
      
      triggerHaptic('heavy');
      toast({
        title: 'Success',
        description: `${createdAgent.name} has been created successfully!`,
      });

      onSuccess(createdAgent);
      onClose();
    } catch (error: any) {
      triggerHaptic('heavy');
      toast({
        title: 'Error',
        description: error.message || 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [wizardData, toast, onSuccess, onClose, triggerHaptic]);

  const currentStepData = WIZARD_STEPS[currentStep];
  const CurrentStepComponent = currentStepData?.component;

  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0,
      y: '100%',
    },
    visible: { 
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      }
    },
    exit: { 
      opacity: 0,
      y: '100%',
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      }
    },
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 100,
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      transition: {
        duration: 0.2,
      }
    }),
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50 safe-area-top">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              disabled={isCreating}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h1 className="text-lg font-semibold">Create Agent</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {WIZARD_STEPS.length}
              </p>
            </div>

            <div className="w-10" /> {/* Spacer for center alignment */}
          </div>

          {/* Progress Bar */}
          <div className="px-4 py-2">
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center px-4 py-2">
            <div className="flex gap-2">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <motion.div
                    key={step.id}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {isActive && (
                      <span className="hidden sm:inline">{step.title}</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait" custom={currentStep}>
              <motion.div
                key={currentStep}
                custom={currentStep}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                drag={hasTouch ? "x" : false}
                dragConstraints={{ left: -300, right: 300 }}
                dragElastic={0.2}
                onDragStart={handlePanStart}
                onDrag={handlePan}
                onDragEnd={handlePanEnd}
                style={{ x: dragOffset }}
                className="absolute inset-0 p-4 overflow-y-auto"
              >
                <div className="max-w-md mx-auto space-y-6">
                  {/* Step Header */}
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                    <p className="text-muted-foreground">{currentStepData.description}</p>
                  </div>

                  {/* Step Component */}
                  {CurrentStepComponent && (
                    <CurrentStepComponent
                      data={wizardData}
                      onUpdate={updateWizardData}
                      onNext={handleNext}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Swipe Hint */}
            {hasTouch && !isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground text-center"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-3 h-3" />
                  <span>Swipe to navigate</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="p-4 border-t border-border/50 safe-area-bottom">
            <div className="flex justify-between items-center gap-4">
              {/* Previous Button */}
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={!canGoPrevious() || isCreating}
                className={`flex items-center gap-2 ${!canGoPrevious() ? 'invisible' : ''}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              {/* Next/Create Button */}
              {currentStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canGoNext() || isCreating}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateAgent}
                  disabled={!canGoNext() || isCreating}
                  className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent"
                >
                  <Sparkles className="w-4 h-4" />
                  {isCreating ? 'Creating...' : 'Create Agent'}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

export default MobileWizard;