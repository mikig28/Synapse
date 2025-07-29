/**
 * Mobile Components Index
 * Exports all mobile-optimized components and utilities
 */

// Mobile Component Exports
// Centralized exports for all mobile-optimized components

// Navigation Components
export { MobileNavigation } from './MobileNavigation';

// Touch-Optimized Components  
export { BottomSheet } from './BottomSheet';

// Accessibility Components
export { MobileAccessibility } from './MobileAccessibility';

// Agent Components
export { MobileAgentCard } from '../MobileAgentCard';

// Dashboard Components
export { MobileMetricsDashboard } from './MobileMetricsDashboard';
export { MobileAgentDetails } from './MobileAgentDetails';

// Wizard Components
export { MobileWizard } from './MobileWizard';

// Mobile hooks and utilities
export * from '../../hooks/useTouchGestures';
export * from '../../utils/mobileOptimizations';

// Types
export type { TouchPoint, SwipeGesture, LongPressGesture, PullToRefreshGesture } from '../../hooks/useTouchGestures';

// Re-export commonly used mobile detection
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
};

// Mobile breakpoints
export const MOBILE_BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// Touch target sizes (WCAG compliant)
export const TOUCH_TARGET_SIZES = {
  small: 36,
  medium: 44,
  large: 56,
} as const;