import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
  unlocked: boolean;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  integrations: {
    whatsapp: {
      enabled: boolean;
      autoCapture: boolean;
      keywords: string[];
    };
    telegram: {
      enabled: boolean;
      chatLinked: boolean;
      botToken?: string;
    };
    calendar: {
      enabled: boolean;
      provider?: 'google' | 'outlook';
      syncEnabled: boolean;
    };
  };
  aiAgents: {
    defaultAgent?: string;
    autoAnalysis: boolean;
    scheduledReports: boolean;
  };
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  timeSpent: number;
  startTime?: Date;
  completedTime?: Date;
}

export interface IntegrationStatus {
  whatsapp: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    qrCode?: string;
    error?: string;
    messagesCount?: number;
  };
  telegram: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    chatId?: string;
    error?: string;
    messagesCount?: number;
  };
  documents: {
    uploadedCount: number;
    lastUpload?: Date;
  };
  agents: {
    createdCount: number;
    activeCount: number;
    lastCreated?: Date;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  category: 'integration' | 'content' | 'agent' | 'milestone';
}

interface OnboardingState {
  // Core state
  isOnboarding: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  progress: OnboardingProgress;
  
  // User data
  userPreferences: UserPreferences;
  integrationStatus: IntegrationStatus;
  achievements: Achievement[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showCelebration: boolean;
  celebrationMessage: string;
  showTips: boolean;
  currentTip?: string;
  
  // Actions
  startOnboarding: () => void;
  completeOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  skipStep: () => void;
  completeStep: (stepId: string) => void;
  updateProgress: (progress: Partial<OnboardingProgress>) => void;
  
  // Preferences
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  updateIntegrationStatus: (integration: keyof IntegrationStatus, status: any) => void;
  
  // Achievements
  unlockAchievement: (achievementId: string) => void;
  showAchievement: (message: string) => void;
  hideCelebration: () => void;
  
  // Tips
  showNextTip: () => void;
  hideTips: () => void;
  
  // Utility
  reset: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const initialSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Synapse',
    description: 'Discover how Synapse transforms your knowledge management',
    completed: false,
    optional: false,
    unlocked: true
  },
  {
    id: 'connect-data',
    title: 'Connect Your First Data Source',
    description: 'Link WhatsApp, Telegram, or upload documents to get started',
    completed: false,
    optional: false,
    unlocked: false
  },
  {
    id: 'create-agent',
    title: 'Create Your AI Agent',
    description: 'Set up your first AI agent to analyze and organize content',
    completed: false,
    optional: false,
    unlocked: false
  },
  {
    id: 'explore-search',
    title: 'Discover Search',
    description: 'Learn how to find information across all your content',
    completed: false,
    optional: false,
    unlocked: false
  },
  {
    id: 'organize-content',
    title: 'Organize Your Knowledge',
    description: 'Create notes, tasks, and organize your content',
    completed: false,
    optional: true,
    unlocked: false
  },
  {
    id: 'customize-settings',
    title: 'Customize Your Experience',
    description: 'Set up notifications and preferences',
    completed: false,
    optional: true,
    unlocked: false
  }
];

const initialPreferences: UserPreferences = {
  notifications: {
    email: true,
    push: true,
    telegram: false,
    whatsapp: false
  },
  integrations: {
    whatsapp: {
      enabled: false,
      autoCapture: true,
      keywords: ['פתק', 'note', 'important']
    },
    telegram: {
      enabled: false,
      chatLinked: false
    },
    calendar: {
      enabled: false,
      syncEnabled: false
    }
  },
  aiAgents: {
    autoAnalysis: true,
    scheduledReports: false
  }
};

const initialIntegrationStatus: IntegrationStatus = {
  whatsapp: {
    status: 'disconnected'
  },
  telegram: {
    status: 'disconnected'
  },
  documents: {
    uploadedCount: 0
  },
  agents: {
    createdCount: 0,
    activeCount: 0
  }
};

