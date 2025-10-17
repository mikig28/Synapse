import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import telegramBotService from '@/services/telegramBotService';
import whatsappService from '@/services/whatsappService';
import documentService from '@/services/documentService';
import { agentService } from '@/services/agentService';
import useAuthStore from '@/store/authStore';

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

export type UseCase =
  | 'knowledge-management'
  | 'task-management'
  | 'communication-analysis'
  | 'ai-automation'
  | 'personal-productivity'
  | 'content-organization'
  | null;

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  timeSpent: number;
  startTime?: Date;
  completedTime?: Date;
  selectedUseCase?: UseCase;
}

export interface IntegrationStatus {
  whatsapp: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    lastSync?: string | null;
    error?: string | null;
  };
  telegram: {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    botUsername?: string | null;
    error?: string | null;
  };
  documents: {
    uploadedCount: number;
    lastUpload?: string | null;
  };
  agents: {
    createdCount: number;
    activeCount: number;
    lastCreated?: string | null;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  category: 'integration' | 'content' | 'agent' | 'milestone';
}

interface OnboardingState {
  isOnboarding: boolean;
  isInitialized: boolean;
  onboardingDismissed: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  progress: OnboardingProgress;
  userPreferences: UserPreferences;
  integrationStatus: IntegrationStatus;
  achievements: Achievement[];
  isLoading: boolean;
  error: string | null;
  showCelebration: boolean;
  celebrationMessage: string;
  showTips: boolean;
  currentTip?: string;
  startOnboarding: () => void;
  initializeFromServer: () => Promise<void>;
  completeOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  skipStep: () => void;
  completeStep: (stepId: string) => void;
  updateProgress: (progress: Partial<OnboardingProgress>) => void;
  setUseCase: (useCase: UseCase) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  updateIntegrationStatus: (integration: keyof IntegrationStatus, status: Partial<IntegrationStatus[keyof IntegrationStatus]>) => void;
  unlockAchievement: (achievementId: string) => void;
  showAchievement: (message: string) => void;
  hideCelebration: () => void;
  showNextTip: () => void;
  hideTips: () => void;
  dismissOnboarding: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const ONBOARDING_STORAGE_BASE_KEY = 'synapse-onboarding';
const ONBOARDING_GUEST_STORAGE_KEY = `${ONBOARDING_STORAGE_BASE_KEY}:guest`;

const getOnboardingStorageKey = (userId?: string | null) =>
  userId ? `${ONBOARDING_STORAGE_BASE_KEY}:${userId}` : ONBOARDING_GUEST_STORAGE_KEY;

const onboardingStorage: StateStorage = {
  getItem: (name) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      const key = getOnboardingStorageKey(userId);
      if (localStorage.getItem(name)) {
        localStorage.removeItem(name);
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[OnboardingStore] Unable to read onboarding state from storage', error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      const key = getOnboardingStorageKey(userId);
      localStorage.setItem(key, value);
      localStorage.removeItem(name);
      if (userId) {
        localStorage.removeItem(ONBOARDING_GUEST_STORAGE_KEY);
      }
    } catch (error) {
      console.error('[OnboardingStore] Unable to persist onboarding state', error);
    }
  },
  removeItem: (name) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      localStorage.removeItem(getOnboardingStorageKey(userId));
      localStorage.removeItem(name);
      if (userId) {
        localStorage.removeItem(ONBOARDING_GUEST_STORAGE_KEY);
      }
    } catch (error) {
      console.error('[OnboardingStore] Unable to remove onboarding state', error);
    }
  },
};

const createDefaultSteps = (): OnboardingStep[] => ([
  {
    id: 'welcome',
    title: 'Welcome to Synapse',
    description: 'See how Synapse will organize your knowledge base in minutes.',
    completed: false,
    optional: true,
    unlocked: true,
  },
  {
    id: 'telegram-bot-setup',
    title: 'Set Up Telegram Bot',
    description: 'Connect your personal Telegram bot for updates and quick capture.',
    completed: false,
    optional: true,
    unlocked: false,
  },
  {
    id: 'connect-data',
    title: 'Connect Your First Data Source',
    description: 'Bring in WhatsApp chats, Telegram channels, or documents.',
    completed: false,
    optional: false,
    unlocked: false,
  },
  {
    id: 'create-agent',
    title: 'Create Your AI Agent',
    description: 'Spin up your first automation to keep everything organized.',
    completed: false,
    optional: false,
    unlocked: false,
  },
  {
    id: 'explore-search',
    title: 'Discover Search',
    description: 'Learn how to query across all connected knowledge instantly.',
    completed: false,
    optional: false,
    unlocked: false,
  },
  {
    id: 'organize-content',
    title: 'Organize Your Knowledge',
    description: 'Create notes, tasks, and spaces to keep work in context.',
    completed: false,
    optional: true,
    unlocked: false,
  },
  {
    id: 'customize-settings',
    title: 'Customize Your Experience',
    description: 'Fine-tune notifications, summaries, and workspace preferences.',
    completed: false,
    optional: true,
    unlocked: false,
  },
]);

