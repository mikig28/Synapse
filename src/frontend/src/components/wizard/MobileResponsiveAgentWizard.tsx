import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MobileDialog,
  MobileDialogContent,
  MobileDialogHeader,
} from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '@/services/agentService';
import { Agent } from '@/types/agent';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { ScreenReaderOnly, DescriptiveText } from '@/components/accessibility';
import { WizardProgress } from './WizardProgress';
import { WizardStep } from './WizardStep';
import { AgentTypeSelector } from './AgentTypeSelector';
import { TemplateSelector } from './TemplateSelector';
import { AgentConfiguration } from './AgentConfiguration';
import { ReviewAndLaunch } from './ReviewAndLaunch';
import { MobileAgentTypeSelector } from './MobileAgentTypeSelector';
import { MobileTemplateSelector } from './MobileTemplateSelector';
import { MobileAgentConfiguration } from './MobileAgentConfiguration';
import { MobileReviewAndLaunch } from './MobileReviewAndLaunch';
import { useIsMobile } from '@/hooks/useMobileDetection';
import {
  modalVariants,
  slideVariants,
  buttonVariants,
  transitions
} from '@/utils/animations';
import {
  typography,
  spacing,
  shadows,
  borderRadius,
  agentColors
} from '@/utils/designSystem';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// Wizard steps configuration
const WIZARD_STEPS = [
  {
    id: 'type',
    title: 'Agent Type',
    description: 'Choose the type of AI agent you want to create',
    component: AgentTypeSelector,
    mobileComponent: MobileAgentTypeSelector,
  },
  {
    id: 'template',
    title: 'Template',
    description: 'Select a pre-built template or start from scratch',
    component: TemplateSelector,
    mobileComponent: MobileTemplateSelector,
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'Configure your agent settings and parameters',
    component: AgentConfiguration,
    mobileComponent: MobileAgentConfiguration,
  },
  {
    id: 'review',
    title: 'Review & Launch',
    description: 'Review your settings and launch your agent',
    component: ReviewAndLaunch,
    mobileComponent: MobileReviewAndLaunch,
  },
] as const;

// Agent type definitions
export type AgentType = 'twitter' | 'news' | 'crewai_news' | 'custom';

// Template definition
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  icon: string;
  configuration: Record<string, any>;
  tags: string[];
  isRecommended?: boolean;
}

// Wizard data structure
export interface WizardData {
  type: AgentType | null;
  template: AgentTemplate | null;
  configuration: {
    name: string;
    description: string;
    keywords: string;
    minLikes: number;
    minRetweets: number;
    excludeReplies: boolean;
    newsSources: string;
    categories: string;
    language: string;
    topics: string;
    crewaiSources: {
      reddit: boolean;
      linkedin: boolean;
      telegram: boolean;
      news_websites: boolean;
    };
    schedule: string;
    maxItemsPerRun: number;
  };
}

interface MobileResponsiveAgentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (agent: Agent) => void;
}

