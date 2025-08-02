# Synapse Onboarding System - Frontend Design Specification

## Project Overview

The Synapse onboarding system is designed to guide new users through a seamless, progressive introduction to the platform's core features: personal AI assistants, data capture automation, and intelligent workflow creation. The system emphasizes user confidence building through gradual feature introduction and immediate value demonstration.

## Technology Stack Integration

### Current Stack Compatibility
- **Framework**: React 18 + TypeScript (existing)
- **Styling**: Tailwind CSS + shadcn/ui components (existing)
- **Animations**: Framer Motion with enhanced onboarding sequences
- **State Management**: Zustand with new onboarding store
- **Routing**: React Router with onboarding flow integration
- **Build Tool**: Vite with code splitting for onboarding modules

### New Dependencies Required
```json
{
  "react-confetti": "^6.1.0",
  "react-use-gesture": "^9.1.3",
  "lottie-react": "^2.4.0"
}
```

## Design System Foundation

### Extended Color Palette for Onboarding

```typescript
// Add to existing designSystem.ts
export const onboardingColors = {
  welcome: {
    primary: 'rgb(99, 102, 241)', // indigo-500 - welcoming
    gradient: 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(139, 92, 246) 100%)',
    bg: 'rgb(238, 242, 255)', // indigo-50
    text: 'rgb(54, 47, 120)', // indigo-900
  },
  success: {
    primary: 'rgb(34, 197, 94)', // green-500 - achievement
    gradient: 'linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(59, 130, 246) 100%)',
    bg: 'rgb(240, 253, 244)', // green-50
    text: 'rgb(20, 83, 45)', // green-900
  },
  progress: {
    incomplete: 'rgb(229, 231, 235)', // gray-200
    complete: 'rgb(99, 102, 241)', // indigo-500
    current: 'rgb(59, 130, 246)', // blue-500
  },
  celebration: {
    confetti: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'],
    glow: 'rgba(99, 102, 241, 0.4)',
  }
} as const;
```

### Typography Enhancements

```typescript
// Add to existing typography in designSystem.ts
export const onboardingTypography = {
  welcome: {
    fontSize: '2.5rem', // 40px
    lineHeight: '3rem', // 48px
    fontWeight: '800',
    letterSpacing: '-0.025em',
  },
  stepTitle: {
    fontSize: '1.75rem', // 28px
    lineHeight: '2.25rem', // 36px
    fontWeight: '700',
    letterSpacing: '-0.025em',
  },
  progressLabel: {
    fontSize: '0.75rem', // 12px
    lineHeight: '1rem', // 16px
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
} as const;
```

## Component Architecture

### Core Onboarding Components

#### 1. OnboardingContainer
**Purpose**: Main wrapper for the entire onboarding flow with progress persistence

```typescript
interface OnboardingContainerProps {
  children: React.ReactNode;
  onComplete: () => void;
  onSkip?: () => void;
  allowSkip?: boolean;
  className?: string;
}

// Features:
// - Progress tracking across sessions
// - Auto-save at each step
// - Skip/Exit functionality
// - Responsive layout management
// - Accessibility focus management
```

#### 2. OnboardingWizard
**Purpose**: Step management and navigation controller

```typescript
interface OnboardingWizardProps {
  steps: OnboardingStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  allowBackNavigation?: boolean;
  showProgress?: boolean;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
  isOptional?: boolean;
  minTimeToSpend?: number; // seconds
  validationRules?: ValidationRule[];
  dependencies?: string[]; // step IDs that must be completed first
}
```

#### 3. Enhanced Progress Components

```typescript
// OnboardingProgress.tsx
interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep: number;
  completedSteps: string[];
  variant?: 'linear' | 'circular' | 'minimal';
  showLabels?: boolean;
  showEstimatedTime?: boolean;
}

// OnboardingProgressRing.tsx - for mobile
interface OnboardingProgressRingProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  animated?: boolean;
}
```

#### 4. Interactive Step Components

```typescript
// WelcomeStep.tsx
interface WelcomeStepProps extends BaseStepProps {
  userName?: string;
  showPersonalization?: boolean;
  highlightFeatures?: string[];
}

// DataConnectionStep.tsx
interface DataConnectionStepProps extends BaseStepProps {
  availableConnections: DataConnection[];
  onConnectionSelect: (connections: string[]) => void;
  minConnections?: number;
  showSkipOption?: boolean;
}

// AgentCreationStep.tsx
interface AgentCreationStepProps extends BaseStepProps {
  templates: AgentTemplate[];
  onAgentCreate: (config: AgentConfig) => void;
  showAdvancedOptions?: boolean;
}

// FirstTaskStep.tsx
interface FirstTaskStepProps extends BaseStepProps {
  suggestedTasks: TaskSuggestion[];
  onTaskCreate: (task: TaskConfig) => void;
  showTaskTemplates?: boolean;
}
```

#### 5. Celebration Components

