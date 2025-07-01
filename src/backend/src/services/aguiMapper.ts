import {
  AGUIEvent,
  AGUIEventType,
  RunStartedEvent,
  RunFinishedEvent,
  RunErrorEvent,
  StepStartedEvent,
  StepFinishedEvent,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  StateUpdateEvent,
  SynapseAGUIEvent
} from '../../../shared/aguiTypes';

/**
 * AG-UI Mapper Service
 * Maps agent service events to standardized AG-UI protocol events
 */

export interface AgentUpdateData {
  agentId: string;
  runId?: string;
  status: string;
  message: string;
  timestamp: Date;
  stats?: {
    itemsProcessed: number;
    itemsAdded: number;
    duration: number;
  };
  error?: string;
  progress?: {
    steps: Array<{
      agent: string;
      step: string;
      status: string;
      message: string;
      timestamp: string;
    }>;
    hasActiveProgress: boolean;
    results?: any;
  };
}

export interface CrewProgressData {
  steps: Array<{
    agent: string;
    step: string;
    status: string;
    message: string;
    timestamp: string;
  }>;
  hasActiveProgress: boolean;
  results?: any;
  session_id?: string;
  agent_id: string;
}

/**
 * Map agent status update to AG-UI Run events
 */
export function mapAgentStatusToAGUIEvents(
  userId: string,
  agentId: string,
  agentName: string,
  agentType: string,
  updateData: AgentUpdateData
): SynapseAGUIEvent[] {
  const events: SynapseAGUIEvent[] = [];
  const baseMetadata = {
    agentName,
    agentType,
    itemsProcessed: updateData.stats?.itemsProcessed || 0,
    itemsAdded: updateData.stats?.itemsAdded || 0,
    runDuration: updateData.stats?.duration || 0
  };

  const threadId = `agent_${agentId}`;
  const runId = updateData.runId || `run_${Date.now()}`;

  switch (updateData.status) {
    case 'running':
      events.push({
        type: AGUIEventType.RUN_STARTED,
        threadId,
        runId,
        timestamp: updateData.timestamp.toISOString(),
        userId,
        agentId,
        metadata: baseMetadata
      } as SynapseAGUIEvent);

      // If there's a message, emit it as a text message
      if (updateData.message) {
        const messageId = `msg_${Date.now()}`;
        events.push({
          type: AGUIEventType.TEXT_MESSAGE_START,
          messageId,
          role: 'assistant',
          timestamp: updateData.timestamp.toISOString(),
          userId,
          agentId,
          metadata: baseMetadata
        } as SynapseAGUIEvent);

        events.push({
          type: AGUIEventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: updateData.message,
          timestamp: updateData.timestamp.toISOString(),
          userId,
          agentId,
          metadata: baseMetadata
        } as SynapseAGUIEvent);

        events.push({
          type: AGUIEventType.TEXT_MESSAGE_END,
          messageId,
          timestamp: updateData.timestamp.toISOString(),
          userId,
          agentId,
          metadata: baseMetadata
        } as SynapseAGUIEvent);
      }
      break;

    case 'completed':
      events.push({
        type: AGUIEventType.RUN_FINISHED,
        threadId,
        runId,
        timestamp: updateData.timestamp.toISOString(),
        userId,
        agentId,
        metadata: baseMetadata
      } as SynapseAGUIEvent);

      // Emit completion message
      if (updateData.message) {
        const messageId = `msg_${Date.now()}`;
        events.push({
          type: AGUIEventType.TEXT_MESSAGE_START,
          messageId,
          role: 'assistant',
          timestamp: updateData.timestamp.toISOString(),
          userId,
          agentId,
          metadata: baseMetadata
        } as SynapseAGUIEvent);

        events.push({
          type: AGUIEventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: updateData.message,
          timestamp: updateData.timestamp.toISOString(),
          userId,
          agentId,
          metadata: baseMetadata
        } as SynapseAGUIEvent);

        events.push({
          type: AGUIEventType.TEXT_MESSAGE_END,
          messageId,
          timestamp: updateData.timestamp.toISOString(),
          userId,
          agentId,
          metadata: baseMetadata
        } as SynapseAGUIEvent);
      }
      break;

    case 'failed':
      events.push({
        type: AGUIEventType.RUN_ERROR,
        message: updateData.error || updateData.message || 'Agent execution failed',
        code: 'AGENT_EXECUTION_ERROR',
        timestamp: updateData.timestamp.toISOString(),
        userId,
        agentId,
        metadata: baseMetadata
      } as SynapseAGUIEvent);
      break;

    case 'paused':
      events.push({
        type: AGUIEventType.STATE_UPDATE,
        key: 'agent_status',
        value: 'paused',
        timestamp: updateData.timestamp.toISOString(),
        userId,
        agentId,
        metadata: baseMetadata
      } as SynapseAGUIEvent);
      break;

    case 'resumed':
      events.push({
        type: AGUIEventType.STATE_UPDATE,
        key: 'agent_status',
        value: 'running',
        timestamp: updateData.timestamp.toISOString(),
        userId,
        agentId,
        metadata: baseMetadata
      } as SynapseAGUIEvent);
      break;
  }

  return events;
}

