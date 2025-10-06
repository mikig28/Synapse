import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import { adminService, PlatformAnalytics, RealtimeStats, UserAnalytics } from '@/services/adminService';
import {
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Crown,
  UserX,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const AdminDashboardPage: React.FC = () => {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check admin access
  useEffect(() => {
    if (!isAuthenticated || !isAdmin()) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Fetch analytics data
  useEffect(() => {
    fetchAnalytics();
    fetchUsers();
    fetchRealtimeStats();

    // Refresh realtime stats every 10 seconds
    const interval = setInterval(() => {
      fetchRealtimeStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentPage, selectedRole, searchQuery]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPlatformAnalytics();
      setAnalytics(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      const data = await adminService.getRealtimeStats();
      setRealtimeStats(data);
    } catch (err) {
      console.error('Failed to fetch realtime stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (selectedRole !== 'all') {
        params.role = selectedRole;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await adminService.getAllUsers(params);
      setUsers(response.users);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await adminService.updateUserRole(userId, newRole);
      fetchUsers(); // Refresh user list
      fetchAnalytics(); // Refresh analytics
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-red-500">
          <CardContent className="p-6">
            <p className="text-red-400">{error}</p>
            <Button onClick={fetchAnalytics} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Crown className="w-10 h-10 text-yellow-400" />
              Admin Dashboard
            </h1>
            <p className="text-slate-300 mt-2">
              Platform analytics and user management
            </p>
          </div>
          <Button
            onClick={() => {
              fetchAnalytics();
              fetchUsers();
              fetchRealtimeStats();
            }}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Real-time Stats Bar */}
        {realtimeStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white">
                      {realtimeStats.totalUsers}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Active Now</p>
                    <p className="text-2xl font-bold text-white">
                      {realtimeStats.activeUsers}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">New Today</p>
                    <p className="text-2xl font-bold text-white">
                      {realtimeStats.newUsersToday}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">API Calls/Hour</p>
                    <p className="text-2xl font-bold text-white">
                      {realtimeStats.apiRequestsLastHour}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Overview */}
        {analytics && (
          <>
            {/* User Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">This Month:</span>
                      <span className="text-white font-semibold">
                        +{analytics.newUsersThisMonth}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">This Week:</span>
                      <span className="text-white font-semibold">
                        +{analytics.newUsersThisWeek}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Today:</span>
                      <span className="text-white font-semibold">
                        +{analytics.newUsersToday}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total MRR:</span>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(analytics.totalRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Projection:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(analytics.revenueProjection)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Avg Cost/User:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(analytics.averageCost)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/80 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    User Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Power Users:</span>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        {analytics.powerUsers}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Churn Risk:</span>
                      <Badge variant="secondary" className="bg-red-500/20 text-red-300">
                        {analytics.churnRisk}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Admins:</span>
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                        {analytics.adminCount}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Health */}
            <Card className="bg-slate-800/80 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {analytics.systemHealth.apiHealthStatus === 'healthy' && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {analytics.systemHealth.apiHealthStatus === 'degraded' && (
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  )}
                  {analytics.systemHealth.apiHealthStatus === 'down' && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Status</p>
                    <Badge
                      className={
                        analytics.systemHealth.apiHealthStatus === 'healthy'
                          ? 'bg-green-500/20 text-green-300'
                          : analytics.systemHealth.apiHealthStatus === 'degraded'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-red-500/20 text-red-300'
                      }
                    >
                      {analytics.systemHealth.apiHealthStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Avg Response Time</p>
                    <p className="text-white font-semibold">
                      {analytics.systemHealth.averageResponseTime}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Error Rate</p>
                    <p className="text-white font-semibold">
                      {analytics.systemHealth.errorRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Management Table */}
            <Card className="bg-slate-800/80 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription>
                  Manage users and their roles
                </CardDescription>

                {/* Filters */}
                <div className="flex gap-4 mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-md"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admins</option>
                    <option value="user">Users</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-3 text-slate-300 font-semibold">User</th>
                        <th className="text-left p-3 text-slate-300 font-semibold">Role</th>
                        <th className="text-left p-3 text-slate-300 font-semibold">Tier</th>
                        <th className="text-left p-3 text-slate-300 font-semibold">Usage</th>
                        <th className="text-left p-3 text-slate-300 font-semibold">Last Login</th>
                        <th className="text-left p-3 text-slate-300 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="p-3">
                            <div>
                              <p className="text-white font-medium">{user.email}</p>
                              {user.fullName && (
                                <p className="text-slate-400 text-sm">{user.fullName}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              className={
                                user.role === 'admin'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-white">
                              {user.tier}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <span className="text-white">{user.totalUsage}</span>
                              {user.flags.isPowerUser && (
                                <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                                  Power
                                </Badge>
                              )}
                              {user.flags.isChurnRisk && (
                                <Badge className="bg-red-500/20 text-red-300 text-xs">
                                  Risk
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-slate-300 text-sm">
                            {formatDate(user.lastLogin)}
                          </td>
                          <td className="p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRoleUpdate(
                                  user.id,
                                  user.role === 'admin' ? 'user' : 'admin'
                                )
                              }
                              className="text-xs"
                            >
                              {user.role === 'admin' ? 'Demote' : 'Promote'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <span className="text-white px-4 py-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