```typescript
// OnboardingCelebration.tsx
interface OnboardingCelebrationProps {
  type: 'step-complete' | 'milestone' | 'onboarding-complete';
  title: string;
  message: string;
  achievements?: Achievement[];
  nextSteps?: NextStep[];
  autoAdvance?: boolean;
  duration?: number;
}

// SuccessAnimation.tsx
interface SuccessAnimationProps {
  variant: 'confetti' | 'checkmark' | 'progress-burst' | 'agent-cheer';
  trigger: boolean;
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
}
```

### Advanced Interactive Components

#### 6. Feature Discovery Components

```typescript
// FeatureSpotlight.tsx
interface FeatureSpotlightProps {
  target: string; // selector or ref
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  onNext: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  highlightColor?: string;
}

// InteractiveTour.tsx
interface InteractiveTourProps {
  tourSteps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  allowSkip?: boolean;
  maskPadding?: number;
}

interface TourStep {
  target: string;
  title: string;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  actionRequired?: boolean;
  waitForAction?: boolean;
}
```

#### 7. Gamification Components

```typescript
// OnboardingBadges.tsx
interface OnboardingBadgesProps {
  badges: Badge[];
  newlyEarned?: string[];
  showProgress?: boolean;
  variant?: 'grid' | 'horizontal' | 'stack';
}

// ProgressMilestones.tsx
interface ProgressMilestonesProps {
  milestones: Milestone[];
  currentProgress: number;
  showRewards?: boolean;
  animated?: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  threshold: number; // percentage
  reward?: Reward;
  icon: React.ReactNode;
}
```

## State Management Architecture

### Zustand Onboarding Store

```typescript
// src/store/onboardingStore.ts
interface OnboardingState {
  // Core State
  isOnboardingActive: boolean;
  currentStep: number;
  completedSteps: string[];
  userPreferences: UserPreferences;
  onboardingProgress: OnboardingProgress;
  
  // Feature Flags
  hasSeenWelcome: boolean;
  hasConnectedData: boolean;
  hasCreatedAgent: boolean;
  hasCompletedFirstTask: boolean;
  hasExploredDashboard: boolean;
  
  // User Journey Data
  selectedDataSources: string[];
  createdAgents: string[];
  completedTasks: string[];
  viewedTours: string[];
  earnedBadges: string[];
  
  // Preferences
  preferredOnboardingPace: 'guided' | 'explorer' | 'minimal';
  skipOptionalSteps: boolean;
  showDetailedExplanations: boolean;
  enableAnimations: boolean;
  
  // Actions
  startOnboarding: () => void;
  completeStep: (stepId: string) => void;
  skipStep: (stepId: string) => void;
  updateProgress: (progress: Partial<OnboardingProgress>) => void;
  setUserPreferences: (preferences: Partial<UserPreferences>) => void;
  markFeatureDiscovered: (feature: string) => void;
  addDataSource: (source: string) => void;
  removeDataSource: (source: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  
  // Persistence Actions
  saveProgress: () => Promise<void>;
  loadProgress: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

interface OnboardingProgress {
  overallProgress: number; // 0-100
  stepProgress: Record<string, number>; // per-step progress
  timeSpent: Record<string, number>; // seconds per step
  startedAt: Date;
  lastActiveAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining: number; // minutes
}
```

### Persistence Strategy

```typescript
// src/store/onboardingPersistence.ts
export class OnboardingPersistenceManager {
  private static readonly STORAGE_KEY = 'synapse-onboarding';
  private static readonly BACKUP_INTERVAL = 30000; // 30 seconds
  
  static async saveToLocalStorage(state: OnboardingState): Promise<void> {
    try {
      const serializedState = JSON.stringify({
        ...state,
        lastSaved: new Date().toISOString(),
      });
      localStorage.setItem(this.STORAGE_KEY, serializedState);
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  }
  
  static async saveToBackend(state: OnboardingState): Promise<void> {
    try {
      await fetch('/api/user/onboarding-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (error) {
      console.warn('Failed to sync onboarding progress to backend:', error);
      // Fallback to local storage only
    }
  }
  
  static async loadFromStorage(): Promise<Partial<OnboardingState> | null> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
      return null;
    }
  }
}
```

## Routing Strategy

### Onboarding Flow Integration

```typescript
// src/routes/OnboardingRoutes.tsx
const OnboardingRoutes: React.FC = () => {
  const { isOnboardingActive, currentStep } = useOnboardingStore();
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isOnboardingActive) {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingContainer />}>
        <Route index element={<Navigate to="/onboarding/welcome" />} />
        <Route path="welcome" element={<WelcomeStep />} />
        <Route path="personalize" element={<PersonalizationStep />} />
        <Route path="connect-data" element={<DataConnectionStep />} />
        <Route path="create-agent" element={<AgentCreationStep />} />
        <Route path="first-task" element={<FirstTaskStep />} />
        <Route path="explore" element={<ExplorationStep />} />
        <Route path="complete" element={<CompletionStep />} />
      </Route>
    </Routes>
  );
};

// Add to main App.tsx routes
<Route 
  path="/onboarding/*" 
  element={
    isAuthenticated ? <OnboardingRoutes /> : <Navigate to="/login" />
  } 
/>
```

