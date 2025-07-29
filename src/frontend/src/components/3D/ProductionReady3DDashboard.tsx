import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Settings, Zap, Users, AlertTriangle, Loader2, Bot } from 'lucide-react';
import { AgentStatus } from '../../types/aguiTypes';
import { Enhanced2DFallback } from './Enhanced2DFallback';
import { ProductionSafe2DDashboard } from './ProductionSafe2DDashboard';

// Types
export interface SceneTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  environment?: string;
}

export interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: number;
}

interface ProductionReady3DDashboardProps {
  agents: AgentStatus[];
  className?: string;
  theme?: SceneTheme;
  enableEnhancedFeatures?: boolean;
  enableDataVisualization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableFormations?: boolean;
  onAgentSelect?: (agentId: string | null) => void;
}

// Simple 2D Fallback Dashboard - Lightweight version
function SimpleFallbackDashboard({ 
  agents, 
  onAgentSelect 
}: { 
  agents: AgentStatus[];
  onAgentSelect?: (agentId: string | null) => void;
}) {
  const agentStats = useMemo(() => {
    const stats = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  }, [agents]);

  if (agents.length === 0) {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700">
        <div className="h-full flex flex-col justify-center items-center p-8">
          <Bot className="h-16 w-16 text-blue-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Agents Available
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create agents to see them visualized here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(agentStats).map(([status, count]) => (
          <Card key={status} className="text-center hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {count}
              </div>
              <Badge 
                variant={
                  status === 'running' ? 'default' :
                  status === 'idle' ? 'secondary' :
                  status === 'error' ? 'destructive' :
                  'outline'
                }
                className="text-xs mt-2"
              >
                {status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {agents.map((agent, index) => (
          <Button
            key={agent.id || index}
            variant="outline"
            size="sm"
            onClick={() => onAgentSelect?.(agent.id)}
            className="flex items-center gap-2 p-3 h-auto"
          >
            <div 
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                agent.status === 'running' ? 'bg-green-500' :
                agent.status === 'idle' ? 'bg-blue-500' :
                agent.status === 'error' ? 'bg-red-500' :
                'bg-yellow-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {agent.name || `Agent ${index + 1}`}
              </div>
              {agent.type && (
                <div className="text-xs text-gray-500 truncate">
                  {agent.type}
                </div>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

// Dashboard mode selector
type DashboardMode = 'simple' | 'enhanced' | 'full';

// Mode configuration
const getModeConfig = (mode: DashboardMode) => {
  switch (mode) {
    case 'simple':
      return {
        title: 'Simple View',
        description: 'Basic agent overview with essential information',
        icon: Monitor
      };
    case 'enhanced':
      return {
        title: 'Enhanced View', 
        description: 'Rich interactive dashboard with animations and metrics',
        icon: Zap
      };
    case 'full':
      return {
        title: 'Full Dashboard',
        description: 'Complete feature set with advanced visualizations',
        icon: Settings
      };
    default:
      return {
        title: 'Dashboard',
        description: 'Agent visualization',
        icon: Monitor
      };
  }
};

// Main component - Production-safe dashboard with multiple modes
export function ProductionReady3DDashboard({
  agents = [],
  className = '',
  theme = {
    primary: '#3b82f6',
    secondary: '#8b5cf6', 
    accent: '#06b6d4',
    background: '#1e293b',
    environment: 'studio'
  },
  enableEnhancedFeatures = true,
  enableDataVisualization = true,
  enablePerformanceMonitoring = true,
  onAgentSelect
}: ProductionReady3DDashboardProps) {
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('enhanced');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const modeConfig = getModeConfig(dashboardMode);

  const handleAgentSelect = useCallback((agentId: string | null) => {
    setSelectedAgent(agentId);
    onAgentSelect?.(agentId);
  }, [onAgentSelect]);

  const cycleDashboardMode = useCallback(() => {
    setDashboardMode(current => {
      switch (current) {
        case 'simple': return 'enhanced';
        case 'enhanced': return 'full';
        case 'full': return 'simple';
        default: return 'enhanced';
      }
    });
  }, []);

  const renderDashboard = () => {
    switch (dashboardMode) {
      case 'simple':
        return (
          <SimpleFallbackDashboard 
            agents={agents} 
            onAgentSelect={handleAgentSelect} 
          />
        );
      case 'enhanced':
        return (
          <Enhanced2DFallback
            agents={agents}
            onAgentSelect={handleAgentSelect}
            theme={theme}
            enableEnhancedFeatures={enableEnhancedFeatures}
            enableDataVisualization={enableDataVisualization}
            showPerformanceMetrics={enablePerformanceMonitoring}
          />
        );
      case 'full':
        return (
          <ProductionSafe2DDashboard
            agents={agents}
            onAgentSelect={handleAgentSelect}
            theme={theme}
            enableEnhancedFeatures={enableEnhancedFeatures}
            enableDataVisualization={enableDataVisualization}
            enablePerformanceMonitoring={enablePerformanceMonitoring}
          />
        );
      default:
        return (
          <Enhanced2DFallback
            agents={agents}
            onAgentSelect={handleAgentSelect}
            theme={theme}
            enableEnhancedFeatures={enableEnhancedFeatures}
            enableDataVisualization={enableDataVisualization}
          />
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agents Dashboard
          <Badge variant="outline" className="ml-2">
            {modeConfig.title}
          </Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cycleDashboardMode}
            className="flex items-center gap-2"
            title={modeConfig.description}
          >
            <modeConfig.icon className="h-4 w-4" />
            Switch View
          </Button>
          
          {agents.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {agents.length} Agent{agents.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderDashboard()}
        
        {/* Global selected agent info */}
        {selectedAgent && dashboardMode === 'simple' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  {agents.find(a => a.id === selectedAgent)?.name || 'Unknown Agent'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {agents.find(a => a.id === selectedAgent)?.status || 'unknown'}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAgentSelect(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductionReady3DDashboard;