export const MobileResponsiveAgentWizard: React.FC<MobileResponsiveAgentWizardProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { settings, screenReader, focusManagement } = useAccessibilityContext();
  const isMobile = useIsMobile();

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

  const handleStepClick = useCallback((stepIndex: number) => {
    // Allow jumping to previous steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  }, [currentStep]);

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
      
      toast({
        title: 'Success',
        description: `${createdAgent.name} has been created successfully!`,
      });

      onSuccess(createdAgent);
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create agent',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [wizardData, toast, onSuccess]);

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setWizardData({
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
  }, []);

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isCreating) {
      onOpenChange(false);
      // Reset after animation completes
      setTimeout(resetWizard, 300);
    }
  }, [isCreating, onOpenChange, resetWizard]);

  // Current step component
  const currentStepData = WIZARD_STEPS[currentStep];
  const CurrentStepComponent = isMobile ? 
    currentStepData?.mobileComponent : 
    currentStepData?.component;

  return (
    <MobileDialog open={open} onOpenChange={handleClose}>
      <MobileDialogContent 
        fullScreen={isMobile}
        className="flex flex-col p-0"
        aria-labelledby="wizard-title"
        aria-describedby="wizard-description"
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="h-full flex flex-col"
        >
          {/* Header */}
          <MobileDialogHeader className="space-y-2 sm:space-y-4 pb-4 sm:pb-6 border-b border-border/20 flex-shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="mx-auto p-3 sm:p-4 rounded-full w-fit"
              style={{
                backgroundColor: agentColors.running.bg,
                border: `2px solid ${agentColors.running.border}`
              }}
            >
              <Bot className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: agentColors.running.primary }} />
            </motion.div>
            
            <div className="text-center space-y-2">
              <motion.h1 
                id="wizard-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-bold"
                style={{ color: agentColors.running.text }}
              >
                Create AI Agent
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: agentColors.completed.primary }} />
              </motion.h1>
              
              <motion.p 
                id="wizard-description"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground text-sm sm:text-base px-4 sm:px-0"
              >
                Build a powerful AI agent in just a few simple steps
              </motion.p>

              {/* Screen reader instructions */}
              <ScreenReaderOnly>
                <DescriptiveText level="detailed">
                  Agent creation wizard with {WIZARD_STEPS.length} steps. 
                  Current step: {currentStep + 1} of {WIZARD_STEPS.length}.
                </DescriptiveText>
              </ScreenReaderOnly>
            </div>

            {/* Progress Indicator */}
            <WizardProgress
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              onStepClick={handleStepClick}
            />
          </MobileDialogHeader>

          {/* Step Content */}
          <div 
            className="flex-1 overflow-y-auto py-4 sm:py-6 min-h-0 px-4 sm:px-6"
            role="main"
            aria-live="polite"
            aria-label={`Step ${currentStep + 1} of ${WIZARD_STEPS.length}: ${currentStepData?.title}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                custom="right"
                transition={transitions.smooth}
                className="h-full"
              >
                {CurrentStepComponent && (
                  <WizardStep
                    title={currentStepData.title}
                    description={currentStepData.description}
                    stepNumber={currentStep + 1}
                    totalSteps={WIZARD_STEPS.length}
                  >
                    <CurrentStepComponent
                      data={wizardData}
                      onUpdate={updateWizardData}
                      onNext={handleNext}
                    />
                  </WizardStep>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Mobile swipe hint */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                className="text-center mt-4 text-xs text-muted-foreground"
              >
                <div className="flex items-center justify-center gap-2">
                  <ArrowLeft className="w-3 h-3" />
                  <span>Swipe to navigate</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Navigation Footer */}
          <motion.div 
            className="flex justify-between items-center px-4 sm:px-6 py-4 sm:py-6 border-t border-border/20 flex-shrink-0 gap-2 sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {canGoPrevious() && (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious}
                    className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isCreating}
                  className="text-sm sm:text-base"
                >
                  Cancel
                </Button>
              </motion.div>

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button 
                    onClick={handleNext}
                    disabled={!canGoNext()}
                    className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                    style={{
                      background: canGoNext() ? 
                        `linear-gradient(135deg, ${agentColors.running.primary}, ${agentColors.completed.primary})` :
                        agentColors.paused.primary,
                      border: 'none',
                      color: 'white',
                      opacity: canGoNext() ? 1 : 0.5
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button 
                    onClick={handleCreateAgent}
                    disabled={!canGoNext() || isCreating}
                    className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                    style={{
                      background: (canGoNext() && !isCreating) ? 
                        `linear-gradient(135deg, ${agentColors.completed.primary}, ${agentColors.running.primary})` :
                        agentColors.paused.primary,
                      border: 'none',
                      color: 'white',
                      opacity: (canGoNext() && !isCreating) ? 1 : 0.5
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isCreating ? 'Creating...' : 'Create'}
                    </span>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </MobileDialogContent>
    </MobileDialog>
  );
};