### Route Guards and Redirects

```typescript
// src/hooks/useOnboardingRouteGuard.ts
export const useOnboardingRouteGuard = () => {
  const { isAuthenticated } = useAuthStore();
  const { 
    isOnboardingActive, 
    hasCompletedOnboarding,
    currentStep 
  } = useOnboardingStore();
  
  const shouldRedirectToOnboarding = useMemo(() => {
    return isAuthenticated && 
           !hasCompletedOnboarding && 
           !isOnboardingActive;
  }, [isAuthenticated, hasCompletedOnboarding, isOnboardingActive]);
  
  const getOnboardingRedirectPath = useCallback(() => {
    if (currentStep === 0) return '/onboarding/welcome';
    // Map currentStep to appropriate route
    const stepRoutes = [
      '/onboarding/welcome',
      '/onboarding/personalize', 
      '/onboarding/connect-data',
      '/onboarding/create-agent',
      '/onboarding/first-task',
      '/onboarding/explore',
      '/onboarding/complete'
    ];
    return stepRoutes[currentStep] || '/onboarding/welcome';
  }, [currentStep]);
  
  return {
    shouldRedirectToOnboarding,
    getOnboardingRedirectPath,
  };
};
```

## Animation Strategy

### Framer Motion Animation Variants

```typescript
// src/utils/onboardingAnimations.ts
export const onboardingAnimations = {
  // Page Transitions
  stepTransition: {
    initial: { opacity: 0, x: 50, scale: 0.95 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // Custom easing
      }
    },
    exit: { 
      opacity: 0, 
      x: -50, 
      scale: 0.95,
      transition: { duration: 0.4 }
    }
  },
  
  // Progress Animations
  progressFill: {
    initial: { width: 0 },
    animate: (progress: number) => ({
      width: `${progress}%`,
      transition: {
        duration: 1.2,
        ease: [0.4, 0, 0.2, 1],
      }
    })
  },
  
  // Success Celebrations
  successPulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },
  
  // Card Reveals
  cardReveal: {
    initial: { opacity: 0, y: 20, rotateX: -15 },
    animate: (delay: number = 0) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        delay,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    })
  },
  
  // Interactive Hover States
  interactiveHover: {
    rest: { scale: 1, y: 0 },
    hover: { 
      scale: 1.02, 
      y: -2,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    },
    tap: { scale: 0.98 }
  },
  
  // Feature Spotlight
  spotlight: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
      }
    },
    exit: {
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.2,
      }
    }
  }
};

// Orchestrated Sequences
export const onboardingSequences = {
  welcomeSequence: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.2,
          delayChildren: 0.3,
        }
      }
    },
    item: {
      initial: { opacity: 0, y: 30 },
      animate: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
        }
      }
    }
  },
  
  stepCompletionSequence: {
    container: {
      animate: {
        transition: {
          staggerChildren: 0.1,
        }
      }
    },
    checkmark: {
      initial: { scale: 0, rotate: -180 },
      animate: {
        scale: 1,
        rotate: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20,
        }
      }
    },
    text: {
      initial: { opacity: 0, x: -20 },
      animate: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.5,
          ease: "easeOut",
        }
      }
    }
  }
};
```

### Performance-Optimized Animation Components

```typescript
// src/components/onboarding/animations/OptimizedAnimations.tsx
export const AnimatedStepContainer: React.FC<{
  children: React.ReactNode;
  stepIndex: number;
}> = ({ children, stepIndex }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), stepIndex * 100);
    return () => clearTimeout(timer);
  }, [stepIndex]);
  
  return (
    <motion.div
      initial="initial"
      animate={isVisible ? "animate" : "initial"}
      variants={onboardingAnimations.stepTransition}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

// Reduced motion support
export const useReducedMotionAnimations = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  
  return useMemo(() => {
    if (prefersReducedMotion) {
      return {
        stepTransition: {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: { duration: 0.2 } },
          exit: { opacity: 0, transition: { duration: 0.2 } }
        }
      };
    }
    return onboardingAnimations;
  }, [prefersReducedMotion]);
};
```

## Responsive Design Strategy

### Mobile-First Breakpoint System

```typescript
// src/utils/onboardingResponsive.ts
export const onboardingBreakpoints = {
  mobile: '320px',
  mobileLg: '480px',
  tablet: '768px',
  tabletLg: '1024px',
  desktop: '1280px',
  desktopLg: '1536px',
} as const;

export const onboardingLayouts = {
  mobile: {
    container: 'px-4 py-6',
    stepContent: 'space-y-6',
    navigation: 'fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur',
    progress: 'px-4 py-2',
  },
  tablet: {
    container: 'px-8 py-8 max-w-2xl mx-auto',
    stepContent: 'space-y-8',
    navigation: 'mt-8 flex justify-between',
    progress: 'px-8 py-4',
  },
  desktop: {
    container: 'px-12 py-12 max-w-4xl mx-auto',
    stepContent: 'space-y-12 grid grid-cols-1 lg:grid-cols-2 gap-12',
    navigation: 'mt-12 flex justify-between',
    progress: 'px-12 py-6',
  },
} as const;
```

