import { Vector3 } from 'three';
import { AgentFormation, TransitionConfig, AgentStatus } from '../../types/aguiTypes';

export interface FormationPosition {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  priority: number;
}

export interface FormationLayout {
  positions: Map<string, FormationPosition>;
  center: Vector3;
  bounds: { min: Vector3; max: Vector3 };
}

export class AgentFormationManager {
  private currentFormation: AgentFormation | null = null;
  private targetPositions: Map<string, FormationPosition> = new Map();
  private animatingAgents: Set<string> = new Set();
  private transitionConfig: TransitionConfig = {
    duration: 1000,
    easing: 'easeInOut',
    loop: false,
    autoplay: true,
    delay: 0,
    from: null,
    to: null
  };

  constructor(private agents: AgentStatus[]) {}

  /**
   * Calculate positions for different formation types
   */
  calculateFormation(formation: AgentFormation): FormationLayout {
    const positions = new Map<string, FormationPosition>();
    const center = formation.center ? new Vector3(...formation.center) : new Vector3(0, 0, 0);
    let bounds = { min: new Vector3(), max: new Vector3() };

    switch (formation.type) {
      case 'grid':
        return this.calculateGridFormation(formation, positions, center);
      case 'circle':
        return this.calculateCircleFormation(formation, positions, center);
      case 'spiral':
        return this.calculateSpiralFormation(formation, positions, center);
      case 'hierarchical':
        return this.calculateHierarchicalFormation(formation, positions, center);
      case 'random':
        return this.calculateRandomFormation(formation, positions, center);
      default:
        return { positions, center, bounds };
    }
  }

  /**
   * Grid formation with intelligent spacing
   */
  private calculateGridFormation(
    formation: AgentFormation,
    positions: Map<string, FormationPosition>,
    center: Vector3
  ): FormationLayout {
    const { rows = 3, columns = 3 } = formation.parameters;
    const spacing = formation.spacing;
    const totalAgents = this.agents.length;
    
    // Calculate optimal grid dimensions if not specified
    const actualRows = rows || Math.ceil(Math.sqrt(totalAgents));
    const actualColumns = columns || Math.ceil(totalAgents / actualRows);
    
    // Calculate grid offset to center the formation
    const gridWidth = (actualColumns - 1) * spacing;
    const gridDepth = (actualRows - 1) * spacing;
    const startX = center.x - gridWidth / 2;
    const startZ = center.z - gridDepth / 2;

    this.agents.forEach((agent, index) => {
      const row = Math.floor(index / actualColumns);
      const col = index % actualColumns;
      
      // Add some variation based on agent status for visual interest
      const heightVariation = this.getStatusHeightVariation(agent.status);
      const scaleVariation = this.getStatusScaleVariation(agent.status);
      
      positions.set(agent.id, {
        position: [
          startX + col * spacing,
          center.y + heightVariation,
          startZ + row * spacing
        ],
        rotation: [0, 0, 0],
        scale: [scaleVariation, scaleVariation, scaleVariation],
        priority: this.getAgentPriority(agent)
      });
    });

    const bounds = {
      min: new Vector3(startX - spacing/2, center.y - 1, startZ - spacing/2),
      max: new Vector3(startX + gridWidth + spacing/2, center.y + 3, startZ + gridDepth + spacing/2)
    };

    return { positions, center, bounds };
  }

  /**
   * Circular formation with dynamic radius
   */
  private calculateCircleFormation(
    formation: AgentFormation,
    positions: Map<string, FormationPosition>,
    center: Vector3
  ): FormationLayout {
    const baseRadius = formation.parameters.radius || 10;
    const totalAgents = this.agents.length;
    const angleStep = (Math.PI * 2) / totalAgents;
    
    // Create multiple concentric circles if needed
    const agentsPerCircle = Math.min(12, totalAgents);
    const circles = Math.ceil(totalAgents / agentsPerCircle);

    this.agents.forEach((agent, index) => {
      const circleIndex = Math.floor(index / agentsPerCircle);
      const agentInCircle = index % agentsPerCircle;
      const radius = baseRadius + (circleIndex * formation.spacing);
      const angle = (agentInCircle / agentsPerCircle) * Math.PI * 2;
      
      const heightVariation = this.getStatusHeightVariation(agent.status);
      const scaleVariation = this.getStatusScaleVariation(agent.status);
      
      positions.set(agent.id, {
        position: [
          center.x + Math.cos(angle) * radius,
          center.y + heightVariation,
          center.z + Math.sin(angle) * radius
        ],
        rotation: [0, -angle + Math.PI/2, 0], // Face toward center
        scale: [scaleVariation, scaleVariation, scaleVariation],
        priority: this.getAgentPriority(agent)
      });
    });

    const maxRadius = baseRadius + ((circles - 1) * formation.spacing);
    const bounds = {
      min: new Vector3(center.x - maxRadius, center.y - 1, center.z - maxRadius),
      max: new Vector3(center.x + maxRadius, center.y + 3, center.z + maxRadius)
    };

    return { positions, center, bounds };
  }

