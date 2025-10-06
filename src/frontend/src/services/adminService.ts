import axios from './axiosConfig';

export interface UserAnalytics {
  id: string;
  fullName?: string;
  email: string;
  role: 'admin' | 'user';
  isEmailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  totalUsage: number;
  tier: string;
  estimatedCost: number;
  flags: {
    isPowerUser: boolean;
    isNewUser: boolean;
    isChurnRisk: boolean;
    hasHitLimits: boolean;
  };
  metadata?: {
    lastIp?: string;
    lastUserAgent?: string;
  };
}

export interface PlatformAnalytics {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  adminCount: number;

  // Growth metrics
  userGrowth: {
    daily: Array<{ date: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
    monthly: Array<{ month: string; count: number }>;
  };

  // Activity metrics
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;

  // Feature usage
  topFeatures: Array<{ feature: string; usage: number }>;
  totalUsage: number;

  // Tier distribution
  tierDistribution: Record<string, number>;

  // User flags
  powerUsers: number;
  churnRisk: number;
  newUsers: number;

  // Financial
  averageCost: number;
  revenueProjection: number;
  totalRevenue: number;

  // System health
  systemHealth: {
    apiHealthStatus: 'healthy' | 'degraded' | 'down';
    averageResponseTime: number;
    errorRate: number;
    totalApiCalls: number;
  };
}

export interface RealtimeStats {
  timestamp: string;
  activeUsers: number;
  totalUsers: number;
  apiRequestsLastHour: number;
  newUsersToday: number;
  systemLoad: {
    cpu?: number;
    memory?: number;
  };
}

export interface UsersListResponse {
  users: UserAnalytics[];
  pagination: {
    page: number;
    pages: number;
    total: number;
  };
}

class AdminService {
  private baseUrl = '/admin';

  /**
   * Get comprehensive platform analytics
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const response = await axios.get(`${this.baseUrl}/analytics`);
    return response.data.data;
  }

  /**
   * Get all users with analytics
   */
  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    role?: 'admin' | 'user';
    tier?: string;
    search?: string;
    isPowerUser?: boolean;
    isChurnRisk?: boolean;
  }): Promise<UsersListResponse> {
    const response = await axios.get(`${this.baseUrl}/users`, { params });
    return {
      users: response.data.data,
      pagination: response.data.pagination,
    };
  }

  /**
   * Get specific user analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics> {
    const response = await axios.get(`${this.baseUrl}/users/${userId}`);
    return response.data.data;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    await axios.patch(`${this.baseUrl}/users/${userId}/role`, { role });
  }

  /**
   * Get real-time statistics
   */
  async getRealtimeStats(): Promise<RealtimeStats> {
    const response = await axios.get(`${this.baseUrl}/realtime-stats`);
    return response.data.data;
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<PlatformAnalytics['systemHealth']> {
    const response = await axios.get(`${this.baseUrl}/system-health`);
    return response.data.data;
  }
}

export const adminService = new AdminService();
export default adminService;
