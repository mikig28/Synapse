/**
 * Color Contrast Enhancer Component
 * Automatically adjusts colors to meet WCAG 2.1 AA compliance
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { 
  auditPageContrast, 
  generateAccessiblePalette, 
  setCSSCustomProperties, 
  ContrastAuditResult,
  ColorScheme,
  colorContrastUtils
} from '@/utils/colorContrastUtils';

interface ColorContrastEnhancerProps {
  children: React.ReactNode;
  autoFix?: boolean;
  auditOnMount?: boolean;
  targetLevel?: 'AA' | 'AAA';
}

export const ColorContrastEnhancer: React.FC<ColorContrastEnhancerProps> = ({
  children,
  autoFix = true,
  auditOnMount = true,
  targetLevel = 'AA',
}) => {
  const { settings, updateSettings, screenReader } = useAccessibilityContext();
  const [auditResults, setAuditResults] = useState<ContrastAuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [enhancedPalette, setEnhancedPalette] = useState<ColorScheme | null>(null);

  // Run initial audit
  useEffect(() => {
    if (auditOnMount) {
      performContrastAudit();
    }
  }, [auditOnMount, targetLevel]);

  // Apply high contrast mode
  useEffect(() => {
    if (settings.highContrast) {
      applyHighContrastMode();
    } else {
      removeHighContrastMode();
    }
  }, [settings.highContrast]);

  // Perform contrast audit
  const performContrastAudit = useCallback(async () => {
    setIsAuditing(true);
    screenReader.announce('Running color contrast audit', 'polite');

    try {
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const results = auditPageContrast(targetLevel);
      setAuditResults(results);
      
      if (results.length > 0) {
        screenReader.announce(
          `Found ${results.length} color contrast issues. ${autoFix ? 'Applying automatic fixes.' : ''}`,
          'polite'
        );
        
        if (autoFix) {
          await applyAutomaticFixes(results);
        }
      } else {
        screenReader.announce('All colors meet contrast requirements', 'polite');
      }
    } catch (error) {
      console.error('Color contrast audit failed:', error);
      screenReader.announceError('Color contrast audit failed');
    } finally {
      setIsAuditing(false);
    }
  }, [targetLevel, autoFix, screenReader]);

  // Apply automatic contrast fixes
  const applyAutomaticFixes = useCallback(async (results: ContrastAuditResult[]) => {
    const styleElement = document.getElementById('accessibility-contrast-fixes') || document.createElement('style');
    styleElement.id = 'accessibility-contrast-fixes';
    
    let css = '/* Accessibility Contrast Fixes */\n';
    
    results.forEach((result, index) => {
      const { selector, foreground, background, isLargeText } = result;
      
      // Try to find an accessible color
      const accessibleColor = colorContrastUtils.findAccessibleColor(
        foreground,
        [background],
        isLargeText,
        targetLevel
      );
      
      if (accessibleColor && accessibleColor !== foreground) {
        css += `${selector} { color: ${accessibleColor} !important; }\n`;
      } else {
        // If we can't fix the foreground, try adjusting the background
        const lighterBg = colorContrastUtils.adjustColorLuminance(background, 20);
        const darkerBg = colorContrastUtils.adjustColorLuminance(background, -20);
        
        const lighterRatio = colorContrastUtils.getContrastRatio(foreground, lighterBg);
        const darkerRatio = colorContrastUtils.getContrastRatio(foreground, darkerBg);
        const requiredRatio = targetLevel === 'AAA' ? (isLargeText ? 4.5 : 7.0) : (isLargeText ? 3.0 : 4.5);
        
        if (lighterRatio >= requiredRatio) {
          css += `${selector} { background-color: ${lighterBg} !important; }\n`;
        } else if (darkerRatio >= requiredRatio) {
          css += `${selector} { background-color: ${darkerBg} !important; }\n`;
        }
      }
    });
    
    styleElement.textContent = css;
    
    if (!document.head.contains(styleElement)) {
      document.head.appendChild(styleElement);
    }
    
    // Re-audit to verify fixes
    setTimeout(() => {
      const newResults = auditPageContrast(targetLevel);
      const fixedCount = results.length - newResults.length;
      if (fixedCount > 0) {
        screenReader.announce(`Fixed ${fixedCount} color contrast issues`, 'polite');
      }
      setAuditResults(newResults);
    }, 100);
  }, [targetLevel, screenReader]);

  // Apply high contrast mode
  const applyHighContrastMode = useCallback(() => {
    const highContrastPalette: ColorScheme = {
      primary: '#000000',
      secondary: '#000000',
      background: '#ffffff',
      surface: '#ffffff',
      text: '#000000',
      textSecondary: '#000000',
      border: '#000000',
      error: '#cc0000',
      warning: '#cc6600',
      success: '#006600',
      info: '#0066cc',
    };
    
    setCSSCustomProperties(highContrastPalette);
    setEnhancedPalette(highContrastPalette);
    
    // Add high contrast class to body
    document.body.classList.add('high-contrast-mode');
    
    // Apply high contrast styles
    const styleElement = document.getElementById('high-contrast-styles') || document.createElement('style');
    styleElement.id = 'high-contrast-styles';
    styleElement.textContent = `
      /* High Contrast Mode Styles */
      .high-contrast-mode {
        filter: contrast(150%);
      }
      
      .high-contrast-mode * {
        background-image: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      
      .high-contrast-mode a,
      .high-contrast-mode button,
      .high-contrast-mode [role="button"] {
        text-decoration: underline !important;
        border: 2px solid currentColor !important;
      }
      
      .high-contrast-mode input,
      .high-contrast-mode select,
      .high-contrast-mode textarea {
        border: 2px solid #000000 !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      
      .high-contrast-mode :focus {
        outline: 3px solid #000000 !important;
        outline-offset: 2px !important;
      }
      
      .high-contrast-mode img {
        filter: contrast(150%) brightness(120%);
      }
    `;
    
    if (!document.head.contains(styleElement)) {
      document.head.appendChild(styleElement);
    }
    
    screenReader.announce('High contrast mode enabled', 'polite');
  }, [screenReader]);

  // Remove high contrast mode
  const removeHighContrastMode = useCallback(() => {
    document.body.classList.remove('high-contrast-mode');
    
    const styleElement = document.getElementById('high-contrast-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    // Restore original palette if available
    if (enhancedPalette) {
      // Reset to default theme colors
      const defaultPalette = generateAccessiblePalette({}, targetLevel);
      setCSSCustomProperties(defaultPalette);
      setEnhancedPalette(null);
    }
    
    screenReader.announce('High contrast mode disabled', 'polite');
  }, [enhancedPalette, targetLevel, screenReader]);

  // Generate accessible color palette for current theme
  const generateThemePalette = useCallback(() => {
    const currentColors = getCurrentThemeColors();
    const accessiblePalette = generateAccessiblePalette(currentColors, targetLevel);
    
    setCSSCustomProperties(accessiblePalette);
    setEnhancedPalette(accessiblePalette);
    
    screenReader.announce('Applied accessible color palette', 'polite');
    
    // Re-audit after applying new palette
    setTimeout(performContrastAudit, 100);
  }, [targetLevel, screenReader, performContrastAudit]);

  // Get current theme colors from CSS custom properties
  const getCurrentThemeColors = useCallback((): Partial<ColorScheme> => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    const getValue = (property: string): string => {
      return computedStyle.getPropertyValue(property).trim() || 
             computedStyle.getPropertyValue(`--${property}`).trim();
    };
    
    return {
      primary: getValue('--color-primary') || getValue('--primary'),
      secondary: getValue('--color-secondary') || getValue('--secondary'),
      background: getValue('--color-background') || getValue('--background'),
      surface: getValue('--color-surface') || getValue('--surface'),
      text: getValue('--color-text') || getValue('--foreground'),
      textSecondary: getValue('--color-text-secondary') || getValue('--muted-foreground'),
      border: getValue('--color-border') || getValue('--border'),
      error: getValue('--color-error') || getValue('--destructive'),
      warning: getValue('--color-warning') || getValue('--warning'),
      success: getValue('--color-success') || getValue('--success'),
      info: getValue('--color-info') || getValue('--info'),
    };
  }, []);

  // Color blind simulation filters
  const applyColorBlindFilter = useCallback((type: 'deuteranopia' | 'protanopia' | 'tritanopia' | 'none') => {
    const filterElement = document.getElementById('colorblind-filter') || document.createElement('style');
    filterElement.id = 'colorblind-filter';
    
    const filters = {
      deuteranopia: 'sepia(50%) saturate(1.2) hue-rotate(90deg)',
      protanopia: 'sepia(50%) saturate(1.2) hue-rotate(120deg)',
      tritanopia: 'sepia(50%) saturate(1.2) hue-rotate(180deg)',
      none: 'none',
    };
    
    filterElement.textContent = `
      .colorblind-filter {
        filter: ${filters[type]};
      }
    `;
    
    if (type === 'none') {
      document.body.classList.remove('colorblind-filter');
      if (filterElement.parentNode) {
        filterElement.parentNode.removeChild(filterElement);
      }
    } else {
      document.body.classList.add('colorblind-filter');
      if (!document.head.contains(filterElement)) {
        document.head.appendChild(filterElement);
      }
    }
    
    screenReader.announce(
      type === 'none' ? 'Color blind simulation disabled' : `Applied ${type} simulation`,
      'polite'
    );
  }, [screenReader]);

  // Apply color blind mode based on settings
  useEffect(() => {
    applyColorBlindFilter(settings.colorBlindMode);
  }, [settings.colorBlindMode, applyColorBlindFilter]);

  // Enhanced focus indicators
  useEffect(() => {
    const focusStyleElement = document.getElementById('enhanced-focus-styles') || document.createElement('style');
    focusStyleElement.id = 'enhanced-focus-styles';
    
    const focusStyles = {
      standard: `
        :focus {
          outline: 2px solid #0066cc !important;
          outline-offset: 2px !important;
        }
      `,
      enhanced: `
        :focus {
          outline: 3px solid #0066cc !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 6px rgba(0, 102, 204, 0.2) !important;
        }
      `,
      'high-visibility': `
        :focus {
          outline: 4px solid #ffff00 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 8px rgba(255, 255, 0, 0.3) !important;
          background-color: rgba(255, 255, 0, 0.1) !important;
        }
      `,
    };
    
    focusStyleElement.textContent = focusStyles[settings.focusIndicators];
    
    if (!document.head.contains(focusStyleElement)) {
      document.head.appendChild(focusStyleElement);
    }
  }, [settings.focusIndicators]);

  // Expose utility functions
  const enhancerAPI = {
    performAudit: performContrastAudit,
    generatePalette: generateThemePalette,
    applyHighContrast: () => updateSettings({ highContrast: !settings.highContrast }),
    setColorBlindMode: (mode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia') => 
      updateSettings({ colorBlindMode: mode }),
    setFocusStyle: (style: 'standard' | 'enhanced' | 'high-visibility') =>
      updateSettings({ focusIndicators: style }),
    getAuditResults: () => auditResults,
    isAuditing,
  };

  return (
    <>
      {children}
      
      {/* Development-only contrast audit display */}
      {process.env.NODE_ENV === 'development' && auditResults.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm p-4 bg-red-100 border border-red-400 rounded-lg">
          <h3 className="font-bold text-red-800 mb-2">
            Contrast Issues ({auditResults.length})
          </h3>
          <div className="max-h-40 overflow-y-auto">
            {auditResults.slice(0, 5).map((result, index) => (
              <div key={index} className="text-sm text-red-700 mb-1">
                {result.selector}: {result.ratio.toFixed(2)}:1
              </div>
            ))}
            {auditResults.length > 5 && (
              <div className="text-sm text-red-600 italic">
                +{auditResults.length - 5} more issues
              </div>
            )}
          </div>
          <button
            onClick={performContrastAudit}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
            disabled={isAuditing}
          >
            {isAuditing ? 'Auditing...' : 'Re-audit'}
          </button>
        </div>
      )}
      
      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite">
        {isAuditing && 'Running color contrast audit...'}
        {auditResults.length > 0 && (
          `${auditResults.length} color contrast issues found`
        )}
      </div>
    </>
  );
};

export default ColorContrastEnhancer;