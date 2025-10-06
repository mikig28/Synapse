import User from '../models/User';
import { Usage } from '../models/Usage';
import { usageTrackingService } from './usageTrackingService';
import { startOfDay, subDays, subWeeks, subMonths } from 'date-fns';

export interface UserAnalytics {
  id: string;
  fullName?: string;
  email: string;
  role: 'admin' | 'user';
  isEmailVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
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

  // Feature usage from existing service
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
  timestamp: Date;
  activeUsers: number;
  totalUsers: number;
  apiRequestsLastHour: number;
  newUsersToday: number;
  systemLoad: {
    cpu?: number;
    memory?: number;
  };
}

export class AdminAnalyticsService {
  private static instance: AdminAnalyticsService;

  static getInstance(): AdminAnalyticsService {
    if (!AdminAnalyticsService.instance) {
      AdminAnalyticsService.instance = new AdminAnalyticsService();
    }
    return AdminAnalyticsService.instance;
  }

  /**
   * Get comprehensive platform analytics for admin dashboard
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = subWeeks(todayStart, 1);
    const monthStart = subMonths(todayStart, 1);

    // Get user metrics
    const [
      totalUsers,
      adminCount,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      userGrowthDaily,
      userGrowthWeekly,
      userGrowthMonthly,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
      this.getUserGrowthDaily(30), // Last 30 days
      this.getUserGrowthWeekly(12), // Last 12 weeks
      this.getUserGrowthMonthly(12), // Last 12 months
    ]);

    // Get activity metrics from usage records
    const [activeToday, activeThisWeek, activeThisMonth] = await Promise.all([
      this.getActiveUserCount('daily', todayStart),
      this.getActiveUserCount('weekly', weekStart),
      this.getActiveUserCount('monthly', monthStart),
    ]);

    // Leverage existing analytics from usageTrackingService
    const existingAnalytics = await usageTrackingService.getUsageAnalytics();

    // Get system health metrics
    const systemHealth = await this.getSystemHealth();

    // Calculate total revenue based on tier distribution
    const totalRevenue = this.calculateTotalRevenue(existingAnalytics.tierDistribution);

    return {
      // User metrics
      totalUsers,
      activeUsers: existingAnalytics.activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      adminCount,

      // Growth metrics
      userGrowth: {
        daily: userGrowthDaily,
        weekly: userGrowthWeekly,
        monthly: userGrowthMonthly,
      },

      // Activity metrics
      activeToday,
      activeThisWeek,
      activeThisMonth,

      // Feature usage from existing service
      topFeatures: existingAnalytics.topFeatures,
      totalUsage: existingAnalytics.totalUsage,

      // Tier distribution
      tierDistribution: existingAnalytics.tierDistribution,

      // User flags
      powerUsers: existingAnalytics.powerUsers,
      churnRisk: existingAnalytics.churnRisk,
      newUsers: await this.getNewUsersCount(),

      // Financial
      averageCost: existingAnalytics.averageCost,
      revenueProjection: existingAnalytics.revenueProjection,
      totalRevenue,

      // System health
      systemHealth,
    };
  }

  /**
   * Get list of all users with analytics
   */
  async getAllUsersWithAnalytics(
    page: number = 1,
    limit: number = 50,
    filters?: {
      role?: 'admin' | 'user';
      tier?: string;
      search?: string;
      isPowerUser?: boolean;
      isChurnRisk?: boolean;
    }
  ): Promise<{ users: UserAnalytics[]; total: number; page: number; pages: number }> {
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    if (filters?.role) query.role = filters.role;
    if (filters?.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: 'i' } },
        { fullName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -emailVerificationToken -telegramBotToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    // Get usage data for each user
    const usersWithAnalytics = await Promise.all(
      users.map(async (user) => {
        const monthlyUsage = await usageTrackingService.getUserUsage(user._id.toString(), 'monthly');

        return {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified || false,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          totalUsage: monthlyUsage?.totalUsageScore || 0,
          tier: monthlyUsage?.billing.tier || 'free',
          estimatedCost: monthlyUsage?.billing.estimatedCost || 0,
          flags: monthlyUsage?.flags || {
            isPowerUser: false,
            isNewUser: true,
            isChurnRisk: false,
            hasHitLimits: false,
          },
          metadata: user.metadata,
        } as UserAnalytics;
      })
    );

    // Apply additional filters based on usage data
    let filteredUsers = usersWithAnalytics;
    if (filters?.tier) {
      filteredUsers = filteredUsers.filter((u) => u.tier === filters.tier);
    }
    if (filters?.isPowerUser !== undefined) {
      filteredUsers = filteredUsers.filter((u) => u.flags.isPowerUser === filters.isPowerUser);
    }
    if (filters?.isChurnRisk !== undefined) {
      filteredUsers = filteredUsers.filter((u) => u.flags.isChurnRisk === filters.isChurnRisk);
    }

    return {
      users: filteredUsers,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single user analytics
   */
  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    const user = await User.findById(userId).select(
      '-password -emailVerificationToken -telegramBotToken'
    );

    if (!user) return null;

    const monthlyUsage = await usageTrackingService.getUserUsage(userId, 'monthly');

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified || false,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      totalUsage: monthlyUsage?.totalUsageScore || 0,
      tier: monthlyUsage?.billing.tier || 'free',
      estimatedCost: monthlyUsage?.billing.estimatedCost || 0,
      flags: monthlyUsage?.flags || {
        isPowerUser: false,
        isNewUser: true,
        isChurnRisk: false,
        hasHitLimits: false,
      },
      metadata: user.metadata,
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    const result = await User.updateOne({ _id: userId }, { $set: { role } });
    return result.modifiedCount > 0;
  }

  /**
   * Get real-time statistics
   */
  async getRealtimeStats(): Promise<RealtimeStats> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = startOfDay(now);

    const [totalUsers, activeUsers, apiRequestsLastHour, newUsersToday] = await Promise.all([
      User.countDocuments(),
      this.getActiveUserCount('daily', todayStart),
      Usage.aggregate([
        {
          $match: {
            updatedAt: { $gte: hourAgo },
          },
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: '$api.totalRequests' },
          },
        },
      ]),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
    ]);

    return {
      timestamp: now,
      activeUsers,
      totalUsers,
      apiRequestsLastHour: apiRequestsLastHour[0]?.totalRequests || 0,
      newUsersToday,
      systemLoad: {
        cpu: undefined, // Can be implemented with OS metrics
        memory: undefined,
      },
    };
  }

  /**
   * Helper: Get user growth for specific period
   */
  private async getUserGrowthDaily(days: number): Promise<Array<{ date: string; count: number }>> {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const startDate = startOfDay(date);
      const endDate = startOfDay(subDays(new Date(), i - 1));

      const count = await User.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate },
      });

      result.push({
        date: startDate.toISOString().split('T')[0],
        count,
      });
    }
    return result;
  }

  private async getUserGrowthWeekly(weeks: number): Promise<Array<{ week: string; count: number }>> {
    const result = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = subWeeks(startOfDay(new Date()), i);
      const weekEnd = subWeeks(startOfDay(new Date()), i - 1);

      const count = await User.countDocuments({
        createdAt: { $gte: weekStart, $lt: weekEnd },
      });

      result.push({
        week: weekStart.toISOString().split('T')[0],
        count,
      });
    }
    return result;
  }

  private async getUserGrowthMonthly(
    months: number
  ): Promise<Array<{ month: string; count: number }>> {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = subMonths(startOfDay(new Date()), i);
      const monthEnd = subMonths(startOfDay(new Date()), i - 1);

      const count = await User.countDocuments({
        createdAt: { $gte: monthStart, $lt: monthEnd },
      });

      result.push({
        month: monthStart.toISOString().split('T')[0].substring(0, 7), // YYYY-MM format
        count,
      });
    }
    return result;
  }

  /**
   * Helper: Get active user count for period
   */
  private async getActiveUserCount(
    periodType: 'daily' | 'weekly' | 'monthly',
    startDate: Date
  ): Promise<number> {
    const result = await Usage.aggregate([
      {
        $match: {
          'period.type': periodType,
          'period.start': { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalUsage: {
            $sum: {
              $add: [
                '$features.searches.count',
                '$features.agents.executionsCount',
                '$features.content.notesCreated',
                '$api.totalRequests',
              ],
            },
          },
        },
      },
      {
        $match: {
          totalUsage: { $gt: 0 },
        },
      },
      {
        $count: 'activeUsers',
      },
    ]);

    return result[0]?.activeUsers || 0;
  }

  /**
   * Helper: Get new users count (last 30 days)
   */
  private async getNewUsersCount(): Promise<number> {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
  }

  /**
   * Helper: Calculate total revenue from tier distribution
   */
  private calculateTotalRevenue(tierDistribution: Record<string, number>): number {
    const pricing = {
      free: 0,
      starter: 29,
      pro: 99,
      enterprise: 299,
    };

    let total = 0;
    for (const [tier, count] of Object.entries(tierDistribution)) {
      total += (pricing[tier as keyof typeof pricing] || 0) * count;
    }

    return total;
  }

  /**
   * Helper: Get system health metrics
   */
  private async getSystemHealth(): Promise<{
    apiHealthStatus: 'healthy' | 'degraded' | 'down';
    averageResponseTime: number;
    errorRate: number;
    totalApiCalls: number;
  }> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentUsage = await Usage.aggregate([
      {
        $match: {
          updatedAt: { $gte: hourAgo },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$api.avgResponseTime' },
          errorRate: { $avg: '$api.errorRate' },
          totalApiCalls: { $sum: '$api.totalRequests' },
        },
      },
    ]);

    const stats = recentUsage[0] || {
      avgResponseTime: 0,
      errorRate: 0,
      totalApiCalls: 0,
    };

    // Determine health status
    let healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (stats.avgResponseTime > 3000 || stats.errorRate > 5) {
      healthStatus = 'degraded';
    }
    if (stats.avgResponseTime > 10000 || stats.errorRate > 20) {
      healthStatus = 'down';
    }

    return {
      apiHealthStatus: healthStatus,
      averageResponseTime: Math.round(stats.avgResponseTime),
      errorRate: Math.round(stats.errorRate * 100) / 100,
      totalApiCalls: stats.totalApiCalls,
    };
  }
}

export const adminAnalyticsService = AdminAnalyticsService.getInstance();
export default adminAnalyticsService;
