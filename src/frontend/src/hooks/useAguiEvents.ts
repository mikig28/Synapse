import { useState, useEffect, useRef, useCallback } from 'react';
import { useAgui, useAguiEvent } from '../contexts/AguiContext';
import {
  AGUIEvent,
  AGUIEventType,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
  TextMessageContentEvent,
  StateUpdateEvent,
  AgentCommandEvent
} from '../../../shared/aguiTypes';

/**
 * Hook for tracking agent execution lifecycle
 */
export const useAgentLifecycle = (agentId?: string) => {
  const [runningRuns, setRunningRuns] = useState<Set<string>>(new Set());
  const [completedRuns, setCompletedRuns] = useState<string[]>([]);
  const [failedRuns, setFailedRuns] = useState<Array<{ runId: string; error: string }>>([]);
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  useAguiEvent(AGUIEventType.RUN_STARTED, (event: RunStartedEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      setRunningRuns(prev => new Set(prev).add(event.runId));
      setCurrentStatus('running');
    }
  }, [agentId]);

  useAguiEvent(AGUIEventType.RUN_FINISHED, (event: RunFinishedEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      setRunningRuns(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.runId);
        return newSet;
      });
      setCompletedRuns(prev => [event.runId, ...prev].slice(0, 10)); // Keep last 10
      setCurrentStatus(runningRuns.size > 1 ? 'running' : 'completed');
    }
  }, [agentId, runningRuns.size]);

  useAguiEvent(AGUIEventType.RUN_ERROR, (event: RunErrorEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      setFailedRuns(prev => [
        { runId: synapseEvent.runId || 'unknown', error: event.message },
        ...prev
      ].slice(0, 10)); // Keep last 10
      setCurrentStatus('failed');
    }
  }, [agentId]);

  return {
    runningRuns: Array.from(runningRuns),
    completedRuns,
    failedRuns,
    currentStatus,
    isRunning: runningRuns.size > 0
  };
};

/**
 * Hook for tracking agent steps and progress
 */
export const useAgentSteps = (agentId?: string) => {
  const [steps, setSteps] = useState<Array<{
    stepId: string;
    stepName: string;
    status: 'started' | 'finished';
    timestamp: string;
    agentId?: string;
  }>>([]);
  const [activeSteps, setActiveSteps] = useState<Set<string>>(new Set());

  useAguiEvent(AGUIEventType.STEP_STARTED, (event: StepStartedEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      const stepData = {
        stepId: event.stepId || `${event.stepName}_${Date.now()}`,
        stepName: event.stepName,
        status: 'started' as const,
        timestamp: event.timestamp || new Date().toISOString(),
        agentId: synapseEvent.agentId
      };
      
      setSteps(prev => [stepData, ...prev].slice(0, 50)); // Keep last 50 steps
      setActiveSteps(prev => new Set(prev).add(stepData.stepId));
    }
  }, [agentId]);

  useAguiEvent(AGUIEventType.STEP_FINISHED, (event: StepFinishedEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      const stepId = event.stepId || `${event.stepName}_${Date.now()}`;
      
      setSteps(prev => prev.map(step => 
        step.stepId === stepId 
          ? { ...step, status: 'finished' as const }
          : step
      ));
      setActiveSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  }, [agentId]);

  return {
    steps,
    activeSteps: Array.from(activeSteps),
    hasActiveSteps: activeSteps.size > 0,
    getStepsByAgent: (targetAgentId: string) => steps.filter(s => s.agentId === targetAgentId)
  };
};

/**
 * Hook for collecting agent messages
 */
