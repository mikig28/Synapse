/**
 * Accessibility Components Index
 * Comprehensive WCAG 2.1 AA compliant accessibility system
 */

// Core Context and Providers
export { 
  AccessibilityProvider, 
  useAccessibilityContext,
  type AccessibilitySettings,
  type AccessibilityContextType,
  type AriaLivePriority,
  type FocusManagement,
  type KeyboardNavigationContext,
  type ScreenReaderSystem,
  type AccessibilityAuditResult,
  type FocusOrderResult
} from '@/contexts/AccessibilityContext';

// Screen Reader Components - Import first, then export
import {
  ScreenReaderOnly as ScreenReaderOnlyComponent,
  SkipLink as SkipLinkComponent,
  LiveRegion as LiveRegionComponent
} from './ScreenReaderOnlySimple';

export {
  ScreenReaderOnlyComponent as ScreenReaderOnly,
  SkipLinkComponent as SkipLink,
  LiveRegionComponent as LiveRegion
};

// Descriptive Text Components - Import first
import {
  DescriptiveText as DescriptiveTextComponent,
  ChartDescription as ChartDescriptionComponent,
  ImageDescription as ImageDescriptionComponent,
  ComplexUIDescription as ComplexUIDescriptionComponent,
  ProgressDescription as ProgressDescriptionComponent
} from './DescriptiveText';

export {
  DescriptiveTextComponent as DescriptiveText,
  ChartDescriptionComponent as ChartDescription,
  ImageDescriptionComponent as ImageDescription,
  ComplexUIDescriptionComponent as ComplexUIDescription,
  ProgressDescriptionComponent as ProgressDescription
};

// Keyboard Navigation Components - Import first
import {
  KeyboardNavigation as KeyboardNavigationComponent,
  FocusTrap as FocusTrapComponent,
  RovingTabindex as RovingTabindexComponent,
  type KeyboardShortcut,
  type FocusTrapOptions,
  type RovingTabindexConfig
} from './KeyboardNavigation';

export {
  KeyboardNavigationComponent as KeyboardNavigation,
  FocusTrapComponent as FocusTrap,
  RovingTabindexComponent as RovingTabindex,
  type KeyboardShortcut,
  type FocusTrapOptions,
  type RovingTabindexConfig
};

// Color Contrast and Visual Enhancements - Import first
import {
  ColorContrastEnhancer as ColorContrastEnhancerComponent,
  default as ColorContrastEnhancerDefault
} from './ColorContrastEnhancer';

export {
  ColorContrastEnhancerComponent as ColorContrastEnhancer,
  ColorContrastEnhancerDefault
};

// Testing and Validation - Import first
import {
  AccessibilityTesting as AccessibilityTestingComponent,
  type AccessibilityTestResult,
  type TestSuite,
  type AccessibilityTest,
  default as AccessibilityTestingDefault
} from './AccessibilityTesting';

export {
  AccessibilityTestingComponent as AccessibilityTesting,
  type AccessibilityTestResult,
  type TestSuite,
  type AccessibilityTest,
  AccessibilityTestingDefault
};

// Data Representations - Import first
import {
  DataTableView as DataTableViewComponent,
  ChartAlternative as ChartAlternativeComponent,
  default as DataTableViewDefault
} from './DataTableView';

export {
  DataTableViewComponent as DataTableView,
  ChartAlternativeComponent as ChartAlternative,
  DataTableViewDefault
};

// 3D Accessibility Alternatives - Import first
import {
  Accessible3DAlternatives as Accessible3DAlternativesComponent,
  default as Accessible3DAlternativesDefault
} from './Accessible3DAlternatives';

export {
  Accessible3DAlternativesComponent as Accessible3DAlternatives,
  Accessible3DAlternativesDefault
};

// Form Components (if they exist)
export {
  AccessibleForm,
  default as AccessibleFormDefault
} from './AccessibleForm';

// Screen Reader Support
export {
  ScreenReaderSupport,
  default as ScreenReaderSupportDefault
} from './ScreenReaderSupport';

