export interface MCPServer {
  name: string;
  serverUri: string;
  enabled: boolean;
  capabilities: string[];
  description?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'apikey';
    credentials?: string;
  };
}

export interface AgentTool {
  name: string;
  type: 'builtin' | 'custom' | 'mcp';
  enabled: boolean;
  configuration?: Record<string, any>;
  description?: string;
  mcpServerId?: string;
}

export interface Agent {
  _id: string;
  userId: string;
  name: string;
  type: 'twitter' | 'news' | 'crewai_news' | 'custom';
  description?: string;
  isActive: boolean;
  configuration: {
    keywords?: string[];
    minLikes?: number;
    minRetweets?: number;
    excludeReplies?: boolean;
    newsSources?: string[];
    categories?: string[];
    language?: string;
    topics?: string[];
    crewaiSources?: {
      reddit?: boolean;
      linkedin?: boolean;
      telegram?: boolean;
      news_websites?: boolean;
    };
    mcpServers?: MCPServer[];
    tools?: AgentTool[];
    schedule?: string;
    maxItemsPerRun?: number;
  };
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'error' | 'paused';
  errorMessage?: string;
  statistics: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalItemsProcessed: number;
    totalItemsAdded: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  _id: string;
  agentId: string | Agent;
  userId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  itemsProcessed: number;
  itemsAdded: number;
  errorMessages: string[];
  logs: {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }[];
  results: {
    summary: string;
    details?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AgentStatistics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalItemsProcessed: number;
  totalItemsAdded: number;
  recentRuns: number;
  recentActivity: number;
  lastRun?: string;
  nextRun?: string;
  status: string;
  readPercentage: number;
}

export interface CreateAgentData {
  name: string;
  type: 'twitter' | 'news' | 'crewai_news' | 'custom';
  description?: string;
  configuration?: {
    keywords?: string[];
    minLikes?: number;
    minRetweets?: number;
    excludeReplies?: boolean;
    newsSources?: string[];
    categories?: string[];
    language?: string;
    topics?: string[];
    crewaiSources?: {
      reddit?: boolean;
      linkedin?: boolean;
      telegram?: boolean;
      news_websites?: boolean;
    };
    mcpServers?: MCPServer[];
    tools?: AgentTool[];
    schedule?: string;
    maxItemsPerRun?: number;
  };
}

export interface BuiltinTool {
  name: string;
  description: string;
  category: 'data' | 'communication' | 'analysis' | 'utility';
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
    default?: any;
  }[];
}