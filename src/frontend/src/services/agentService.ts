import axiosInstance from './axiosConfig';
import { Agent, AgentRun, AgentStatistics, CreateAgentData, BuiltinTool, MCPServer } from '../types/agent';

export interface AgentResponse {
  success: boolean;
  data: Agent;
  message?: string;
}

export interface AgentsResponse {
  success: boolean;
  data: Agent[];
  count: number;
}

export interface AgentRunsResponse {
  success: boolean;
  data: AgentRun[];
  count: number;
}

export interface AgentStatisticsResponse {
  success: boolean;
  data: AgentStatistics;
}

export interface SchedulerStatusResponse {
  success: boolean;
  data: {
    isRunning: boolean;
    scheduledAgentsCount: number;
    nextCheckIn?: number;
  };
}

export interface BuiltinToolsResponse {
  success: boolean;
  data: BuiltinTool[];
}

export interface MCPTestResponse {
  success: boolean;
  data: {
    connectable: boolean;
    status?: number;
    statusText?: string;
    error?: string;
    message: string;
  };
}

export interface AgentCapabilitiesResponse {
  success: boolean;
  data: {
    mcpServers: {
      total: number;
      enabled: number;
      capabilities: string[];
      byCategory: {
        ai: number;
        productivity: number;
        data: number;
        files: number;
        search: number;
      };
    };
    tools: {
      total: number;
      enabled: number;
      byType: {
        builtin: number;
        mcp: number;
        custom: number;
      };
    };
    integrations: {
      hasWebScraping: boolean;
      hasNotifications: boolean;
      hasAnalysis: boolean;
      hasMemory: boolean;
      hasFileSystem: boolean;
      hasSearch: boolean;
    };
    sophisticationScore: number;
    sophisticationLevel: string;
  };
}

export interface MCPRecommendationsResponse {
  success: boolean;
  data: {
    agentType: string;
    recommendations: {
      id: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
    }[];
    totalRecommendations: number;
  };
}