// Utility functions from color contrast utils - Import first
import {
  colorContrastUtils as colorContrastUtilsObject,
  WCAG_RATIOS,
  parseColor,
  getContrastRatio,
  checkContrastCompliance,
  findAccessibleColor,
  generateAccessiblePalette,
  auditPageContrast,
  adjustColorLuminance,
  setCSSCustomProperties,
  isHighContrastMode,
  isReducedMotionPreferred,
  isDarkModePreferred,
  type RGBColor,
  type HSLColor,
  type ColorContrastResult,
  type ColorScheme,
  type ContrastAuditResult
} from '@/utils/colorContrastUtils';

export {
  colorContrastUtilsObject as colorContrastUtils,
  WCAG_RATIOS,
  parseColor,
  getContrastRatio,
  checkContrastCompliance,
  findAccessibleColor,
  generateAccessiblePalette,
  auditPageContrast,
  adjustColorLuminance,
  setCSSCustomProperties,
  isHighContrastMode,
  isReducedMotionPreferred,
  isDarkModePreferred,
  type RGBColor,
  type HSLColor,
  type ColorContrastResult,
  type ColorScheme,
  type ContrastAuditResult
};

// Animation Context Integration
export {
  AnimationProvider,
  useAnimationContext,
  useHapticFeedback,
  useAnimationConfig,
  type AnimationPreferences,
  type AnimationContextType
} from '@/contexts/AnimationContext';

// Accessibility hooks
export {
  useAccessibility,
  default as useAccessibilityDefault
} from '@/hooks/useAccessibility';

/**
 * Accessibility Component Collection
 * Pre-configured components for common accessibility patterns
 */
export const AccessibilityComponents = {
  // Screen Reader
  ScreenReaderOnly: ScreenReaderOnlyComponent,
  SkipLink: SkipLinkComponent,
  LiveRegion: LiveRegionComponent,
  
  // Descriptive Content
  DescriptiveText: DescriptiveTextComponent,
  ChartDescription: ChartDescriptionComponent,
  ImageDescription: ImageDescriptionComponent,
  ComplexUIDescription: ComplexUIDescriptionComponent,
  ProgressDescription: ProgressDescriptionComponent,
  
  // Navigation
  KeyboardNavigation: KeyboardNavigationComponent,
  FocusTrap: FocusTrapComponent,
  RovingTabindex: RovingTabindexComponent,
  
  // Visual Enhancement
  ColorContrastEnhancer: ColorContrastEnhancerComponent,
  
  // Testing
  AccessibilityTesting: AccessibilityTestingComponent,
  
  // Data Alternatives
  DataTableView: DataTableViewComponent,
  ChartAlternative: ChartAlternativeComponent,
  
  // 3D Alternatives
  Accessible3DAlternatives: Accessible3DAlternativesComponent,
};

/**
 * Accessibility Utility Functions
 * Common utility functions for accessibility features
 */
