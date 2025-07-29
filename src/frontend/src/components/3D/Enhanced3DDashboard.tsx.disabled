import React, { useState, useEffect } from 'react';
import { Enhanced3DContainer } from './Enhanced3DContainer';
import { HolographicChart } from './UI/HolographicChart';
import { FloatingPanel } from './UI/FloatingPanel';
import { useAgentFormation, FORMATION_PRESETS, TRANSITION_PRESETS } from './formations/useAgentFormation';
import { SceneConfig, SceneTheme, PerformanceLevel, PerformanceMetrics } from './types';
import { AgentStatus } from '../../types/aguiTypes';

interface Enhanced3DDashboardProps {
  agents: AgentStatus[];
  className?: string;
  theme?: SceneTheme;
  enableEnhancedFeatures?: boolean;
  enableDataVisualization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableFormations?: boolean;
  onAgentSelect?: (agentId: string | null) => void;
}

// Sample performance data generator
function generateSamplePerformanceData(): PerformanceMetrics {
  return {
    fps: Math.floor(Math.random() * 20) + 40,
    drawCalls: Math.floor(Math.random() * 200) + 100,
    triangles: Math.floor(Math.random() * 50000) + 10000,
    geometries: Math.floor(Math.random() * 50) + 20,
    textures: Math.floor(Math.random() * 20) + 10,
    memoryUsage: Math.random() * 50 + 20
  };
}

export function Enhanced3DDashboard({
  agents,
  className = '',
  theme = 'studio',
  enableEnhancedFeatures = true,
  enableDataVisualization = true,
  enablePerformanceMonitoring = true,
  enableFormations = true,
  onAgentSelect
}: Enhanced3DDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(generateSamplePerformanceData());
  const [currentFormation, setCurrentFormation] = useState<string>('grid');
  const [dashboardMode, setDashboardMode] = useState<'overview' | 'performance' | 'network' | 'agents'>('overview');
  const [showPanels, setShowPanels] = useState(true);

  // Scene configuration
  const sceneConfig: SceneConfig = {
    theme,
    enableParticles: enableEnhancedFeatures,
    enablePostProcessing: enableEnhancedFeatures,
    enableShadows: enableEnhancedFeatures,
    enableEnvironment: true,
    performanceMode: enableEnhancedFeatures ? 'high' : 'medium'
  };

  // Formation management
  const formationSystem = useAgentFormation(agents, {
    initialFormation: enableFormations ? FORMATION_PRESETS[currentFormation] : undefined,
    autoUpdate: true,
    enableTransitions: true
  });

  // Update performance metrics periodically
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;
    
    const interval = setInterval(() => {
      setPerformanceMetrics(generateSamplePerformanceData());
    }, 2000);

    return () => clearInterval(interval);
  }, [enablePerformanceMonitoring]);

  // Handle agent selection
  const handleAgentSelect = (agentId: string | null) => {
    setSelectedAgent(agentId);
    onAgentSelect?.(agentId);
  };

  // Handle performance changes
  const handlePerformanceChange = (level: PerformanceLevel, metrics: PerformanceMetrics) => {
    setPerformanceMetrics(metrics);
  };

  // Handle formation changes
  const handleFormationChange = async (formationType: string) => {
    if (formationSystem.formationManager && enableFormations) {
      setCurrentFormation(formationType);
      await formationSystem.applyFormation(
        FORMATION_PRESETS[formationType],
        TRANSITION_PRESETS.smooth
      );
    }
  };

  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* Enhanced 3D Controls Panel */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
        {/* Theme Selector */}
        <div className="bg-black/90 rounded-lg p-3 text-white min-w-[200px]">
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={theme}
            onChange={(e) => {
              console.log('Theme change requested:', e.target.value);
            }}
            className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
          >
            <option value="studio">Studio</option>
            <option value="cyber">Cyber</option>
            <option value="space">Space</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        {/* Formation Controls */}
        {enableFormations && (
          <div className="bg-black/90 rounded-lg p-3 text-white">
            <label className="block text-sm font-medium mb-2">Formation</label>
            <select
              value={currentFormation}
              onChange={(e) => handleFormationChange(e.target.value)}
              className="w-full bg-gray-800 text-white rounded px-2 py-1 text-sm"
            >
              <option value="grid">Grid</option>
              <option value="circle">Circle</option>
              <option value="spiral">Spiral</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="random">Random</option>
            </select>
            {formationSystem.isTransitioning && (
              <div className="text-xs text-yellow-400 mt-1">Transitioning...</div>
            )}
          </div>
        )}

        {/* Panel Toggle */}
        <button
          onClick={() => setShowPanels(!showPanels)}
          className="bg-black/90 hover:bg-black/95 text-white px-3 py-2 rounded-lg text-sm transition-colors"
        >
          {showPanels ? 'Hide Panels' : 'Show Panels'}
        </button>
      </div>

      {/* Agent Selection Info */}
      {selectedAgent && (
        <div className="absolute bottom-4 left-4 z-20 bg-black/90 rounded-lg p-4 text-white max-w-sm">
          <h3 className="font-semibold text-lg mb-2">Selected Agent</h3>
          {(() => {
            const agent = agents.find(a => a.id === selectedAgent);
            if (!agent) return <p>Agent not found</p>;
            
            return (
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {agent.name}</div>
                <div><strong>Type:</strong> {agent.type}</div>
                <div><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    agent.status === 'running' ? 'bg-green-600' :
                    agent.status === 'error' ? 'bg-red-600' :
                    agent.status === 'completed' ? 'bg-blue-600' :
                    'bg-gray-600'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                {agent.performance && (
                  <div className="pt-2 border-t border-gray-600">
                    <div><strong>Tasks:</strong> {agent.performance.tasksCompleted}</div>
                    <div><strong>Success Rate:</strong> {agent.performance.successRate}%</div>
                    <div><strong>Avg Response:</strong> {agent.performance.avgResponseTime}ms</div>
                  </div>
                )}
              </div>
            );
          })()} 
        </div>
      )}

      {/* Main 3D Scene */}
      <Enhanced3DContainer
        agents={agents}
        config={sceneConfig}
        selectedAgent={selectedAgent}
        enableAccessibility={false}
        onAgentSelect={handleAgentSelect}
        onPerformanceChange={handlePerformanceChange}
        enableFormations={enableFormations}
        formationType={currentFormation as any}
      />

      {/* Performance Warning */}
      {performanceMetrics.fps < 30 && (
        <div className="absolute top-4 left-4 z-20 bg-yellow-900/90 border border-yellow-600 rounded-lg p-3 text-yellow-100">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">⚠️</span>
            <div>
              <div className="font-medium">Performance Warning</div>
              <div className="text-sm">FPS: {performanceMetrics.fps} - Consider reducing visual effects</div>
            </div>
          </div>
        </div>
      )}

      {/* Data Visualization Panels - Simplified for now */}
      {showPanels && enableDataVisualization && (
        <>
          {/* System Status Panel */}
          <FloatingPanel
            position={[-12, 0, 0]}
            title="System Status"
            width={3}
            height={2.5}
            theme={theme}
            interactive={true}
            autoRotate={false}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Active Agents:</span>
                <span className="font-mono">{agents.filter(a => a.status === 'running').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Agents:</span>
                <span className="font-mono">{agents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>System Load:</span>
                <span className="font-mono">{Math.round(performanceMetrics.memoryUsage)}%</span>
              </div>
            </div>
          </FloatingPanel>
        </>
      )}
    </div>
  );
}

export default Enhanced3DDashboard; 