### Adaptive Component Behaviors

```typescript
// src/components/onboarding/AdaptiveOnboardingWrapper.tsx
export const AdaptiveOnboardingWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const isMobile = useMediaQuery(`(max-width: ${onboardingBreakpoints.tablet})`);
  const isTablet = useMediaQuery(
    `(min-width: ${onboardingBreakpoints.tablet}) and (max-width: ${onboardingBreakpoints.desktop})`
  );
  
  const layoutConfig = useMemo(() => {
    if (isMobile) return onboardingLayouts.mobile;
    if (isTablet) return onboardingLayouts.tablet;
    return onboardingLayouts.desktop;
  }, [isMobile, isTablet]);
  
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background to-muted/20",
      layoutConfig.container
    )}>
      {children}
    </div>
  );
};

// Mobile-specific navigation
export const MobileOnboardingNavigation: React.FC<{
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
}> = ({ onNext, onBack, canGoBack, canGoNext, isLastStep }) => {
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex gap-3">
        {canGoBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button 
          onClick={onNext} 
          disabled={!canGoNext}
          className="flex-1"
        >
          {isLastStep ? 'Complete' : 'Next'}
        </Button>
      </div>
    </motion.div>
  );
};
```

## Integration Points

### Service Integration Architecture

```typescript
// src/services/onboardingIntegrationService.ts
export class OnboardingIntegrationService {
  
  // WhatsApp Integration
  static async setupWhatsAppConnection(phoneNumber: string): Promise<ConnectionResult> {
    try {
      const response = await fetch('/api/whatsapp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      
      return await response.json();
    } catch (error) {
      throw new OnboardingIntegrationError('WhatsApp setup failed', error);
    }
  }
  
  // Telegram Integration
  static async connectTelegramBot(botToken: string): Promise<ConnectionResult> {
    try {
      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken }),
      });
      
      return await response.json();
    } catch (error) {
      throw new OnboardingIntegrationError('Telegram connection failed', error);
    }
  }
  
  // Agent Creation
  static async createOnboardingAgent(config: AgentConfig): Promise<Agent> {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          isOnboardingAgent: true,
          autoStart: true,
        }),
      });
      
      return await response.json();
    } catch (error) {
      throw new OnboardingIntegrationError('Agent creation failed', error);
    }
  }
  
  // Calendar Integration
  static async connectCalendar(provider: 'google' | 'outlook'): Promise<ConnectionResult> {
    try {
      const authUrl = await this.getCalendarAuthUrl(provider);
      window.open(authUrl, 'calendar-auth', 'width=500,height=600');
      
      return new Promise((resolve, reject) => {
        const checkAuth = setInterval(async () => {
          try {
            const status = await this.checkCalendarAuthStatus();
            if (status.connected) {
              clearInterval(checkAuth);
              resolve(status);
            }
          } catch (error) {
            clearInterval(checkAuth);
            reject(error);
          }
        }, 1000);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkAuth);
          reject(new Error('Calendar authentication timeout'));
        }, 300000);
      });
    } catch (error) {
      throw new OnboardingIntegrationError('Calendar connection failed', error);
    }
  }
}

// Integration Status Monitoring
export class OnboardingIntegrationMonitor {
  private static eventListeners: Map<string, Function[]> = new Map();
  
  static onIntegrationStatusChange(
    integrationType: string, 
    callback: (status: IntegrationStatus) => void
  ): () => void {
    if (!this.eventListeners.has(integrationType)) {
      this.eventListeners.set(integrationType, []);
    }
    
    this.eventListeners.get(integrationType)!.push(callback);
    
    // Return cleanup function
    return () => {
      const listeners = this.eventListeners.get(integrationType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }
  
  static notifyStatusChange(integrationType: string, status: IntegrationStatus): void {
    const listeners = this.eventListeners.get(integrationType);
    if (listeners) {
      listeners.forEach(callback => callback(status));
    }
  }
}
```

### Real-time Integration Status Components

```typescript
// src/components/onboarding/IntegrationStatusCard.tsx
interface IntegrationStatusCardProps {
  integration: IntegrationType;
  status: 'pending' | 'connecting' | 'connected' | 'failed';
  onRetry?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
}

export const IntegrationStatusCard: React.FC<IntegrationStatusCardProps> = ({
  integration,
  status,
  onRetry,
  onSkip,
  showProgress
}) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (status === 'connecting' && showProgress) {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [status, showProgress]);
  
  return (
    <motion.div
      layout
      className="p-6 bg-card rounded-lg border"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-4">
        <IntegrationIcon integration={integration} status={status} />
        <div className="flex-1">
          <h3 className="font-semibold">{integration.displayName}</h3>
          <p className="text-sm text-muted-foreground">
            {getStatusMessage(status)}
          </p>
          
          {status === 'connecting' && showProgress && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Connecting...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
        
        <StatusIndicator status={status} />
      </div>
      
      {status === 'failed' && (
        <div className="mt-4 flex gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip for now
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};
```

