import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  swRegistration: ServiceWorkerRegistration | null;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => Promise<void>;
  showInstallPrompt: () => void;
  dismissInstallPrompt: () => void;
}

export const usePWA = (): PWAState & PWAActions => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Check if app is already installed
  useEffect(() => {
    const checkIfInstalled = () => {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running as PWA on iOS
      const isIOSPWA = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isIOSPWA);
    };

    checkIfInstalled();
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service worker registered:', registration);
      setSwRegistration(registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available');
              setIsUpdateAvailable(true);
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from SW:', event.data);
        
        if (event.data.type === 'UPDATE_AVAILABLE') {
          setIsUpdateAvailable(true);
        }
      });

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  };

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }

    try {
      const result = await deferredPrompt.prompt();
      console.log('[PWA] Install prompt result:', result);

      if (result.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(async () => {
    if (!swRegistration || !isUpdateAvailable) {
      console.log('[PWA] No update available');
      return;
    }

    try {
      // Tell the waiting service worker to skip waiting
      if (swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Reload the page to activate the new service worker
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Update failed:', error);
    }
  }, [swRegistration, isUpdateAvailable]);

  const showInstallPrompt = useCallback(() => {
    if (isInstallable && deferredPrompt) {
      installApp();
    }
  }, [isInstallable, deferredPrompt, installApp]);

  const dismissInstallPrompt = useCallback(() => {
    setIsInstallable(false);
    setDeferredPrompt(null);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOffline,
    isUpdateAvailable,
    swRegistration,
    installApp,
    updateApp,
    showInstallPrompt,
    dismissInstallPrompt,
  };
};

// Utility functions for PWA features
export const PWAUtils = {
  // Check if device supports PWA features
  isPWASupported: () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  // Check if running as PWA
  isPWAMode: () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSPWA = (window.navigator as any).standalone === true;
    return isStandalone || isIOSPWA;
  },

  // Get device type for PWA optimization
  getDeviceType: () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    if (/windows/.test(userAgent)) return 'windows';
    if (/mac/.test(userAgent)) return 'mac';
    return 'unknown';
  },

  // Request notification permission
  requestNotificationPermission: async () => {
    if (!('Notification' in window)) {
      console.log('[PWA] Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Show local notification
  showNotification: (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      });
    }
  },

  // Add to home screen guidance
  getInstallInstructions: () => {
    const device = PWAUtils.getDeviceType();
    
    switch (device) {
      case 'ios':
        return {
          title: 'Install Synapse',
          steps: [
            'Tap the Share button',
            'Scroll down and tap "Add to Home Screen"',
            'Tap "Add" to install Synapse'
          ]
        };
      case 'android':
        return {
          title: 'Install Synapse',
          steps: [
            'Tap the menu button (⋮)',
            'Tap "Add to Home screen"',
            'Tap "Add" to install Synapse'
          ]
        };
      default:
        return {
          title: 'Install Synapse',
          steps: [
            'Look for the install icon in your browser',
            'Click "Install" when prompted',
            'Synapse will be added to your apps'
          ]
        };
    }
  },
}; 