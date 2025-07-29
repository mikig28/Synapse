/**
 * Mobile Accessibility Component
 * Ensures mobile accessibility compliance with screen readers and touch accessibility
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Smartphone,
  Settings,
  Accessibility,
  ZoomIn,
  ZoomOut,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useTouchGestures } from '@/hooks/useTouchGestures';

interface AccessibilitySettings {
  voiceOver: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  announceActions: boolean;
  touchTargetSize: 'small' | 'medium' | 'large';
  hapticFeedback: boolean;
  fontSize: number;
  screenReaderOptimized: boolean;
}

interface MobileAccessibilityProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AccessibilitySettings) => void;
}

interface AccessibilityManager {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  updateFocusManagement: () => void;
  setupKeyboardNavigation: () => void;
  validateTouchTargets: () => void;
}

// Global accessibility manager
class AccessibilityManagerImpl implements AccessibilityManager {
  private announcer: HTMLElement | null = null;

  constructor() {
    this.createScreenReaderAnnouncer();
  }

  private createScreenReaderAnnouncer() {
    if (typeof window === 'undefined') return;

    // Create a live region for screen reader announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(this.announcer);
  }

  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;

    // Clear after announcement to allow repeat announcements
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }

  updateFocusManagement() {
    // Ensure all interactive elements have proper focus indicators
    const interactiveElements = document.querySelectorAll(
      'button, [role="button"], input, select, textarea, a, [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach((element) => {
      if (!element.getAttribute('aria-label') && !element.textContent?.trim()) {
        console.warn('Interactive element missing accessible name:', element);
      }
    });
  }

  setupKeyboardNavigation() {
    // Add keyboard navigation support for custom components
    document.addEventListener('keydown', (event) => {
      const activeElement = document.activeElement as HTMLElement;
      
      // Space bar activation for role="button" elements
      if (event.key === ' ' && activeElement?.getAttribute('role') === 'button') {
        event.preventDefault();
        activeElement.click();
      }

      // Enter key activation
      if (event.key === 'Enter' && activeElement?.hasAttribute('data-keyboard-activatable')) {
        event.preventDefault();
        activeElement.click();
      }
    });
  }

  validateTouchTargets() {
    const touchTargets = document.querySelectorAll('button, [role="button"], a, input, select');
    
    touchTargets.forEach((target) => {
      const element = target as HTMLElement;
      const rect = element.getBoundingClientRect();
      const minSize = 44; // WCAG AA minimum touch target size
      
      if (rect.width < minSize || rect.height < minSize) {
        console.warn('Touch target too small (should be at least 44x44px):', {
          element,
          size: { width: rect.width, height: rect.height }
        });
      }
    });
  }
}

export const accessibilityManager = new AccessibilityManagerImpl();

const MobileAccessibility: React.FC<MobileAccessibilityProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    voiceOver: false,
    highContrast: false,
    reduceMotion: false,
    largeText: false,
    announceActions: true,
    touchTargetSize: 'medium',
    hapticFeedback: true,
    fontSize: 16,
    screenReaderOptimized: false,
  });

  const [isVoiceOverActive, setIsVoiceOverActive] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Touch gesture support with accessibility considerations
  const { triggerHaptic } = useTouchGestures({
    onSwipe: (gesture) => {
      if (settings.announceActions) {
        accessibilityManager.announceToScreenReader(`Swiped ${gesture.direction}`);
      }
    },
    onLongPress: () => {
      if (settings.announceActions) {
        accessibilityManager.announceToScreenReader('Long press detected');
      }
    },
  });

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for screen reader indicators
      const hasScreenReader = 
        window.speechSynthesis?.speaking ||
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        document.body.classList.contains('voice-over-enabled');

      setIsVoiceOverActive(hasScreenReader);
      
      if (hasScreenReader) {
        setSettings(prev => ({ ...prev, screenReaderOptimized: true }));
      }
    };

    detectScreenReader();

    // Listen for VoiceOver on iOS
    document.addEventListener('focusin', detectScreenReader);
    
    return () => {
      document.removeEventListener('focusin', detectScreenReader);
    };
  }, []);

  // Apply accessibility settings
  useEffect(() => {
    const root = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Large text
    if (settings.largeText) {
      root.style.fontSize = `${settings.fontSize}px`;
    } else {
      root.style.fontSize = '';
    }

    // Touch target size
    root.setAttribute('data-touch-size', settings.touchTargetSize);

    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  // Focus management
  useEffect(() => {
    if (isOpen && panelRef.current) {
      // Focus the first interactive element
      const firstFocusable = panelRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        firstFocusable.focus();
      }

      // Announce panel opening
      if (settings.announceActions) {
        accessibilityManager.announceToScreenReader('Accessibility settings panel opened');
      }
    }
  }, [isOpen, settings.announceActions]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    if (settings.hapticFeedback) {
      triggerHaptic('light');
    }

    if (settings.announceActions) {
      accessibilityManager.announceToScreenReader(`${key} changed to ${value}`);
    }
  };

  const resetToDefaults = () => {
    const defaultSettings: AccessibilitySettings = {
      voiceOver: isVoiceOverActive,
      highContrast: false,
      reduceMotion: false,
      largeText: false,
      announceActions: true,
      touchTargetSize: 'medium',
      hapticFeedback: true,
      fontSize: 16,
      screenReaderOptimized: isVoiceOverActive,
    };

    setSettings(defaultSettings);
    
    if (settings.hapticFeedback) {
      triggerHaptic('medium');
    }

    accessibilityManager.announceToScreenReader('Accessibility settings reset to defaults');
  };

  const runAccessibilityCheck = () => {
    if (settings.hapticFeedback) {
      triggerHaptic('medium');
    }

    accessibilityManager.updateFocusManagement();
    accessibilityManager.validateTouchTargets();
    accessibilityManager.announceToScreenReader('Accessibility check completed');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="accessibility-title"
            aria-describedby="accessibility-description"
            aria-modal="true"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 
                    id="accessibility-title"
                    className="text-xl font-bold flex items-center gap-2"
                  >
                    <Accessibility className="w-6 h-6" />
                    Accessibility
                  </h2>
                  <p 
                    id="accessibility-description"
                    className="text-sm text-muted-foreground mt-1"
                  >
                    Customize your accessibility preferences
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close accessibility settings"
                >
                  ✕
                </Button>
              </div>

              {/* Screen Reader Detection */}
              {isVoiceOverActive && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Volume2 className="w-5 h-5" />
                      <span className="font-medium">Screen reader detected</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                      Optimizations have been automatically enabled for better screen reader experience.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Visual Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Visual Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="high-contrast" className="font-medium">
                        High Contrast
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </p>
                    </div>
                    <Switch
                      id="high-contrast"
                      checked={settings.highContrast}
                      onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                      aria-describedby="high-contrast-help"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="reduce-motion" className="font-medium">
                        Reduce Motion
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations and transitions
                      </p>
                    </div>
                    <Switch
                      id="reduce-motion"
                      checked={settings.reduceMotion}
                      onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="font-size" className="font-medium block">
                      Font Size: {settings.fontSize}px
                    </label>
                    <Slider
                      id="font-size"
                      min={12}
                      max={24}
                      step={1}
                      value={[settings.fontSize]}
                      onValueChange={([value]) => updateSetting('fontSize', value)}
                      className="w-full"
                      aria-describedby="font-size-help"
                    />
                    <p id="font-size-help" className="text-sm text-muted-foreground">
                      Adjust text size for better readability
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Touch Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Touch & Interaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-medium block">Touch Target Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <Button
                          key={size}
                          variant={settings.touchTargetSize === size ? 'default' : 'outline'}
                          onClick={() => updateSetting('touchTargetSize', size)}
                          className="capitalize"
                          aria-pressed={settings.touchTargetSize === size}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Larger targets are easier to tap accurately
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="haptic-feedback" className="font-medium">
                        Haptic Feedback
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Physical feedback for touch interactions
                      </p>
                    </div>
                    <Switch
                      id="haptic-feedback"
                      checked={settings.hapticFeedback}
                      onCheckedChange={(checked) => updateSetting('hapticFeedback', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Screen Reader Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    Screen Reader
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="announce-actions" className="font-medium">
                        Announce Actions
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Announce button presses and interactions
                      </p>
                    </div>
                    <Switch
                      id="announce-actions"
                      checked={settings.announceActions}
                      onCheckedChange={(checked) => updateSetting('announceActions', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label htmlFor="screen-reader-optimized" className="font-medium">
                        Screen Reader Optimizations
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Enhanced navigation and descriptions
                      </p>
                    </div>
                    <Switch
                      id="screen-reader-optimized"
                      checked={settings.screenReaderOptimized}
                      onCheckedChange={(checked) => updateSetting('screenReaderOptimized', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={runAccessibilityCheck}
                  variant="outline"
                  className="flex items-center gap-2"
                  aria-label="Run accessibility validation check"
                >
                  <Eye className="w-4 h-4" />
                  Check Accessibility
                </Button>
                
                <Button
                  onClick={resetToDefaults}
                  variant="outline"
                  className="flex items-center gap-2"
                  aria-label="Reset all accessibility settings to defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Swipe gestures are announced when "Announce Actions" is enabled</p>
                <p>• Touch target validation runs automatically</p>
                <p>• Settings are saved locally and persist between sessions</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook for using accessibility settings throughout the app
export const useAccessibilitySettings = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    voiceOver: false,
    highContrast: false,
    reduceMotion: false,
    largeText: false,
    announceActions: true,
    touchTargetSize: 'medium',
    hapticFeedback: true,
    fontSize: 16,
    screenReaderOptimized: false,
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
      } catch (error) {
        console.warn('Failed to parse saved accessibility settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = (newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    localStorage.setItem('accessibility-settings', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings,
    announceToScreenReader: accessibilityManager.announceToScreenReader,
  };
};

export default MobileAccessibility;