## Error Handling & Recovery

### Graceful Error Boundaries

```typescript
// src/components/onboarding/OnboardingErrorBoundary.tsx
interface OnboardingErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class OnboardingErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  OnboardingErrorBoundaryState
> {
  private maxRetries = 3;
  
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<OnboardingErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Onboarding Error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error);
    
    // Report to error tracking service
    this.reportError(error, errorInfo);
  }
  
  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Integration with error tracking service
    try {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          context: 'onboarding',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  };
  
  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
      });
    }
  };
  
  private handleSkipStep = () => {
    const onboardingStore = useOnboardingStore.getState();
    onboardingStore.skipStep(onboardingStore.currentStep.toString());
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <OnboardingErrorFallback
          error={this.state.error}
          canRetry={this.state.retryCount < this.maxRetries}
          onRetry={this.handleRetry}
          onSkipStep={this.handleSkipStep}
          onResetOnboarding={() => {
            const onboardingStore = useOnboardingStore.getState();
            onboardingStore.resetOnboarding();
          }}
        />
      );
    }
    
    return this.props.children;
  }
}

// Error Fallback Component
const OnboardingErrorFallback: React.FC<{
  error: Error | null;
  canRetry: boolean;
  onRetry: () => void;
  onSkipStep: () => void;
  onResetOnboarding: () => void;
}> = ({ error, canRetry, onRetry, onSkipStep, onResetOnboarding }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg border p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        
        <h2 className="text-xl font-semibold">Oops! Something went wrong</h2>
        
        <p className="text-muted-foreground">
          {error?.message || 'An unexpected error occurred during onboarding.'}
        </p>
        
        <div className="space-y-2">
          {canRetry && (
            <Button onClick={onRetry} className="w-full">
              Try Again
            </Button>
          )}
          
          <Button variant="outline" onClick={onSkipStep} className="w-full">
            Skip This Step
          </Button>
          
          <Button variant="ghost" onClick={onResetOnboarding} className="w-full">
            Restart Onboarding
          </Button>
        </div>
        
        <details className="text-left">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            Technical Details
          </summary>
          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
            {error?.stack || 'No stack trace available'}
          </pre>
        </details>
      </div>
    </div>
  );
};
```

### Network Error Handling

```typescript
// src/hooks/useOnboardingNetworkHandler.ts
export const useOnboardingNetworkHandler = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionStable, setConnectionStable] = useState(true);
  const [retryQueue, setRetryQueue] = useState<Array<() => Promise<any>>>([]);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStable(true);
      // Process retry queue
      processRetryQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStable(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const addToRetryQueue = useCallback((operation: () => Promise<any>) => {
    setRetryQueue(prev => [...prev, operation]);
  }, []);
  
  const processRetryQueue = useCallback(async () => {
    while (retryQueue.length > 0 && isOnline) {
      const operation = retryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.warn('Retry operation failed:', error);
          // Re-add to queue if it's a network error
          if (error instanceof TypeError && error.message.includes('fetch')) {
            addToRetryQueue(operation);
          }
        }
      }
    }
  }, [retryQueue, isOnline, addToRetryQueue]);
  
  const withNetworkRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        if (!isOnline) {
          addToRetryQueue(() => operation());
          throw new Error('Device is offline. Operation queued for retry.');
        }
        
        return await operation();
      } catch (error) {
        attempts++;
        
        if (attempts >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }, [isOnline, addToRetryQueue]);
  
  return {
    isOnline,
    connectionStable,
    withNetworkRetry,
    retryQueueLength: retryQueue.length,
  };
};
```

## Accessibility Implementation

### ARIA Labels and Semantic Structure

