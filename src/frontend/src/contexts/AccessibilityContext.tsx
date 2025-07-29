/**
 * Accessibility Context Provider
 * Comprehensive WCAG 2.1 AA compliance system for managing accessibility features
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';

// Comprehensive accessibility settings interface
export interface AccessibilitySettings {
  // Visual Settings
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: number;
  colorBlindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  focusIndicators: 'standard' | 'enhanced' | 'high-visibility';
  
  // Screen Reader Settings
  screenReaderOptimized: boolean;
  announceActions: boolean;
  verboseDescriptions: boolean;
  liveRegionsEnabled: boolean;
  
  // Keyboard Navigation
  keyboardNavigationEnabled: boolean;
  skipLinksEnabled: boolean;
  tabOrderOptimized: boolean;
  keyboardShortcuts: boolean;
  
  // Motor Accessibility
  largerClickTargets: boolean;
  stickyFocus: boolean;
  dwellTime: number;
  touchGesturesEnabled: boolean;
  
  // Cognitive Accessibility
  simplifiedInterface: boolean;
  readingMode: boolean;
  autoplayDisabled: boolean;
  timeoutExtensions: boolean;
  
  // Audio/Visual
  captionsEnabled: boolean;
  audioDescriptions: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
}

// ARIA live region priorities
export type AriaLivePriority = 'off' | 'polite' | 'assertive';

// Focus management utilities
export interface FocusManagement {
  trapFocus: (container: HTMLElement) => () => void;
  restoreFocus: (element?: HTMLElement) => void;
  setFocusToFirst: (container: HTMLElement) => boolean;
  setFocusToLast: (container: HTMLElement) => boolean;
  getNextFocusable: (current: HTMLElement, container?: HTMLElement) => HTMLElement | null;
  getPreviousFocusable: (current: HTMLElement, container?: HTMLElement) => HTMLElement | null;
}

// Keyboard navigation context
export interface KeyboardNavigationContext {
  currentFocusedElement: HTMLElement | null;
  focusHistory: HTMLElement[];
  skipLinkTargets: Map<string, HTMLElement>;
  registerSkipLink: (id: string, element: HTMLElement) => void;
  unregisterSkipLink: (id: string) => void;
  activateSkipLink: (id: string) => void;
}

// Screen reader announcement system
export interface ScreenReaderSystem {
  announce: (message: string, priority?: AriaLivePriority, delay?: number) => void;
  announceRoute: (routeName: string, description?: string) => void;
  announceStatus: (status: string, context?: string) => void;
  announceError: (error: string, context?: string) => void;
  announceSuccess: (message: string, context?: string) => void;
  clearAnnouncements: () => void;
}

// Accessibility context interface
export interface AccessibilityContextType {
  // Settings
  settings: AccessibilitySettings;
  updateSettings: (partial: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  
  // Detection
  isScreenReaderActive: boolean;
  isKeyboardUser: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  
  // Systems
  screenReader: ScreenReaderSystem;
  focusManagement: FocusManagement;
  keyboardNavigation: KeyboardNavigationContext;
  
  // Utilities
  getContrastRatio: (color1: string, color2: string) => number;
  validateColorContrast: (foreground: string, background: string, isLargeText?: boolean) => boolean;
  generateSkipLink: (targetId: string, label: string) => React.ReactElement;
  
  // Testing
  runAccessibilityCheck: () => Promise<AccessibilityAuditResult[]>;
  validateFocusOrder: (container: HTMLElement) => FocusOrderResult[];
}

// Audit result interfaces
export interface AccessibilityAuditResult {
  type: 'error' | 'warning' | 'info';
  rule: string;
  element?: HTMLElement;
  message: string;
  suggestion?: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

export interface FocusOrderResult {
  element: HTMLElement;
  tabIndex: number;
  isAccessible: boolean;
  hasLabel: boolean;
  issues: string[];
}

// Default accessibility settings
const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 16,
  colorBlindMode: 'none',
  focusIndicators: 'standard',
  screenReaderOptimized: false,
  announceActions: true,
  verboseDescriptions: false,
  liveRegionsEnabled: true,
  keyboardNavigationEnabled: true,
  skipLinksEnabled: true,
  tabOrderOptimized: true,
  keyboardShortcuts: true,
  largerClickTargets: false,
  stickyFocus: false,
  dwellTime: 1000,
  touchGesturesEnabled: true,
  simplifiedInterface: false,
  readingMode: false,
  autoplayDisabled: false,
  timeoutExtensions: false,
  captionsEnabled: false,
  audioDescriptions: false,
  soundEnabled: true,
  hapticFeedback: true,
};

// Create the context
const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

// Focusable element selector
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'details',
  'summary',
  'iframe',
  'object',
  'embed',
  'area[href]',
  'audio[controls]',
  'video[controls]'
].join(', ');

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [currentFocusedElement, setCurrentFocusedElement] = useState<HTMLElement | null>(null);
  const [focusHistory, setFocusHistory] = useState<HTMLElement[]>([]);
  const [skipLinkTargets] = useState<Map<string, HTMLElement>>(new Map());
  
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveRegionRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  
  // Use our existing accessibility hooks
  const { prefersReducedMotion, prefersHighContrast } = useAccessibility();

  // Initialize accessibility detection
  useEffect(() => {
    detectScreenReader();
    detectKeyboardUsage();
    createLiveRegions();
    applyAccessibilitySettings();
    
    return () => {
      cleanupLiveRegions();
    };
  }, []);

  // Screen reader detection
  const detectScreenReader = useCallback(() => {
    const indicators = [
      // Check for screen reader APIs
      !!window.speechSynthesis,
      // Check for high contrast mode (often used with screen readers)
      window.matchMedia('(prefers-contrast: high)').matches,
      // Check for reduced motion (often enabled with screen readers)
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Check for specific screen reader user agents
      /NVDA|JAWS|VoiceOver|TalkBack|Orca/i.test(navigator.userAgent),
    ];
    
    const isActive = indicators.some(Boolean);
    setIsScreenReaderActive(isActive);
    
    if (isActive) {
      setSettings(prev => ({
        ...prev,
        screenReaderOptimized: true,
        announceActions: true,
        verboseDescriptions: true,
        keyboardNavigationEnabled: true,
      }));
    }
  }, []);

  // Keyboard usage detection
  const detectKeyboardUsage = useCallback(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        document.body.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      document.body.classList.remove('keyboard-user');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Create ARIA live regions
  const createLiveRegions = useCallback(() => {
    // Polite live region
    const politeRegion = document.createElement('div');
    politeRegion.id = 'aria-live-polite';
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    politeRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(politeRegion);
    liveRegionRef.current = politeRegion;

    // Assertive live region
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'aria-live-assertive';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    assertiveRegion.style.cssText = politeRegion.style.cssText;
    document.body.appendChild(assertiveRegion);
    assertiveRegionRef.current = assertiveRegion;
  }, []);

  // Cleanup live regions
  const cleanupLiveRegions = useCallback(() => {
    if (liveRegionRef.current?.parentNode) {
      liveRegionRef.current.parentNode.removeChild(liveRegionRef.current);
    }
    if (assertiveRegionRef.current?.parentNode) {
      assertiveRegionRef.current.parentNode.removeChild(assertiveRegionRef.current);
    }
  }, []);

  // Apply accessibility settings to DOM
  const applyAccessibilitySettings = useCallback(() => {
    const root = document.documentElement;
    
    // High contrast mode
    root.classList.toggle('high-contrast', settings.highContrast);
    
    // Reduced motion
    root.classList.toggle('reduce-motion', settings.reducedMotion || prefersReducedMotion);
    
    // Font size
    if (settings.fontSize !== 16) {
      root.style.fontSize = `${settings.fontSize}px`;
    } else {
      root.style.fontSize = '';
    }
    
    // Color blind mode
    root.setAttribute('data-colorblind-mode', settings.colorBlindMode);
    
    // Focus indicators
    root.setAttribute('data-focus-style', settings.focusIndicators);
    
    // Larger click targets
    root.classList.toggle('large-targets', settings.largerClickTargets);
    
    // Simplified interface
    root.classList.toggle('simplified-ui', settings.simplifiedInterface);
  }, [settings, prefersReducedMotion]);

  // Update settings
  const updateSettings = useCallback((partial: Partial<AccessibilitySettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...partial };
      localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // Reset settings
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem('accessibility-settings');
  }, []);

  // Screen reader announcement system
  const screenReader: ScreenReaderSystem = {
    announce: useCallback((message: string, priority: AriaLivePriority = 'polite', delay = 0) => {
      if (!settings.liveRegionsEnabled) return;
      
      const region = priority === 'assertive' ? assertiveRegionRef.current : liveRegionRef.current;
      if (!region) return;

      setTimeout(() => {
        region.textContent = message;
        
        // Clear after announcement to allow repeat messages
        setTimeout(() => {
          if (region.textContent === message) {
            region.textContent = '';
          }
        }, 1000);
      }, delay);
    }, [settings.liveRegionsEnabled]),

    announceRoute: useCallback((routeName: string, description?: string) => {
      const message = description 
        ? `Navigated to ${routeName}. ${description}` 
        : `Navigated to ${routeName}`;
      screenReader.announce(message, 'polite');
    }, []),

    announceStatus: useCallback((status: string, context?: string) => {
      const message = context ? `${context}: ${status}` : status;
      screenReader.announce(message, 'polite');
    }, []),

    announceError: useCallback((error: string, context?: string) => {
      const message = context ? `Error in ${context}: ${error}` : `Error: ${error}`;
      screenReader.announce(message, 'assertive');
    }, []),

    announceSuccess: useCallback((message: string, context?: string) => {
      const fullMessage = context ? `${context}: ${message}` : message;
      screenReader.announce(fullMessage, 'polite');
    }, []),

    clearAnnouncements: useCallback(() => {
      if (liveRegionRef.current) liveRegionRef.current.textContent = '';
      if (assertiveRegionRef.current) assertiveRegionRef.current.textContent = '';
    }, []),
  };

  // Focus management system
  const focusManagement: FocusManagement = {
    trapFocus: useCallback((container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(FOCUSABLE_ELEMENTS) as NodeListOf<HTMLElement>;
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              e.preventDefault();
              lastFocusable?.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault();
              firstFocusable?.focus();
            }
          }
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      firstFocusable?.focus();

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }, []),

    restoreFocus: useCallback((element?: HTMLElement) => {
      const target = element || lastFocusedElement.current;
      if (target && document.contains(target)) {
        target.focus();
      }
    }, []),

    setFocusToFirst: useCallback((container: HTMLElement) => {
      const firstFocusable = container.querySelector(FOCUSABLE_ELEMENTS) as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
        return true;
      }
      return false;
    }, []),

    setFocusToLast: useCallback((container: HTMLElement) => {
      const focusableElements = container.querySelectorAll(FOCUSABLE_ELEMENTS) as NodeListOf<HTMLElement>;
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (lastFocusable) {
        lastFocusable.focus();
        return true;
      }
      return false;
    }, []),

    getNextFocusable: useCallback((current: HTMLElement, container?: HTMLElement) => {
      const root = container || document.body;
      const focusableElements = Array.from(root.querySelectorAll(FOCUSABLE_ELEMENTS)) as HTMLElement[];
      const currentIndex = focusableElements.indexOf(current);
      return focusableElements[currentIndex + 1] || null;
    }, []),

    getPreviousFocusable: useCallback((current: HTMLElement, container?: HTMLElement) => {
      const root = container || document.body;
      const focusableElements = Array.from(root.querySelectorAll(FOCUSABLE_ELEMENTS)) as HTMLElement[];
      const currentIndex = focusableElements.indexOf(current);
      return focusableElements[currentIndex - 1] || null;
    }, []),
  };

  // Keyboard navigation context
  const keyboardNavigation: KeyboardNavigationContext = {
    currentFocusedElement,
    focusHistory,
    skipLinkTargets,
    
    registerSkipLink: useCallback((id: string, element: HTMLElement) => {
      skipLinkTargets.set(id, element);
    }, [skipLinkTargets]),
    
    unregisterSkipLink: useCallback((id: string) => {
      skipLinkTargets.delete(id);
    }, [skipLinkTargets]),
    
    activateSkipLink: useCallback((id: string) => {
      const target = skipLinkTargets.get(id);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, [skipLinkTargets]),
  };

  // Color contrast utilities
  const getContrastRatio = useCallback((color1: string, color2: string): number => {
    const getLuminance = (color: string): number => {
      // Convert color to RGB
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      
      // Calculate relative luminance
      const sRGB = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }, []);

  const validateColorContrast = useCallback((foreground: string, background: string, isLargeText = false): boolean => {
    const ratio = getContrastRatio(foreground, background);
    const requiredRatio = isLargeText ? 3 : 4.5; // WCAG AA standards
    return ratio >= requiredRatio;
  }, [getContrastRatio]);

  // Skip link generator
  const generateSkipLink = useCallback((targetId: string, label: string): React.ReactElement => {
    return React.createElement('a', {
      href: `#${targetId}`,
      className: 'skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        keyboardNavigation.activateSkipLink(targetId);
      },
      children: label,
    });
  }, [keyboardNavigation]);

  // Accessibility audit
  const runAccessibilityCheck = useCallback(async (): Promise<AccessibilityAuditResult[]> => {
    const results: AccessibilityAuditResult[] = [];
    
    // Check for missing alt text
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach(img => {
      results.push({
        type: 'error',
        rule: 'Images must have alt text',
        element: img as HTMLElement,
        message: 'Image is missing alt attribute',
        suggestion: 'Add descriptive alt text or alt="" for decorative images',
        wcagLevel: 'A',
      });
    });
    
    // Check for low contrast
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button');
    textElements.forEach(element => {
      const computed = getComputedStyle(element as HTMLElement);
      const color = computed.color;
      const backgroundColor = computed.backgroundColor;
      
      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const isAccessible = validateColorContrast(color, backgroundColor);
        if (!isAccessible) {
          results.push({
            type: 'error',
            rule: 'Text must have sufficient contrast',
            element: element as HTMLElement,
            message: 'Text does not meet WCAG AA contrast requirements',
            suggestion: 'Increase contrast between text and background colors',
            wcagLevel: 'AA',
          });
        }
      }
    });
    
    // Check for missing labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        results.push({
          type: 'error',
          rule: 'Form inputs must have labels',
          element: input as HTMLElement,
          message: 'Form input is missing a label',
          suggestion: 'Add a label element or aria-label attribute',
          wcagLevel: 'A',
        });
      }
    });
    
    return results;
  }, [validateColorContrast]);

  // Focus order validation
  const validateFocusOrder = useCallback((container: HTMLElement): FocusOrderResult[] => {
    const focusableElements = container.querySelectorAll(FOCUSABLE_ELEMENTS) as NodeListOf<HTMLElement>;
    
    return Array.from(focusableElements).map(element => {
      const tabIndex = element.tabIndex;
      const hasLabel = element.hasAttribute('aria-label') || 
                       element.hasAttribute('aria-labelledby') ||
                       element.textContent?.trim() ||
                       element.hasAttribute('title');
      
      const issues: string[] = [];
      
      if (tabIndex < 0 && element.getAttribute('tabindex') !== '-1') {
        issues.push('Element has negative tabindex but may still be focusable');
      }
      
      if (!hasLabel) {
        issues.push('Element lacks accessible name');
      }
      
      const rect = element.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        issues.push('Touch target too small (minimum 44x44px)');
      }
      
      return {
        element,
        tabIndex,
        isAccessible: issues.length === 0,
        hasLabel: !!hasLabel,
        issues,
      };
    });
  }, []);

  // Track focus changes
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target) {
        lastFocusedElement.current = target;
        setCurrentFocusedElement(target);
        setFocusHistory(prev => [...prev.slice(-9), target]); // Keep last 10 focused elements
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Apply settings when they change
  useEffect(() => {
    applyAccessibilitySettings();
  }, [applyAccessibilitySettings]);

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.warn('Failed to parse saved accessibility settings:', error);
      }
    }
  }, []);

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    resetSettings,
    isScreenReaderActive,
    isKeyboardUser,
    prefersReducedMotion,
    prefersHighContrast,
    screenReader,
    focusManagement,
    keyboardNavigation,
    getContrastRatio,
    validateColorContrast,
    generateSkipLink,
    runAccessibilityCheck,
    validateFocusOrder,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
      {/* Skip Links */}
      {settings.skipLinksEnabled && (
        <nav className="skip-links" aria-label="Skip links">
          <a 
            href="#main-content" 
            className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            onClick={(e) => {
              e.preventDefault();
              const main = document.getElementById('main-content');
              if (main) {
                main.focus();
                main.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Skip to main content
          </a>
          <a 
            href="#navigation" 
            className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-20 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary-foreground"
            onClick={(e) => {
              e.preventDefault();
              const nav = document.getElementById('navigation');
              if (nav) {
                nav.focus();
                nav.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Skip to navigation
          </a>
        </nav>
      )}
    </AccessibilityContext.Provider>
  );
};

// Hook to use accessibility context
export const useAccessibilityContext = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};

export default AccessibilityProvider;