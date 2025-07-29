import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Settings, Zap, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { AgentStatus } from '../../types/aguiTypes';
import { ClientOnly3DWrapper } from './ClientOnly3DWrapper';

// Dynamically import Three.js components to prevent SSR issues
const ThreeJSComponents = React.lazy(() => 
  import('./ThreeJSComponents').then(module => ({ default: module.ThreeJSComponents }))
);

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

// 2D Fallback Dashboard - Always works regardless of 3D support
function FallbackDashboard({ 
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

  return (
    <div className="w-full h-96 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700">
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center mb-6">
          <Monitor className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Agent Overview
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Production-ready agent management dashboard
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-md">
          {Object.entries(agentStats).map(([status, count]) => (
            <Card key={status} className="text-center">
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

        {agents.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl">
            {agents.slice(0, 6).map((agent, index) => (
              <Button
                key={agent.id || index}
                variant="outline"
                size="sm"
                onClick={() => onAgentSelect?.(agent.id)}
                className="flex items-center gap-2"
              >
                <div 
                  className={`w-2 h-2 rounded-full ${
                    agent.status === 'running' ? 'bg-green-500' :
                    agent.status === 'idle' ? 'bg-blue-500' :
                    agent.status === 'error' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`}
                />
                <span className="truncate">
                  {agent.name || `Agent ${index + 1}`}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading component for 3D components
function ThreeJSLoader() {
  return (
    <div className="w-full h-96 flex items-center justify-center bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Loading 3D Visualization
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Initializing WebGL components...
          </p>
        </div>
      </div>
    </div>
  );
}

// Error boundary for 3D components
function ThreeJSErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="w-full h-96 flex items-center justify-center bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg border border-red-200 dark:border-red-800">
      <div className="text-center space-y-4 p-6">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            3D Rendering Error
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            {error.message || 'Failed to initialize 3D components'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={resetError}>
              Try Again
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with production-ready 3D handling
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
  enableEnhancedFeatures = false,
  onAgentSelect
}: ProductionReady3DDashboardProps) {
  const [use3D, setUse3D] = useState(true);
  const [threeJSError, setThreeJSError] = useState<Error | null>(null);

  // Reset error when toggling modes
  const handleToggle3D = useCallback(() => {
    setUse3D(!use3D);
    setThreeJSError(null);
  }, [use3D]);

  // Reset error handler
  const resetThreeJSError = useCallback(() => {
    setThreeJSError(null);
  }, []);

  // Handle Three.js component errors
  const handleThreeJSError = useCallback((error: Error) => {
    console.error('Three.js Component Error:', error);
    setThreeJSError(error);
    setUse3D(false);
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agents Dashboard {use3D && !threeJSError ? '(3D)' : '(2D)'}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle3D}
            className="flex items-center gap-2"
          >
            {use3D ? (
              <>
                <Monitor className="h-4 w-4" />
                2D View
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Try 3D View
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!use3D || threeJSError ? (
          // Show 2D fallback
          <>
            <FallbackDashboard agents={agents} onAgentSelect={onAgentSelect} />
            {threeJSError && (
              <div className="mt-4">
                <ThreeJSErrorFallback error={threeJSError} resetError={resetThreeJSError} />
              </div>
            )}
          </>
        ) : (
          // Show 3D with proper client-side rendering
          <ClientOnly3DWrapper fallback={<ThreeJSLoader />}>
            <Suspense fallback={<ThreeJSLoader />}>
              <div className="w-full h-96 rounded-lg overflow-hidden">
                <ThreeJSComponents
                  agents={agents}
                  theme={theme}
                  onAgentSelect={onAgentSelect}
                  onError={handleThreeJSError}
                />
              </div>
            </Suspense>
          </ClientOnly3DWrapper>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductionReady3DDashboard;