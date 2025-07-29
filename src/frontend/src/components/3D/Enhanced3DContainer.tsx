import React from 'react';
import { Enhanced3DScene } from './Enhanced3DScene';
import { AdvancedAgentAvatar } from './AdvancedAgentAvatar';
import { Advanced3DControls } from './interactions/Advanced3DControls';
import { usePerformanceManager } from './hooks/usePerformanceManager';
import { useAgentFormation, FORMATION_PRESETS } from './formations/useAgentFormation';
import { AgentStatus } from '../../types/aguiTypes';
import { SceneConfig, SceneTheme, PerformanceLevel, PerformanceMetrics } from './types';

interface Enhanced3DContainerProps {
  agents: AgentStatus[];
  config: SceneConfig;
  selectedAgent: string | null;
  enableAccessibility: boolean;
  onAgentSelect: (agentId: string | null) => void;
  onPerformanceChange: (level: PerformanceLevel, metrics: PerformanceMetrics) => void;
  enableFormations?: boolean;
  formationType?: 'grid' | 'circle' | 'spiral' | 'random' | 'hierarchical';
}

export function Enhanced3DContainer({
  agents,
  config,
  selectedAgent,
  enableAccessibility,
  onAgentSelect,
  onPerformanceChange,
  enableFormations = true,
  formationType = 'grid'
}: Enhanced3DContainerProps) {
  // Initialize performance manager
  const performanceManager = usePerformanceManager({
    autoOptimization: true,
    initialLevel: config.performanceMode,
    onPerformanceChange
  });
  
  // Initialize formation manager
  const formationSystem = useAgentFormation(agents, {
    initialFormation: enableFormations ? FORMATION_PRESETS[formationType] : undefined,
    autoUpdate: true,
    enableTransitions: true
  });

  return (
    <Enhanced3DScene 
      config={config}
      onPerformanceChange={(fps, drawCalls) => {
        if (performanceManager.isInitialized) {
          const metrics = performanceManager.metrics;
          onPerformanceChange(performanceManager.performanceLevel, {
            ...metrics,
            fps,
            drawCalls
          });
        }
      }}
    >
      {/* Enhanced Agent Avatars with Formation System */}
      {agents.map((agent, index) => {
        // Get position from formation system or fallback to grid
        const formationPosition = enableFormations 
          ? formationSystem.getAgentPosition(agent.id)
          : null;
        
        const position: [number, number, number] = formationPosition
          ? formationPosition.position
          : [
              (index % 3) * 4 - 4, // X position in grid
              0,
              Math.floor(index / 3) * 4 - 4 // Z position in grid
            ];
        
        return (
          <AdvancedAgentAvatar
            key={agent.id}
            agent={agent}
            position={position}
            selected={selectedAgent === agent.id}
            theme={config.theme}
            enableLOD={config.performanceMode !== 'low'}
            enableAnimations={config.performanceMode === 'high' || config.performanceMode === 'ultra'}
            enableParticles={config.enableParticles}
            performanceLevel={config.performanceMode}
            onClick={() => onAgentSelect(agent.id)}
            onHover={(hovered) => {
              // Handle hover effects
            }}
          />
        );
      })}

      {/* Advanced Controls */}
      <Advanced3DControls
        enableFocusMode={true}
        accessibilityMode={enableAccessibility}
        onSelectionChange={onAgentSelect}
      />
    </Enhanced3DScene>
  );
}

export default Enhanced3DContainer;