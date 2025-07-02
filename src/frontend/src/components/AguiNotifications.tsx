import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAguiEvent } from '../contexts/AguiContext';
import { AGUIEventType } from '../types/aguiTypes';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Activity,
  Zap,
  MessageSquare 
} from 'lucide-react';

export const AguiNotifications: React.FC = () => {
  const { toast } = useToast();

  // Listen for run started events
  useAguiEvent(AGUIEventType.RUN_STARTED, (event) => {
    const synapseEvent = event as any;
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" />
          Agent Started
        </div>
      ) as any,
      description: `${synapseEvent.rawEvent?.agentName || 'Agent'} has started execution`,
      duration: 3000,
    });
  }, []);

  // Listen for run completed events
  useAguiEvent(AGUIEventType.RUN_COMPLETED, (event) => {
    const synapseEvent = event as any;
    const agentName = synapseEvent.rawEvent?.agentName || 'Agent';
    const itemsAdded = synapseEvent.rawEvent?.itemsAdded || 0;
    
    toast({
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Run Completed
        </div>
      ) as any,
      description: `${agentName} completed successfully${itemsAdded > 0 ? ` - ${itemsAdded} items added` : ''}`,
      duration: 5000,
    });
  }, []);

  // Listen for run failed events
  useAguiEvent(AGUIEventType.RUN_FAILED, (event) => {
    const synapseEvent = event as any;
    const agentName = synapseEvent.rawEvent?.agentName || 'Agent';
    const error = synapseEvent.rawEvent?.error || 'Unknown error';
    
    toast({
      title: (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          Run Failed
        </div>
      ) as any,
      description: `${agentName} failed: ${error}`,
      variant: 'destructive',
      duration: 7000,
    });
  }, []);

  // Listen for important step events
  useAguiEvent(AGUIEventType.STEP_STARTED, (event) => {
    // Only notify for important steps
    const stepName = event.stepName.toLowerCase();
    if (stepName.includes('research') || stepName.includes('analysis') || stepName.includes('final')) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" />
            Important Step
          </div>
        ) as any,
        description: event.stepName,
        duration: 2000,
      });
    }
  }, []);

  // Listen for important messages
  useAguiEvent(AGUIEventType.MESSAGE, (event) => {
    const metadata = event.metadata;
    
    // Only show important messages
    if (metadata?.severity === 'error' || metadata?.severity === 'warning') {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Agent Message
          </div>
        ) as any,
        description: event.content,
        variant: metadata.severity === 'error' ? 'destructive' : 'default',
        duration: 5000,
      });
    }
  }, []);

  // Listen for agent paused/resumed events
  useAguiEvent(AGUIEventType.AGENT_PAUSED, (event) => {
    const synapseEvent = event as any;
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-yellow-500" />
          Agent Paused
        </div>
      ) as any,
      description: `${synapseEvent.agentName || 'Agent'} has been paused`,
      duration: 3000,
    });
  }, []);

  useAguiEvent(AGUIEventType.AGENT_RESUMED, (event) => {
    const synapseEvent = event as any;
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-green-500" />
          Agent Resumed
        </div>
      ) as any,
      description: `${synapseEvent.agentName || 'Agent'} has been resumed`,
      duration: 3000,
    });
  }, []);

  return null; // This component doesn't render anything
}; 