  /**
   * Spiral formation with golden ratio spacing
   */
  private calculateSpiralFormation(
    formation: AgentFormation,
    positions: Map<string, FormationPosition>,
    center: Vector3
  ): FormationLayout {
    const { turns = 3 } = formation.parameters;
    const totalAgents = this.agents.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle in radians
    
    this.agents.forEach((agent, index) => {
      const t = index / (totalAgents - 1);
      const angle = goldenAngle * index;
      const radius = formation.spacing * Math.sqrt(index);
      const heightOffset = (turns * t * formation.spacing) - (turns * formation.spacing / 2);
      
      const heightVariation = this.getStatusHeightVariation(agent.status);
      const scaleVariation = this.getStatusScaleVariation(agent.status);
      
      positions.set(agent.id, {
        position: [
          center.x + Math.cos(angle) * radius,
          center.y + heightOffset + heightVariation,
          center.z + Math.sin(angle) * radius
        ],
        rotation: [0, -angle, 0],
        scale: [scaleVariation, scaleVariation, scaleVariation],
        priority: this.getAgentPriority(agent)
      });
    });

    const maxRadius = formation.spacing * Math.sqrt(totalAgents);
    const bounds = {
      min: new Vector3(center.x - maxRadius, center.y - turns * formation.spacing, center.z - maxRadius),
      max: new Vector3(center.x + maxRadius, center.y + turns * formation.spacing, center.z + maxRadius)
    };

    return { positions, center, bounds };
  }

  /**
   * Hierarchical formation based on agent types and status
   */
  private calculateHierarchicalFormation(
    formation: AgentFormation,
    positions: Map<string, FormationPosition>,
    center: Vector3
  ): FormationLayout {
    const { hierarchy = {} } = formation.parameters;
    
    // Group agents by type and priority
    const agentGroups = new Map<string, AgentStatus[]>();
    this.agents.forEach(agent => {
      const type = agent.type || 'default';
      if (!agentGroups.has(type)) {
        agentGroups.set(type, []);
      }
      agentGroups.get(type)!.push(agent);
    });

    let currentRadius = 0;
    const groupSpacing = formation.spacing * 2;
    
    Array.from(agentGroups.entries()).forEach(([type, agents], groupIndex) => {
      const hierarchyLevel = hierarchy[type] || groupIndex;
      const groupRadius = currentRadius + (hierarchyLevel * groupSpacing);
      const agentsInGroup = agents.length;
      const angleStep = (Math.PI * 2) / agentsInGroup;
      
      agents.forEach((agent, agentIndex) => {
        const angle = agentIndex * angleStep;
        const heightVariation = this.getStatusHeightVariation(agent.status) + (hierarchyLevel * 0.5);
        const scaleVariation = this.getStatusScaleVariation(agent.status) + (hierarchyLevel * 0.1);
        
        positions.set(agent.id, {
          position: [
            center.x + Math.cos(angle) * groupRadius,
            center.y + heightVariation,
            center.z + Math.sin(angle) * groupRadius
          ],
          rotation: [0, -angle + Math.PI/2, 0],
          scale: [scaleVariation, scaleVariation, scaleVariation],
          priority: this.getAgentPriority(agent) + hierarchyLevel * 10
        });
      });
      
      currentRadius = Math.max(currentRadius, groupRadius);
    });

    const bounds = {
      min: new Vector3(center.x - currentRadius, center.y - 1, center.z - currentRadius),
      max: new Vector3(center.x + currentRadius, center.y + 5, center.z + currentRadius)
    };

    return { positions, center, bounds };
  }

