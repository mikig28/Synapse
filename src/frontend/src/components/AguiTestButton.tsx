import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAgui } from '@/contexts/AguiContext';
import { Zap } from 'lucide-react';

export const AguiTestButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isConnected, connectionState, eventCount, getStats } = useAgui();

  const triggerTestEvent = async () => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 
        import.meta.env.VITE_BACKEND_ROOT_URL ||
        (window.location.hostname === 'localhost' 
          ? 'http://localhost:3000' 
          : 'https://synapse-backend-7lq6.onrender.com');

      console.log('[AguiTest] Triggering test event on backend:', backendUrl);
      
      const response = await fetch(`${backendUrl}/api/v1/ag-ui/test-event`);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Test Event Triggered',
          description: `Test AG-UI event emitted successfully. ${result.message}`,
        });
        console.log('[AguiTest] Test event response:', result);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[AguiTest] Error triggering test event:', error);
      toast({
        title: 'Test Failed',
        description: `Failed to trigger test event: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logConnectionInfo = () => {
    const stats = getStats();
    console.log('[AguiTest] Connection Info:', {
      isConnected,
      connectionState,
      eventCount,
      stats
    });
    
    toast({
      title: 'Connection Info Logged',
      description: `Check console for AG-UI connection details. Events: ${eventCount}`,
    });
  };

  return (
    <div className="flex gap-2 items-center p-4 border rounded-lg bg-muted/50">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">AG-UI Test Panel</span>
        <span className="text-xs text-muted-foreground">
          Status: {connectionState} | Events: {eventCount}
        </span>
      </div>
      
      <Button
        onClick={triggerTestEvent}
        disabled={isLoading}
        size="sm"
        variant="outline"
      >
        {isLoading ? 'Triggering...' : 'Test Event'}
      </Button>
      
      <Button
        onClick={logConnectionInfo}
        size="sm"
        variant="ghost"
      >
        Log Info
      </Button>
    </div>
  );
}; 