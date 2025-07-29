// 3D System Type Definitions
import { Vector3, Color } from 'three';

// Theme types
export type SceneTheme = 'studio' | 'cyber' | 'space' | 'minimal';

// Performance types
export type PerformanceLevel = 'low' | 'medium' | 'high' | 'ultra';

export interface PerformanceMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: number;
}

export interface PerformanceSettings {
  pixelRatio: number;
  shadowMapSize: number;
  antialias: boolean;
  enableShadows: boolean;
  enablePostProcessing: boolean;
  enableParticles: boolean;
  maxParticles: number;
  lodDistanceMultiplier: number;
  cullingEnabled: boolean;
}

// LOD (Level of Detail) configuration
export interface LODConfig {
  high: number;    // Distance threshold for high detail
  medium: number;  // Distance threshold for medium detail
  low: number;     // Distance threshold for low detail
}

// Scene configuration
export interface SceneConfig {
  theme: SceneTheme;
  enableParticles: boolean;
  enablePostProcessing: boolean;
  enableShadows: boolean;
  enableEnvironment: boolean;
  performanceMode: PerformanceLevel;
}

// Agent 3D types
export interface Agent3DState {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  selected: boolean;
  hovered: boolean;
  animationState: 'idle' | 'running' | 'completed' | 'error';
  lodLevel: 'high' | 'medium' | 'low';
}

export interface Agent3DConfig {
  enableAnimations: boolean;
  enableParticles: boolean;
  enableStatusIndicators: boolean;
  enableInteraction: boolean;
  modelPath?: string;
  fallbackGeometry: 'box' | 'sphere' | 'capsule';
}

// Animation types
export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  loop: boolean;
  autoplay: boolean;
}

export interface TransitionConfig extends AnimationConfig {
  delay: number;
  from: any;
  to: any;
}

// Particle system types
export type ParticleSystemType = 
  | 'data_flow' 
  | 'processing' 
  | 'success_burst' 
  | 'error_sparks' 
  | 'idle_ambient' 
  | 'connection_lines'
  | 'ambient'
  | 'flow'
  | 'burst'
  | 'trail';

export interface ParticleConfig {
  count: number;
  position: [number, number, number];
  velocity: number;
  spread: number;
  life: number;
  size: number;
  color: string;
  direction: Vector3;
  emissionRate: number;
}

export interface ParticleSystemConfig {
  type: ParticleSystemType;
  enabled: boolean;
  intensity: number; // 0-1
  theme: SceneTheme;
  config: Partial<ParticleConfig>;
}

// 3D UI types
export interface FloatingPanelConfig {
  position: [number, number, number];
  dimensions: [number, number]; // width, height
  theme: SceneTheme;
  interactive: boolean;
  autoRotate: boolean;
  transparent: boolean;
}

export interface HolographicChartConfig {
  type: 'bar' | 'line' | 'ring';
  position: [number, number, number];
  scale: number;
  animated: boolean;
  theme: SceneTheme;
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export interface StatusRingConfig {
  position: [number, number, number];
  radius: number;
  theme: SceneTheme;
  animated: boolean;
  showLabel: boolean;
}

// Control system types
export interface CameraTarget {
  position: Vector3;
  target: Vector3;
  transition: boolean;
  duration: number;
}

export interface ControlsConfig {
  enableZoom: boolean;
  enablePan: boolean;
  enableRotate: boolean;
  enableKeyboard: boolean;
  enableTouch: boolean;
  enableGestures: boolean;
  enableAutoRotate: boolean;
  autoRotateSpeed: number;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  maxPolarAngle: number;
  minPolarAngle: number;
  enableFocusMode: boolean;
  accessibilityMode: boolean;
}

export interface GestureEvent {
  type: 'pinch' | 'rotation' | 'pan';
  scale?: number;
  rotation?: number;
  deltaX?: number;
  deltaY?: number;
}

export interface KeyboardNavigation {
  movement: Vector3;
  rotation: Vector3;
  speed: number;
  enabled: boolean;
}

// Environment types
export interface EnvironmentConfig {
  preset: 'studio' | 'city' | 'sunset' | 'dawn' | 'night';
  background: Color | string;
  fog: {
    enabled: boolean;
    color: Color | string;
    near: number;
    far: number;
  };
}

export interface LightingConfig {
  ambient: {
    intensity: number;
    color: Color | string;
  };
  directional: {
    intensity: number;
    position: [number, number, number];
    color: Color | string;
    castShadows: boolean;
  };
  point: {
    intensity: number;
    position: [number, number, number];
    color: Color | string;
    distance: number;
  };
}

// Event types for 3D system
export interface Scene3DEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface AgentSelectionEvent extends Scene3DEvent {
  type: 'agent_selected' | 'agent_deselected' | 'agent_focused';
  data: {
    agentId: string;
    position: [number, number, number];
  };
}

export interface PerformanceEvent extends Scene3DEvent {
  type: 'performance_change' | 'lod_change' | 'culling_update';
  data: {
    level: PerformanceLevel;
    metrics: PerformanceMetrics;
    affectedObjects?: string[];
  };
}

export interface InteractionEvent extends Scene3DEvent {
  type: 'click' | 'hover' | 'focus' | 'keyboard' | 'gesture';
  data: {
    target?: string;
    position?: [number, number, number];
    gesture?: GestureEvent;
    key?: string;
  };
}

// Formation and layout types
export interface AgentFormation {
  type: 'grid' | 'circle' | 'spiral' | 'random' | 'hierarchical';
  spacing: number;
  center: [number, number, number];
  parameters: {
    rows?: number;
    columns?: number;
    radius?: number;
    turns?: number;
    hierarchy?: { [key: string]: number };
  };
}

export interface LayoutManager {
  formation: AgentFormation;
  transition: TransitionConfig;
  autoArrange: boolean;
  collisionAvoidance: boolean;
}

// Integration types with existing agent system
export interface Enhanced3DAgent {
  // Base agent properties
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  
  // 3D specific properties
  state3D: Agent3DState;
  config3D: Agent3DConfig;
  particles: ParticleSystemConfig[];
  statusRing: StatusRingConfig;
  