```typescript
// src/components/onboarding/accessible/AccessibleOnboardingWrapper.tsx
export const AccessibleOnboardingWrapper: React.FC<{
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}> = ({ children, currentStep, totalSteps, stepTitle }) => {
  const announceRef = useRef<HTMLDivElement>(null);
  
  // Announce step changes to screen readers
  useEffect(() => {
    if (announceRef.current) {
      announceRef.current.textContent = 
        `Step ${currentStep + 1} of ${totalSteps}: ${stepTitle}`;
    }
  }, [currentStep, totalSteps, stepTitle]);
  
  return (
    <div
      role="region"
      aria-label="Onboarding wizard"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Screen reader announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      />
      
      {/* Skip link for keyboard users */}
      <a
        href="#onboarding-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Skip to main content
      </a>
      
      <main
        id="onboarding-main-content"
        className="focus:outline-none"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
};

// Accessible Progress Indicator
export const AccessibleProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
}> = ({ currentStep, totalSteps, completedSteps }) => {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  
  return (
    <div
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuetext={`Step ${currentStep + 1} of ${totalSteps}`}
      aria-label="Onboarding progress"
      className="relative"
    >
      <div className="w-full bg-muted rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full",
              index <= currentStep ? "bg-primary" : "bg-muted",
              completedSteps.includes(index.toString()) && "bg-success"
            )}
            aria-label={`Step ${index + 1}${
              index <= currentStep ? ' completed' : ' pending'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
```

### Keyboard Navigation System

```typescript
// src/hooks/useOnboardingKeyboardNavigation.ts
export const useOnboardingKeyboardNavigation = (
  onNext: () => void,
  onBack: () => void,
  canGoNext: boolean,
  canGoBack: boolean
) => {
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowRight':
            event.preventDefault();
            if (canGoNext) onNext();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            if (canGoBack) onBack();
            break;
        }
      }
      
      // Tab navigation enhancement
      if (event.key === 'Tab') {
        // Ensure focus stays within onboarding flow
        const focusableElements = document.querySelectorAll(
          '[role="region"][aria-label="Onboarding wizard"] button, [role="region"][aria-label="Onboarding wizard"] input, [role="region"][aria-label="Onboarding wizard"] [tabindex="0"]'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
      
      // Escape key handling
      if (event.key === 'Escape') {
        // Show exit confirmation
        const exitButton = document.querySelector('[data-onboarding-exit]') as HTMLElement;
        exitButton?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onBack, canGoNext, canGoBack]);
  
  const focusFirstInteractiveElement = useCallback(() => {
    const firstInteractive = document.querySelector(
      '[role="region"][aria-label="Onboarding wizard"] button:not([disabled]), [role="region"][aria-label="Onboarding wizard"] input:not([disabled])'
    ) as HTMLElement;
    
    firstInteractive?.focus();
  }, []);
  
  return {
    focusedElement,
    setFocusedElement,
    focusFirstInteractiveElement,
  };
};

// Focus management component
export const OnboardingFocusManager: React.FC<{
  children: React.ReactNode;
  stepChanged: boolean;
}> = ({ children, stepChanged }) => {
  const focusManagerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (stepChanged && focusManagerRef.current) {
      // Focus the step container when step changes
      focusManagerRef.current.focus();
      
      // Then focus the first interactive element
      setTimeout(() => {
        const firstInteractive = focusManagerRef.current?.querySelector(
          'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
        ) as HTMLElement;
        
        firstInteractive?.focus();
      }, 100);
    }
  }, [stepChanged]);
  
  return (
    <div
      ref={focusManagerRef}
      tabIndex={-1}
      className="focus:outline-none"
      aria-live="polite"
    >
      {children}
    </div>
  );
};
```

## Performance Optimization

### Code Splitting Strategy

```typescript
// src/components/onboarding/LazyOnboardingComponents.tsx
export const LazyOnboardingComponents = {
  // Core components - loaded immediately
  OnboardingContainer: React.lazy(() => import('./OnboardingContainer')),
  OnboardingWizard: React.lazy(() => import('./OnboardingWizard')),
  
  // Step components - loaded on demand
  WelcomeStep: React.lazy(() => import('./steps/WelcomeStep')),
  PersonalizationStep: React.lazy(() => import('./steps/PersonalizationStep')),
  DataConnectionStep: React.lazy(() => import('./steps/DataConnectionStep')),
  AgentCreationStep: React.lazy(() => import('./steps/AgentCreationStep')),
  FirstTaskStep: React.lazy(() => import('./steps/FirstTaskStep')),
  ExplorationStep: React.lazy(() => import('./steps/ExplorationStep')),
  CompletionStep: React.lazy(() => import('./steps/CompletionStep')),
  
  // Heavy interactive components - loaded when needed
  InteractiveTour: React.lazy(() => import('./interactive/InteractiveTour')),
  FeatureSpotlight: React.lazy(() => import('./interactive/FeatureSpotlight')),
  CelebrationEffects: React.lazy(() => import('./animations/CelebrationEffects')),
  
  // Integration components - loaded per feature
  WhatsAppIntegration: React.lazy(() => import('./integrations/WhatsAppIntegration')),
  TelegramIntegration: React.lazy(() => import('./integrations/TelegramIntegration')),
  CalendarIntegration: React.lazy(() => import('./integrations/CalendarIntegration')),
};