  /**
   * Random formation with collision avoidance
   */
  private calculateRandomFormation(
    formation: AgentFormation,
    positions: Map<string, FormationPosition>,
    center: Vector3
  ): FormationLayout {
    const bounds = {
      min: new Vector3(center.x - 20, center.y - 1, center.z - 20),
      max: new Vector3(center.x + 20, center.y + 5, center.z + 20)
    };
    
    const occupiedPositions: Vector3[] = [];
    const minDistance = formation.spacing;
    
    this.agents.forEach(agent => {
      let position: Vector3;
      let attempts = 0;
      const maxAttempts = 50;
      
      do {
        position = new Vector3(
          center.x + (Math.random() - 0.5) * 40,
          center.y + Math.random() * 6,
          center.z + (Math.random() - 0.5) * 40
        );
        attempts++;
      } while (
        attempts < maxAttempts &&
        occupiedPositions.some(pos => pos.distanceTo(position) < minDistance)
      );
      
      occupiedPositions.push(position);
      
      const heightVariation = this.getStatusHeightVariation(agent.status);
      const scaleVariation = this.getStatusScaleVariation(agent.status);
      
      positions.set(agent.id, {
        position: [position.x, position.y + heightVariation, position.z],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: [scaleVariation, scaleVariation, scaleVariation],
        priority: this.getAgentPriority(agent)
      });
    });

    return { positions, center, bounds };
  }

  /**
   * Apply formation with smooth transitions
   */
  applyFormation(formation: AgentFormation, transitionConfig?: Partial<TransitionConfig>): Promise<void> {
    return new Promise((resolve) => {
      this.currentFormation = formation;
      this.transitionConfig = { ...this.transitionConfig, ...transitionConfig };
      
      const layout = this.calculateFormation(formation);
      this.targetPositions = layout.positions;
      
      // Mark all agents as animating
      this.agents.forEach(agent => {
        this.animatingAgents.add(agent.id);
      });
      
      // Simulate transition completion
      setTimeout(() => {
        this.animatingAgents.clear();
        resolve();
      }, this.transitionConfig.duration);
    });
  }

  /**
   * Get target position for an agent
   */
  getTargetPosition(agentId: string): FormationPosition | null {
    return this.targetPositions.get(agentId) || null;
  }

  /**
   * Check if agent is currently animating
   */
  isAnimating(agentId: string): boolean {
    return this.animatingAgents.has(agentId);
  }

  /**
   * Get formation bounds for camera positioning
   */
  getFormationBounds(): { min: Vector3; max: Vector3 } | null {
    if (!this.currentFormation) return null;
    
    const layout = this.calculateFormation(this.currentFormation);
    return layout.bounds;
  }

  /**
   * Helper methods for status-based variations
   */
  private getStatusHeightVariation(status: string): number {
    switch (status) {
      case 'running': return 0.2;
      case 'completed': return 0.4;
      case 'error': return -0.2;
      default: return 0;
    }
  }

  private getStatusScaleVariation(status: string): number {
    switch (status) {
      case 'running': return 1.1;
      case 'completed': return 1.2;
      case 'error': return 0.9;
      default: return 1.0;
    }
  }

  private getAgentPriority(agent: AgentStatus): number {
    let priority = 0;
    
    // Priority by status
    switch (agent.status) {
      case 'running': priority += 10; break;
      case 'error': priority += 5; break;
      case 'completed': priority += 3; break;
      default: priority += 1;
    }
    
    // Priority by performance (if available)
    if (agent.performance) {
      priority += Math.floor(agent.performance.successRate / 10);
    }
    
    return priority;
  }

  /**
   * Update agents list and recalculate if needed
   */
  updateAgents(agents: AgentStatus[]): void {
    this.agents = agents;
    
    // Recalculate formation if currently applied
    if (this.currentFormation) {
      const layout = this.calculateFormation(this.currentFormation);
      this.targetPositions = layout.positions;
    }
  }

  /**
   * Get current formation info
   */
  getCurrentFormation(): AgentFormation | null {
    return this.currentFormation;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.targetPositions.clear();
    this.animatingAgents.clear();
    this.currentFormation = null;
  }
}

export default AgentFormationManager;