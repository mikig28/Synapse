import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgui } from '../contexts/AguiContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  X 
} from 'lucide-react';

interface ConnectionStatusNotificationProps {
  showDetails?: boolean;
  className?: string;
  onDismiss?: () => void;
}

export const ConnectionStatusNotification: React.FC<ConnectionStatusNotificationProps> = ({
  showDetails = false,
  className = '',
  onDismiss
}) => {
  const { isConnected, connectionState, connect, eventCount, getStats } = useAgui();
  const [lastConnectionState, setLastConnectionState] = useState(connectionState);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  // Track connection state changes and show notifications
  useEffect(() => {
    if (connectionState !== lastConnectionState) {
      setLastConnectionState(connectionState);
      
      // Show notification for state changes
      let message = '';
      let shouldShow = false;

      switch (connectionState) {
        case 'connecting':
          message = '🔄 Connecting to real-time agent updates...';
          shouldShow = true;
          break;
        case 'connected':
          message = '✅ Connected! Real-time agent updates are active';
          shouldShow = true;
          // Auto-hide success message after 3 seconds
          setTimeout(() => setShowNotification(false), 3000);
          break;
        case 'error':
          message = '❌ Connection lost - agents will continue but updates may be delayed';
          shouldShow = true;
          break;
        case 'disconnected':
          if (lastConnectionState === 'connected') {
            message = '⚠️ Disconnected from real-time updates';
            shouldShow = true;
          }
          break;
      }

      if (shouldShow) {
        setNotificationMessage(message);
        setShowNotification(true);
      }
    }
  }, [connectionState, lastConnectionState]);

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-gray-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionBadgeVariant = () => {
    switch (connectionState) {
      case 'connected':
        return 'default';
      case 'connecting':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'disconnected':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Real-time Updates Active';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      case 'disconnected':
        return 'Offline Mode';
      default:
        return 'Unknown Status';
    }
  };

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await connect();
      setNotificationMessage('🔄 Attempting to reconnect...');
      setShowNotification(true);
    } catch (error) {
      setNotificationMessage('❌ Retry failed - please check your internet connection');
      setShowNotification(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const stats = getStats();

  return (
    <div className={className}>
      {/* Status Badge (Always Visible) */}
      <Badge 
        variant={getConnectionBadgeVariant()} 
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => showDetails && setShowNotification(!showNotification)}
      >
        {getConnectionIcon()}
        <span className="text-xs">{getConnectionStatusText()}</span>
        {eventCount > 0 && isConnected && (
          <span className="text-xs opacity-75">• {eventCount} events</span>
        )}
      </Badge>

      {/* Notification Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <Card className="shadow-lg border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getConnectionIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">AG-UI Connection</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notificationMessage}
                    </p>
                    
                    {/* Retry button for error states */}
                    {(connectionState === 'error' || connectionState === 'disconnected') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetryConnection}
                        disabled={isRetrying}
                        className="mt-2"
                      >
                        {isRetrying ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Retry Connection
                      </Button>
                    )}

                    {/* Connection details */}
                    {showDetails && stats && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>• Events received: {eventCount}</p>
                        <p>• Reconnects: {stats.reconnectCount || 0}</p>
                        <p>• Last heartbeat: {stats.lastHeartbeat ? 'Active' : 'None'}</p>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNotification(false);
                      onDismiss?.();
                    }}
                    className="flex-shrink-0 h-auto p-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Impact Messages */}
      {!isConnected && (
        <div className="mt-2">
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Real-time updates unavailable
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                • Agent progress may not update automatically<br/>
                • You can still start and stop agents normally<br/>
                • Refresh the page to see latest status
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatusNotification;