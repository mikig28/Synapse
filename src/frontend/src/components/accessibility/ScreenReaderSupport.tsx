/**
 * Comprehensive Screen Reader Support System
 * WCAG 2.1 AA compliant screen reader integration with ARIA live regions
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAccessibilityContext, AriaLivePriority } from '@/contexts/AccessibilityContext';

// Screen reader announcement types
export interface Announcement {
  id: string;
  message: string;
  priority: AriaLivePriority;
  timestamp: number;
  category?: 'navigation' | 'status' | 'error' | 'success' | 'warning' | 'info';
  persistent?: boolean;
}

// Live region configuration
export interface LiveRegionConfig {
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  busy?: boolean;
  role?: 'alert' | 'log' | 'marquee' | 'status' | 'timer';
}

// ARIA description utilities
export interface AriaDescriptionManager {
  addDescription: (elementId: string, description: string) => string;
  removeDescription: (elementId: string, descriptionId: string) => void;
  updateDescription: (descriptionId: string, newDescription: string) => void;
  getDescriptions: (elementId: string) => string[];
}

interface ScreenReaderSupportProps {
  children: React.ReactNode;
  announcePageChanges?: boolean;
  announceStatusUpdates?: boolean;
  verboseMode?: boolean;
}

export const ScreenReaderSupport: React.FC<ScreenReaderSupportProps> = ({
  children,
  announcePageChanges = true,
  announceStatusUpdates = true,
  verboseMode = false,
}) => {
  const { settings, screenReader, isScreenReaderActive } = useAccessibilityContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pageTitle, setPageTitle] = useState(document.title);
  
  const politeRegionRef = useRef<HTMLDivElement>(null);
  const assertiveRegionRef = useRef<HTMLDivElement>(null);
  const statusRegionRef = useRef<HTMLDivElement>(null);
  const logRegionRef = useRef<HTMLDivElement>(null);
  
  const descriptionCounter = useRef(0);
  const descriptions = useRef<Map<string, Set<string>>>(new Map());

  // Initialize live regions
  useEffect(() => {
    if (!settings.screenReaderOptimized) return;
    
    createLiveRegions();
    setupPageChangeAnnouncements();
    
    return () => {
      cleanupLiveRegions();
    };
  }, [settings.screenReaderOptimized]);

  // Create ARIA live regions
  const createLiveRegions = useCallback(() => {
    const regions = [
      { ref: politeRegionRef, id: 'aria-live-polite', live: 'polite', role: 'status' },
      { ref: assertiveRegionRef, id: 'aria-live-assertive', live: 'assertive', role: 'alert' },
      { ref: statusRegionRef, id: 'aria-live-status', live: 'polite', role: 'status' },
      { ref: logRegionRef, id: 'aria-live-log', live: 'polite', role: 'log' },
    ];

    regions.forEach(({ ref, id, live, role }) => {
      if (ref.current) return; // Already exists
      
      const region = document.createElement('div');
      region.id = id;
      region.setAttribute('aria-live', live);
      region.setAttribute('aria-atomic', 'true');
      region.setAttribute('role', role);
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      
      document.body.appendChild(region);
      ref.current = region;
    });
  }, []);

  // Cleanup live regions
  const cleanupLiveRegions = useCallback(() => {
    [politeRegionRef, assertiveRegionRef, statusRegionRef, logRegionRef].forEach(ref => {
      if (ref.current?.parentNode) {
        ref.current.parentNode.removeChild(ref.current);
        ref.current = null;
      }
    });
  }, []);

  // Setup page change announcements
  const setupPageChangeAnnouncements = useCallback(() => {
    if (!announcePageChanges) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target === document.head) {
          const titleElement = document.querySelector('title');
          if (titleElement && titleElement.textContent !== pageTitle) {
            const newTitle = titleElement.textContent || '';
            setPageTitle(newTitle);
            announcePageChange(newTitle);
          }
        }
      });
    });

    observer.observe(document.head, { childList: true, subtree: true });
    
    // Also listen for History API changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => announcePageChange(document.title), 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => announcePageChange(document.title), 100);
    };

    window.addEventListener('popstate', () => {
      setTimeout(() => announcePageChange(document.title), 100);
    });

    return () => {
      observer.disconnect();
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [announcePageChanges, pageTitle]);

  // Announce page changes
  const announcePageChange = useCallback((title: string) => {
    if (!settings.announceActions) return;
    
    const cleanTitle = title.replace(/\s*\|\s*.*$/, ''); // Remove site name
    announceToScreenReader(`Page changed to: ${cleanTitle}`, 'polite', 'navigation');
  }, [settings.announceActions]);

  // Enhanced announcement function
  const announceToScreenReader = useCallback((
    message: string,
    priority: AriaLivePriority = 'polite',
    category?: Announcement['category'],
    persistent = false
  ) => {
    if (!settings.liveRegionsEnabled || !message.trim()) return;

    const announcement: Announcement = {
      id: `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: message.trim(),
      priority,
      timestamp: Date.now(),
      category,
      persistent,
    };

    // Add to announcements history
    setAnnouncements(prev => [...prev.slice(-99), announcement]); // Keep last 100

    // Get appropriate live region
    const region = getRegionForAnnouncement(announcement);
    if (!region) return;

    // Clear previous content if not persistent
    if (!persistent) {
      region.textContent = '';
    }

    // Announce with slight delay to ensure screen reader picks it up
    setTimeout(() => {
      if (region) {
        region.textContent = announcement.message;
        
        // Clear after announcement unless persistent
        if (!persistent) {
          setTimeout(() => {
            if (region.textContent === announcement.message) {
              region.textContent = '';
            }
          }, 1000);
        }
      }
    }, 50);

    // Enhance with additional context in verbose mode
    if (verboseMode || settings.verboseDescriptions) {
      setTimeout(() => {
        announceVerboseContext(announcement);
      }, 1500);
    }
  }, [settings.liveRegionsEnabled, verboseMode, settings.verboseDescriptions]);

  // Get appropriate region for announcement
  const getRegionForAnnouncement = useCallback((announcement: Announcement): HTMLElement | null => {
    switch (announcement.priority) {
      case 'assertive':
        return assertiveRegionRef.current;
      case 'off':
        return null;
      default:
        // Use specific regions based on category
        switch (announcement.category) {
          case 'status':
            return statusRegionRef.current;
          case 'navigation':
          case 'info':
            return logRegionRef.current;
          default:
            return politeRegionRef.current;
        }
    }
  }, []);

  // Announce verbose context
  const announceVerboseContext = useCallback((announcement: Announcement) => {
    if (!settings.verboseDescriptions) return;

    const context = getCurrentContext();
    if (context) {
      const contextMessage = `Context: ${context}`;
      const region = politeRegionRef.current;
      if (region) {
        region.textContent = contextMessage;
        setTimeout(() => {
          if (region.textContent === contextMessage) {
            region.textContent = '';
          }
        }, 2000);
      }
    }
  }, [settings.verboseDescriptions]);

  // Get current page/section context
  const getCurrentContext = useCallback((): string | null => {
    const main = document.querySelector('main');
    const currentPage = document.querySelector('[data-page]')?.getAttribute('data-page');
    const currentSection = document.querySelector('[data-section]')?.getAttribute('data-section');
    const activeElement = document.activeElement;
    
    if (currentPage) return `Page: ${currentPage}`;
    if (currentSection) return `Section: ${currentSection}`;
    if (main) {
      const mainHeading = main.querySelector('h1, h2');
      if (mainHeading?.textContent) {
        return `Section: ${mainHeading.textContent.trim()}`;
      }
    }
    if (activeElement && activeElement !== document.body) {
      const section = activeElement.closest('section, article, aside, nav');
      if (section) {
        const sectionHeading = section.querySelector('h1, h2, h3, h4, h5, h6');
        if (sectionHeading?.textContent) {
          return `In section: ${sectionHeading.textContent.trim()}`;
        }
      }
    }
    
    return null;
  }, []);

  // ARIA description manager
  const ariaDescriptionManager: AriaDescriptionManager = {
    addDescription: useCallback((elementId: string, description: string): string => {
      const descriptionId = `desc-${elementId}-${++descriptionCounter.current}`;
      
      // Create description element
      const descElement = document.createElement('div');
      descElement.id = descriptionId;
      descElement.className = 'sr-only';
      descElement.textContent = description;
      document.body.appendChild(descElement);
      
      // Track descriptions for element
      if (!descriptions.current.has(elementId)) {
        descriptions.current.set(elementId, new Set());
      }
      descriptions.current.get(elementId)!.add(descriptionId);
      
      // Update element's aria-describedby
      const element = document.getElementById(elementId);
      if (element) {
        const existingDescribedBy = element.getAttribute('aria-describedby') || '';
        const newDescribedBy = existingDescribedBy 
          ? `${existingDescribedBy} ${descriptionId}`
          : descriptionId;
        element.setAttribute('aria-describedby', newDescribedBy);
      }
      
      return descriptionId;
    }, []),

    removeDescription: useCallback((elementId: string, descriptionId: string) => {
      // Remove description element
      const descElement = document.getElementById(descriptionId);
      if (descElement?.parentNode) {
        descElement.parentNode.removeChild(descElement);
      }
      
      // Update tracking
      const elementDescriptions = descriptions.current.get(elementId);
      if (elementDescriptions) {
        elementDescriptions.delete(descriptionId);
        if (elementDescriptions.size === 0) {
          descriptions.current.delete(elementId);
        }
      }
      
      // Update element's aria-describedby
      const element = document.getElementById(elementId);
      if (element) {
        const describedBy = element.getAttribute('aria-describedby') || '';
        const newDescribedBy = describedBy
          .split(' ')
          .filter(id => id !== descriptionId)
          .join(' ');
        
        if (newDescribedBy) {
          element.setAttribute('aria-describedby', newDescribedBy);
        } else {
          element.removeAttribute('aria-describedby');
        }
      }
    }, []),

    updateDescription: useCallback((descriptionId: string, newDescription: string) => {
      const descElement = document.getElementById(descriptionId);
      if (descElement) {
        descElement.textContent = newDescription;
      }
    }, []),

    getDescriptions: useCallback((elementId: string): string[] => {
      const elementDescriptions = descriptions.current.get(elementId);
      if (!elementDescriptions) return [];
      
      return Array.from(elementDescriptions).map(descId => {
        const descElement = document.getElementById(descId);
        return descElement?.textContent || '';
      }).filter(Boolean);
    }, []),
  };

  // Status announcements
  const announceStatus = useCallback((status: string, context?: string) => {
    const message = context ? `${context}: ${status}` : status;
    announceToScreenReader(message, 'polite', 'status');
  }, [announceToScreenReader]);

  const announceError = useCallback((error: string, context?: string) => {
    const message = context ? `Error in ${context}: ${error}` : `Error: ${error}`;
    announceToScreenReader(message, 'assertive', 'error');
  }, [announceToScreenReader]);

  const announceSuccess = useCallback((message: string, context?: string) => {
    const fullMessage = context ? `${context}: ${message}` : message;
    announceToScreenReader(fullMessage, 'polite', 'success');
  }, [announceToScreenReader]);

  const announceWarning = useCallback((warning: string, context?: string) => {
    const message = context ? `Warning in ${context}: ${warning}` : `Warning: ${warning}`;
    announceToScreenReader(message, 'assertive', 'warning');
  }, [announceToScreenReader]);

  // Provide enhanced screenReader object to children via context
  const enhancedScreenReader = {
    ...screenReader,
    announceToScreenReader,
    announceStatus,
    announceError,
    announceSuccess,
    announceWarning,
    ariaDescriptionManager,
    announcements,
    clearAnnouncements: () => setAnnouncements([]),
  };

  return (
    <>
      {children}
      
      {/* Status indicator for screen reader users */}
      {isScreenReaderActive && settings.screenReaderOptimized && (
        <div className="sr-only">
          <p>Screen reader optimizations are active.</p>
          {settings.verboseDescriptions && (
            <p>Verbose descriptions are enabled for detailed navigation assistance.</p>
          )}
          {settings.announceActions && (
            <p>Action announcements are enabled.</p>
          )}
        </div>
      )}
      
      {/* Announcement history for debugging (only visible in dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="sr-only">
          <summary>Screen Reader Announcements (Dev Only)</summary>
          <ul>
            {announcements.slice(-10).map((announcement) => (
              <li key={announcement.id}>
                [{announcement.priority}] {announcement.category && `[${announcement.category}]`} {announcement.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
};

// Live region component for custom implementations
interface LiveRegionProps {
  children: React.ReactNode;
  priority?: AriaLivePriority;
  atomic?: boolean;
  relevant?: string;
  role?: string;
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  priority = 'polite',
  atomic = true,
  relevant = 'all',
  role,
  className = 'sr-only',
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      role={role}
      className={className}
    >
      {children}
    </div>
  );
};

// Screen reader text component for developers
interface ScreenReaderTextProps {
  children: React.ReactNode;
  className?: string;
}

export const ScreenReaderText: React.FC<ScreenReaderTextProps> = ({
  children,
  className = '',
}) => {
  return (
    <span className={`sr-only ${className}`}>
      {children}
    </span>
  );
};

// Accessible heading component with proper hierarchy
interface AccessibleHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  id?: string;
  className?: string;
  visualLevel?: 1 | 2 | 3 | 4 | 5 | 6; // For visual styling different from semantic level
}

export const AccessibleHeading: React.FC<AccessibleHeadingProps> = ({
  level,
  children,
  id,
  className = '',
  visualLevel,
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  const visualClass = visualLevel ? `text-h${visualLevel}` : '';
  
  return React.createElement(
    HeadingTag,
    {
      id,
      className: `${className} ${visualClass}`.trim(),
    },
    children
  );
};

// ARIA landmark component
interface LandmarkProps {
  role: 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search';
  children: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  className?: string;
}

export const Landmark: React.FC<LandmarkProps> = ({
  role,
  children,
  ariaLabel,
  ariaLabelledBy,
  className = '',
}) => {
  const TagName = role === 'banner' || role === 'contentinfo' ? 'header' : 
                  role === 'navigation' ? 'nav' :
                  role === 'main' ? 'main' :
                  role === 'complementary' ? 'aside' :
                  role === 'search' ? 'search' : 'div';

  return React.createElement(
    TagName,
    {
      role: role,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      className,
    },
    children
  );
};

export default ScreenReaderSupport;