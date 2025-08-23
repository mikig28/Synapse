/**
 * Enhanced Agent Card Component
 * Premium design with progressive disclosure, smooth animations, and WCAG 2.1 AA accessibility
 */

import React, { useState, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Agent } from '@/types/agent';
import { useAccessibilityContext } from '@/contexts/AccessibilityContext';
import { useAnimationContext, useHapticFeedback } from '@/contexts/AnimationContext';
import { EnhancedAnimatedCard, MagneticButton } from '@/components/animations/EnhancedAnimatedComponents';
import { SwipeableCard, FloatingTooltip, CelebrationEffect } from '@/components/animations/PremiumInteractions';
import { 
  agentColors, 
  getAgentStatusColor, 
  getAgentTypeColor, 
  typography, 
  spacing, 
  shadows 
} from '@/utils/designSystem';
import { 
  cardVariants, 
  statusVariants, 
  expandVariants, 
  springPhysics,
  springConfigs,
  successFeedback,
  errorFeedback,
  metricVariants,
  animationConfig 
} from '@/utils/animations';
import { 
  useInteractionAnimation, 
  useFeedbackAnimation, 
  useStatusAnimation
} from '@/hooks/useAnimations';
import { useAnimatedCounter } from '@/hooks/useDataAnimations';
import { AnimatedButton } from '@/components/animations/AnimatedButton';
import { AnimatedStatusIndicator, StatusBadge } from '@/components/animations/AnimatedStatusIndicator';
import {
  Bot,
  Play,
  Pause,
  Settings,
  Edit,
  Trash2,
  Loader2,
  Twitter,
  Newspaper,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Target,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

interface EnhancedAgentCardProps {
  agent: Agent;
  isExecuting: boolean;
  onExecute: (agentId: string) => void;
  onToggle: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onReset: (agentId: string) => void;
  onSettings: (agentId: string) => void;
  formatTimeAgo: (dateString: string) => string;
}

export const EnhancedAgentCard: React.FC<EnhancedAgentCardProps> = ({
  agent,
  isExecuting,
  onExecute,
  onToggle,
  onDelete,
  onReset,
  onSettings,
  formatTimeAgo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { toast } = useToast();
  const { settings, screenReader, isKeyboardUser } = useAccessibilityContext();
  const { preferences } = useAnimationContext();
  const hapticFeedback = useHapticFeedback();
  
  // Accessibility IDs
  const cardId = useId();
  const titleId = `${cardId}-title`;
  const descriptionId = `${cardId}-description`;
  const statusId = `${cardId}-status`;
  const metricsId = `${cardId}-metrics`;
  const actionsId = `${cardId}-actions`;
  
  // Refs for focus management
  const cardRef = useRef<HTMLDivElement>(null);
  const executeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Enhanced animation hooks
  const { controls, handlers, isHovered } = useInteractionAnimation();
  const { controls: feedbackControls, success, error } = useFeedbackAnimation();
  const { status: animatedStatus, changeStatus } = useStatusAnimation(agent.status);
  
  // Animated counters for metrics
  const totalRunsCounter = useAnimatedCounter(agent.statistics.totalRuns, {
    duration: animationConfig.timing.lazy * 1000,
    formatter: (value) => Math.round(value).toString(),
  });
  
  const totalItemsCounter = useAnimatedCounter(agent.statistics.totalItemsAdded, {
    duration: animationConfig.timing.lazy * 1000,
    formatter: (value) => Math.round(value).toString(),
  });
  
  const successRateCounter = useAnimatedCounter(
    Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100),
    {
      duration: animationConfig.timing.lazy * 1000,
      formatter: (value) => `${Math.round(value)}%`,
    }
  );

  const statusColor = getAgentStatusColor(agent.status);
  const typeColor = getAgentTypeColor(agent.type);

  const getAgentIcon = (type: string) => {
    const iconProps = { 
      className: "w-5 h-5", 
      style: { color: typeColor.icon } 
    };
    
    switch (type) {
      case 'twitter':
        return <Twitter {...iconProps} />;
      case 'news':
        return <Newspaper {...iconProps} />;
      case 'crewai_news':
        return <Zap {...iconProps} />;
      default:
        return <Bot {...iconProps} />;
    }
  };

  const getStatusIcon = (status: string) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (status) {
      case 'running':
        return (
          <motion.div variants={statusVariants} animate="running">
            <Loader2 {...iconProps} style={{ color: statusColor.primary }} className="animate-spin" />
          </motion.div>
        );
      case 'idle':
        return (
          <motion.div variants={statusVariants} animate="idle">
            <CheckCircle {...iconProps} style={{ color: statusColor.primary }} />
          </motion.div>
        );
      case 'error':
        return (
          <motion.div variants={statusVariants} animate="error">
            <AlertCircle {...iconProps} style={{ color: statusColor.primary }} />
          </motion.div>
        );
      case 'completed':
        return (
          <motion.div variants={statusVariants} animate="completed">
            <CheckCircle {...iconProps} style={{ color: statusColor.primary }} />
          </motion.div>
        );
      case 'paused':
        return (
          <motion.div variants={statusVariants} animate="paused">
            <Pause {...iconProps} style={{ color: statusColor.primary }} />
          </motion.div>
        );
      default:
        return <Clock {...iconProps} style={{ color: statusColor.primary }} />;
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

  // Accessibility utility functions
  const announceStatusChange = useCallback((oldStatus: string, newStatus: string) => {
    if (settings.announceActions) {
      screenReader.announceStatus(
        `${agent.name} status changed from ${oldStatus} to ${newStatus}`,
        'Agent Status'
      );
    }
  }, [settings.announceActions, agent.name, screenReader]);

  // Handle status changes with animations and announcements
  React.useEffect(() => {
    if (agent.status !== animatedStatus) {
      const oldStatus = animatedStatus;
      changeStatus(agent.status);
      
      // Announce status changes for screen readers
      if (oldStatus && oldStatus !== agent.status) {
        announceStatusChange(oldStatus, agent.status);
      }
    }
  }, [agent.status, animatedStatus, changeStatus, announceStatusChange]);

  const getAgentStatusDescription = (status: string) => {
    const descriptions = {
      running: 'Agent is currently processing tasks',
      idle: 'Agent is ready and waiting for tasks',
      error: 'Agent encountered an error and needs attention',
      completed: 'Agent successfully completed its last task',
      paused: 'Agent is temporarily paused',
    };
    return descriptions[status as keyof typeof descriptions] || 'Agent status unknown';
  };

  const getAgentTypeDescription = (type: string) => {
    const descriptions = {
      twitter: 'Monitors and curates Twitter content',
      news: 'Aggregates and summarizes news articles',
      crewai_news: 'Advanced multi-agent system for comprehensive news analysis',
      custom: 'Custom configured agent',
    };
    return descriptions[type as keyof typeof descriptions] || `${type} agent`;
  };

  const handleExecute = async () => {
    try {
      // Announce action for screen readers
      if (settings.announceActions) {
        screenReader.announce(`Executing ${agent.name}`, 'polite');
      }
      
      // Haptic feedback for execution
      hapticFeedback('medium');
      
      // Provide immediate visual feedback
      await feedbackControls.start(successFeedback);
      onExecute(agent._id);
      
      // Trigger celebration if execution is successful
      if (agent.status === 'completed') {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }
      
      // Success feedback
      if (settings.announceActions) {
        screenReader.announceSuccess(`${agent.name} execution started`);
      }
    } catch (error) {
      // Show error animation
      await error();
      
      // Error haptic feedback
      hapticFeedback('heavy');
      
      // Announce error
      screenReader.announceError('Failed to execute agent', agent.name);
      
      toast({
        title: 'Error',
        description: 'Failed to execute agent',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async () => {
    try {
      const action = agent.isActive ? 'pausing' : 'resuming';
      const newState = agent.isActive ? 'paused' : 'active';
      
      if (settings.announceActions) {
        screenReader.announce(`${action} ${agent.name}`, 'polite');
      }
      
      onToggle(agent);
      
      if (settings.announceActions) {
        screenReader.announceSuccess(`${agent.name} is now ${newState}`);
      }
    } catch (error) {
      screenReader.announceError(`Failed to toggle agent`, agent.name);
    }
  };

  const handleDelete = async () => {
    try {
      if (settings.announceActions) {
        screenReader.announce(`Deleting ${agent.name}`, 'assertive');
      }
      
      onDelete(agent._id);
      
      if (settings.announceActions) {
        screenReader.announceSuccess(`${agent.name} deleted successfully`);
      }
    } catch (error) {
      screenReader.announceError('Failed to delete agent', agent.name);
    }
  };

  const handleReset = async () => {
    try {
      if (settings.announceActions) {
        screenReader.announce(`Resetting ${agent.name} status`, 'polite');
      }
      
      onReset(agent._id);
      
      if (settings.announceActions) {
        screenReader.announceSuccess(`${agent.name} status reset`);
      }
    } catch (error) {
      screenReader.announceError('Failed to reset agent status', agent.name);
    }
  };

  const handleExpand = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    
    if (settings.announceActions) {
      screenReader.announce(
        `Agent details ${newState ? 'expanded' : 'collapsed'}`,
        'polite'
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Keyboard shortcuts for agent actions
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          handleExecute();
          break;
        case ' ':
          event.preventDefault();
          handleToggle();
          break;
        case 'r':
          event.preventDefault();
          handleReset();
          break;
        case 'e':
          event.preventDefault();
          handleExpand();
          break;
        case 's':
          event.preventDefault();
          if (settings.announceActions) {
            screenReader.announce(`Opening settings for ${agent.name}`, 'polite');
          }
          onSettings(agent._id);
          break;
      }
    }
  };

  const cardStyle = {
    background: `linear-gradient(135deg, ${statusColor.bg} 0%, ${statusColor.bgDark} 100%)`,
    borderColor: statusColor.border,
    boxShadow: isHovered ? shadows.coloredGlow(statusColor.glow) : shadows.md,
  };

  // Swipe actions for mobile devices
  const handleSwipeLeft = () => {
    handleDelete();
  };

  const handleSwipeRight = () => {
    handleExecute();
  };

  return (
    <SwipeableCard
      onSwipeLeft={preferences.enableAnimations ? handleSwipeLeft : undefined}
      onSwipeRight={preferences.enableAnimations ? handleSwipeRight : undefined}
      leftAction={
        <div className="bg-red-500 text-white p-2 rounded-full">
          <Trash2 className="w-4 h-4" />
        </div>
      }
      rightAction={
        <div className="bg-green-500 text-white p-2 rounded-full">
          <Play className="w-4 h-4" />
        </div>
      }
      disabled={!preferences.enableAnimations || settings.reducedMotion}
      className="group"
    >
      <EnhancedAnimatedCard
        ref={cardRef}
        variant="premium"
        hoverEffect="magnetic"
        clickEffect="ripple"
        glowColor={statusColor.primary}
        className="h-full"
        onKeyDown={handleKeyDown}
        {...handlers}
        role="article"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId} ${statusId}`}
        tabIndex={0}
        style={{
          outline: isKeyboardUser ? 'none' : undefined,
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 rounded-lg"
                style={{ 
                  backgroundColor: typeColor.bg,
                  border: `1px solid ${typeColor.primary}20`
                }}
                whileHover={!settings.reducedMotion ? { scale: 1.1 } : undefined}
                transition={springConfigs.gentle}
                role="img"
                aria-label={`${getAgentDisplayName(agent.type)} icon`}
              >
                {getAgentIcon(agent.type)}
              </motion.div>
              <div>
                <h3 
                  id={titleId}
                  className="font-semibold text-gray-900 dark:text-white"
                  style={typography.cardTitle}
                >
                  {agent.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    id={descriptionId}
                    className="text-gray-600 dark:text-gray-300"
                    style={typography.small}
                    aria-label={getAgentTypeDescription(agent.type)}
                  >
                    {getAgentDisplayName(agent.type)}
                  </span>
                  {agent.type === 'crewai_news' && (
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                      role="status"
                      aria-label="Enhanced agent with advanced capabilities"
                    >
                      Enhanced
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Enhanced Status Section */}
            <div 
              id={statusId}
              className="flex items-center gap-2"
              role="status"
              aria-label={`Agent status: ${getAgentStatusDescription(agent.status)}`}
            >
              <AnimatedStatusIndicator
                status={agent.status}
                size="sm"
                showLabel={false}
                showPulse={agent.status === 'running'}
                showGlow={isHovered}
                aria-label={getAgentStatusDescription(agent.status)}
              />
              <StatusBadge
                status={agent.isActive ? 'idle' : 'paused'}
                variant="subtle"
                size="sm"
                aria-label={agent.isActive ? 'Agent is active' : 'Agent is paused'}
              />
              {/* Prominent Edit Button - Always Visible */}
              <AnimatedButton
                size="sm"
                variant="default"
                onClick={() => onSettings(agent._id)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                rippleEffect={!settings.reducedMotion}
                hapticFeedback={settings.hapticFeedback}
                aria-label={`Edit ${agent.name} settings`}
                title="Edit agent settings and configuration"
              >
                <Edit className="w-3 h-3" aria-hidden="true" />
                <span className="text-xs font-semibold">Edit</span>
              </AnimatedButton>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {agent.description && (
            <p 
              className="text-gray-600 dark:text-gray-300 line-clamp-2"
              style={typography.body}
            >
              {agent.description}
            </p>
          )}

          {/* Enhanced Metrics Grid with Animated Counters */}
          <div 
            id={metricsId}
            className="grid grid-cols-3 gap-3"
            role="group"
            aria-label="Agent performance metrics"
          >
            {[
              { 
                label: 'Runs', 
                counter: totalRunsCounter, 
                index: 0, 
                description: `Total number of times this agent has been executed: ${agent.statistics.totalRuns}`,
                ariaLabel: `${agent.statistics.totalRuns} total runs`
              },
              { 
                label: 'Items', 
                counter: totalItemsCounter, 
                index: 1, 
                description: `Total items processed by this agent: ${agent.statistics.totalItemsAdded}`,
                ariaLabel: `${agent.statistics.totalItemsAdded} items processed`
              },
              { 
                label: 'Success', 
                counter: successRateCounter, 
                index: 2, 
                description: `Success rate: ${Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100)}%`,
                ariaLabel: `${Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100)}% success rate`
              },
            ].map(({ label, counter, index, description, ariaLabel }) => (
              <motion.div 
                key={label}
                className="text-center p-3 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20"
                variants={!settings.reducedMotion ? metricVariants : undefined}
                custom={index}
                initial={!settings.reducedMotion ? "hidden" : undefined}
                animate={!settings.reducedMotion ? feedbackControls : undefined}
                whileHover={!settings.reducedMotion ? "hover" : undefined}
                role="stat"
                aria-label={ariaLabel}
                title={description}
              >
                <motion.p 
                  className="font-bold text-gray-900 dark:text-white"
                  style={typography.metric}
                  key={counter.value} // Force re-render on value change
                  aria-live={settings.announceActions ? "polite" : "off"}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springPhysics.bouncy}
                >
                  {counter.value}
                </motion.p>
                <p 
                  className="text-gray-500 dark:text-gray-400"
                  style={typography.caption}
                >
                  {label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Last Run Info */}
          {agent.lastRun && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last run: {formatTimeAgo(agent.lastRun)}</span>
            </div>
          )}

          {/* Error Message */}
          {agent.status === 'error' && agent.errorMessage && (
            <motion.div 
              className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={springConfigs.smooth}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{agent.errorMessage}</span>
              </div>
            </motion.div>
          )}

          {/* Enhanced Primary Actions */}
          <div 
            id={actionsId}
            className="flex gap-2"
            role="group"
            aria-label="Agent action buttons"
          >
            <div className="flex-1">
              <FloatingTooltip
                content={`Execute this agent to ${getAgentTypeDescription(agent.type).toLowerCase()}. Keyboard shortcut: Ctrl+Enter`}
                placement="top"
              >
                <MagneticButton
                  ref={executeButtonRef}
                  size="md"
                  variant="premium"
                  magneticStrength="medium"
                  glowEffect={true}
                  rippleEffect={!settings.reducedMotion}
                  hapticFeedback={settings.hapticFeedback}
                  onClick={handleExecute}
                  disabled={isExecuting || agent.status === 'running'}
                  className="w-full font-medium"
                  aria-label={`Execute ${agent.name} agent`}
                  aria-describedby={`${statusId} ${metricsId}`}
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  ) : agent.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  ) : agent.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  {isExecuting ? 'Running...' : agent.status === 'completed' ? 'Completed!' : agent.status === 'error' ? 'Failed' : 'Run Now'}
                </MagneticButton>
              </FloatingTooltip>
            </div>

            <FloatingTooltip
              content={`Edit ${agent.name} settings and configuration. Keyboard shortcut: Ctrl+S`}
              placement="top"
            >
              <AnimatedButton
                size="sm"
                variant="outline"
                onClick={() => onSettings(agent._id)}
                className="px-3 flex items-center gap-1"
                rippleEffect={!settings.reducedMotion}
                hapticFeedback={settings.hapticFeedback}
                aria-label={`Edit ${agent.name} settings`}
                title="Edit agent settings and configuration"
              >
                <Edit className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-medium">Edit</span>
                <span className="sr-only">Edit settings</span>
              </AnimatedButton>
            </FloatingTooltip>

            <AnimatedButton
              size="sm"
              variant="outline"
              onClick={handleToggle}
              className="px-3"
              rippleEffect={!settings.reducedMotion}
              hapticFeedback={settings.hapticFeedback}
              aria-label={agent.isActive ? `Pause ${agent.name}` : `Resume ${agent.name}`}
              title={`${agent.isActive ? 'Pause' : 'Resume'} this agent. Keyboard shortcut: Ctrl+Space`}
            >
              {agent.isActive ? 
                <Pause className="w-4 h-4" aria-hidden="true" /> : 
                <Play className="w-4 h-4" aria-hidden="true" />
              }
              <span className="sr-only">
                {agent.isActive ? 'Pause agent' : 'Resume agent'}
              </span>
            </AnimatedButton>

            {agent.status === 'error' && (
              <AnimatedButton
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="px-3"
                rippleEffect={!settings.reducedMotion}
                hapticFeedback={settings.hapticFeedback}
                aria-label={`Reset ${agent.name} status`}
                title="Reset agent status to clear error state. Keyboard shortcut: Ctrl+R"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Reset status</span>
              </AnimatedButton>
            )}
          </div>

          {/* Progressive Disclosure */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <AnimatedButton
              variant="ghost"
              size="sm"
              className="w-full justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white h-8"
              onClick={handleExpand}
              rippleEffect={false}
              aria-expanded={isExpanded}
              aria-controls={`${cardId}-details`}
              aria-label={`${isExpanded ? 'Hide' : 'Show'} detailed information for ${agent.name}`}
              title={`${isExpanded ? 'Hide' : 'Show'} additional agent details. Keyboard shortcut: Ctrl+E`}
            >
              <span>More Details</span>
              <motion.div
                animate={!settings.reducedMotion ? { rotate: isExpanded ? 180 : 0 } : undefined}
                transition={springPhysics.gentle}
                aria-hidden="true"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </AnimatedButton>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  id={`${cardId}-details`}
                  variants={!settings.reducedMotion ? expandVariants : undefined}
                  initial={!settings.reducedMotion ? "collapsed" : undefined}
                  animate={!settings.reducedMotion ? "expanded" : undefined}
                  exit={!settings.reducedMotion ? "collapsed" : undefined}
                  className="overflow-hidden"
                  role="region"
                  aria-label={`Detailed information for ${agent.name}`}
                >
                  <div className="pt-3 space-y-3">
                    {/* Configuration Details */}
                    <div className="space-y-2">
                      <h4 
                        className="font-medium text-gray-900 dark:text-white text-sm"
                        id={`${cardId}-config-heading`}
                      >
                        Configuration
                      </h4>
                      <div 
                        className="text-xs text-gray-600 dark:text-gray-400 space-y-1"
                        role="list"
                        aria-labelledby={`${cardId}-config-heading`}
                      >
                        {agent.configuration.schedule && (
                          <div className="flex items-center gap-2" role="listitem">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            <span>
                              <span className="sr-only">Execution schedule: </span>
                              Schedule: {agent.configuration.schedule}
                            </span>
                          </div>
                        )}
                        {agent.configuration.maxItemsPerRun && (
                          <div className="flex items-center gap-2" role="listitem">
                            <Target className="w-3 h-3" aria-hidden="true" />
                            <span>
                              <span className="sr-only">Maximum items per execution: </span>
                              Max items: {agent.configuration.maxItemsPerRun}
                            </span>
                          </div>
                        )}
                        {agent.configuration.keywords && agent.configuration.keywords.length > 0 && (
                          <div className="flex items-start gap-2" role="listitem">
                            <Target className="w-3 h-3 mt-0.5" aria-hidden="true" />
                            <span>
                              <span className="sr-only">Monitoring keywords: </span>
                              Keywords: {agent.configuration.keywords.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Statistics */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">Statistics</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                          <span className="font-medium">
                            {Math.round((agent.statistics.successfulRuns / Math.max(agent.statistics.totalRuns, 1)) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Failed Runs:</span>
                          <span className="font-medium">{agent.statistics.failedRuns}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Items Processed:</span>
                          <span className="font-medium">{agent.statistics.totalItemsProcessed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <span className="font-medium">{formatTimeAgo(agent.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Secondary Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex-1">
                        <AnimatedButton
                          size="sm"
                          variant="outline"
                          onClick={() => onSettings(agent._id)}
                          className="w-full"
                          rippleEffect
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </AnimatedButton>
                      </div>
                      <AnimatedButton
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(agent._id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                        rippleEffect
                        hapticFeedback
                      >
                        <Trash2 className="w-4 h-4" />
                      </AnimatedButton>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </EnhancedAnimatedCard>
      
      {/* Celebration Effect */}
      <CelebrationEffect
        trigger={showCelebration}
        type="sparkles"
        intensity="medium"
        duration={2000}
      />
    </SwipeableCard>
  );
};