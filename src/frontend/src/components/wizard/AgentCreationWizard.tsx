import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
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
  Sparkles
} from 'lucide-react';

// Wizard steps configuration
const WIZARD_STEPS = [
  {
    id: 'type',
    title: 'Agent Type',
    description: 'Choose the type of AI agent you want to create',
    component: AgentTypeSelector,
  },
  {
    id: 'template',
    title: 'Template',
    description: 'Select a pre-built template or start from scratch',
    component: TemplateSelector,
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'Configure your agent settings and parameters',
    component: AgentConfiguration,
  },
  {
    id: 'review',
    title: 'Review & Launch',
    description: 'Review your settings and launch your agent',
    component: ReviewAndLaunch,
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

interface AgentCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (agent: Agent) => void;
}

export const AgentCreationWizard: React.FC<AgentCreationWizardProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { settings, screenReader, focusManagement } = useAccessibilityContext();

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

  // Navigation handlers
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

  // Enhanced keyboard navigation with accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    } else if (event.key === 'ArrowRight' || event.key === 'Tab') {
      if (event.ctrlKey && canGoNext()) {
        event.preventDefault();
        handleNext();
        // Announce step change
        if (settings.announceActions) {
          screenReader.announce(
            `Advanced to step ${currentStep + 2}: ${WIZARD_STEPS[currentStep + 1]?.title}`,
            'polite'
          );
        }
      }
    } else if (event.key === 'ArrowLeft') {
      if (event.ctrlKey && canGoPrevious()) {
        event.preventDefault();
        handlePrevious();
        // Announce step change
        if (settings.announceActions) {
          screenReader.announce(
            `Returned to step ${currentStep}: ${WIZARD_STEPS[currentStep - 1]?.title}`,
            'polite'
          );
        }
      }
    } else if (event.key === 'Enter') {
      if (event.ctrlKey && currentStep === WIZARD_STEPS.length - 1 && canGoNext()) {
        event.preventDefault();
        handleCreateAgent();
      }
    } else if (event.key >= '1' && event.key <= '4') {
      // Quick step navigation
      const stepIndex = parseInt(event.key) - 1;
      if (stepIndex <= currentStep && stepIndex < WIZARD_STEPS.length) {
        setCurrentStep(stepIndex);
        if (settings.announceActions) {
          screenReader.announce(
            `Jumped to step ${stepIndex + 1}: ${WIZARD_STEPS[stepIndex]?.title}`,
            'polite'
          );
        }
      }
    }
  }, [handleClose, canGoNext, handleNext, canGoPrevious, handlePrevious, currentStep, handleCreateAgent, screenReader, settings.announceActions]);

  // Current step component
  const CurrentStepComponent = WIZARD_STEPS[currentStep]?.component;
  const currentStepData = WIZARD_STEPS[currentStep];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden border-0 flex flex-col p-0"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.xl
        }}
        onKeyDown={handleKeyDown}
        aria-labelledby="wizard-title"
        aria-describedby="wizard-description"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="h-full flex flex-col p-6"
        >
          {/* Header */}
          <DialogHeader className="space-y-4 pb-6 border-b border-border/20 flex-shrink-0">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="mx-auto p-4 rounded-full w-fit"
              style={{
                backgroundColor: agentColors.running.bg,
                border: `2px solid ${agentColors.running.border}`
              }}
            >
              <Bot className="w-8 h-8" style={{ color: agentColors.running.primary }} />
            </motion.div>
            
            <div className="text-center space-y-2">
              <motion.h1 
                id="wizard-title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2"
                style={{
                  ...typography.title,
                  color: agentColors.running.text
                }}
              >
                Create AI Agent
                <Sparkles className="w-6 h-6" style={{ color: agentColors.completed.primary }} />
              </motion.h1>
              
              <motion.p 
                id="wizard-description"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground"
                style={typography.body}
              >
                Build a powerful AI agent in just a few simple steps. Use Ctrl+Arrow keys to navigate between steps.
              </motion.p>
              
              {/* Screen reader instructions */}
              <ScreenReaderOnly>
                <DescriptiveText level="detailed">
                  Agent creation wizard with {WIZARD_STEPS.length} steps. 
                  Current step: {currentStep + 1} of {WIZARD_STEPS.length}. 
                  Use Ctrl+Arrow keys to navigate, number keys 1-4 to jump to specific steps, 
                  and Ctrl+Enter to create the agent on the final step.
                </DescriptiveText>
              </ScreenReaderOnly>
            </div>

            {/* Progress Indicator */}
            <WizardProgress
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              onStepClick={handleStepClick}
            />
          </DialogHeader>

          {/* Step Content */}
          <div 
            className="flex-1 overflow-y-auto py-6 min-h-0"
            role="main"
            aria-live="polite"
            aria-label={`Step ${currentStep + 1} of ${WIZARD_STEPS.length}: ${currentStepData?.title}`}
            aria-describedby="wizard-description"
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
                role="tabpanel"
                aria-labelledby={`step-${currentStep}-heading`}
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
          </div>

          {/* Navigation Footer */}
          <motion.div 
            className="flex justify-between items-center pt-6 border-t border-border/20 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3">
              {canGoPrevious() && (
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button 
                    variant="outline" 
                    onClick={handlePrevious}
                    className="flex items-center gap-2"
                    style={{
                      borderColor: agentColors.paused.border,
                      color: agentColors.paused.text,
                      padding: `${spacing.sm} ${spacing.lg}`,
                      borderRadius: borderRadius.md
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                </motion.div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isCreating}
                  style={{
                    borderColor: agentColors.paused.border,
                    color: agentColors.paused.text,
                    padding: `${spacing.sm} ${spacing.lg}`,
                    borderRadius: borderRadius.md
                  }}
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
                    className="flex items-center gap-2 relative overflow-hidden group"
                    style={{
                      background: canGoNext() ? 
                        `linear-gradient(135deg, ${agentColors.running.primary}, ${agentColors.completed.primary})` :
                        agentColors.paused.primary,
                      border: 'none',
                      color: 'white',
                      fontWeight: typography.cardTitle.fontWeight,
                      padding: `${spacing.sm} ${spacing.lg}`,
                      borderRadius: borderRadius.md,
                      opacity: canGoNext() ? 1 : 0.5
                    }}
                  >
                    {canGoNext() && (
                      <motion.div 
                        className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                        style={{ borderRadius: borderRadius.md }}
                      />
                    )}
                    <span className="relative z-10">Next</span>
                    <ChevronRight className="w-4 h-4 relative z-10" />
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
                    className="flex items-center gap-2 relative overflow-hidden group"
                    style={{
                      background: (canGoNext() && !isCreating) ? 
                        `linear-gradient(135deg, ${agentColors.completed.primary}, ${agentColors.running.primary})` :
                        agentColors.paused.primary,
                      border: 'none',
                      color: 'white',
                      fontWeight: typography.cardTitle.fontWeight,
                      padding: `${spacing.sm} ${spacing.xl}`,
                      borderRadius: borderRadius.md,
                      opacity: (canGoNext() && !isCreating) ? 1 : 0.5
                    }}
                  >
                    {(canGoNext() && !isCreating) && (
                      <motion.div 
                        className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                        style={{ borderRadius: borderRadius.md }}
                      />
                    )}
                    <Sparkles className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">
                      {isCreating ? 'Creating Agent...' : 'Create Agent'}
                    </span>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};