import axiosInstance from './axiosConfig';

export interface UsageData {
  period: {
    start: string;
    end: string;
    type: 'daily' | 'weekly' | 'monthly';
  };
  features: {
    searches: {
      count: number;
      uniqueQueries: number;
      avgResponseTime: number;
      totalResultsReturned: number;
    };
    agents: {
      executionsCount: number;
      totalExecutionTime: number;
      uniqueAgentsUsed: number;
      scheduledAgentsCount: number;
    };
    data: {
      documentsUploaded: number;
      documentsAnalyzed: number;
      totalStorageUsed: number;
      exportJobsCreated: number;
    };
    integrations: {
      whatsappMessages: number;
      telegramMessages: number;
      calendarEvents: number;
      newsArticlesProcessed: number;
    };
    content: {
      notesCreated: number;
      ideasCreated: number;
      tasksCreated: number;
      meetingsCreated: number;
      bookmarksAdded: number;
    };
    advanced: {
      vectorSearchQueries: number;
      aiSummariesGenerated: number;
      videoTranscriptions: number;
      ttsGenerations: number;
    };
  };
  billing: {
    estimatedCost: number;
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    overageFlags: string[];
    credits: {
      used: number;
      remaining: number;
      type: string;
    };
  };
  flags: {
    isPowerUser: boolean;
    isNewUser: boolean;
    isChurnRisk: boolean;
    hasHitLimits: boolean;
  };
}

export interface UsageLimit {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

export interface UsageAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalUsage: number;
  topFeatures: Array<{ feature: string; usage: number }>;
  tierDistribution: Record<string, number>;
  churnRisk: number;
  powerUsers: number;
  averageCost: number;
  revenueProjection: number;
}

export interface TierPricing {
  tiers: Array<{
    id: string;
    name: string;
    price: number;
    period: string;
    features: Record<string, any>;
    popular: boolean;
  }>;
  features: Array<{
    name: string;
    description: string;
  }>;
}

class UsageService {
  private baseUrl = '/usage';

  /**
   * Get current user's usage data
   */
  async getUserUsage(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<UsageData> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/my-usage`, {
        params: { period }
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Get user usage error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get usage data');
    }
  }

  /**
   * Get user's usage history
   */
  async getUserUsageHistory(
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    limit: number = 12
  ): Promise<{
    history: Array<{
      period: { start: string; end: string; type: string };
      totalUsage: number;
      features: any;
      billing: any;
      flags: any;
    }>;
    period: string;
    limit: number;
  }> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/my-usage/history`, {
        params: { period, limit }
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Get user usage history error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get usage history');
    }
  }