// Preloading strategy
export const useOnboardingPreloader = () => {
  const [preloadedComponents, setPreloadedComponents] = useState<Set<string>>(new Set());
  
  const preloadComponent = useCallback(async (componentName: keyof typeof LazyOnboardingComponents) => {
    if (preloadedComponents.has(componentName)) return;
    
    try {
      await LazyOnboardingComponents[componentName];
      setPreloadedComponents(prev => new Set([...prev, componentName]));
    } catch (error) {
      console.warn(`Failed to preload component ${componentName}:`, error);
    }
  }, [preloadedComponents]);
  
  const preloadUpcomingSteps = useCallback((currentStep: number) => {
    const stepComponents = [
      'WelcomeStep',
      'PersonalizationStep', 
      'DataConnectionStep',
      'AgentCreationStep',
      'FirstTaskStep',
      'ExplorationStep',
      'CompletionStep'
    ];
    
    // Preload next 2 steps
    for (let i = currentStep + 1; i <= Math.min(currentStep + 2, stepComponents.length - 1); i++) {
      preloadComponent(stepComponents[i] as keyof typeof LazyOnboardingComponents);
    }
  }, [preloadComponent]);
  
  return {
    preloadComponent,
    preloadUpcomingSteps,
    preloadedComponents: Array.from(preloadedComponents),
  };
};
```

### Data Fetching Optimization

```typescript
// src/hooks/useOnboardingDataOptimization.ts
export const useOnboardingDataOptimization = () => {
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());
  const [isLoading, setIsLoading] = useState<Set<string>>(new Set());
  
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  const fetchWithCache = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    // Check cache first
    if (!forceRefresh && cache.has(key)) {
      const cached = cache.get(key)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Prevent duplicate requests
    if (isLoading.has(key)) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!isLoading.has(key)) {
            clearInterval(checkInterval);
            if (cache.has(key)) {
              resolve(cache.get(key)!.data);
            } else {
              reject(new Error('Failed to fetch data'));
            }
          }
        }, 100);
      });
    }
    
    setIsLoading(prev => new Set([...prev, key]));
    
    try {
      const data = await fetcher();
      setCache(prev => new Map([...prev, [key, { data, timestamp: Date.now() }]]));
      return data;
    } finally {
      setIsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [cache, isLoading]);
  
  // Prefetch data for upcoming steps
  const prefetchStepData = useCallback(async (stepId: string) => {
    const prefetchMap = {
      'data-connection': () => fetchAvailableIntegrations(),
      'agent-creation': () => fetchAgentTemplates(),
      'first-task': () => fetchTaskSuggestions(),
    };
    
    const prefetcher = prefetchMap[stepId as keyof typeof prefetchMap];
    if (prefetcher) {
      await fetchWithCache(stepId, prefetcher);
    }
  }, [fetchWithCache]);
  
  return {
    fetchWithCache,
    prefetchStepData,
    clearCache: () => setCache(new Map()),
    cacheSize: cache.size,
  };
};
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Core Infrastructure**
   - [ ] Set up onboarding store with Zustand
   - [ ] Create base components (OnboardingContainer, OnboardingWizard)
   - [ ] Implement routing structure
   - [ ] Add error boundaries and basic error handling

2. **Basic Step Components**
   - [ ] WelcomeStep with personalization
   - [ ] Basic progress tracking
   - [ ] Mobile-responsive layouts
   - [ ] Accessibility foundation (ARIA, keyboard navigation)

### Phase 2: Core Flow (Week 3-4)
1. **Essential Steps**
   - [ ] PersonalizationStep (preferences, goals)
   - [ ] DataConnectionStep (WhatsApp, Telegram, Calendar)
   - [ ] AgentCreationStep (templates, simple configuration)
   - [ ] FirstTaskStep (guided task creation)

2. **Integration Framework**
   - [ ] Service integration architecture
   - [ ] Real-time status monitoring
   - [ ] Error handling and retry mechanisms
   - [ ] Progress persistence (local + backend)

### Phase 3: Enhanced Experience (Week 5-6)
1. **Advanced Features**
   - [ ] InteractiveTour with feature spotlights
   - [ ] Gamification elements (badges, milestones)
   - [ ] Celebration animations and effects
   - [ ] ExplorationStep (dashboard tour)

2. **Performance Optimization**
   - [ ] Code splitting implementation
   - [ ] Data caching and prefetching
   - [ ] Animation performance optimization
   - [ ] Bundle size optimization

### Phase 4: Polish & Testing (Week 7-8)
1. **Quality Assurance**
   - [ ] Comprehensive accessibility testing
   - [ ] Cross-device/browser testing
   - [ ] Performance benchmarking
   - [ ] Error scenario testing

2. **Analytics & Monitoring**
   - [ ] Onboarding completion tracking
   - [ ] Drop-off point analysis
   - [ ] Performance monitoring
   - [ ] User feedback collection

## Testing Strategy

### Component Testing Framework

