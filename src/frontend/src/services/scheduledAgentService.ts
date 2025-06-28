import axiosInstance from './axiosConfig';
import {
  ScheduledAgent,
  CreateScheduledAgentRequest,
  UpdateScheduledAgentRequest,
  ScheduledAgentExecutionHistory
} from '../types/scheduledAgent';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const scheduledAgentService = {
  // Create a new scheduled agent
  async createScheduledAgent(request: CreateScheduledAgentRequest): Promise<ScheduledAgent> {
    try {
      const response = await axiosInstance.post<ApiResponse<ScheduledAgent>>('/scheduled-agents', request);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create scheduled agent');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating scheduled agent:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to create scheduled agent');
    }
  },

  // Get all scheduled agents
  async getScheduledAgents(params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive';
    search?: string;
  }): Promise<{ agents: ScheduledAgent[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);

      const response = await axiosInstance.get<PaginatedResponse<ScheduledAgent>>(
        `/scheduled-agents?${queryParams.toString()}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch scheduled agents');
      }
      
      return {
        agents: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      console.error('Error fetching scheduled agents:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch scheduled agents');
    }
  },

  // Get a specific scheduled agent
  async getScheduledAgent(id: string): Promise<ScheduledAgent> {
    try {
      const response = await axiosInstance.get<ApiResponse<ScheduledAgent>>(`/scheduled-agents/${id}`);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch scheduled agent');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching scheduled agent:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch scheduled agent');
    }
  },

  // Update a scheduled agent
  async updateScheduledAgent(id: string, request: UpdateScheduledAgentRequest): Promise<ScheduledAgent> {
    try {
      const response = await axiosInstance.put<ApiResponse<ScheduledAgent>>(`/scheduled-agents/${id}`, request);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to update scheduled agent');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating scheduled agent:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error('This scheduled agent no longer exists. The page will refresh to show current agents.');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied to this scheduled agent.');
      }
      
      throw new Error(error.response?.data?.error || error.message || 'Failed to update scheduled agent');
    }
  },

  // Toggle active status of a scheduled agent
  async toggleScheduledAgent(id: string): Promise<ScheduledAgent> {
    try {
      const response = await axiosInstance.patch<ApiResponse<ScheduledAgent>>(`/scheduled-agents/${id}/toggle`);
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to toggle scheduled agent');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error toggling scheduled agent:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to toggle scheduled agent');
    }
  },

  // Delete a scheduled agent
  async deleteScheduledAgent(id: string): Promise<void> {
    try {
      const response = await axiosInstance.delete<ApiResponse<void>>(`/scheduled-agents/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete scheduled agent');
      }
    } catch (error: any) {
      console.error('Error deleting scheduled agent:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete scheduled agent');
    }
  },

  // Execute a scheduled agent manually
  async executeScheduledAgent(id: string): Promise<any> {
    try {
      const response = await axiosInstance.post<ApiResponse<any>>(`/scheduled-agents/${id}/execute`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to execute scheduled agent');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error executing scheduled agent:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to execute scheduled agent');
    }
  },

  // Get execution history for a scheduled agent
  async getExecutionHistory(id: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ScheduledAgentExecutionHistory> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await axiosInstance.get<ApiResponse<ScheduledAgentExecutionHistory>>(
        `/scheduled-agents/${id}/history?${queryParams.toString()}`
      );
      
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch execution history');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching execution history:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch execution history');
    }
  },

  // Validate cron expression
  validateCronExpression(expression: string): boolean {
    // Basic cron validation - 5 or 6 fields separated by spaces
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 6) return false;
    
    // Basic field validation (this is simplified - a real implementation would be more thorough)
    const validators = [
      /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+,)*\d+)$/, // minute (0-59)
      /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+,)*\d+)$/, // hour (0-23)
      /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+,)*\d+)$/, // day of month (1-31)
      /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+,)*\d+|[A-Z]{3})$/, // month (1-12 or JAN-DEC)
      /^(\*|\d+|\d+-\d+|\*\/\d+|(\d+,)*\d+|[A-Z]{3})$/, // day of week (0-7 or SUN-SAT)
    ];
    
    // If 6 fields, add year validator
    if (parts.length === 6) {
      validators.push(/^(\*|\d{4}|\d{4}-\d{4})$/); // year
    }
    
    return parts.every((part, index) => validators[index]?.test(part) || false);
  },

  // Get next execution time for a cron expression (simplified)
  getNextExecutionTime(cronExpression: string, timezone: string = 'UTC'): Date | null {
    try {
      // This is a simplified implementation
      // In a real app, you'd use a proper cron parsing library
      const now = new Date();
      const parts = cronExpression.split(' ');
      
      if (parts.length < 5) return null;
      
      const [minute, hour] = parts;
      
      const next = new Date(now);
      
      // Simple parsing for common patterns
      if (minute !== '*') {
        next.setMinutes(parseInt(minute));
      }
      
      if (hour !== '*') {
        next.setHours(parseInt(hour));
      }
      
      // If the time has passed today, move to tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    } catch (error) {
      console.error('Error calculating next execution time:', error);
      return null;
    }
  }
};