export const agentService = {
  // Get all agents for the current user
  async getAgents(): Promise<Agent[]> {
    try {
      const response = await axiosInstance.get<AgentsResponse>('/agents');
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      return [];
    }
  },

  // Get a specific agent by ID
  async getAgentById(agentId: string): Promise<Agent> {
    const response = await axiosInstance.get<AgentResponse>(`/agents/${agentId}`);
    return response.data.data;
  },

  // Create a new agent
  async createAgent(agentData: CreateAgentData): Promise<Agent> {
    const response = await axiosInstance.post<AgentResponse>('/agents', agentData);
    return response.data.data;
  },

  // Update an agent
  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
    const response = await axiosInstance.put<AgentResponse>(`/agents/${agentId}`, updates);
    return response.data.data;
  },

  // Delete an agent
  async deleteAgent(agentId: string): Promise<void> {
    await axiosInstance.delete(`/agents/${agentId}`);
  },

  // Get agent status
  async getAgentStatus(agentId: string): Promise<{
    agentId: string;
    status: string;
    isActive: boolean;
    lastRun?: Date;
    isStuck: boolean;
    canExecute: boolean;
    executorAvailable: boolean;
  }> {
    const response = await axiosInstance.get<{ success: boolean; data: any }>(`/agents/${agentId}/status`);
    return response.data.data;
  },

  // Reset agent status
  async resetAgentStatus(agentId: string): Promise<Agent> {
    const response = await axiosInstance.post<AgentResponse>(`/agents/${agentId}/reset-status`);
    return response.data.data;
  },

  // Execute an agent manually
  async executeAgent(agentId: string, force: boolean = false): Promise<AgentRun> {
    const response = await axiosInstance.post<{ success: boolean; data: AgentRun }>(`/agents/${agentId}/execute`, { force });
    return response.data.data;
  },

  // Pause an agent
  async pauseAgent(agentId: string): Promise<Agent> {
    const response = await axiosInstance.post<AgentResponse>(`/agents/${agentId}/pause`);
    return response.data.data;
  },

  // Resume an agent
  async resumeAgent(agentId: string): Promise<Agent> {
    const response = await axiosInstance.post<AgentResponse>(`/agents/${agentId}/resume`);
    return response.data.data;
  },

  // Get agent runs
  async getAgentRuns(agentId: string, limit: number = 50): Promise<AgentRun[]> {
    try {
      const response = await axiosInstance.get<AgentRunsResponse>(`/agents/${agentId}/runs?limit=${limit}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching agent runs:', error);
      return [];
    }
  },

  // Get all agent runs for the user
  async getUserAgentRuns(limit: number = 50): Promise<AgentRun[]> {
    try {
      const response = await axiosInstance.get<AgentRunsResponse>(`/agents/runs?limit=${limit}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching user agent runs:', error);
      return [];
    }
  },

  // Get agent statistics
  async getAgentStatistics(agentId: string): Promise<AgentStatistics> {
    const response = await axiosInstance.get<AgentStatisticsResponse>(`/agents/${agentId}/statistics`);
    return response.data.data;
  },

  // Get scheduler status
  async getSchedulerStatus(): Promise<{ isRunning: boolean; scheduledAgentsCount: number; nextCheckIn?: number }> {
    const response = await axiosInstance.get<SchedulerStatusResponse>('/agents/scheduler/status');
    return response.data.data;
  },

  // Get available builtin tools
  async getBuiltinTools(): Promise<BuiltinTool[]> {
    const response = await axiosInstance.get<BuiltinToolsResponse>('/agents/builtin-tools');
    return response.data.data;
  },

  // Test MCP server connection
  async testMCPConnection(serverUri: string, authentication?: MCPServer['authentication']): Promise<{
    connectable: boolean;
    status?: number;
    statusText?: string;
    error?: string;
    message: string;
  }> {
    const response = await axiosInstance.post<MCPTestResponse>('/agents/test-mcp', {
      serverUri,
      authentication
    });
    return response.data.data;
  },

  // Get agent capabilities summary
  async getAgentCapabilities(agentId: string): Promise<{
    mcpServers: {
      total: number;
      enabled: number;
      capabilities: string[];
      byCategory: {
        ai: number;
        productivity: number;
        data: number;
        files: number;
        search: number;
      };
    };
    tools: {
      total: number;
      enabled: number;
      byType: {
        builtin: number;
        mcp: number;
        custom: number;
      };
    };
    integrations: {
      hasWebScraping: boolean;
      hasNotifications: boolean;
      hasAnalysis: boolean;
      hasMemory: boolean;
      hasFileSystem: boolean;
      hasSearch: boolean;
    };
    sophisticationScore: number;
    sophisticationLevel: string;
  }> {
    const response = await axiosInstance.get<AgentCapabilitiesResponse>(`/agents/${agentId}/capabilities`);
    return response.data.data;
  },

  // Get MCP recommendations for agent type
  async getMCPRecommendations(agentType: string): Promise<{
    agentType: string;
    recommendations: {
      id: string;
      priority: 'high' | 'medium' | 'low';
      reason: string;
    }[];
    totalRecommendations: number;
  }> {
    const response = await axiosInstance.get<MCPRecommendationsResponse>(`/agents/mcp-recommendations/${agentType}`);
    return response.data.data;
  },

  // Get agent execution status
  async getAgentStatus(agentId: string): Promise<{
    agentId: string;
    status: string;
    isActive: boolean;
    canExecute: boolean;
    isStuck: boolean;
    statusReason: string;
    lastRun: string | null;
    lastRunStatus: string | null;
  }> {
    try {
      const response = await axiosInstance.get(`/agents/${agentId}/status`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching agent status:', error);
      throw error;
    }
  },

  // Reset agent status (for stuck agents)
  async resetAgentStatus(agentId: string): Promise<{
    agentId: string;
    status: string;
    resetAt: string;
  }> {
    try {
      const response = await axiosInstance.post(`/agents/${agentId}/reset-status`);
      return response.data.data;
    } catch (error) {
      console.error('Error resetting agent status:', error);
      throw error;
    }
  },

  // Helper function to get agent by ID (alias for getAgentById)
  async getAgent(agentId: string): Promise<Agent> {
    return this.getAgentById(agentId);
  },
};