const createInitialPreferences = (): UserPreferences => ({
  notifications: {
    email: true,
    push: true,
    telegram: false,
    whatsapp: false,
  },
  integrations: {
    whatsapp: {
      enabled: false,
      autoCapture: true,
      keywords: ['highlight', 'todo', 'important'],
    },
    telegram: {
      enabled: false,
      chatLinked: false,
    },
    calendar: {
      enabled: false,
      syncEnabled: false,
    },
  },
  aiAgents: {
    autoAnalysis: true,
    scheduledReports: false,
  },
});

const createInitialIntegrationStatus = (): IntegrationStatus => ({
  whatsapp: {
    status: 'disconnected',
    lastSync: null,
    error: null,
  },
  telegram: {
    status: 'disconnected',
    botUsername: null,
    error: null,
  },
  documents: {
    uploadedCount: 0,
    lastUpload: null,
  },
  agents: {
    createdCount: 0,
    activeCount: 0,
    lastCreated: null,
  },
});

const createDefaultAchievements = (): Achievement[] => ([
  {
    id: 'first-connection',
    title: 'First Connection',
    description: 'Connected your first data source.',
    icon: 'spark',
    category: 'integration',
  },
  {
    id: 'agent-creator',
    title: 'Agent Creator',
    description: 'Created your first AI automation.',
    icon: 'robot',
    category: 'agent',
  },
  {
    id: 'search-explorer',
    title: 'Search Explorer',
    description: 'Ran your first intelligent search.',
    icon: 'search',
    category: 'milestone',
  },
  {
    id: 'content-organizer',
    title: 'Content Organizer',
    description: 'Captured or organized knowledge inside Synapse.',
    icon: 'notebook',
    category: 'content',
  },
  {
    id: 'onboarding-complete',
    title: 'Onboarding Champion',
    description: 'Completed the onboarding journey.',
    icon: 'trophy',
    category: 'milestone',
  },
]);

const createInitialProgress = (totalSteps: number): OnboardingProgress => ({
  currentStep: 0,
  totalSteps,
  completedSteps: [],
  skippedSteps: [],
  timeSpent: 0,
});

const deriveCompletedSteps = (steps: OnboardingStep[]): string[] =>
  steps.filter((step) => step.completed).map((step) => step.id);

const normalizeStepUnlocks = (steps: OnboardingStep[], skippedSteps: string[] = []): OnboardingStep[] => {
  let prerequisitesMet = true;

  return steps.map((step, index) => {
    const unlocked = index === 0 ? true : prerequisitesMet;

    const isSkipped = skippedSteps.includes(step.id);

    if (!step.optional && !step.completed) {
      // Required steps block progression unless explicitly skipped
      prerequisitesMet = isSkipped;
    } else if (step.optional && (step.completed || isSkipped)) {
      // Optional steps that are completed or skipped don't block progression
      prerequisitesMet = true;
    }

    return {
      ...step,
      unlocked,
    };
  });
};

const findNextUnlockedIndex = (
  steps: OnboardingStep[],
  fromIndex: number,
  direction: 1 | -1,
): number => {
  if (steps.length === 0) {
    return 0;
  }

  let index = fromIndex;
  while (true) {
    index += direction;
    if (index < 0 || index >= steps.length) {
      return fromIndex;
    }
    if (steps[index].unlocked) {
      return index;
    }
  }
};

const determineCurrentStep = (steps: OnboardingStep[], fallback = 0): number => {
  const firstAvailable = steps.findIndex((step) => step.unlocked && !step.completed);
  if (firstAvailable >= 0) {
    return firstAvailable;
  }
  return steps.length > 0 ? steps.length - 1 : fallback;
};