  // Performance data
  performance?: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
  
  // Animation state
  currentAnimation?: string;
  animationQueue: string[];
  
  // Interaction state
  interactive: boolean;
  focusable: boolean;
  selectable: boolean;
}

// 3D Scene Manager types
export interface Scene3DManager {
  config: SceneConfig;
  agents: Map<string, Enhanced3DAgent>;
  ui: {
    panels: Map<string, FloatingPanelConfig>;
    charts: Map<string, HolographicChartConfig>;
    statusRings: Map<string, StatusRingConfig>;
  };
  environment: EnvironmentConfig;
  lighting: LightingConfig;
  performance: PerformanceSettings;
  controls: ControlsConfig;
  layout: LayoutManager;
  
  // Event system
  addEventListener: (type: string, handler: (event: Scene3DEvent) => void) => void;
  removeEventListener: (type: string, handler: (event: Scene3DEvent) => void) => void;
  emit: (event: Scene3DEvent) => void;
}

// Hook types for React integration
export interface Use3DScene {
  manager: Scene3DManager;
  isReady: boolean;
  error: Error | null;
  performance: PerformanceMetrics;
  selectedAgent: Enhanced3DAgent | null;
  
  // Actions
  selectAgent: (id: string) => void;
  focusAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: Enhanced3DAgent['status']) => void;
  setTheme: (theme: SceneTheme) => void;
  setPerformanceLevel: (level: PerformanceLevel) => void;
}

export interface Use3DControls {
  controlsRef: React.RefObject<any>;
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  isAnimating: boolean;
  
  // Actions
  focusOn: (position: Vector3, target?: Vector3) => void;
  reset: () => void;
  enableAutoRotate: (enabled: boolean) => void;
  setAccessibilityMode: (enabled: boolean) => void;
}

// Utility types
export type Vector3Tuple = [number, number, number];
export type ColorValue = string | number | Color;
export type ThemeColorMap = Record<SceneTheme, Record<string, string>>;

// Constants
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  theme: 'studio',
  enableParticles: true,
  enablePostProcessing: true,
  enableShadows: true,
  enableEnvironment: true,
  performanceMode: 'high'
};

export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  enableZoom: true,
  enablePan: true,
  enableRotate: true,
  enableKeyboard: true,
  enableTouch: true,
  enableGestures: true,
  enableAutoRotate: false,
  autoRotateSpeed: 2,
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 3,
  maxDistance: 50,
  maxPolarAngle: Math.PI / 1.8,
  minPolarAngle: Math.PI / 6,
  enableFocusMode: true,
  accessibilityMode: false
};

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  shadowMapSize: 2048,
  antialias: true,
  enableShadows: true,
  enablePostProcessing: true,
  enableParticles: true,
  maxParticles: 200,
  lodDistanceMultiplier: 1.0,
  cullingEnabled: true
};

export default {
  // Export all types as a default object for easier importing
  SceneTheme,
  PerformanceLevel,
  ParticleSystemType,
  DEFAULT_SCENE_CONFIG,
  DEFAULT_CONTROLS_CONFIG,
  DEFAULT_PERFORMANCE_SETTINGS
};