/**
 * Map CrewAI progress data to AG-UI Step events
 */
export function mapCrewProgressToAGUIEvents(
  userId: string,
  agentId: string,
  agentName: string,
  progressData: CrewProgressData
): SynapseAGUIEvent[] {
  const events: SynapseAGUIEvent[] = [];
  const baseMetadata = { agentName, agentType: 'crewai_news' };

  // Map each step to AG-UI step events
  if (progressData.steps && progressData.steps.length > 0) {
    for (const step of progressData.steps) {
      const stepId = `${step.agent}_${step.step}_${Date.parse(step.timestamp)}`;

      if (step.status === 'running' || step.status === 'started') {
        events.push({
          type: AGUIEventType.STEP_STARTED,
          stepName: `${step.agent}: ${step.step}`,
          stepId,
          timestamp: step.timestamp,
          userId,
          agentId,
          sessionId: progressData.session_id,
          metadata: baseMetadata
        } as SynapseAGUIEvent);

        // Emit step message if available
        if (step.message && step.message !== step.step) {
          const messageId = `msg_${stepId}`;
          events.push({
            type: AGUIEventType.TEXT_MESSAGE_START,
            messageId,
            role: 'assistant',
            timestamp: step.timestamp,
            userId,
            agentId,
            sessionId: progressData.session_id,
            metadata: baseMetadata
          } as SynapseAGUIEvent);

          events.push({
            type: AGUIEventType.TEXT_MESSAGE_CONTENT,
            messageId,
            delta: step.message,
            timestamp: step.timestamp,
            userId,
            agentId,
            sessionId: progressData.session_id,
            metadata: baseMetadata
          } as SynapseAGUIEvent);

          events.push({
            type: AGUIEventType.TEXT_MESSAGE_END,
            messageId,
            timestamp: step.timestamp,
            userId,
            agentId,
            sessionId: progressData.session_id,
            metadata: baseMetadata
          } as SynapseAGUIEvent);
        }
      } else if (step.status === 'completed' || step.status === 'finished') {
        events.push({
          type: AGUIEventType.STEP_FINISHED,
          stepName: `${step.agent}: ${step.step}`,
          stepId,
          timestamp: step.timestamp,
          userId,
          agentId,
          sessionId: progressData.session_id,
          metadata: baseMetadata
        } as SynapseAGUIEvent);
      }
    }
  }

  // If there are results, emit state update
  if (progressData.results) {
    events.push({
      type: AGUIEventType.STATE_UPDATE,
      key: 'crew_results',
      value: progressData.results,
      timestamp: new Date().toISOString(),
      userId,
      agentId,
      sessionId: progressData.session_id,
      metadata: baseMetadata
    } as SynapseAGUIEvent);
  }

  return events;
}

/**
 * Map agent log entry to AG-UI Text Message events
 */
export function mapAgentLogToAGUIEvents(
  userId: string,
  agentId: string,
  agentName: string,
  logLevel: string,
  logMessage: string,
  logData?: any
): SynapseAGUIEvent[] {
  const events: SynapseAGUIEvent[] = [];
  const messageId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  const metadata = { agentName, logLevel, logData };

  // Only emit significant log messages as text messages
  if (logLevel === 'info' || logLevel === 'error' || logLevel === 'warn') {
    events.push({
      type: AGUIEventType.TEXT_MESSAGE_START,
      messageId,
      role: 'system',
      timestamp,
      userId,
      agentId,
      metadata
    } as SynapseAGUIEvent);

    events.push({
      type: AGUIEventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta: `[${logLevel.toUpperCase()}] ${logMessage}`,
      timestamp,
      userId,
      agentId,
      metadata
    } as SynapseAGUIEvent);

    events.push({
      type: AGUIEventType.TEXT_MESSAGE_END,
      messageId,
      timestamp,
      userId,
      agentId,
      metadata
    } as SynapseAGUIEvent);
  }

  return events;
}

/**
 * Map agent statistics to AG-UI State Update event
 */
export function mapAgentStatsToAGUIEvent(
  userId: string,
  agentId: string,
  agentName: string,
  stats: any
): SynapseAGUIEvent {
  return {
    type: AGUIEventType.STATE_UPDATE,
    key: 'agent_statistics',
    value: stats,
    timestamp: new Date().toISOString(),
    userId,
    agentId,
    metadata: { agentName }
  } as SynapseAGUIEvent;
}

/**
 * Create AG-UI command event for agent control
 */
export function createAgentCommandEvent(
  command: 'pause' | 'resume' | 'cancel' | 'restart',
  agentId: string,
  userId?: string
): SynapseAGUIEvent {
  return {
    type: AGUIEventType.AGENT_COMMAND,
    command,
    agentId,
    userId,
    timestamp: new Date().toISOString()
  } as SynapseAGUIEvent;
}

/**
 * Utility function to create unique IDs
 */
export function generateAGUIId(prefix: string = 'ag'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate AG-UI event structure
 */
export function validateAGUIEvent(event: any): event is AGUIEvent {
  return (
    event &&
    typeof event === 'object' &&
    typeof event.type === 'string' &&
    Object.values(AGUIEventType).includes(event.type as AGUIEventType)
  );
}