const unique = (list: string[]): string[] => Array.from(new Set(list));

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isOnboarding: false,
      isInitialized: false,
      onboardingDismissed: false,
      currentStep: 0,
      steps: createDefaultSteps(),
      progress: createInitialProgress(createDefaultSteps().length),
      userPreferences: createInitialPreferences(),
      integrationStatus: createInitialIntegrationStatus(),
      achievements: createDefaultAchievements(),
      isLoading: false,
      error: null,
      showCelebration: false,
      celebrationMessage: '',
      showTips: true,
      currentTip: undefined,

      startOnboarding: () => {
        const state = get();
        const defaultSteps = createDefaultSteps();
        // Merge with cached data to preserve completion status
        const mergedSteps = defaultSteps.map((defaultStep) => {
          const cachedStep = state.steps.find((s) => s.id === defaultStep.id);
          return {
            ...defaultStep,
            completed: cachedStep?.completed ?? defaultStep.completed,
          };
        });
        const steps = normalizeStepUnlocks(mergedSteps, state.progress.skippedSteps);
        const progress = {
          ...state.progress,
          totalSteps: steps.length,
        };

        set({
          isOnboarding: true,
          isInitialized: false,
          onboardingDismissed: state.onboardingDismissed, // Preserve dismissed state
          steps,
          progress,
          currentStep: determineCurrentStep(steps),
          error: null,
        });
      },

      initializeFromServer: async () => {
        const state = get();
        if (state.isLoading) {
          return;
        }

        set({ isLoading: true, error: null });

        const [botStatusResult, whatsappStatusResult, documentsResult, agentsResult] = await Promise.allSettled([
          telegramBotService.getBotStatus(),
          whatsappService.getConnectionStatus(),
          documentService.getDocuments({ page: 1, limit: 1 }),
          agentService.getAgents(),
        ]);

        const nextIntegrationStatus = createInitialIntegrationStatus();
        // Merge cached steps with fresh defaults to get updated optional flags
        const defaultSteps = createDefaultSteps();
        const mergedSteps = defaultSteps.map((defaultStep) => {
          const cachedStep = state.steps.find((s) => s.id === defaultStep.id);
          return {
            ...defaultStep,
            completed: cachedStep?.completed ?? defaultStep.completed,
          };
        });
        const updatedSteps = normalizeStepUnlocks(mergedSteps, get().progress.skippedSteps);
        const errors: string[] = [];

        // Telegram status
        if (botStatusResult.status === 'fulfilled') {
          const botStatus = botStatusResult.value;
          if (botStatus) {
            const isConnected = botStatus.hasBot && botStatus.isActive;
            nextIntegrationStatus.telegram = {
              status: isConnected ? 'connected' : botStatus.hasBot ? 'connecting' : 'disconnected',
              botUsername: botStatus.botUsername || null,
              error: null,
            };

            if (isConnected) {
              const stepIndex = updatedSteps.findIndex((step) => step.id === 'telegram-bot-setup');
              if (stepIndex >= 0) {
                updatedSteps[stepIndex] = {
                  ...updatedSteps[stepIndex],
                  completed: true,
                };
              }
            }
          }
        } else {
          const statusCode = (botStatusResult.reason as any)?.response?.status;
          if (statusCode && statusCode !== 404) {
            errors.push('Unable to verify Telegram connection.');
          }
        }

        // WhatsApp status
        if (whatsappStatusResult.status === 'fulfilled') {
          const waStatus = whatsappStatusResult.value;
          if (waStatus) {
            nextIntegrationStatus.whatsapp = {
              status: waStatus.connected ? 'connected' : 'disconnected',
              lastSync: waStatus.lastHeartbeat ? new Date(waStatus.lastHeartbeat).toISOString() : null,
              error: null,
            };
          }
        } else {
          const statusCode = (whatsappStatusResult.reason as any)?.response?.status;
          if (statusCode && statusCode !== 404) {
            errors.push('Unable to load WhatsApp status.');
          }
        }

        // Documents
        if (documentsResult.status === 'fulfilled') {
          const { documents, pagination } = documentsResult.value;
          const totalDocuments = pagination?.total ?? documents?.length ?? 0;
          nextIntegrationStatus.documents = {
            uploadedCount: totalDocuments,
            lastUpload: documents && documents.length > 0 ? documents[0].createdAt ?? null : null,
          };

          if (totalDocuments > 0) {
            const stepIndex = updatedSteps.findIndex((step) => step.id === 'connect-data');
            if (stepIndex >= 0) {
              updatedSteps[stepIndex] = {
                ...updatedSteps[stepIndex],
                completed: true,
              };
            }
          }
        } else {
          const statusCode = (documentsResult.reason as any)?.response?.status;
          if (statusCode && statusCode !== 404) {
            errors.push('Unable to retrieve documents.');
          }
        }

        // Agents
        if (agentsResult.status === 'fulfilled') {
          const agents = agentsResult.value || [];
          nextIntegrationStatus.agents = {
            createdCount: agents.length,
            activeCount: agents.filter((agent) => agent.isActive).length,
            lastCreated: agents.length > 0 ? agents[0].createdAt : null,
          };

          if (agents.length > 0) {
            const stepIndex = updatedSteps.findIndex((step) => step.id === 'create-agent');
            if (stepIndex >= 0) {
              updatedSteps[stepIndex] = {
                ...updatedSteps[stepIndex],
                completed: true,
              };
            }
          }
        } else {
          const statusCode = (agentsResult.reason as any)?.response?.status;
          if (statusCode && statusCode !== 404) {
            errors.push('Unable to load agent information.');
          }
        }

        const normalizedSteps = normalizeStepUnlocks(updatedSteps, get().progress.skippedSteps);
        const completedSteps = deriveCompletedSteps(normalizedSteps);
        const currentStep = determineCurrentStep(normalizedSteps, get().currentStep);

        set({
          integrationStatus: nextIntegrationStatus,
          steps: normalizedSteps,
          progress: {
            ...get().progress,
            totalSteps: normalizedSteps.length,
            completedSteps,
            currentStep,
          },
          currentStep,
          isInitialized: true,
          isLoading: false,
          error: errors.length > 0 ? errors.join(' ') : null,
        });
      },

      completeOnboarding: () => {
        const state = get();
        const completionTime = new Date();

        set({
          isOnboarding: false,
          onboardingDismissed: true,
          progress: {
            ...state.progress,
            completedTime: completionTime,
          },
          showCelebration: true,
          celebrationMessage: 'You are all set. Explore Synapse and start capturing knowledge.',
        });

        get().unlockAchievement('onboarding-complete');
      },

      nextStep: () => {
        const state = get();
        const next = findNextUnlockedIndex(state.steps, state.currentStep, 1);
        if (next !== state.currentStep) {
          set({
            currentStep: next,
            progress: {
              ...state.progress,
              currentStep: next,
            },
          });
        }
      },

      prevStep: () => {
        const state = get();
        const previous = findNextUnlockedIndex(state.steps, state.currentStep, -1);
        if (previous !== state.currentStep) {
          set({
            currentStep: previous,
            progress: {
              ...state.progress,
              currentStep: previous,
            },
          });
        }
      },

      goToStep: (stepIndex: number) => {
        const state = get();
        const clampedIndex = Math.max(0, Math.min(stepIndex, state.steps.length - 1));
        if (!state.steps[clampedIndex]?.unlocked) {
          return;
        }
        set({
          currentStep: clampedIndex,
          progress: {
            ...state.progress,
            currentStep: clampedIndex,
          },
        });
      },

      skipStep: () => {
        const state = get();
        const currentStepId = state.steps[state.currentStep]?.id;
        if (!currentStepId) {
          return;
        }

        const newSkippedSteps = unique([...state.progress.skippedSteps, currentStepId]);

        // Re-normalize steps with updated skipped list to unlock next steps
        const normalizedSteps = normalizeStepUnlocks(state.steps, newSkippedSteps);

        set({
          steps: normalizedSteps,
          progress: {
            ...state.progress,
            skippedSteps: newSkippedSteps,
          },
        });

        get().nextStep();
      },

      completeStep: (stepId: string) => {
        const state = get();
        const updatedSteps = state.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                completed: true,
              }
            : step,
        );

        const normalizedSteps = normalizeStepUnlocks(updatedSteps, state.progress.skippedSteps);
        const completedSteps = deriveCompletedSteps(normalizedSteps);

        set({
          steps: normalizedSteps,
          progress: {
            ...state.progress,
            completedSteps: unique([...state.progress.completedSteps, ...completedSteps]),
          },
        });
      },

      updateProgress: (progress) => {
        const state = get();
        set({
          progress: {
            ...state.progress,
            ...progress,
          },
        });
      },

      setUseCase: (useCase) => {
        const state = get();
        set({
          progress: {
            ...state.progress,
            selectedUseCase: useCase,
          },
        });
      },

      updateUserPreferences: (preferences) => {
        const state = get();
        set({
          userPreferences: {
            ...state.userPreferences,
            ...preferences,
          },
        });
      },

      updateIntegrationStatus: (integration, status) => {
        const state = get();
        set({
          integrationStatus: {
            ...state.integrationStatus,
            [integration]: {
              ...state.integrationStatus[integration],
              ...status,
            },
          },
        });
      },

      unlockAchievement: (achievementId) => {
        const state = get();
        const alreadyUnlocked = state.achievements.find((achievement) => achievement.id === achievementId)?.unlockedAt;
        if (alreadyUnlocked) {
          return;
        }

        const updatedAchievements = state.achievements.map((achievement) =>
          achievement.id === achievementId
            ? {
                ...achievement,
                unlockedAt: new Date().toISOString(),
              }
            : achievement,
        );

        const unlocked = updatedAchievements.find((achievement) => achievement.id === achievementId);
        set({
          achievements: updatedAchievements,
          showCelebration: true,
          celebrationMessage: unlocked ? `${unlocked.title} unlocked. Nice work!` : 'Great progress!',
        });
      },

      showAchievement: (message: string) => {
        set({
          showCelebration: true,
          celebrationMessage: message,
        });
      },

      hideCelebration: () => {
        set({
          showCelebration: false,
          celebrationMessage: '',
        });
      },

      showNextTip: () => {
        const tips = [
          'Press Ctrl+K to open global search from anywhere.',
          'Invite Synapse to your workflows by forwarding important messages.',
          'Create focused spaces to keep related documents, chats, and tasks together.',
          'Automate weekly summaries with a dedicated agent.',
          'Connect your calendar to capture meeting notes automatically.',
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        set({
          currentTip: randomTip,
          showTips: true,
        });
      },

      hideTips: () => {
        set({
          showTips: false,
          currentTip: undefined,
        });
      },

      dismissOnboarding: () => {
        set({
          isOnboarding: false,
          onboardingDismissed: true,
        });
      },

      reset: () => {
        const steps = normalizeStepUnlocks(createDefaultSteps(), []);
        set({
          isOnboarding: false,
          isInitialized: false,
          currentStep: 0,
          steps,
          progress: createInitialProgress(steps.length),
          userPreferences: createInitialPreferences(),
          onboardingDismissed: false,
          integrationStatus: createInitialIntegrationStatus(),
          achievements: createDefaultAchievements(),
          isLoading: false,
          error: null,
          showCelebration: false,
          celebrationMessage: '',
          showTips: true,
          currentTip: undefined,
        });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: ONBOARDING_STORAGE_BASE_KEY,
      storage: onboardingStorage,
      partialize: (state) => ({
        progress: state.progress,
        userPreferences: state.userPreferences,
        integrationStatus: state.integrationStatus,
        achievements: state.achievements,
        isOnboarding: state.isOnboarding,
        currentStep: state.currentStep,
        steps: state.steps,
        onboardingDismissed: state.onboardingDismissed,
      }),
    },
  ),
);

type OnboardingStorePersistApi = {
  rehydrate: () => Promise<void>;
};

const triggerOnboardingRehydrate = () => {
  const persistApi = (useOnboardingStore as typeof useOnboardingStore & { persist?: OnboardingStorePersistApi }).persist;
  if (persistApi?.rehydrate) {
    void persistApi.rehydrate();
  }
};

const hasPersistedOnboardingState = (userId: string | null): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem(getOnboardingStorageKey(userId)) !== null;
  } catch (error) {
    console.error('[OnboardingStore] Unable to verify persisted onboarding state', error);
    return false;
  }
};

useAuthStore.subscribe(
  (state) => ({ userId: state.user?.id ?? null, hydrated: state.hasHydrated }),
  (current, previous) => {
    if (!current.hydrated) {
      return;
    }

    const hasStoredState = hasPersistedOnboardingState(current.userId);
    const isSameUser = previous?.hydrated && current.userId === previous.userId;

    if (hasStoredState) {
      triggerOnboardingRehydrate();
      return;
    }

    if (!isSameUser) {
      useOnboardingStore.getState().reset();
    }
  },
);