  /**
   * Check if user can perform a specific action
   */
  async checkUsageLimit(action: string, feature: string): Promise<UsageLimit> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/check-limit`, {
        action,
        feature
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Check usage limit error:', error);
      throw new Error(error.response?.data?.error || 'Failed to check usage limit');
    }
  }

  /**
   * Track a usage event manually
   */
  async trackUsageEvent(
    feature: string,
    action: string,
    metadata?: any,
    computeTime?: number,
    storageUsed?: number,
    responseTime?: number
  ): Promise<void> {
    try {
      await axiosInstance.post(`${this.baseUrl}/track-event`, {
        feature,
        action,
        metadata,
        computeTime,
        storageUsed,
        responseTime
      });
    } catch (error: any) {
      console.error('Track usage event error:', error);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Get usage analytics (admin)
   */
  async getUsageAnalytics(startDate?: Date, endDate?: Date): Promise<UsageAnalytics> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await axiosInstance.get(`${this.baseUrl}/analytics`, { params });
      return response.data.data;
    } catch (error: any) {
      console.error('Get usage analytics error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get usage analytics');
    }
  }

  /**
   * Get tier pricing information
   */
  async getTierPricing(): Promise<TierPricing> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/pricing`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get tier pricing error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get pricing information');
    }
  }

  /**
   * Simulate tier upgrade (for beta testing)
   */
  async simulateTierUpgrade(tier: 'free' | 'starter' | 'pro' | 'enterprise'): Promise<void> {
    try {
      await axiosInstance.post(`${this.baseUrl}/simulate-upgrade`, { tier });
    } catch (error: any) {
      console.error('Simulate tier upgrade error:', error);
      throw new Error(error.response?.data?.error || 'Failed to simulate tier upgrade');
    }
  }

  /**
   * Format storage size in human readable format
   */
  formatStorageSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration in human readable format
   */
  formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  /**
   * Calculate usage percentage for a feature
   */
  calculateUsagePercentage(used: number, limit: number | string): number {
    if (limit === 'Unlimited' || limit === Infinity) return 0;
    return Math.min((used / (limit as number)) * 100, 100);
  }

  /**
   * Get tier limits for display
   */
  getTierLimits(tier: string) {
    const limits = {
      free: {
        searches: 100,
        agentExecutions: 10,
        storage: 100 * 1024 * 1024, // 100MB
        apiRequests: 1000,
        exportJobs: 3
      },
      starter: {
        searches: 1000,
        agentExecutions: 100,
        storage: 1024 * 1024 * 1024, // 1GB
        apiRequests: 10000,
        exportJobs: 10
      },
      pro: {
        searches: 10000,
        agentExecutions: 1000,
        storage: 10 * 1024 * 1024 * 1024, // 10GB
        apiRequests: 100000,
        exportJobs: 50
      },
      enterprise: {
        searches: 'Unlimited',
        agentExecutions: 'Unlimited',
        storage: 'Unlimited',
        apiRequests: 'Unlimited',
        exportJobs: 'Unlimited'
      }
    };

    return limits[tier as keyof typeof limits] || limits.free;
  }

  /**
   * Get tier color for UI
   */
  getTierColor(tier: string): string {
    const colors = {
      free: 'text-gray-500',
      starter: 'text-blue-500',
      pro: 'text-purple-500',
      enterprise: 'text-gold-500'
    };

    return colors[tier as keyof typeof colors] || colors.free;
  }

  /**
   * Get tier badge color for UI
   */
  getTierBadgeColor(tier: string): string {
    const colors = {
      free: 'bg-gray-500/20 text-gray-300',
      starter: 'bg-blue-500/20 text-blue-300',
      pro: 'bg-purple-500/20 text-purple-300',
      enterprise: 'bg-yellow-500/20 text-yellow-300'
    };

    return colors[tier as keyof typeof colors] || colors.free;
  }

  /**
   * Quick tracking methods for common actions
   */
  async trackSearch(responseTime: number, resultsCount: number, isVector: boolean = false): Promise<void> {
    await this.trackUsageEvent('search', 'query', { resultsCount, unique: true, isVector }, undefined, undefined, responseTime);
  }

  async trackAgentExecution(agentId: string, computeTime: number): Promise<void> {
    await this.trackUsageEvent('agent', 'execute', { agentId }, computeTime);
  }

  async trackContentCreation(contentType: 'note' | 'idea' | 'task' | 'meeting' | 'bookmark'): Promise<void> {
    await this.trackUsageEvent(contentType, 'create');
  }

  async trackIntegrationMessage(platform: 'whatsapp' | 'telegram'): Promise<void> {
    await this.trackUsageEvent(platform, 'message');
  }

  async trackExport(format: string, itemCount: number): Promise<void> {
    await this.trackUsageEvent('export', 'create', { format, itemCount });
  }

  async trackDocumentUpload(fileSize: number): Promise<void> {
    await this.trackUsageEvent('document', 'upload', undefined, undefined, fileSize);
  }

  async trackAISummary(): Promise<void> {
    await this.trackUsageEvent('ai', 'summarize');
  }

  async trackVideoTranscription(): Promise<void> {
    await this.trackUsageEvent('transcription', 'create');
  }

  async trackTTSGeneration(): Promise<void> {
    await this.trackUsageEvent('tts', 'generate');
  }
}

export const usageService = new UsageService();
export default usageService;