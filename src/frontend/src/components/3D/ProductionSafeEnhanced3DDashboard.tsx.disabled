import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Conditionally import Three.js only when safe
let Canvas: any = null;
let OrbitControls: any = null;
let Environment: any = null;
let Center: any = null;

// Only import Three.js in development or when explicitly needed
const isThreeJSSafe = typeof window !== 'undefined' && 
                      window.navigator && 
                      !window.navigator.userAgent.includes('HeadlessChrome');

if (isThreeJSSafe) {
  try {
    // These will be loaded dynamically when needed
  } catch (error) {
    console.warn('Three.js components not available:', error);
  }
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Settings, Zap, Users } from 'lucide-react';
import { AgentStatus } from '../../types/aguiTypes';

// Safer imports with error handling
let Enhanced3DContainer: React.ComponentType<any> | null = null;
let HolographicChart: React.ComponentType<any> | null = null;
let FloatingPanel: React.ComponentType<any> | null = null;

// Safely import 3D components
try {
  Enhanced3DContainer = React.lazy(() => import('./Enhanced3DContainer').then(module => ({ default: module.Enhanced3DContainer })));
  HolographicChart = React.lazy(() => import('./UI/HolographicChart').then(module => ({ default: module.HolographicChart })));
  FloatingPanel = React.lazy(() => import('./UI/FloatingPanel').then(module => ({ default: module.FloatingPanel })));
} catch (error) {
  console.warn('Failed to import 3D components:', error);
}

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

interface ProductionSafeEnhanced3DDashboardProps {
  agents: AgentStatus[];
  className?: string;
  theme?: SceneTheme;
  enableEnhancedFeatures?: boolean;
  enableDataVisualization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableFormations?: boolean;
  onAgentSelect?: (agentId: string | null) => void;
}

// Safe 3D Scene Component with proper React context - only when components are available
function Safe3DScene({ 
  agents, 
  theme, 
  onAgentSelect 
}: { 
  agents: AgentStatus[];
  theme: SceneTheme;
  onAgentSelect?: (agentId: string | null) => void;
}) {
  // Return null if Three.js components aren't available
  if (!Canvas || !OrbitControls || !Environment || !Center) {
    return null;
  }

  // Basic 3D scene without complex dependencies
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      <Center>
        {agents.map((agent, index) => (
          <mesh
            key={agent.id || index}
            position={[
              (index % 3 - 1) * 3, 
              Math.floor(index / 3) * 2,
              0
            ]}
            onClick={() => onAgentSelect?.(agent.id)}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
              color={
                agent.status === 'running' ? '#10b981' :
                agent.status === 'idle' ? '#6366f1' :
                agent.status === 'error' ? '#ef4444' :
                '#f59e0b'
              } 
            />
          </mesh>
        ))}
      </Center>

      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxDistance={20}
        minDistance={5}
      />
      
      <Environment preset="studio" />
    </>
  );
}

// 2D Fallback Dashboard
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
            2D visualization mode for better compatibility
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

// Main component with safe 3D loading
export function ProductionSafeEnhanced3DDashboard({
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
}: ProductionSafeEnhanced3DDashboardProps) {
  const [use3D, setUse3D] = useState(true);
  const [canvasError, setCanvasError] = useState<Error | null>(null);

  // Reset error when toggling modes
  const handleToggle3D = useCallback(() => {
    setUse3D(!use3D);
    setCanvasError(null);
  }, [use3D]);

  // Error handler for Canvas
  const handleCanvasError = useCallback((error: Error) => {
    console.error('Canvas Error:', error);
    setCanvasError(error);
    setUse3D(false);
  }, []);

  // If there's an error, 3D is disabled, or Three.js components aren't available, show fallback
  if (!use3D || canvasError || !Canvas) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agents Dashboard
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle3D}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Try 3D View
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FallbackDashboard agents={agents} onAgentSelect={onAgentSelect} />
          {canvasError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                3D Error: {canvasError.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Try to render 3D
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agents Dashboard (3D)
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle3D}
            className="flex items-center gap-2"
          >
            <Monitor className="h-4 w-4" />
            2D View
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-96 rounded-lg overflow-hidden">
          {Canvas ? (
            <Canvas
              camera={{ position: [10, 10, 10], fov: 50 }}
              onError={handleCanvasError}
              gl={{ 
                antialias: true, 
                alpha: true,
                powerPreference: "high-performance"
              }}
            >
              <Safe3DScene 
                agents={agents} 
                theme={theme} 
                onAgentSelect={onAgentSelect}
              />
            </Canvas>
          ) : (
            <FallbackDashboard agents={agents} onAgentSelect={onAgentSelect} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProductionSafeEnhanced3DDashboard;