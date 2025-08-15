import React, { useEffect, useState, useCallback, useRef, memo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { agentService } from '../services/agentService';
import { Agent, AgentRun } from '../types/agent';
import { ErrorHandler } from '@/utils/errorHandler';
import { useNavigate } from 'react-router-dom';
import { useAgui } from '../contexts/AguiContext';
import { EnhancedAgentCard } from '@/components/EnhancedAgentCard';
import { MobileAgentCard } from '@/components/MobileAgentCard';
import { useIsMobile } from '@/hooks/useMobileDetection';
import { StatusGrid, LiveActivityIndicator } from '@/components/AgentStatusIndicator';

// Add error logging
console.log('[AgentsPage] Component loading...');

// Performance optimized imports
import { VirtualizedAgentGrid } from '@/components/VirtualizedAgentGrid';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { 
  useOptimizedAgents, 
  useOptimizedAgentRuns, 
  useCacheManagement,
  useBackgroundSync 
} from '@/hooks/useOptimizedData';

// Lazy-loaded components for code splitting
import {
  LazyMetricsDashboard,
  LazyAgentCreationWizard,
  LazyAguiLiveDashboard,
  LazyAgentActivityDashboard,
  LazyAgentStepTimeline,
  LazyDebugPanel,
  LoadingFallback,
  LazyWrapper,
  preloadCriticalComponents,
} from '@/components/LazyComponents';

// Production-safe 2D Dashboard with zero Three.js dependencies
const ProductionSafe2DDashboard = React.lazy(() => 
  import('@/components/3D/ProductionSafe2DDashboard')
);

// Other imports remain the same
import { DashboardHealthCheck } from '@/components/DashboardHealthCheck';
import { AguiStatusBar } from '@/components/AguiStatusBar';
import { 
  containerVariants, 
  fabVariants, 
  modalVariants,
  cardVariants,
  statusVariants,
  slideVariants,
  loadingVariants,
  animationConfig,
  springPhysics,
  pageVariants 
} from '@/utils/animations';
import { 
  useStaggeredAnimation, 
  useScrollAnimation,
  useAnimatedCounter,
  useFeedbackAnimation 
} from '@/hooks/useAnimations';
import { AnimatedButton, FloatingActionButton } from '@/components/animations/AnimatedButton';
import { AnimatedStatusIndicator, ConnectionStatus } from '@/components/animations/AnimatedStatusIndicator';
import { AgentCardSkeleton, SkeletonGrid } from '@/components/animations/LoadingAnimations';
import { PageTransitionManager } from '@/components/animations/PageTransitionManager';
import { 
  typography, 
  spacing, 
  shadows,
  getAgentStatusColor,
  getAgentTypeColor,
  agentColors,
  borderRadius 
} from '@/utils/designSystem';
import {
  Bot,
  Plus,
  Play,
  Pause,
  Settings,
  Trash2,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Twitter,
  Newspaper,
  Zap,
  RotateCcw,
  Wifi,
  WifiOff,
  BarChart3,
  Grid3X3,
  Box,
} from 'lucide-react';
import {
  DialogTrigger,
} from '@/components/ui/dialog';
import { AguiTestButton } from '@/components/AguiTestButton';

// Memoized component for better performance
const AgentsPage: React.FC = memo(() => {
  console.log('[AgentsPage] Rendering component...');
  
  const { isConnected, connectionState, eventCount } = useAgui();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Performance optimized data hooks
  const {
    agents,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
    updateAgentOptimistically,
    addAgentOptimistically,
    removeAgentOptimistically,
  } = useOptimizedAgents({
    pollingInterval: 30000, // 30 seconds
    enableRealtime: true,
    staleWhileRevalidate: true,
  });

  const {
    runs: recentRuns,
    loading: runsLoading,
    refresh: refreshRuns,
  } = useOptimizedAgentRuns({
    limit: 20,
    pollingInterval: 15000, // 15 seconds
  });

  // Cache management
  const { clearAllCaches, getCacheStats } = useCacheManagement();
  
  // Background sync for offline support
  const { isOnline, pendingOperations } = useBackgroundSync();

  // Local state
  const [executingAgents, setExecutingAgents] = useState<Set<string>>(new Set());
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<{ isRunning: boolean; scheduledAgentsCount: number } | null>(null);
  const [isDashboardHealthy, setIsDashboardHealthy] = useState(true);
  
  // Debouncing for execution calls
  const executionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Wizard state
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  
  // View state - toggle between agent cards, analytics dashboard, and dashboard visualization
  const [currentView, setCurrentView] = useState<'agents' | 'analytics' | 'dashboard'>('agents');
  const [enableDashboardFeatures, setEnableDashboardFeatures] = useState(true);
  const [selectedAgentDashboard, setSelectedAgentDashboard] = useState<string | null>(null);

  // Preload critical components on mount
  useEffect(() => {
    preloadCriticalComponents();
  }, []);

  // Convert Agent data to format expected by dashboard components
  const convertAgentsForDashboard = useCallback((agentList: Agent[]) => {
    return agentList.map(agent => ({
      id: agent._id,
      name: agent.name,
      type: agent.type || 'agent',
      status: agent.isActive ? 'running' : agent.lastExecutionResult?.status === 'error' ? 'error' : 
              agent.lastExecutionResult?.status === 'success' ? 'completed' : 'idle',
      performance: {
        tasksCompleted: agent.stats?.totalExecutions || 0,
        successRate: agent.stats?.successRate || 0,
        avgResponseTime: agent.stats?.averageExecutionTime || 0
      }
    }));
  }, []);

  // Fetch scheduler status (not optimized since it's less frequent)
  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const statusData = await agentService.getSchedulerStatus();
      setSchedulerStatus(statusData);
    } catch (error) {
      // Silently handle backend connection issues in development
      // Only log if it's not a network error
      if (error.code !== 'ERR_NETWORK') {
        console.warn('Failed to fetch scheduler status:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetchSchedulerStatus();
  }, [fetchSchedulerStatus]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      executionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      executionTimeouts.current.clear();
    };
  }, []);

  // Combined loading state
  const loading = agentsLoading || runsLoading;

  const handleAgentCreated = useCallback((createdAgent: Agent) => {
    // Optimistic update
    addAgentOptimistically(createdAgent);
    setShowCreateWizard(false);
    
    // Refresh data in background to ensure consistency
    setTimeout(() => {
      refreshAgents();
    }, 1000);
  }, [addAgentOptimistically, refreshAgents]);

  // Debounced execution function to prevent rapid multiple clicks
  const debouncedExecuteAgent = useCallback((agentId: string, force: boolean = false) => {
    // Clear any existing timeout for this agent
    const existingTimeout = executionTimeouts.current.get(agentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
      handleExecuteAgentInternal(agentId, force);
      executionTimeouts.current.delete(agentId);
    }, 300); // 300ms debounce

    executionTimeouts.current.set(agentId, timeout);
  }, []);

  const handleExecuteAgent = (agentId: string, force: boolean = false) => {
    debouncedExecuteAgent(agentId, force);
  };

  const handleExecuteAgentInternal = async (agentId: string, force: boolean = false) => {
    // Prevent multiple executions
    if (executingAgents.has(agentId)) {
      console.log('Agent execution already in progress, ignoring duplicate request');
      return;
    }

    try {
      setExecutingAgents(prev => new Set(prev).add(agentId));

      // Check agent status first
      const status = await agentService.getAgentStatus(agentId);
      
      if (!status.canExecute && !force) {
        if (status.isStuck) {
          // Offer to reset stuck agent
          toast({
            title: 'Agent is stuck',
            description: 'The agent appears to be stuck in running state. It will be reset automatically.',
            variant: 'default',
          });
          
          // Auto-reset stuck agent and try again
          await agentService.resetAgentStatus(agentId);
          await agentService.executeAgent(agentId, true);
        } else if (status.status === 'running') {
          toast({
            title: 'Agent is already running',
            description: 'Please wait for the current execution to complete.',
            variant: 'default',
          });
          return;
        } else if (!status.isActive) {
          toast({
            title: 'Agent is inactive',
            description: 'Please activate the agent before executing.',
            variant: 'destructive',
          });
          return;
        } else if (!status.executorAvailable) {
          toast({
            title: 'Executor not available',
            description: 'The executor for this agent type is not available.',
            variant: 'destructive',
          });
          return;
        }
      } else {
        await agentService.executeAgent(agentId, force);
      }
      
      toast({
        title: 'Success',
        description: 'Agent execution started',
      });

      // Refresh data after a short delay
      setTimeout(() => {
        refreshAgents();
        refreshRuns();
      }, 2000);
    } catch (error: any) {
      const errorInfo = ErrorHandler.processError(error, { 
        action: 'agent_execution',
        agentId,
        component: 'AgentsPage'
      });
      
      // Handle specific error types
      if (error.response?.status === 409) {
        const errorType = error.response?.data?.errorType;
        if (errorType === 'agent_already_running') {
          toast({
            title: 'Agent Already Running',
            description: 'This agent is currently executing. Please wait for it to complete or reset its status.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Agent Execution Conflict',
            description: errorInfo.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Agent Execution Failed',
          description: errorInfo.message,
          variant: 'destructive',
        });
      }
    } finally {
      setExecutingAgents(prev => {
        const newSet = new Set(prev);
        newSet.delete(agentId);
        return newSet;
      });
    }
  };

  const handleResetAgentStatus = async (agentId: string) => {
    try {
      await agentService.resetAgentStatus(agentId);
      toast({
        title: 'Success',
        description: 'Agent status reset successfully',
      });
      refreshAgents();
      refreshRuns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset agent status',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAgent = useCallback(async (agent: Agent) => {
    const newStatus = !agent.isActive;
    
    // Optimistic update
    updateAgentOptimistically(agent._id, { isActive: newStatus });
    
    try {
      if (agent.isActive) {
        await agentService.pauseAgent(agent._id);
        toast({ title: 'Success', description: 'Agent paused' });
      } else {
        await agentService.resumeAgent(agent._id);
        toast({ title: 'Success', description: 'Agent resumed' });
      }
    } catch (error: any) {
      // Revert optimistic update on error
      updateAgentOptimistically(agent._id, { isActive: agent.isActive });
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle agent',
        variant: 'destructive',
      });
    }
  }, [updateAgentOptimistically, toast]);

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    // Optimistic update
    removeAgentOptimistically(agentId);
    
    try {
      await agentService.deleteAgent(agentId);
      
      toast({
        title: 'Success',
        description: 'Agent deleted successfully',
      });
    } catch (error: any) {
      // Revert optimistic update on error
      refreshAgents();
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete agent',
        variant: 'destructive',
      });
    }
  }, [removeAgentOptimistically, refreshAgents, toast]);

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'twitter':
        return <Twitter className="w-5 h-5" />;
      case 'news':
        return <Newspaper className="w-5 h-5" />;
      case 'crewai_news':
        return <Zap className="w-5 h-5 text-purple-500" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  const getAgentDisplayName = (type: string) => {
    switch (type) {
      case 'twitter':
        return 'Twitter Agent';
      case 'news':
        return 'News Agent';
      case 'crewai_news':
        return 'CrewAI 2025 Multi-Agent';
      case 'custom':
        return 'Custom Agent';
      default:
        return `${type} Agent`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'idle':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Enhanced loading skeleton using our animation components
  const LoadingSkeleton = () => (
    <PageTransitionManager showLoadingOverlay={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden"
      >
        <div className="relative z-10 container mx-auto p-4 md:p-8 space-y-6">
          {/* Header Skeleton */}
          <motion.div
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
            variants={slideVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-muted/50 rounded-full animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
                <div className="h-4 w-96 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-32 h-10 bg-muted/50 rounded animate-pulse" />
          </motion.div>
          
          {/* Enhanced Cards Skeleton Grid */}
          <SkeletonGrid
            items={6}
            columns={isMobile ? 1 : 3}
            renderItem={(index) => (
              <AgentCardSkeleton
                key={index}
                animation="wave"
                className="h-full"
              />
            )}
          />
        </div>
      </motion.div>
    </PageTransitionManager>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <PageTransitionManager>
        <motion.div 
          className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 -right-32 w-96 h-96 rounded-full opacity-5"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              background: `radial-gradient(circle, ${agentColors.running.primary}, transparent 70%)`,
            }}
          />
          <motion.div
            className="absolute bottom-1/4 -left-32 w-80 h-80 rounded-full opacity-5"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              background: `radial-gradient(circle, ${agentColors.completed.primary}, transparent 70%)`,
            }}
          />
        </div>
        <motion.div 
          className="relative z-10 container mx-auto p-4 md:p-8 space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Health Check - Always visible for system monitoring */}
          <DashboardHealthCheck onHealthChange={setIsDashboardHealthy} />
          
          {/* AG-UI Status Bar */}
          <AguiStatusBar />
          
          {/* AG-UI Test Panel for debugging */}
          <AguiTestButton />
          
          {/* Enhanced Header with Design System */}
          <motion.div
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
          >
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 rounded-2xl"
                style={{ 
                  boxShadow: shadows.glow(agentColors.running.glow),
                  borderRadius: borderRadius.xl 
                }}
              >
                <Bot className="w-10 h-10 text-primary" />
              </motion.div>
              <div className="space-y-2">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    ...typography.hero,
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                  className="flex items-center gap-3"
                >
                  Multi AI Agents
                  {!isDashboardHealthy && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-sm font-normal text-red-500"
                      style={typography.small}
                    >
                      • System Issues
                    </motion.span>
                  )}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground"
                  style={typography.body}
                >
                  Automated content curation agents working 24/7
                  {!isDashboardHealthy && (
                    <span className="text-red-500 ml-2">• Check system health above</span>
                  )}
                </motion.p>
                
                {/* Enhanced AG-UI Connection Status */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 mt-3"
                >
                  <ConnectionStatus
                    isConnected={isConnected}
                    showBandwidth={isConnected}
                    bandwidth={85}
                  />
                  {isConnected && (
                    <motion.div
                      variants={statusVariants.completed}
                      animate="completed"
                      className="px-2 py-1 rounded-md"
                      style={{ 
                        backgroundColor: agentColors.completed.bg,
                        border: `1px solid ${agentColors.completed.border}` 
                      }}
                    >
                      <span 
                        className="text-xs font-medium"
                        style={{ color: agentColors.completed.text, ...typography.caption }}
                      >
                        {eventCount} events
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center bg-muted/50 rounded-lg p-1"
              >
                <AnimatedButton
                  variant={currentView === 'agents' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView('agents')}
                  className="h-8 px-3 text-sm"
                  rippleEffect
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Agents
                </AnimatedButton>
                <AnimatedButton
                  variant={currentView === 'analytics' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView('analytics')}
                  className="h-8 px-3 text-sm"
                  rippleEffect
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </AnimatedButton>
                <AnimatedButton
                  variant={currentView === 'dashboard' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView('dashboard')}
                  className="h-8 px-3 text-sm"
                  rippleEffect
                >
                  <Box className="w-4 h-4 mr-2" />
                  Dashboard
                </AnimatedButton>
              </motion.div>

              {/* Enhanced Create Agent Button */}
              <AnimatedButton
                size="lg" 
                className="relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${agentColors.running.primary}, ${agentColors.completed.primary})`,
                  border: 'none',
                  color: 'white',
                  fontWeight: typography.cardTitle.fontWeight,
                  fontSize: typography.body.fontSize,
                  padding: `${spacing.md} ${spacing.xl}`,
                  borderRadius: borderRadius.lg,
                  boxShadow: shadows.md
                }}
                onClick={() => {
                  console.log('Create Agent button clicked');
                  setShowCreateWizard(true);
                }}
                glowEffect
                rippleEffect
                hapticFeedback
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Agent
              </AnimatedButton>
            </div>
          </motion.div>

          {/* Enhanced Scheduler Status */}
          {schedulerStatus && (
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
            >
              <Card 
                className="border-0 overflow-hidden relative"
                style={{
                  backgroundColor: schedulerStatus.isRunning ? agentColors.running.bg : agentColors.error.bg,
                  border: `1px solid ${schedulerStatus.isRunning ? agentColors.running.border : agentColors.error.border}`,
                  borderRadius: borderRadius.xl,
                  boxShadow: shadows.md
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div
                        variants={statusVariants[schedulerStatus.isRunning ? 'running' : 'error']}
                        animate={schedulerStatus.isRunning ? 'running' : 'error'}
                        className="p-2 rounded-full"
                        style={{
                          backgroundColor: schedulerStatus.isRunning ? agentColors.running.bgDark : agentColors.error.bgDark
                        }}
                      >
                        <Activity 
                          className="w-5 h-5"
                          style={{ 
                            color: schedulerStatus.isRunning ? agentColors.running.primary : agentColors.error.primary 
                          }} 
                        />
                      </motion.div>
                      <div className="space-y-1">
                        <p 
                          className="font-semibold"
                          style={{ 
                            ...typography.cardTitle,
                            color: schedulerStatus.isRunning ? agentColors.running.text : agentColors.error.text
                          }}
                        >
                          Agent Scheduler
                        </p>
                        <p 
                          className="text-muted-foreground"
                          style={{
                            ...typography.small,
                            color: schedulerStatus.isRunning ? agentColors.running.text : agentColors.error.text,
                            opacity: 0.8
                          }}
                        >
                          {schedulerStatus.isRunning ? 'Running' : 'Stopped'} • {schedulerStatus.scheduledAgentsCount} agents scheduled
                        </p>
                      </div>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring' }}
                    >
                      <Badge 
                        className="px-3 py-1 font-medium border-0"
                        style={{
                          backgroundColor: schedulerStatus.isRunning ? agentColors.running.primary : agentColors.error.primary,
                          color: 'white',
                          ...typography.caption
                        }}
                      >
                        {schedulerStatus.isRunning ? 'Active' : 'Inactive'}
                      </Badge>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Main Content - Conditional View */}
          <AnimatePresence mode="wait">
            {currentView === 'agents' ? (
              <motion.div
                key="agents-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Performance Optimized Virtualized Agents Grid */}
                <VirtualizedAgentGrid
                  agents={agents || []}
                  executingAgents={executingAgents}
                  onExecute={handleExecuteAgent}
                  onToggle={handleToggleAgent}
                  onDelete={handleDeleteAgent}
                  onReset={handleResetAgentStatus}
                  formatTimeAgo={formatTimeAgo}
                  loading={loading}
                  className="w-full"
                />

                {/* Enhanced Empty State */}
                {(agents || []).length === 0 && !loading && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center justify-center py-20 px-4"
                  >
                    <motion.div
                      variants={cardVariants}
                      className="text-center space-y-6 max-w-md mx-auto"
                    >
                      <motion.div
                        variants={statusVariants.idle}
                        animate="idle"
                        className="mx-auto p-6 rounded-full"
                        style={{
                          backgroundColor: agentColors.idle.bg,
                          border: `2px solid ${agentColors.idle.border}`
                        }}
                      >
                        <Bot 
                          className="w-16 h-16 mx-auto"
                          style={{ color: agentColors.idle.primary }}
                        />
                      </motion.div>
                      
                      <div className="space-y-3">
                        <motion.h3 
                          variants={cardVariants}
                          style={{
                            ...typography.heading,
                            color: agentColors.idle.text
                          }}
                        >
                          No AI Agents Yet
                        </motion.h3>
                        <motion.p 
                          variants={cardVariants}
                          className="text-muted-foreground leading-relaxed"
                          style={typography.body}
                        >
                          Create your first AI agent to start automating content curation. 
                          Choose from Twitter monitoring, news aggregation, or powerful CrewAI multi-agent systems.
                        </motion.p>
                      </div>
                      
                      <AnimatedButton
                        size="lg"
                        onClick={() => setShowCreateWizard(true)}
                        className="group relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${agentColors.running.primary}, ${agentColors.completed.primary})`,
                          border: 'none',
                          color: 'white',
                          fontWeight: typography.cardTitle.fontWeight,
                          padding: `${spacing.md} ${spacing.xl}`,
                          borderRadius: borderRadius.lg,
                          boxShadow: shadows.lg
                        }}
                        glowEffect
                        rippleEffect
                        hapticFeedback
                        magneticEffect
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your First Agent
                      </AnimatedButton>
                    </motion.div>
                  </motion.div>
                )}

                {/* Enhanced Agent Activity Dashboard - Lazy Loaded */}
                <LazyWrapper 
                  fallbackProps={{ 
                    type: 'skeleton', 
                    message: 'Loading activity dashboard...', 
                    height: 300 
                  }}
                >
                  <LazyAgentActivityDashboard
                    agents={agents || []}
                    onAgentExecute={handleExecuteAgent}
                    onAgentToggle={handleToggleAgent}
                  />
                </LazyWrapper>

                {/* Enhanced Live Agent Execution Timelines - Lazy Loaded */}
                <AnimatePresence>
                  {agents?.filter(agent => agent.status === 'running').map(agent => (
                    <motion.div
                      key={`timeline-${agent._id}`}
                      variants={slideVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      custom="up"
                    >
                      <LazyWrapper 
                        fallbackProps={{ 
                          type: 'skeleton', 
                          message: 'Loading timeline...', 
                          height: 200 
                        }}
                      >
                        <LazyAgentStepTimeline 
                          agentId={agent._id}
                          agentName={agent.name}
                          showMessages={true}
                        />
                      </LazyWrapper>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : currentView === 'analytics' ? (
              <motion.div
                key="analytics-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Analytics Dashboard - Lazy Loaded */}
                <LazyWrapper 
                  fallbackProps={{ 
                    type: 'cards', 
                    message: 'Loading analytics dashboard...',
                    height: 600 
                  }}
                >
                  <LazyMetricsDashboard 
                    agents={agents || []}
                    recentRuns={recentRuns || []}
                  />
                </LazyWrapper>
              </motion.div>
            ) : (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="min-h-[80vh] w-full"
              >
                {/* Enhanced 2D Dashboard */}
                <Suspense fallback={<div className="flex items-center justify-center h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                  <ProductionSafe2DDashboard
                    agents={convertAgentsForDashboard(agents || [])}
                    theme={{
                      primary: '#3b82f6',
                      secondary: '#8b5cf6', 
                      accent: '#06b6d4',
                      background: '#1e293b',
                      environment: 'studio'
                    }}
                    enableEnhancedFeatures={enableDashboardFeatures}
                    enableDataVisualization={true}
                    enablePerformanceMonitoring={true}
                    enableFormations={true}
                    onAgentSelect={(agentId) => {
                      setSelectedAgentDashboard(agentId);
                    }}
                    className="w-full h-full rounded-lg border shadow-lg"
                  />
                </Suspense>
                
                {/* Dashboard Controls Panel */}
                <div className="absolute bottom-4 right-4 bg-black/80 rounded-lg p-3 text-white">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={enableDashboardFeatures}
                        onChange={(e) => setEnableDashboardFeatures(e.target.checked)}
                        className="rounded"
                      />
                      Enhanced Features
                    </label>
                    {selectedAgentDashboard && (
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                        Selected: {agents?.find(a => a._id === selectedAgentDashboard)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

        {/* Enhanced Debug Panel - only shows in development */}
        {import.meta.env.DEV && (
          <>
            {/* Enhanced Floating Debug Button */}
            <FloatingActionButton
              icon={<span className="text-lg">🐛</span>}
              position="bottom-right"
              tooltip="Open Debug Panel"
              onClick={() => setShowDebugPanel(true)}
              style={{
                background: `linear-gradient(135deg, ${agentColors.idle.primary}, ${agentColors.completed.primary})`,
                boxShadow: shadows.coloredGlow(agentColors.idle.glow)
              }}
            />

            {/* Performance Monitor Button */}
            <FloatingActionButton
              icon={<span className="text-lg">⚡</span>}
              position="bottom-left"
              tooltip="Performance Monitor"
              onClick={() => setShowPerformanceMonitor(true)}
              style={{
                background: `linear-gradient(135deg, ${agentColors.running.primary}, ${agentColors.warning.primary})`,
                boxShadow: shadows.coloredGlow(agentColors.running.glow)
              }}
            />
            
            <LazyWrapper 
              fallbackProps={{ 
                type: 'spinner', 
                message: 'Loading debug panel...' 
              }}
            >
              <LazyDebugPanel 
                isVisible={showDebugPanel}
                onClose={() => setShowDebugPanel(false)}
              />
            </LazyWrapper>

            <PerformanceMonitor
              isVisible={showPerformanceMonitor}
              onClose={() => setShowPerformanceMonitor(false)}
              position="bottom-left"
            />
          </>
        )}

        {/* AG-UI Live Dashboard - Lazy Loaded */}
        <LazyWrapper 
          fallbackProps={{ 
            type: 'spinner', 
            message: 'Loading live dashboard...' 
          }}
        >
          <LazyAguiLiveDashboard />
        </LazyWrapper>

        {/* Agent Creation Wizard - Lazy Loaded */}
        <LazyWrapper 
          fallbackProps={{ 
            type: 'skeleton', 
            message: 'Loading creation wizard...',
            height: 500 
          }}
        >
          <LazyAgentCreationWizard 
            open={showCreateWizard}
            onOpenChange={setShowCreateWizard}
            onSuccess={handleAgentCreated}
          />
        </LazyWrapper>

        {/* Offline/Online Status Indicator */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Offline - {pendingOperations} operations queued
                </span>
              </div>
            </div>
          </motion.div>
        )}
        </motion.div>
      </PageTransitionManager>
    );
});

AgentsPage.displayName = 'AgentsPage';

export default AgentsPage;