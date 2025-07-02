import React from 'react';
import { useAgui, useAguiStats } from '../contexts/AguiContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Activity, BarChart, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AguiTestButton } from './AguiTestButton';

export const AguiStatusBar: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected, connectionState, connect, disconnect, eventCount } = useAgui();
  const { eventStats, totalEventTypes, mostFrequentEventType } = useAguiStats();

  const handleConnectionToggle = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  const getConnectionColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full", getConnectionColor())}>
              {getConnectionIcon()}
              <span className="text-sm font-medium capitalize">{connectionState}</span>
            </div>

            {/* Event Stats */}
            {isConnected && (
              <>
                <Badge variant="outline" className="gap-1">
                  <Activity className="w-3 h-3" />
                  {eventCount} events
                </Badge>

                {totalEventTypes > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <BarChart className="w-3 h-3" />
                    {totalEventTypes} types
                  </Badge>
                )}

                {mostFrequentEventType && (
                  <span className="text-xs text-muted-foreground">
                    Most frequent: {mostFrequentEventType[0].replace('agui.', '')}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Connection Control */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isConnected ? "outline" : "default"}
              onClick={handleConnectionToggle}
              disabled={connectionState === 'connecting'}
            >
              {isConnected ? 'Disconnect' : 'Connect'} AG-UI
            </Button>
            {isConnected && <AguiTestButton />}
          </div>
        </div>

        {/* Connection Error Message */}
        {connectionState === 'error' && (
          <div className="mt-2 text-sm text-red-600">
            Failed to connect to AG-UI server. Make sure the backend is running.
          </div>
        )}

        {/* Live Event Stream Preview */}
        {isConnected && eventCount > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground mb-2">Recent Event Types:</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(eventStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type.replace('agui.', '')} ({count})
                  </Badge>
                ))
              }
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 