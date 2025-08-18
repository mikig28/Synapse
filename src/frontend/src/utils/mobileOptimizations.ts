/**
 * Mobile-specific optimizations to prevent blank page issues
 */

import { detectiOS, detectiOSSafari } from './iOSDetection';

/**
 * Initialize mobile-specific optimizations
 */
export const initMobileOptimizations = () => {
  if (typeof window === 'undefined') return;

  // Force GPU acceleration on iOS to prevent rendering issues
  if (detectiOS()) {
    document.documentElement.style.transform = 'translateZ(0)';
    document.documentElement.style.webkitTransform = 'translateZ(0)';
  }

  // Prevent iOS Safari from going blank on navigation
  if (detectiOSSafari()) {
    // Force repaint on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        forceRepaint();
      }
    });

    // Force repaint on focus
    window.addEventListener('focus', forceRepaint);
    
    // Handle page show event (back/forward navigation)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Page was loaded from cache
        forceRepaint();
        // Reload data if needed
        window.dispatchEvent(new CustomEvent('mobile-cache-restore'));
      }
    });

    // Prevent blank page on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(forceRepaint, 100);
    });
  }

  // Optimize touch events
  if ('ontouchstart' in window) {
    // Add passive listeners for better scrolling performance
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }

  // Handle iOS viewport issues
  if (detectiOS()) {
    preventViewportZoom();
    handleSafeAreaInsets();
  }
};

/**
 * Force a repaint to fix blank page issues
 */
export const forceRepaint = () => {
  const root = document.getElementById('root');
  if (!root) return;

  // Method 1: Toggle display
  const display = root.style.display;
  root.style.display = 'none';
  void root.offsetHeight; // Force reflow
  root.style.display = display;

  // Method 2: Toggle transform
  root.style.transform = 'translateZ(0)';
  void root.offsetHeight;
  root.style.transform = '';

  // Method 3: Toggle opacity (less intrusive)
  root.style.opacity = '0.99';
  setTimeout(() => {
    root.style.opacity = '1';
  }, 0);

  console.log('[Mobile] Forced repaint to prevent blank page');
};

/**
 * Prevent viewport zoom on iOS
 */
const preventViewportZoom = () => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }
};

/**
 * Handle safe area insets for notched devices
 */
const handleSafeAreaInsets = () => {
  const root = document.documentElement;
  
  // Set CSS variables for safe area insets
  const setSafeAreaVariables = () => {
    const top = getComputedStyle(root).getPropertyValue('env(safe-area-inset-top)') || '0px';
    const bottom = getComputedStyle(root).getPropertyValue('env(safe-area-inset-bottom)') || '0px';
    const left = getComputedStyle(root).getPropertyValue('env(safe-area-inset-left)') || '0px';
    const right = getComputedStyle(root).getPropertyValue('env(safe-area-inset-right)') || '0px';
    
    root.style.setProperty('--safe-area-inset-top', top);
    root.style.setProperty('--safe-area-inset-bottom', bottom);
    root.style.setProperty('--safe-area-inset-left', left);
    root.style.setProperty('--safe-area-inset-right', right);
  };

  setSafeAreaVariables();
  window.addEventListener('resize', setSafeAreaVariables);
};

/**
 * Preload critical resources for mobile
 */
export const preloadMobileResources = () => {
  if (!detectiOS()) return;

  // Preload critical fonts
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
};

/**
 * Clear iOS Safari cache issues
 */
export const clearMobileCacheIssues = () => {
  if (!detectiOSSafari()) return;

  // Clear any stuck loading states
  const loaders = document.querySelectorAll('.animate-spin, .loading');
  loaders.forEach((loader) => {
    loader.classList.remove('animate-spin', 'loading');
  });

  // Reset any stuck animations
  const animated = document.querySelectorAll('[style*="animation"], [style*="transition"]');
  animated.forEach((el) => {
    (el as HTMLElement).style.animation = 'none';
    (el as HTMLElement).style.transition = 'none';
    void (el as HTMLElement).offsetHeight; // Force reflow
    (el as HTMLElement).style.animation = '';
    (el as HTMLElement).style.transition = '';
  });
};

/**
 * Monitor and report mobile performance issues
 */
export const monitorMobilePerformance = () => {
  if (!detectiOS()) return;

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).duration > 50) {
            console.warn('[Mobile Performance] Long task detected:', {
              duration: (entry as any).duration,
              name: entry.name,
              startTime: entry.startTime
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // PerformanceObserver not supported or error
      console.log('[Mobile] Performance monitoring not available');
    }
  }
};