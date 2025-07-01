// AG-UI Protocol Event Types and Interfaces
// Based on official AG-UI Protocol specification

// Base Event Interface
export interface BaseAGUIEvent {
  type: string;
  timestamp?: string;
  rawEvent?: any;
}

// Lifecycle Events
export interface RunStartedEvent extends BaseAGUIEvent {
  type: 'RUN_STARTED';
  threadId: string;
  runId: string;
}

export interface RunFinishedEvent extends BaseAGUIEvent {
  type: 'RUN_FINISHED';
  threadId: string;
  runId: string;
}

export interface RunErrorEvent extends BaseAGUIEvent {
  type: 'RUN_ERROR';
  message: string;
  code?: string;
}

export interface StepStartedEvent extends BaseAGUIEvent {
  type: 'STEP_STARTED';
  stepName: string;
  stepId?: string;
}

export interface StepFinishedEvent extends BaseAGUIEvent {
  type: 'STEP_FINISHED';
  stepName: string;
  stepId?: string;
}

// Text Message Events
export interface TextMessageStartEvent extends BaseAGUIEvent {
  type: 'TEXT_MESSAGE_START';
  messageId: string;
  role: 'user' | 'assistant' | 'system';
}

export interface TextMessageContentEvent extends BaseAGUIEvent {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
}

export interface TextMessageEndEvent extends BaseAGUIEvent {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
}

// Tool Call Events
export interface ToolCallStartEvent extends BaseAGUIEvent {
  type: 'TOOL_CALL_START';
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface ToolCallArgsEvent extends BaseAGUIEvent {
  type: 'TOOL_CALL_ARGS';
  toolCallId: string;
  delta: string;
}

export interface ToolCallEndEvent extends BaseAGUIEvent {
  type: 'TOOL_CALL_END';
  toolCallId: string;
}

export interface ToolCallResultEvent extends BaseAGUIEvent {
  type: 'TOOL_CALL_RESULT';
  messageId: string;
  toolCallId: string;
  result: any;
}

// State Management Events
export interface StateUpdateEvent extends BaseAGUIEvent {
  type: 'STATE_UPDATE';
  key: string;
  value: any;
}

export interface ContextUpdateEvent extends BaseAGUIEvent {
  type: 'CONTEXT_UPDATE';
  context: any;
}

// Command Events (for UI controls)
export interface AgentCommandEvent extends BaseAGUIEvent {
  type: 'AGENT_COMMAND';
  command: 'pause' | 'resume' | 'cancel' | 'restart';
  agentId: string;
  userId?: string;
}

// Union type for all AG-UI events
export type AGUIEvent = 
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | StepStartedEvent
  | StepFinishedEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | StateUpdateEvent
  | ContextUpdateEvent
  | AgentCommandEvent;

// AG-UI Event Types enum
export enum AGUIEventType {
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR',
  STEP_STARTED = 'STEP_STARTED',
  STEP_FINISHED = 'STEP_FINISHED',
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_ARGS = 'TOOL_CALL_ARGS',
  TOOL_CALL_END = 'TOOL_CALL_END',
  TOOL_CALL_RESULT = 'TOOL_CALL_RESULT',
  STATE_UPDATE = 'STATE_UPDATE',
  CONTEXT_UPDATE = 'CONTEXT_UPDATE',
  AGENT_COMMAND = 'AGENT_COMMAND'
}

// Client-side AG-UI configuration
export interface AGUIClientConfig {
  endpoint: string;
  userId?: string;
  sessionId?: string;
  reconnectAttempts?: number;
  heartbeatInterval?: number;
}

// Event handler type
export type AGUIEventHandler<T extends AGUIEvent = AGUIEvent> = (event: T) => void;

// Event subscription interface
export interface AGUISubscription {
  unsubscribe: () => void;
}

// AG-UI Client interface
export interface IAGUIClient {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe<T extends AGUIEvent>(
    eventType: T['type'] | '*',
    handler: AGUIEventHandler<T>
  ): AGUISubscription;
  emit(event: AGUIEvent): void;
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error';
}

// Enhanced event data for Synapse-specific extensions
export interface SynapseAGUIEvent extends BaseAGUIEvent {
  userId?: string;
  agentId?: string;
  sessionId?: string;
  metadata?: {
    agentName?: string;
    agentType?: string;
    runDuration?: number;
    itemsProcessed?: number;
    itemsAdded?: number;
  };
}