```typescript
// src/components/onboarding/__tests__/OnboardingWizard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OnboardingWizard } from '../OnboardingWizard';
import { useOnboardingStore } from '@/store/onboardingStore';

// Mock the store
jest.mock('@/store/onboardingStore');

const mockSteps = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Welcome to Synapse',
    component: () => <div>Welcome Step</div>,
  },
  {
    id: 'setup',
    title: 'Setup',
    description: 'Setup your account',
    component: () => <div>Setup Step</div>,
  },
];

const renderOnboardingWizard = (props = {}) => {
  return render(
    <BrowserRouter>
      <OnboardingWizard
        steps={mockSteps}
        currentStep={0}
        onStepChange={jest.fn()}
        onComplete={jest.fn()}
        {...props}
      />
    </BrowserRouter>
  );
};

describe('OnboardingWizard', () => {
  beforeEach(() => {
    (useOnboardingStore as jest.Mock).mockReturnValue({
      currentStep: 0,
      completedSteps: [],
      completeStep: jest.fn(),
    });
  });

  it('renders the current step correctly', () => {
    renderOnboardingWizard();
    expect(screen.getByText('Welcome Step')).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    renderOnboardingWizard({ showProgress: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles step navigation', async () => {
    const onStepChange = jest.fn();
    renderOnboardingWizard({ onStepChange });
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(onStepChange).toHaveBeenCalledWith(1);
    });
  });

  it('calls onComplete when reaching the last step', async () => {
    const onComplete = jest.fn();
    renderOnboardingWizard({ 
      currentStep: 1, 
      onComplete 
    });
    
    const completeButton = screen.getByRole('button', { name: /complete/i });
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('supports keyboard navigation', () => {
    renderOnboardingWizard();
    
    fireEvent.keyDown(document, { key: 'ArrowRight', ctrlKey: true });
    // Test keyboard navigation behavior
  });
});
```

### Integration Testing

```typescript
// src/components/onboarding/__tests__/integration/OnboardingFlow.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingFlow } from '../OnboardingFlow';
import { onboardingIntegrationService } from '@/services/onboardingIntegrationService';

// Mock external services
jest.mock('@/services/onboardingIntegrationService');

describe('Onboarding Flow Integration', () => {
  it('completes full onboarding journey', async () => {
    const user = userEvent.setup();
    
    render(<OnboardingFlow />);
    
    // Step 1: Welcome
    expect(screen.getByText(/welcome to synapse/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /get started/i }));
    
    // Step 2: Personalization
    await user.type(screen.getByLabelText(/your name/i), 'John Doe');
    await user.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 3: Data Connection
    await user.click(screen.getByText(/whatsapp/i));
    await waitFor(() => {
      expect(onboardingIntegrationService.setupWhatsAppConnection).toHaveBeenCalled();
    });
    
    // Continue through remaining steps...
    // Test complete flow with realistic user interactions
  });

  it('handles integration failures gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock integration failure
    (onboardingIntegrationService.setupWhatsAppConnection as jest.Mock)
      .mockRejectedValue(new Error('Connection failed'));
    
    render(<OnboardingFlow />);
    
    // Navigate to data connection step
    // ... navigation steps ...
    
    await user.click(screen.getByText(/whatsapp/i));
    
    // Should show retry option
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

## Analytics & Feedback Integration

### Onboarding Analytics

```typescript
// src/services/onboardingAnalytics.ts
export class OnboardingAnalytics {
  private static events: AnalyticsEvent[] = [];
  
  static trackStepStart(stepId: string, stepIndex: number): void {
    this.track('onboarding_step_start', {
      step_id: stepId,
      step_index: stepIndex,
      timestamp: Date.now(),
    });
  }
  
  static trackStepComplete(stepId: string, timeSpent: number): void {
    this.track('onboarding_step_complete', {
      step_id: stepId,
      time_spent_seconds: timeSpent,
      timestamp: Date.now(),
    });
  }
  
  static trackStepSkipped(stepId: string, reason?: string): void {
    this.track('onboarding_step_skipped', {
      step_id: stepId,
      skip_reason: reason,
      timestamp: Date.now(),
    });
  }
  
  static trackIntegrationAttempt(
    integrationType: string, 
    success: boolean, 
    errorMessage?: string
  ): void {
    this.track('onboarding_integration_attempt', {
      integration_type: integrationType,
      success,
      error_message: errorMessage,
      timestamp: Date.now(),
    });
  }
  
  static trackOnboardingComplete(
    totalTimeSpent: number, 
    stepsCompleted: number,
    stepsSkipped: number
  ): void {
    this.track('onboarding_complete', {
      total_time_spent_seconds: totalTimeSpent,
      steps_completed: stepsCompleted,
      steps_skipped: stepsSkipped,
      completion_rate: stepsCompleted / (stepsCompleted + stepsSkipped),
      timestamp: Date.now(),
    });
  }
  
  private static track(eventName: string, properties: Record<string, any>): void {
    const event: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        device_type: this.getDeviceType(),
      },
    };
    
    this.events.push(event);
    
    // Send to analytics service
    this.sendToAnalytics(event);
  }
  
  private static getDeviceType(): string {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  private static async sendToAnalytics(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
      // Store in local queue for retry
      this.queueForRetry(event);
    }
  }
}
```

This comprehensive frontend design specification provides a complete blueprint for implementing the Synapse onboarding system. The architecture is designed to be modular, accessible, performant, and maintainable while integrating seamlessly with your existing codebase patterns and design system.

The specification includes detailed TypeScript interfaces, component hierarchies, state management strategies, and implementation guidelines that your development team can follow to build a world-class onboarding experience that guides users effectively through the platform's capabilities.