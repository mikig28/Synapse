/**
 * Comprehensive Animation System Exports
 * Enhanced with polished micro-interactions and premium user experience
 */

// Core Animation Context and Providers
export { AnimationProvider, useAnimationContext, useHapticFeedback, useAnimationConfig } from '@/contexts/AnimationContext';

// Enhanced Animation Components
export { 
  EnhancedAnimatedCard, 
  MagneticButton, 
  AnimatedMetric, 
  ProgressiveImage 
} from './EnhancedAnimatedComponents';
export {
  SwipeableCard,
  MorphingIconButton,
  LiquidProgress,
  FloatingTooltip,
  CelebrationEffect
} from './PremiumInteractions';

// Page Transitions and Navigation
export {
  PageTransitionProvider,
  usePageTransition,
  EnhancedPageWrapper,
  EnhancedBreadcrumbs,
  ViewTransitionWrapper,
  RoutePreloader
} from './EnhancedPageTransitions';

// Form Components
export { AnimatedInput, AnimatedTextarea, AnimatedForm } from './AnimatedFormComponents';

// Data Visualization
export {
  AnimatedCounter,
  AnimatedProgressRing,
  AnimatedBarChart,
  AnimatedMetricCard,
  AnimatedStatsGrid
} from './AnimatedDataVisualization';

// Navigation and UI Components
export {
  AnimatedModal,
  BottomSheet,
  Toast,
  ToastContainer,
  AnimatedDropdown,
  MobileNavDrawer
} from './NavigationAnimations';

// Legacy Animation Components (Phase 1-3)
export { AnimatedButton, FloatingActionButton, ToggleButton, ProgressButton } from './AnimatedButton';
export { 
  AnimatedStatusIndicator, 
  ConnectionStatus, 
  ProgressStatus, 
  MultiStepStatus, 
  StatusBadge 
} from './AnimatedStatusIndicator';
export { 
  Skeleton, 
  TextSkeleton, 
  CardSkeleton, 
  AgentCardSkeleton,
  LoadingSpinner, 
  LoadingOverlay, 
  SkeletonGrid, 
  MorphingLoader 
} from './LoadingAnimations';
export { 
  PageTransitionManager, 
  withPageTransition, 
  useBreadcrumbTransition 
} from './PageTransitionManager';

// Legacy Animation Components (Phase 1-3)
export * from './AnimatedDashboardCard';
export * from './AnimatedNavigation';
export * from './HeroSection';
export * from './PageTransition';
export * from './RippleButton';
export * from './FloatingInput';
export * from './ConfettiButton';
export * from './MorphingCard';
export * from './CommandPalette';

// Animation Utilities and Hooks
export * from '@/utils/animations';
export * from '@/hooks/useAnimations';
export * from '@/hooks/useDataAnimations';
export * from '@/hooks/useAccessibility'; 