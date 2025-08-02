import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import usageService, { UsageData } from '@/services/usageService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Crown,
  Calendar,
  Search,
  Bot,
  FileText,
  MessageSquare,
  Zap,
  HardDrive,
  DollarSign,
  ArrowUp
} from 'lucide-react';

interface UsageDashboardProps {
  className?: string;
}

export const UsageDashboard: React.FC<UsageDashboardProps> = ({ className = '' }) => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    loadUsageData();
  }, [selectedPeriod]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [currentUsage, history] = await Promise.all([
        usageService.getUserUsage(selectedPeriod),
        usageService.getUserUsageHistory(selectedPeriod, 12)
      ]);

      setUsage(currentUsage);
      setUsageHistory(history.history);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    try {
      await usageService.simulateTierUpgrade(tier as any);
      await loadUsageData(); // Refresh data after upgrade
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-300">
          Failed to load usage data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!usage) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No usage data available</p>
      </div>
    );
  }

  const limits = usageService.getTierLimits(usage.billing.tier);

  // Prepare chart data
  const featureUsageData = [
    { name: 'Searches', value: usage.features.searches.count, icon: Search },
    { name: 'Agents', value: usage.features.agents.executionsCount, icon: Bot },
    { name: 'Documents', value: usage.features.data.documentsUploaded, icon: FileText },
    { name: 'Notes', value: usage.features.content.notesCreated, icon: FileText },
    { name: 'Ideas', value: usage.features.content.ideasCreated, icon: Zap },
    { name: 'Tasks', value: usage.features.content.tasksCreated, icon: Activity }
  ];

  const historyData = usageHistory.map(h => ({
    period: new Date(h.period.start).toLocaleDateString(),
    usage: h.totalUsage || 0,
    cost: h.billing?.estimatedCost || 0
  })).reverse();

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usage Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your Synapse platform usage and billing
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge className={usageService.getTierBadgeColor(usage.billing.tier)}>
            <Crown className="w-3 h-3 mr-1" />
            {usage.billing.tier.toUpperCase()}
          </Badge>
          
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Usage Alerts */}
      {usage.flags.hasHitLimits && (
        <Alert className="border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-yellow-300">
            You've reached limits for: {usage.billing.overageFlags.join(', ')}. 
            Consider upgrading your plan for continued access.
          </AlertDescription>
        </Alert>
      )}

      {usage.flags.isChurnRisk && (
        <Alert className="border-blue-500/20 bg-blue-500/5">
          <TrendingUp className="h-4 w-4" />
          <AlertDescription className="text-blue-300">
            Your usage has decreased recently. Need help getting the most out of Synapse?
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{usage.features.searches.count + usage.features.agents.executionsCount}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">{usageService.formatStorageSize(usage.features.data.totalStorageUsed)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold">${usage.billing.estimatedCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits Left</p>
                <p className="text-2xl font-bold">{usage.billing.credits.remaining}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Details */}
      <Tabs defaultValue="features" className="space-y-4">
        <TabsList>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>
                  Your usage across different features this {selectedPeriod.slice(0, -2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Feature Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Breakdown</CardTitle>
                <CardDescription>
                  Detailed usage by feature category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={featureUsageData.filter(f => f.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {featureUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Search Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Searches</span>
                    <span>{usage.features.searches.count} / {limits.searches === 'Unlimited' ? '∞' : limits.searches}</span>
                  </div>
                  <Progress 
                    value={usageService.calculateUsagePercentage(usage.features.searches.count, limits.searches)} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Vector Searches</span>
                    <span>{usage.features.advanced.vectorSearchQueries}</span>
                  </div>
                  <Progress 
                    value={usageService.calculateUsagePercentage(usage.features.advanced.vectorSearchQueries, limits.searches)} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Agent Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Agent Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Executions</span>
                    <span>{usage.features.agents.executionsCount} / {limits.agentExecutions === 'Unlimited' ? '∞' : limits.agentExecutions}</span>
                  </div>
                  <Progress 
                    value={usageService.calculateUsagePercentage(usage.features.agents.executionsCount, limits.agentExecutions)} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Compute Time</span>
                    <span>{usageService.formatDuration(usage.features.agents.totalExecutionTime)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Total Storage</span>
                    <span>
                      {usageService.formatStorageSize(usage.features.data.totalStorageUsed)} / {
                        limits.storage === 'Unlimited' ? '∞' : usageService.formatStorageSize(limits.storage as number)
                      }
                    </span>
                  </div>
                  <Progress 
                    value={usageService.calculateUsagePercentage(usage.features.data.totalStorageUsed, limits.storage)} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Documents Uploaded</span>
                    <span>{usage.features.data.documentsUploaded}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Export Jobs</span>
                    <span>{usage.features.data.exportJobsCreated} / {limits.exportJobs === 'Unlimited' ? '∞' : limits.exportJobs}</span>
                  </div>
                  <Progress 
                    value={usageService.calculateUsagePercentage(usage.features.data.exportJobsCreated, limits.exportJobs)} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Your usage trends over the past 12 {selectedPeriod}s
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your current billing tier and usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Plan</span>
                  <Badge className={usageService.getTierBadgeColor(usage.billing.tier)}>
                    {usage.billing.tier.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estimated Cost</span>
                  <span className="text-2xl font-bold">${usage.billing.estimatedCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Credits Remaining</span>
                  <span>{usage.billing.credits.remaining}</span>
                </div>
                {usage.billing.overageFlags.length > 0 && (
                  <div className="flex items-center justify-between text-yellow-500">
                    <span className="font-medium">Overages</span>
                    <span>{usage.billing.overageFlags.join(', ')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upgrade Options</CardTitle>
                <CardDescription>
                  Get more features and higher limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleUpgrade('starter')}
                    className="w-full"
                    variant={usage.billing.tier === 'free' ? 'default' : 'outline'}
                    disabled={usage.billing.tier !== 'free'}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Starter Plan - $29/month
                  </Button>
                  <Button 
                    onClick={() => handleUpgrade('pro')}
                    className="w-full"
                    variant={['free', 'starter'].includes(usage.billing.tier) ? 'default' : 'outline'}
                    disabled={!['free', 'starter'].includes(usage.billing.tier)}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Pro Plan - $99/month
                  </Button>
                  <Button 
                    onClick={() => handleUpgrade('enterprise')}
                    className="w-full"
                    variant={usage.billing.tier !== 'enterprise' ? 'default' : 'outline'}
                    disabled={usage.billing.tier === 'enterprise'}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Enterprise Plan - $299/month
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  * Beta testing: Upgrades are simulated for testing purposes
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};