export const useAgentMessages = (agentId?: string, maxMessages: number = 100) => {
  const [messages, setMessages] = useState<Array<{
    messageId: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: string;
    agentId?: string;
    isComplete: boolean;
  }>>([]);
  const activeMessagesRef = useRef<Map<string, any>>(new Map());

  useAguiEvent(AGUIEventType.TEXT_MESSAGE_START, (event: any) => {
    if (!agentId || event.agentId === agentId) {
      const messageData = {
        messageId: event.messageId,
        content: '',
        role: event.role,
        timestamp: event.timestamp || new Date().toISOString(),
        agentId: event.agentId,
        isComplete: false
      };
      
      activeMessagesRef.current.set(event.messageId, messageData);
      setMessages(prev => [messageData, ...prev].slice(0, maxMessages));
    }
  }, [agentId, maxMessages]);

  useAguiEvent(AGUIEventType.TEXT_MESSAGE_CONTENT, (event: TextMessageContentEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      const activeMessage = activeMessagesRef.current.get(event.messageId);
      if (activeMessage) {
        activeMessage.content += event.delta;
        setMessages(prev => prev.map(msg => 
          msg.messageId === event.messageId 
            ? { ...msg, content: activeMessage.content }
            : msg
        ));
      }
    }
  }, [agentId]);

  useAguiEvent(AGUIEventType.TEXT_MESSAGE_END, (event: any) => {
    if (!agentId || event.agentId === agentId) {
      activeMessagesRef.current.delete(event.messageId);
      setMessages(prev => prev.map(msg => 
        msg.messageId === event.messageId 
          ? { ...msg, isComplete: true }
          : msg
      ));
    }
  }, [agentId]);

  return {
    messages,
    activeMessages: Array.from(activeMessagesRef.current.values()),
    getMessagesByRole: (role: 'user' | 'assistant' | 'system') => 
      messages.filter(msg => msg.role === role),
    clearMessages: () => {
      setMessages([]);
      activeMessagesRef.current.clear();
    }
  };
};

/**
 * Hook for managing agent state
 */
export const useAgentState = (agentId?: string) => {
  const [state, setState] = useState<Record<string, any>>({});
  const { emit } = useAgui();

  useAguiEvent(AGUIEventType.STATE_UPDATE, (event: StateUpdateEvent) => {
    const synapseEvent = event as any;
    if (!agentId || synapseEvent.agentId === agentId) {
      setState(prev => ({
        ...prev,
        [event.key]: event.value
      }));
    }
  }, [agentId]);

  const sendCommand = useCallback((command: 'pause' | 'resume' | 'cancel' | 'restart') => {
    if (!agentId) {
      console.warn('Cannot send command: agentId not specified');
      return;
    }

    const commandEvent: AgentCommandEvent = {
      type: AGUIEventType.AGENT_COMMAND,
      command,
      agentId,
      timestamp: new Date().toISOString()
    };

    emit(commandEvent);
  }, [agentId, emit]);

  return {
    state,
    sendCommand,
    pauseAgent: () => sendCommand('pause'),
    resumeAgent: () => sendCommand('resume'),
    cancelAgent: () => sendCommand('cancel'),
    restartAgent: () => sendCommand('restart'),
    getStateValue: (key: string) => state[key],
    hasState: (key: string) => key in state
  };
};

/**
 * Hook for real-time event statistics
 */
export const useAguiStats = () => {
  const { getStats, eventCount, lastEvent, connectionState } = useAgui();
  const [eventStats, setEventStats] = useState<Record<string, number>>({});

  useAguiEvent('*', (event: AGUIEvent) => {
    setEventStats(prev => ({
      ...prev,
      [event.type]: (prev[event.type] || 0) + 1
    }));
  }, []);

  return {
    eventCount,
    lastEvent,
    connectionState,
    eventStats,
    clientStats: getStats?.() || null,
    totalEventTypes: Object.keys(eventStats).length,
    mostFrequentEventType: Object.entries(eventStats).sort(([,a], [,b]) => b - a)[0]?.[0]
  };
};

/**
 * Hook for filtering events by user
 */
export const useUserAgentEvents = (userId: string) => {
  const [userEvents, setUserEvents] = useState<AGUIEvent[]>([]);

  useAguiEvent('*', (event: AGUIEvent) => {
    const synapseEvent = event as any;
    if (synapseEvent.userId === userId) {
      setUserEvents(prev => [event, ...prev].slice(0, 100));
    }
  }, [userId]);

  return {
    userEvents,
    getEventsByType: (eventType: string) => 
      userEvents.filter(event => event.type === eventType),
    getEventsByAgent: (agentId: string) => 
      userEvents.filter(event => (event as any).agentId === agentId),
    clearUserEvents: () => setUserEvents([])
  };
};