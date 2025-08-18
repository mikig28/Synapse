/**
 * iOS Safari detection utilities to handle mobile Safari specific issues
 */

export const detectiOS = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  // Check for iOS devices
  const isiOS = /iphone|ipad|ipod/.test(userAgent) ||
    (platform.startsWith('mac') && 'ontouchend' in document);
  
  return isiOS;
};

export const detectSafari = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check for Safari browser (not Chrome on iOS)
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  
  return isSafari;
};

export const detectiOSSafari = (): boolean => {
  return detectiOS() && detectSafari();
};

export const getiOSVersion = (): number | null => {
  if (!detectiOS()) return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
};

export const isOlderiOS = (version: number = 14): boolean => {
  const iosVersion = getiOSVersion();
  return iosVersion !== null && iosVersion < version;
};

// Check if we should use simplified mobile UI
export const shouldUseMobileFallback = (): boolean => {
  // Use fallback for iOS Safari or older iOS versions
  return detectiOSSafari() || isOlderiOS(15);
};

// Check for specific iOS Safari bugs
export const hasiOSSafariLazyLoadingBug = (): boolean => {
  // iOS Safari has issues with React.lazy() and Suspense in certain versions
  return detectiOSSafari() && isOlderiOS(16);
};

export const hasiOSSafariAnimationBug = (): boolean => {
  // Some iOS versions have performance issues with complex animations
  return detectiOSSafari() && isOlderiOS(15);
};

// Performance optimizations for iOS
export const getiOSPerformanceSettings = () => {
  if (!detectiOS()) {
    return {
      enableAnimations: true,
      enableLazyLoading: true,
      enable3D: true,
      enableComplexTransitions: true,
      maxConcurrentRequests: 6
    };
  }

  const iosVersion = getiOSVersion();
  
  return {
    enableAnimations: !isOlderiOS(15),
    enableLazyLoading: !hasiOSSafariLazyLoadingBug(),
    enable3D: false, // Disable 3D on all iOS for better performance
    enableComplexTransitions: !isOlderiOS(14),
    maxConcurrentRequests: isOlderiOS(13) ? 2 : 4
  };
};