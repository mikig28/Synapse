/**
 * Accessibility Hooks
 * Hooks for managing accessibility features and reduced motion preferences
 */

import { useEffect, useState, useCallback } from 'react';
import { animationConfig, getAnimationConfig } from '@/utils/animations';

/**
 * Hook for managing reduced motion preference
 */
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

/**
 * Hook for managing animation preferences
 */
export const useAnimationPreferences = () => {
  const prefersReducedMotion = useReducedMotion();
  const [animationScale, setAnimationScale] = useState(1);
  const [enableAnimations, setEnableAnimations] = useState(true);

  const config = getAnimationConfig({
    reducedMotion: prefersReducedMotion,
  });

  const toggleAnimations = useCallback(() => {
    setEnableAnimations(prev => !prev);
  }, []);

  const setAnimationIntensity = useCallback((scale: number) => {
    setAnimationScale(Math.max(0, Math.min(2, scale)));
  }, []);

  return {
    prefersReducedMotion,
    animationScale,
    enableAnimations,
    config,
    toggleAnimations,
    setAnimationIntensity,
  };
};

/**
 * Hook for managing focus management
 */
export const useFocusManagement = () => {
  const [focusVisible, setFocusVisible] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return {
    focusVisible,
    isKeyboardUser,
  };
};

/**
 * Hook for screen reader announcements
 */
export const useScreenReader = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);

    // Create temporary element for screen reader
    const element = document.createElement('div');
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', 'true');
    element.className = 'sr-only';
    element.textContent = message;

    document.body.appendChild(element);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(element);
      setAnnouncements(prev => prev.filter(msg => msg !== message));
    }, 1000);
  }, []);

  return {
    announce,
    announcements,
  };
};

/**
 * Hook for color contrast preferences
 */
export const useColorContrast = () => {
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return {
    highContrast,
  };
};

/**
 * Hook for managing ARIA live regions
 */
export const useAriaLive = () => {
  const [liveRegion, setLiveRegion] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    let region = document.getElementById('aria-live-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'aria-live-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    setLiveRegion(region);

    return () => {
      if (region && region.parentNode) {
        region.parentNode.removeChild(region);
      }
    };
  }, []);

  const announce = useCallback((message: string) => {
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = '';
        }
      }, 1000);
    }
  }, [liveRegion]);

  return { announce };
};

/**
 * Hook for comprehensive accessibility features
 */
export const useAccessibility = () => {
  const { prefersReducedMotion, config } = useAnimationPreferences();
  const { focusVisible, isKeyboardUser } = useFocusManagement();
  const { announce } = useScreenReader();
  const { highContrast } = useColorContrast();

  return {
    prefersReducedMotion,
    config,
    focusVisible,
    isKeyboardUser,
    announce,
    highContrast,
  };
};

// Default export for the main accessibility hook
export default useAccessibility;