import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Wifi, WifiOff, X, Smartphone } from 'lucide-react';
import { usePWA, PWAUtils } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Install App Prompt
export const InstallPrompt: React.FC = () => {
  const { isInstallable, showInstallPrompt, dismissInstallPrompt } = usePWA();
  const instructions = PWAUtils.getInstallInstructions();

  if (!isInstallable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="glass border-primary/20 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">Install Synapse</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Get the full app experience with offline access and notifications.
                </p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={showInstallPrompt}
                    className="flex-1 h-8 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Install
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={dismissInstallPrompt}
                    className="h-8 px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

// Update Available Notification
export const UpdateNotification: React.FC = () => {
  const { isUpdateAvailable, updateApp } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="glass border-accent/20 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-full">
                <RefreshCw className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Update Available</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  A new version of Synapse is ready to install.
                </p>
                <Button
                  size="sm"
                  onClick={updateApp}
                  className="w-full h-8 text-xs"
                  variant="secondary"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Update Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

// Offline Status Indicator
export const OfflineIndicator: React.FC = () => {
  const { isOffline } = usePWA();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40"
        >
          <div className="bg-orange-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">You're offline</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Online Status Indicator (shows briefly when coming back online)
export const OnlineIndicator: React.FC = () => {
  const { isOffline } = usePWA();
  const [showOnline, setShowOnline] = React.useState(false);

  React.useEffect(() => {
    if (!isOffline) {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  return (
    <AnimatePresence>
      {showOnline && !isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40"
        >
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Back online</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// PWA Status Badge (for development/debugging)
export const PWAStatusBadge: React.FC = () => {
  const { isInstalled, isOffline, swRegistration } = usePWA();
  const isPWAMode = PWAUtils.isPWAMode();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="glass border-muted/20">
        <CardContent className="p-2">
          <div className="text-xs space-y-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isPWAMode ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span>PWA Mode: {isPWAMode ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isInstalled ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span>Installed: {isInstalled ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${swRegistration ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>SW: {swRegistration ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>Network: {isOffline ? 'Offline' : 'Online'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main PWA Provider Component
export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <InstallPrompt />
      <UpdateNotification />
      <OfflineIndicator />
      <OnlineIndicator />
      <PWAStatusBadge />
    </>
  );
}; 