export const AccessibilityUtils = {
  // Color and contrast
  ...colorContrastUtilsObject,
  
  // Detection
  isHighContrastMode,
  isReducedMotionPreferred,
  isDarkModePreferred,
  
  // Common patterns
  generateSkipLinks: (targets: Array<{ id: string; label: string }>) => 
    targets.map(target => ({ 
      href: `#${target.id}`, 
      label: target.label 
    })),
    
  createAriaLabel: (primary: string, secondary?: string, status?: string) => {
    let label = primary;
    if (secondary) label += `, ${secondary}`;
    if (status) label += `. Status: ${status}`;
    return label;
  },
  
  formatForScreenReader: (text: string) => {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces to camelCase
      .replace(/([0-9]+)/g, ' $1 ') // Add spaces around numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  },
  
  announceWithDelay: (screenReader: ScreenReaderSystem, message: string, delay = 100) => {
    setTimeout(() => screenReader.announce(message, 'polite'), delay);
  },
};

/**
 * Pre-configured accessibility settings for common scenarios
 */
export const AccessibilityPresets = {
  // High contrast mode for users with visual impairments
  highContrast: {
    highContrast: true,
    focusIndicators: 'high-visibility' as const,
    reducedMotion: true,
    announceActions: true,
    verboseDescriptions: true,
  },
  
  // Screen reader optimized
  screenReader: {
    screenReaderOptimized: true,
    announceActions: true,
    verboseDescriptions: true,
    liveRegionsEnabled: true,
    keyboardNavigationEnabled: true,
    skipLinksEnabled: true,
    reducedMotion: true,
  },
  
  // Motor accessibility focused
  motorAccessibility: {
    largerClickTargets: true,
    stickyFocus: true,
    dwellTime: 1500,
    keyboardNavigationEnabled: true,
    skipLinksEnabled: true,
    hapticFeedback: true,
  },
  
  // Cognitive accessibility
  cognitive: {
    simplifiedInterface: true,
    readingMode: true,
    autoplayDisabled: true,
    timeoutExtensions: true,
    reducedMotion: true,
    announceActions: true,
  },
  
  // Performance optimized
  performance: {
    reducedMotion: true,
    autoplayDisabled: true,
    simplifiedInterface: true,
    hapticFeedback: false,
    soundEnabled: false,
  },
};

/**
 * WCAG 2.1 Compliance Checker
 * Quick validation functions for common accessibility requirements
 */
export const WCAGCompliance = {
  // Check if text meets contrast requirements
  checkTextContrast: (foreground: string, background: string, isLarge = false) => {
    const ratio = getContrastRatio(foreground, background);
    const required = isLarge ? WCAG_RATIOS.AA_LARGE : WCAG_RATIOS.AA_NORMAL;
    return {
      ratio,
      passes: ratio >= required,
      level: ratio >= (isLarge ? WCAG_RATIOS.AAA_LARGE : WCAG_RATIOS.AAA_NORMAL) ? 'AAA' : 
             ratio >= required ? 'AA' : 'FAIL'
    };
  },
  
  // Validate focus order
  validateFocusOrder: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [role="button"], a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const issues = [];
    let previousTabIndex = -1;
    
    focusableElements.forEach((element, index) => {
      const tabIndex = (element as HTMLElement).tabIndex;
      
      if (tabIndex > 0 && tabIndex <= previousTabIndex) {
        issues.push(`Element ${index + 1} has tab order issue`);
      }
      
      if (tabIndex > 0) {
        previousTabIndex = tabIndex;
      }
    });
    
    return issues;
  },
  
  // Check for required ARIA attributes
  validateARIA: (element: HTMLElement) => {
    const issues = [];
    const role = element.getAttribute('role');
    
    // Common ARIA validation rules
    if (role === 'button' && !element.hasAttribute('aria-label') && !element.textContent?.trim()) {
      issues.push('Button role requires accessible name');
    }
    
    if (role === 'dialog' && !element.hasAttribute('aria-labelledby') && !element.hasAttribute('aria-label')) {
      issues.push('Dialog requires accessible name');
    }
    
    if (element.hasAttribute('aria-expanded') && !element.hasAttribute('aria-controls')) {
      issues.push('aria-expanded should be paired with aria-controls');
    }
    
    return issues;
  },
  
  // Quick page audit
  auditPage: () => {
    const issues = [];
    
    // Check for missing alt text
    document.querySelectorAll('img:not([alt])').forEach((img, index) => {
      issues.push(`Image ${index + 1} missing alt text`);
    });
    
    // Check for missing form labels
    document.querySelectorAll('input, textarea, select').forEach((input, index) => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${input.id}"]`);
      if (!hasLabel) {
        issues.push(`Form input ${index + 1} missing label`);
      }
    });
    
    // Check heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > previousLevel + 1) {
        issues.push(`Heading ${index + 1} skips levels (h${previousLevel} to h${level})`);
      }
      previousLevel = level;
    });
    
    return issues;
  },
};

// Default export for the main accessibility system
export default {
  AccessibilityComponents,
  AccessibilityUtils,
  AccessibilityPresets,
  WCAGCompliance,
};