import { useEffect, useState, useRef, useCallback } from 'react';
import { Vector3 } from 'three';
import { AgentFormationManager, FormationPosition } from './AgentFormationManager';
import { AgentFormation, TransitionConfig } from '../types';
import { AgentStatus } from '../../types/aguiTypes';

interface UseAgentFormationOptions {
  initialFormation?: AgentFormation;
  autoUpdate?: boolean;
  enableTransitions?: boolean;
}

interface UseAgentFormationReturn {
  formationManager: AgentFormationManager | null;
  currentFormation: AgentFormation | null;
  isTransitioning: boolean;
  applyFormation: (formation: AgentFormation, config?: Partial<TransitionConfig>) => Promise<void>;
  getAgentPosition: (agentId: string) => FormationPosition | null;
  getFormationBounds: () => { min: Vector3; max: Vector3 } | null;
  isAgentAnimating: (agentId: string) => boolean;
}

export function useAgentFormation(
  agents: AgentStatus[],
  options: UseAgentFormationOptions = {}
): UseAgentFormationReturn {
  const {
    initialFormation,
    autoUpdate = true,
    enableTransitions = true
  } = options;

  const [formationManager, setFormationManager] = useState<AgentFormationManager | null>(null);
  const [currentFormation, setCurrentFormation] = useState<AgentFormation | null>(initialFormation || null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const managerRef = useRef<AgentFormationManager | null>(null);

  // Initialize formation manager
  useEffect(() => {
    if (agents.length > 0) {
      const manager = new AgentFormationManager(agents);
      managerRef.current = manager;
      setFormationManager(manager);

      // Apply initial formation if provided
      if (initialFormation) {
        manager.applyFormation(initialFormation).then(() => {
          setCurrentFormation(initialFormation);
        });
      }

      return () => {
        manager.dispose();
        managerRef.current = null;
      };
    }
  }, []); // Only run once on mount

  // Update agents when they change
  useEffect(() => {
    if (managerRef.current && autoUpdate) {
      managerRef.current.updateAgents(agents);
    }
  }, [agents, autoUpdate]);

  // Apply formation function
  const applyFormation = useCallback(async (
    formation: AgentFormation,
    config?: Partial<TransitionConfig>
  ): Promise<void> => {
    if (!managerRef.current) {
      throw new Error('Formation manager not initialized');
    }

    if (enableTransitions) {
      setIsTransitioning(true);
    }

    try {
      await managerRef.current.applyFormation(formation, config);
      setCurrentFormation(formation);
    } finally {
      if (enableTransitions) {
        setIsTransitioning(false);
      }
    }
  }, [enableTransitions]);

  // Get agent position
  const getAgentPosition = useCallback((agentId: string): FormationPosition | null => {
    return managerRef.current?.getTargetPosition(agentId) || null;
  }, []);

  // Get formation bounds
  const getFormationBounds = useCallback((): { min: Vector3; max: Vector3 } | null => {
    return managerRef.current?.getFormationBounds() || null;
  }, []);

  // Check if agent is animating
  const isAgentAnimating = useCallback((agentId: string): boolean => {
    return managerRef.current?.isAnimating(agentId) || false;
  }, []);

  return {
    formationManager,
    currentFormation,
    isTransitioning,
    applyFormation,
    getAgentPosition,
    getFormationBounds,
    isAgentAnimating
  };
}

// Predefined formation presets
export const FORMATION_PRESETS: Record<string, AgentFormation> = {
  grid: {
    type: 'grid',
    spacing: 4,
    center: [0, 0, 0],
    parameters: {
      rows: 3,
      columns: 3
    }
  },
  circle: {
    type: 'circle',
    spacing: 2,
    center: [0, 0, 0],
    parameters: {
      radius: 8
    }
  },
  spiral: {
    type: 'spiral',
    spacing: 1.5,
    center: [0, 0, 0],
    parameters: {
      turns: 2
    }
  },
  hierarchical: {
    type: 'hierarchical',
    spacing: 3,
    center: [0, 0, 0],
    parameters: {
      hierarchy: {
        'manager': 0,
        'analyst': 1,
        'worker': 2,
        'default': 3
      }
    }
  },
  random: {
    type: 'random',
    spacing: 3,
    center: [0, 0, 0],
    parameters: {}
  }
};

// Formation transition presets
export const TRANSITION_PRESETS: Record<string, TransitionConfig> = {
  smooth: {
    duration: 1500,
    easing: 'easeInOut',
    loop: false,
    autoplay: true,
    delay: 0,
    from: null,
    to: null
  },
  fast: {
    duration: 500,
    easing: 'easeOut',
    loop: false,
    autoplay: true,
    delay: 0,
    from: null,
    to: null
  },
  dramatic: {
    duration: 2500,
    easing: 'easeInOut',
    loop: false,
    autoplay: true,
    delay: 100,
    from: null,
    to: null
  },
  instant: {
    duration: 0,
    easing: 'linear',
    loop: false,
    autoplay: true,
    delay: 0,
    from: null,
    to: null
  }
};

export default useAgentFormation;