const defaultAchievements: Achievement[] = [
  {
    id: 'first-connection',
    title: 'First Connection',
    description: 'Connected your first data source',
    icon: '🔗',
    category: 'integration'
  },
  {
    id: 'agent-creator',
    title: 'Agent Creator',
    description: 'Created your first AI agent',
    icon: '🤖',
    category: 'agent'
  },
  {
    id: 'search-explorer',
    title: 'Search Explorer',
    description: 'Performed your first search',
    icon: '🔍',
    category: 'milestone'
  },
  {
    id: 'content-organizer',
    title: 'Content Organizer',
    description: 'Created your first note or task',
    icon: '📝',
    category: 'content'
  },
  {
    id: 'onboarding-complete',
    title: 'Onboarding Champion',
    description: 'Completed the full onboarding journey',
    icon: '🎉',
    category: 'milestone'
  }
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnboarding: false,
      currentStep: 0,
      steps: initialSteps,
      progress: {
        currentStep: 0,
        totalSteps: initialSteps.length,
        completedSteps: [],
        skippedSteps: [],
        timeSpent: 0
      },
      userPreferences: initialPreferences,
      integrationStatus: initialIntegrationStatus,
      achievements: defaultAchievements,
      isLoading: false,
      error: null,
      showCelebration: false,
      celebrationMessage: '',
      showTips: true,
      
      // Core actions
      startOnboarding: () => {
        set({
          isOnboarding: true,
          currentStep: 0,
          progress: {
            ...get().progress,
            startTime: new Date(),
            currentStep: 0
          }
        });
      },
      
      completeOnboarding: () => {
        const state = get();
        set({
          isOnboarding: false,
          progress: {
            ...state.progress,
            completedTime: new Date()
          },
          showCelebration: true,
          celebrationMessage: '🎉 Welcome to Synapse! You\'re all set up and ready to explore.'
        });
        
        // Unlock achievement
        get().unlockAchievement('onboarding-complete');
      },
      
      nextStep: () => {
        const state = get();
        const nextStepIndex = Math.min(state.currentStep + 1, state.steps.length - 1);
        
        // Unlock next step
        const updatedSteps = [...state.steps];
        if (updatedSteps[nextStepIndex]) {
          updatedSteps[nextStepIndex].unlocked = true;
        }
        
        set({
          currentStep: nextStepIndex,
          steps: updatedSteps,
          progress: {
            ...state.progress,
            currentStep: nextStepIndex
          }
        });
      },
      
      prevStep: () => {
        const state = get();
        const prevStepIndex = Math.max(state.currentStep - 1, 0);
        set({
          currentStep: prevStepIndex,
          progress: {
            ...state.progress,
            currentStep: prevStepIndex
          }
        });
      },
      
      goToStep: (stepIndex: number) => {
        const state = get();
        const validIndex = Math.max(0, Math.min(stepIndex, state.steps.length - 1));
        set({
          currentStep: validIndex,
          progress: {
            ...state.progress,
            currentStep: validIndex
          }
        });
      },
      
      skipStep: () => {
        const state = get();
        const currentStepId = state.steps[state.currentStep]?.id;
        
        if (currentStepId) {
          set({
            progress: {
              ...state.progress,
              skippedSteps: [...state.progress.skippedSteps, currentStepId]
            }
          });
        }
        
        get().nextStep();
      },
      
      completeStep: (stepId: string) => {
        const state = get();
        const stepIndex = state.steps.findIndex(step => step.id === stepId);
        
        if (stepIndex >= 0) {
          const updatedSteps = [...state.steps];
          updatedSteps[stepIndex].completed = true;
          
          set({
            steps: updatedSteps,
            progress: {
              ...state.progress,
              completedSteps: [...state.progress.completedSteps, stepId]
            }
          });
          
          // Auto-advance to next step if all required steps in current step are complete
          const currentStep = updatedSteps[state.currentStep];
          if (currentStep && currentStep.completed) {
            setTimeout(() => get().nextStep(), 1000);
          }
        }
      },
      
      updateProgress: (progress: Partial<OnboardingProgress>) => {
        const state = get();
        set({
          progress: {
            ...state.progress,
            ...progress
          }
        });
      },
      
      // Preferences
      updateUserPreferences: (preferences: Partial<UserPreferences>) => {
        const state = get();
        set({
          userPreferences: {
            ...state.userPreferences,
            ...preferences
          }
        });
      },
      
      updateIntegrationStatus: (integration: keyof IntegrationStatus, status: any) => {
        const state = get();
        set({
          integrationStatus: {
            ...state.integrationStatus,
            [integration]: {
              ...state.integrationStatus[integration],
              ...status
            }
          }
        });
        
        // Check for achievements
        if (integration === 'whatsapp' && status.status === 'connected') {
          get().unlockAchievement('first-connection');
        }
        if (integration === 'telegram' && status.status === 'connected') {
          get().unlockAchievement('first-connection');
        }
        if (integration === 'agents' && status.createdCount > 0) {
          get().unlockAchievement('agent-creator');
        }
      },
      
      // Achievements
      unlockAchievement: (achievementId: string) => {
        const state = get();
        const updatedAchievements = state.achievements.map(achievement =>
          achievement.id === achievementId
            ? { ...achievement, unlockedAt: new Date() }
            : achievement
        );
        
        const achievement = updatedAchievements.find(a => a.id === achievementId);
        if (achievement && !achievement.unlockedAt) {
          set({
            achievements: updatedAchievements,
            showCelebration: true,
            celebrationMessage: `🏆 Achievement Unlocked: ${achievement.title}!`
          });
        }
      },
      
      showAchievement: (message: string) => {
        set({
          showCelebration: true,
          celebrationMessage: message
        });
      },
      
      hideCelebration: () => {
        set({
          showCelebration: false,
          celebrationMessage: ''
        });
      },
      
      // Tips
      showNextTip: () => {
        const tips = [
          "💡 Pro tip: Use the search to find content across all your connected sources",
          "🤖 AI agents can automatically categorize and analyze your content",
          "📝 Create notes to capture ideas and link them to relevant content",
          "📅 Connect your calendar to get AI-powered meeting insights",
          "⚡ Keyboard shortcuts: Ctrl+K to open search, Ctrl+N for new note"
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        set({
          currentTip: randomTip,
          showTips: true
        });
      },
      
      hideTips: () => {
        set({
          showTips: false,
          currentTip: undefined
        });
      },
      
      // Utility
      reset: () => {
        set({
          isOnboarding: false,
          currentStep: 0,
          steps: initialSteps,
          progress: {
            currentStep: 0,
            totalSteps: initialSteps.length,
            completedSteps: [],
            skippedSteps: [],
            timeSpent: 0
          },
          userPreferences: initialPreferences,
          integrationStatus: initialIntegrationStatus,
          achievements: defaultAchievements,
          isLoading: false,
          error: null,
          showCelebration: false,
          celebrationMessage: '',
          showTips: true,
          currentTip: undefined
        });
      },
      
      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'synapse-onboarding',
      partialize: (state) => ({
        progress: state.progress,
        userPreferences: state.userPreferences,
        integrationStatus: state.integrationStatus,
        achievements: state.achievements,
        isOnboarding: state.isOnboarding,
        currentStep: state.currentStep,
        steps: state.steps
      })
    }
  )
);