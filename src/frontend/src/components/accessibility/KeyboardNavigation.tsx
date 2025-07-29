/**
 * Comprehensive Keyboard Navigation System
 * WCAG 2.1 AA compliant keyboard navigation with focus management
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';

// Keyboard shortcut interface
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: () => void;
  description: string;
  category?: string;
  disabled?: boolean;
}

// Focus trap options
export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string;
  returnFocus?: HTMLElement;
  allowOutsideClick?: boolean;
  escapeDeactivates?: boolean;
}

// Roving tabindex configuration
export interface RovingTabindexConfig {
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  homeEndKeys?: boolean;
  typeahead?: boolean;
}

interface KeyboardNavigationProps {
  shortcuts?: KeyboardShortcut[];
  children: React.ReactNode;
  className?: string;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  shortcuts = [],
  children,
  className = '',
}) => {
  const { settings, screenReader, focusManagement } = useAccessibilityContext();
  const [activeShortcuts, setActiveShortcuts] = useState<KeyboardShortcut[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize keyboard shortcuts
  useEffect(() => {
    if (!settings.keyboardShortcuts) return;

    const defaultShortcuts: KeyboardShortcut[] = [
      {
        key: '/',
        action: () => focusSearchInput(),
        description: 'Focus search input',
        category: 'navigation',
      },
      {
        key: 'Escape',
        action: () => closeModalOrFocus(),
        description: 'Close modal or return focus',
        category: 'navigation',
      },
      {
        key: 'h',
        action: () => showKeyboardHelp(),
        description: 'Show keyboard shortcuts',
        category: 'help',
      },
      {
        key: '?',
        modifiers: ['shift'],
        action: () => showKeyboardHelp(),
        description: 'Show keyboard shortcuts',
        category: 'help',
      },
      {
        key: 'ArrowUp',
        modifiers: ['alt'],
        action: () => navigateToParent(),
        description: 'Navigate to parent',
        category: 'navigation',
      },
      {
        key: 'ArrowDown',
        modifiers: ['alt'],
        action: () => navigateToChild(),
        description: 'Navigate to child',
        category: 'navigation',
      },
    ];

    setActiveShortcuts([...defaultShortcuts, ...shortcuts]);
  }, [shortcuts, settings.keyboardShortcuts]);

  // Global keyboard event handler
  useEffect(() => {
    if (!settings.keyboardNavigationEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle keyboard shortcuts
      handleKeyboardShortcuts(event);
      
      // Handle special navigation keys
      handleNavigationKeys(event);
      
      // Handle focus management
      handleFocusManagement(event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeShortcuts, settings.keyboardNavigationEnabled]);

  // Keyboard shortcuts handler
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    const matchingShortcut = activeShortcuts.find(shortcut => {
      if (shortcut.disabled) return false;
      
      // Check key match
      if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false;
      
      // Check modifiers
      const requiredModifiers = shortcut.modifiers || [];
      const hasCtrl = requiredModifiers.includes('ctrl') === event.ctrlKey;
      const hasAlt = requiredModifiers.includes('alt') === event.altKey;
      const hasShift = requiredModifiers.includes('shift') === event.shiftKey;
      const hasMeta = requiredModifiers.includes('meta') === event.metaKey;
      
      return hasCtrl && hasAlt && hasShift && hasMeta;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
      
      if (settings.announceActions) {
        screenReader.announce(`Keyboard shortcut activated: ${matchingShortcut.description}`);
      }
    }
  }, [activeShortcuts, settings.announceActions, screenReader]);

  // Navigation keys handler
  const handleNavigationKeys = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    
    switch (event.key) {
      case 'Tab':
        handleTabNavigation(event);
        break;
      case 'Enter':
      case ' ':
        handleActivation(event, target);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        handleArrowNavigation(event, target);
        break;
      case 'Home':
      case 'End':
        handleHomeEndNavigation(event, target);
        break;
      case 'PageUp':
      case 'PageDown':
        handlePageNavigation(event, target);
        break;
    }
  }, []);

  // Tab navigation handler
  const handleTabNavigation = useCallback((event: KeyboardEvent) => {
    // Let browser handle standard tab behavior
    // But announce focus changes for screen readers
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && settings.announceActions) {
        const elementName = getAccessibleName(activeElement);
        const elementRole = activeElement.getAttribute('role') || activeElement.tagName.toLowerCase();
        
        if (elementName) {
          screenReader.announce(`Focused ${elementRole}: ${elementName}`, 'polite');
        }
      }
    }, 0);
  }, [settings.announceActions, screenReader]);

  // Activation handler (Enter/Space)
  const handleActivation = useCallback((event: KeyboardEvent, target: HTMLElement) => {
    const role = target.getAttribute('role');
    const tagName = target.tagName.toLowerCase();
    
    // Handle custom elements with button role
    if (role === 'button' || role === 'menuitem' || role === 'tab') {
      event.preventDefault();
      target.click();
      
      if (settings.announceActions) {
        const name = getAccessibleName(target);
        screenReader.announce(`Activated ${role || tagName}: ${name}`);
      }
    }
    
    // Handle expandable elements
    if (target.hasAttribute('aria-expanded')) {
      const isExpanded = target.getAttribute('aria-expanded') === 'true';
      const newState = !isExpanded;
      target.setAttribute('aria-expanded', newState.toString());
      
      if (settings.announceActions) {
        const name = getAccessibleName(target);
        screenReader.announce(`${name} ${newState ? 'expanded' : 'collapsed'}`);
      }
    }
  }, [settings.announceActions, screenReader]);

  // Arrow navigation handler
  const handleArrowNavigation = useCallback((event: KeyboardEvent, target: HTMLElement) => {
    const container = target.closest('[role="grid"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="toolbar"], [role="tree"]');
    
    if (container) {
      handleRovingTabindex(event, target, container as HTMLElement);
    }
  }, []);

  // Roving tabindex implementation
  const handleRovingTabindex = useCallback((event: KeyboardEvent, current: HTMLElement, container: HTMLElement) => {
    const role = container.getAttribute('role');
    const config = getRovingTabindexConfig(role);
    
    const focusableSelector = getFocusableSelector(role);
    const focusableElements = Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];
    const currentIndex = focusableElements.indexOf(current);
    
    if (currentIndex === -1) return;
    
    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowUp':
        if (config.orientation === 'vertical' || config.orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex - 1;
          if (nextIndex < 0 && config.wrap) {
            nextIndex = focusableElements.length - 1;
          }
        }
        break;
      case 'ArrowDown':
        if (config.orientation === 'vertical' || config.orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex + 1;
          if (nextIndex >= focusableElements.length && config.wrap) {
            nextIndex = 0;
          }
        }
        break;
      case 'ArrowLeft':
        if (config.orientation === 'horizontal' || config.orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex - 1;
          if (nextIndex < 0 && config.wrap) {
            nextIndex = focusableElements.length - 1;
          }
        }
        break;
      case 'ArrowRight':
        if (config.orientation === 'horizontal' || config.orientation === 'both') {
          event.preventDefault();
          nextIndex = currentIndex + 1;
          if (nextIndex >= focusableElements.length && config.wrap) {
            nextIndex = 0;
          }
        }
        break;
    }
    
    if (nextIndex !== currentIndex && nextIndex >= 0 && nextIndex < focusableElements.length) {
      // Update tabindex values
      focusableElements.forEach((el, index) => {
        el.tabIndex = index === nextIndex ? 0 : -1;
      });
      
      // Focus the new element
      focusableElements[nextIndex].focus();
      
      if (settings.announceActions) {
        const name = getAccessibleName(focusableElements[nextIndex]);
        screenReader.announce(`Focused: ${name}`, 'polite');
      }
    }
  }, [settings.announceActions, screenReader]);

  // Home/End navigation
  const handleHomeEndNavigation = useCallback((event: KeyboardEvent, target: HTMLElement) => {
    const container = target.closest('[role="grid"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="toolbar"]');
    
    if (container) {
      event.preventDefault();
      
      const role = container.getAttribute('role');
      const focusableSelector = getFocusableSelector(role);
      const focusableElements = Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];
      
      if (focusableElements.length === 0) return;
      
      const targetElement = event.key === 'Home' ? focusableElements[0] : focusableElements[focusableElements.length - 1];
      
      // Update tabindex values
      focusableElements.forEach((el) => {
        el.tabIndex = el === targetElement ? 0 : -1;
      });
      
      targetElement.focus();
      
      if (settings.announceActions) {
        const name = getAccessibleName(targetElement);
        screenReader.announce(`${event.key === 'Home' ? 'First' : 'Last'} item: ${name}`, 'polite');
      }
    }
  }, [settings.announceActions, screenReader]);

  // Page navigation
  const handlePageNavigation = useCallback((event: KeyboardEvent, target: HTMLElement) => {
    const scrollContainer = target.closest('[role="grid"], [role="listbox"], .overflow-auto, .overflow-y-auto');
    
    if (scrollContainer) {
      event.preventDefault();
      
      const containerHeight = scrollContainer.clientHeight;
      const scrollAmount = event.key === 'PageUp' ? -containerHeight : containerHeight;
      
      scrollContainer.scrollBy({
        top: scrollAmount,
        behavior: 'smooth',
      });
      
      if (settings.announceActions) {
        screenReader.announce(`Page ${event.key === 'PageUp' ? 'up' : 'down'}`, 'polite');
      }
    }
  }, [settings.announceActions, screenReader]);

  // Focus management
  const handleFocusManagement = useCallback((event: KeyboardEvent) => {
    // Track focus history for better restoration
    if (event.key === 'Tab') {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement) {
        // Store focus history in session storage for persistence
        const focusHistory = JSON.parse(sessionStorage.getItem('focus-history') || '[]');
        focusHistory.push({
          selector: getElementSelector(activeElement),
          timestamp: Date.now(),
        });
        
        // Keep only last 10 items
        sessionStorage.setItem('focus-history', JSON.stringify(focusHistory.slice(-10)));
      }
    }
  }, []);

  // Utility functions
  const getAccessibleName = (element: HTMLElement): string => {
    // Check aria-label first
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent || '';
    }
    
    // Check associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent || '';
    }
    
    // Check text content
    const textContent = element.textContent?.trim();
    if (textContent) return textContent;
    
    // Check title attribute
    const title = element.getAttribute('title');
    if (title) return title;
    
    // Check placeholder for inputs
    if (element instanceof HTMLInputElement && element.placeholder) {
      return element.placeholder;
    }
    
    return 'Unnamed element';
  };

  const getRovingTabindexConfig = (role: string | null): RovingTabindexConfig => {
    const configs: Record<string, RovingTabindexConfig> = {
      'grid': { orientation: 'both', wrap: false, homeEndKeys: true },
      'listbox': { orientation: 'vertical', wrap: true, homeEndKeys: true, typeahead: true },
      'menu': { orientation: 'vertical', wrap: true, homeEndKeys: true, typeahead: true },
      'menubar': { orientation: 'horizontal', wrap: true, homeEndKeys: true },
      'tablist': { orientation: 'horizontal', wrap: true, homeEndKeys: true },
      'toolbar': { orientation: 'horizontal', wrap: false, homeEndKeys: true },
      'tree': { orientation: 'vertical', wrap: false, homeEndKeys: true },
    };
    
    return configs[role || ''] || { orientation: 'both', wrap: true };
  };

  const getFocusableSelector = (role: string | null): string => {
    const selectors: Record<string, string> = {
      'grid': '[role="gridcell"]:not([aria-hidden="true"])',
      'listbox': '[role="option"]:not([aria-hidden="true"])',
      'menu': '[role="menuitem"]:not([aria-hidden="true"])',
      'menubar': '[role="menuitem"]:not([aria-hidden="true"])',
      'tablist': '[role="tab"]:not([aria-hidden="true"])',
      'toolbar': 'button:not([disabled]), [role="button"]:not([aria-disabled="true"])',
      'tree': '[role="treeitem"]:not([aria-hidden="true"])',
    };
    
    return selectors[role || ''] || 'button:not([disabled]), [role="button"]:not([aria-disabled="true"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  };

  const getElementSelector = (element: HTMLElement): string => {
    if (element.id) return `#${element.id}`;
    
    const tagName = element.tagName.toLowerCase();
    const className = element.className.split(' ').filter(c => c.trim()).join('.');
    
    if (className) return `${tagName}.${className}`;
    
    // Generate a more specific selector
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element);
      return `${getElementSelector(parent)} > ${tagName}:nth-child(${index + 1})`;
    }
    
    return tagName;
  };

  // Helper functions for shortcuts
  const focusSearchInput = () => {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]') as HTMLElement;
    if (searchInput) {
      searchInput.focus();
      screenReader.announce('Search input focused');
    }
  };

  const closeModalOrFocus = () => {
    // Look for open modals/dialogs
    const modal = document.querySelector('[role="dialog"][aria-modal="true"], .modal.show, .dialog.open') as HTMLElement;
    if (modal) {
      const closeButton = modal.querySelector('button[aria-label*="close" i], .close, [data-dismiss]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
        return;
      }
    }
    
    // Return focus to main content
    const mainContent = document.getElementById('main-content') || document.querySelector('main') as HTMLElement;
    if (mainContent) {
      mainContent.focus();
      screenReader.announce('Focus returned to main content');
    }
  };

  const showKeyboardHelp = () => {
    // This would trigger a help modal showing all available shortcuts
    screenReader.announce('Keyboard shortcuts help would be shown here');
    console.log('Available keyboard shortcuts:', activeShortcuts);
  };

  const navigateToParent = () => {
    const current = document.activeElement as HTMLElement;
    if (current) {
      const parent = current.parentElement;
      if (parent && parent !== document.body) {
        parent.focus();
        screenReader.announce(`Navigated to parent: ${getAccessibleName(parent)}`);
      }
    }
  };

  const navigateToChild = () => {
    const current = document.activeElement as HTMLElement;
    if (current) {
      const firstChild = current.querySelector('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
      if (firstChild) {
        firstChild.focus();
        screenReader.announce(`Navigated to child: ${getAccessibleName(firstChild)}`);
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`keyboard-navigation-container ${className}`}
      onKeyDown={(e) => e.stopPropagation()} // Prevent event bubbling if needed
    >
      {children}
    </div>
  );
};

// Focus trap component
interface FocusTrapProps {
  active: boolean;
  children: React.ReactNode;
  options?: FocusTrapOptions;
  className?: string;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  active,
  children,
  options = {},
  className = '',
}) => {
  const { focusManagement, screenReader } = useAccessibilityContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const trapCleanup = useRef<(() => void) | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (active && containerRef.current) {
      // Store the previously focused element
      previousFocus.current = document.activeElement as HTMLElement;
      
      // Set up focus trap
      trapCleanup.current = focusManagement.trapFocus(containerRef.current);
      
      // Focus initial element if specified
      if (options.initialFocus) {
        const initialElement = typeof options.initialFocus === 'string' 
          ? document.querySelector(options.initialFocus) as HTMLElement
          : options.initialFocus;
        
        if (initialElement) {
          initialElement.focus();
        }
      }
      
      screenReader.announce('Focus trapped in dialog');
    }
    
    return () => {
      if (trapCleanup.current) {
        trapCleanup.current();
        trapCleanup.current = null;
      }
      
      // Restore focus
      if (previousFocus.current && document.contains(previousFocus.current)) {
        previousFocus.current.focus();
      } else if (options.returnFocus && document.contains(options.returnFocus)) {
        options.returnFocus.focus();
      }
    };
  }, [active, options, focusManagement, screenReader]);

  // Handle escape key
  useEffect(() => {
    if (!active || !options.escapeDeactivates) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        
        // This would typically trigger a callback to close the trap
        screenReader.announce('Focus trap deactivated');
      }
    };
    
    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [active, options.escapeDeactivates, screenReader]);

  return (
    <div 
      ref={containerRef}
      className={`focus-trap ${active ? 'active' : ''} ${className}`}
      data-focus-trap={active}
    >
      {children}
    </div>
  );
};

// Roving tabindex component
interface RovingTabindexProps {
  children: React.ReactNode;
  config?: RovingTabindexConfig;
  className?: string;
  role?: string;
}

export const RovingTabindex: React.FC<RovingTabindexProps> = ({
  children,
  config = { orientation: 'both', wrap: true, homeEndKeys: true },
  className = '',
  role = 'group',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { screenReader } = useAccessibilityContext();

  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = Array.from(
      container.querySelectorAll('button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ) as HTMLElement[];
    
    // Initialize tabindex values
    focusableElements.forEach((element, index) => {
      element.tabIndex = index === 0 ? 0 : -1;
    });
    
    // Add ARIA attributes if not present
    if (!container.hasAttribute('role')) {
      container.setAttribute('role', role);
    }
    
    if (config.orientation && !container.hasAttribute('aria-orientation')) {
      if (config.orientation !== 'both') {
        container.setAttribute('aria-orientation', config.orientation);
      }
    }
  }, [config, role]);

  return (
    <div 
      ref={containerRef}
      className={`roving-tabindex ${className}`}
      role={role}
    >
      {children}
    </div>
  );
};

export default KeyboardNavigation;