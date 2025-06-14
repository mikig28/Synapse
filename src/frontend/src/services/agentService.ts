import axiosInstance from './axiosConfig';
import { Agent, AgentRun, AgentStatistics, CreateAgentData } from '../types/agent';

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

export const agentService = {
  // Get all agents for the current user
  async getAgents(): Promise<Agent[]> {
    const response = await axiosInstance.get<AgentsResponse>('/agents');
    return response.data.data;
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

  // Execute an agent manually
  async executeAgent(agentId: string): Promise<AgentRun> {
    const response = await axiosInstance.post<{ success: boolean; data: AgentRun }>(`/agents/${agentId}/execute`);
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
    const response = await axiosInstance.get<AgentRunsResponse>(`/agents/${agentId}/runs?limit=${limit}`);
    return response.data.data;
  },

  // Get all agent runs for the user
  async getUserAgentRuns(limit: number = 50): Promise<AgentRun[]> {
    const response = await axiosInstance.get<AgentRunsResponse>(`/agents/runs?limit=${limit}`);
    return response.data.data;
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
};