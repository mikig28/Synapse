import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text, Html, Sphere, Ring, useAnimations, Detailed } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import { 
  Group, 
  AnimationMixer, 
  AnimationAction, 
  Vector3, 
  Color,
  MeshStandardMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  AdditiveBlending,
  Mesh,
  Material,
  LOD,
  SphereGeometry,
  BoxGeometry,
  CapsuleGeometry
} from 'three';
import { AgentStatus } from '../../types/aguiTypes';

interface AdvancedAgentAvatarProps {
  agent: AgentStatus;
  position: [number, number, number];
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
  selected?: boolean;
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  enableLOD?: boolean;
  enableAnimations?: boolean;
  enableParticles?: boolean;
  performanceLevel?: 'low' | 'medium' | 'high' | 'ultra';
}

// Helper function for particle colors
const getParticleColor = (status: string, theme: string) => {
  if (theme === 'cyber') {
    switch (status) {
      case 'running': return new Color('#00ff88');
      case 'error': return new Color('#ff0066');
      case 'completed': return new Color('#ffaa00');
      default: return new Color('#0088ff');
    }
  } else if (theme === 'space') {
    switch (status) {
      case 'running': return new Color('#4a90e2');
      case 'error': return new Color('#e24a4a');
      case 'completed': return new Color('#f5a623');
      default: return new Color('#7f8fa6');
    }
  } else {
    switch (status) {
      case 'running': return new Color('#28a745');
      case 'error': return new Color('#dc3545');
      case 'completed': return new Color('#ffc107');
      default: return new Color('#6c757d');
    }
  }
};

// Enhanced particle system for agent effects
function AgentParticleSystem({ 
  status, 
  position, 
  theme = 'studio',
  intensity = 1.0,
  enabled = true
}: { 
  status: string;
  position: [number, number, number];
  theme: string;
  intensity?: number;
  enabled?: boolean;
}) {
  if (!enabled) return null;
  const pointsRef = useRef<Points>(null);
  const particleCount = Math.floor(100 * intensity);
  
  const particleGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Create varied distributions based on status
      let radius, theta, phi;
      
      if (status === 'running') {
        // Dynamic swirling pattern for active agents
        radius = Math.random() * 1.5 + 0.5;
        theta = Math.random() * Math.PI * 2;
        phi = Math.random() * Math.PI;
      } else if (status === 'error') {
        // Chaotic scattered pattern for errors
        radius = Math.random() * 3 + 0.5;
        theta = Math.random() * Math.PI * 2;
        phi = Math.random() * Math.PI;
      } else if (status === 'completed') {
        // Organized ascending pattern for completed
        radius = Math.random() * 1 + 0.8;
        theta = (i / particleCount) * Math.PI * 4; // Spiral pattern
        phi = Math.PI * 0.3; // Upward bias
      } else {
        // Gentle ambient pattern for idle
        radius = Math.random() * 1.2 + 0.8;
        theta = Math.random() * Math.PI * 2;
        phi = Math.random() * Math.PI * 0.5 + Math.PI * 0.25; // Horizontal bias
      }
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Set particle colors based on theme and status
      const color = getParticleColor(status, theme);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      scales[i] = Math.random() * 0.5 + 0.5;
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('scale', new Float32BufferAttribute(scales, 1));
    
    return geometry;
  }, [particleCount, status, theme]);
  
  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;
      
      if (status === 'running') {
        // Dynamic rotation for active agents
        pointsRef.current.rotation.y += 0.015;
        pointsRef.current.rotation.z += 0.008;
        
        // Enhanced pulsing effect
        const scale = 1 + Math.sin(time * 4) * 0.15;
        pointsRef.current.scale.setScalar(scale);
        
        // Update particle positions for flow effect
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(time * 2 + i * 0.1) * 0.002;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      } else if (status === 'error') {
        // Chaotic movement for errors
        pointsRef.current.rotation.x += Math.sin(time * 5) * 0.01;
        pointsRef.current.rotation.y += Math.cos(time * 3) * 0.015;
        pointsRef.current.rotation.z += Math.sin(time * 7) * 0.008;
      } else if (status === 'completed') {
        // Gentle upward flow for completed
        pointsRef.current.rotation.y += 0.005;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += 0.01; // Gentle upward movement
          if (positions[i] > 3) positions[i] = -1; // Reset when too high
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      } else {
        // Subtle ambient movement for idle
        pointsRef.current.rotation.y += 0.002;
        const scale = 1 + Math.sin(time * 2) * 0.05;
        pointsRef.current.scale.setScalar(scale);
      }
    }
  });
  
  // Show particles for all states, but with different intensities
  const particleOpacity = status === 'idle' ? 0.3 : status === 'running' ? 0.8 : 0.6;
  
  return (
    <points ref={pointsRef} position={position} geometry={particleGeometry}>
      <pointsMaterial
        size={status === 'running' ? 0.08 : status === 'error' ? 0.06 : 0.05}
        vertexColors
        transparent
        opacity={particleOpacity}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Status indicator rings
function StatusIndicators({ 
  status, 
  theme = 'studio' 
}: { 
  status: string;
  theme: string;
}) {
  const ringRef = useRef<Group>(null);
  const pulseRef = useRef<Group>(null);
  
  const getStatusColor = (status: string, theme: string) => {
    if (theme === 'cyber') {
      switch (status) {
        case 'running': return '#00ff88';
        case 'idle': return '#0088ff';
        case 'error': return '#ff0066';
        case 'completed': return '#ffaa00';
        default: return '#666666';
      }
    } else if (theme === 'space') {
      switch (status) {
        case 'running': return '#4a90e2';
        case 'idle': return '#7f8fa6';
        case 'error': return '#e24a4a';
        case 'completed': return '#f5a623';
        default: return '#95a5a6';
      }
    } else {
      switch (status) {
        case 'running': return '#28a745';
        case 'idle': return '#007bff';
        case 'error': return '#dc3545';
        case 'completed': return '#ffc107';
        default: return '#6c757d';
      }
    }
  };
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01;
    }
    
    if (pulseRef.current && status === 'running') {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      pulseRef.current.scale.setScalar(scale);
    }
  });
  
  const statusColor = getStatusColor(status, theme);
  
  return (
    <group position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Main status ring */}
      <group ref={ringRef}>
        <Ring
          args={[1.2, 1.4, 32]}
          material-color={statusColor}
          material-transparent
          material-opacity={0.8}
        />
      </group>
      
      {/* Pulsing effect for active agents */}
      {status === 'running' && (
        <group ref={pulseRef}>
          <Ring
            args={[1.4, 1.8, 32]}
            material-color={statusColor}
            material-transparent
            material-opacity={0.3}
          />
        </group>
      )}
      
      {/* Data flow lines for running agents */}
      {status === 'running' && (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI) / 2) * 2,
                0,
                Math.sin((i * Math.PI) / 2) * 2
              ]}
              rotation={[0, 0, (i * Math.PI) / 2]}
            >
              <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
              <meshBasicMaterial 
                color={statusColor} 
                transparent 
                opacity={0.6}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// LOD (Level of Detail) geometries for performance optimization
function LODGeometries({ 
  agent, 
  theme, 
  selected, 
  distance 
}: { 
  agent: AgentStatus;
  theme: string;
  selected: boolean;
  distance: number;
}) {
  const getAvatarColor = () => {
    if (theme === 'cyber') {
      switch (agent.status) {
        case 'running': return '#00ff88';
        case 'error': return '#ff0066';
        case 'completed': return '#ffaa00';
        default: return '#0088ff';
      }
    } else if (theme === 'space') {
      switch (agent.status) {
        case 'running': return '#4a90e2';
        case 'error': return '#e24a4a';
        case 'completed': return '#f5a623';
        default: return '#7f8fa6';
      }
    }
    return '#ffffff';
  };

  const materialProps = {
    color: getAvatarColor(),
    metalness: theme === 'cyber' ? 0.8 : 0.3,
    roughness: theme === 'cyber' ? 0.2 : 0.7,
    emissive: theme === 'cyber' ? getAvatarColor() : '#000000',
    emissiveIntensity: theme === 'cyber' ? 0.1 : 0,
    transparent: true,
    opacity: selected ? 1.0 : 0.9
  };

  // High detail (close up)
  if (distance < 15) {
    return (
      <group>
        {/* Detailed body */}
        <mesh castShadow receiveShadow>
          <CapsuleGeometry args={[0.4, 1.2, 8, 16]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        
        {/* Detailed head */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <SphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        
        {/* Arms */}
        <mesh position={[-0.6, 0.3, 0]} rotation={[0, 0, Math.PI/6]} castShadow>
          <CapsuleGeometry args={[0.1, 0.8, 4, 8]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0.6, 0.3, 0]} rotation={[0, 0, -Math.PI/6]} castShadow>
          <CapsuleGeometry args={[0.1, 0.8, 4, 8]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        
        {/* Status-specific details */}
        {agent.status === 'running' && (
          <mesh position={[0, 1.1, 0.3]}>
            <SphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
          </mesh>
        )}
        
        {theme === 'cyber' && (
          <>
            <mesh position={[-0.1, 1.1, 0.25]}>
              <SphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0.1, 1.1, 0.25]}>
              <SphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </>
        )}
      </group>
    );
  }
  
  // Medium detail (medium distance)
  if (distance < 30) {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <CapsuleGeometry args={[0.4, 1.2, 4, 8]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <SphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      </group>
    );
  }
  
  // Low detail (far distance)
  return (
    <mesh castShadow receiveShadow>
      <BoxGeometry args={[0.8, 2, 0.4]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

// Enhanced 3D avatar model with animations and LOD
function Avatar3DModel({ 
  agent, 
  selected = false, 
  theme = 'studio',
  enableLOD = true,
  enableAnimations = true,
  performanceLevel = 'high'
}: { 
  agent: AgentStatus;
  selected: boolean;
  theme: string;
  enableLOD?: boolean;
  enableAnimations?: boolean;
  performanceLevel?: string;
}) {
  const groupRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<{ [key: string]: AnimationAction }>({});
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraDistance, setCameraDistance] = useState(20);
  
  // Animated spring values for smooth transitions
  const [springs, api] = useSpring(() => ({
    scale: selected ? 1.2 : 1.0,
    positionY: 0,
    rotationY: 0,
    config: { tension: 300, friction: 30 }
  }));
  
  // Load the GLB model with error handling (only for high performance)
  let scene: Group | null = null;
  let animations: any[] = [];
  
  if (performanceLevel === 'ultra' || performanceLevel === 'high') {
    try {
      const gltf = useGLTF('/models/robot_avatar.glb');
      scene = gltf.scene;
      animations = gltf.animations || [];
      if (scene) setModelLoaded(true);
    } catch (error) {
      console.warn('Failed to load 3D model, using fallback:', error);
      scene = null;
      animations = [];
      setModelLoaded(false);
    }
  }
  
  // Initialize animations
  useEffect(() => {
    if (animations.length > 0 && scene) {
      mixerRef.current = new AnimationMixer(scene);
      
      animations.forEach((clip) => {
        const action = mixerRef.current!.clipAction(clip);
        actionsRef.current[clip.name] = action;
      });
    }
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [animations, scene]);
  
  // Play appropriate animation based on agent status
  useEffect(() => {
    if (!mixerRef.current) return;
    
    // Stop all animations
    Object.values(actionsRef.current).forEach(action => action.stop());
    
    // Play animation based on status
    let targetAnimation = 'Idle';
    switch (agent.status) {
      case 'running':
        targetAnimation = 'Running';
        break;
      case 'error':
        targetAnimation = 'Death';
        break;
      case 'completed':
        targetAnimation = 'Victory';
        break;
      default:
        targetAnimation = 'Idle';
    }
    
    // Find and play the best matching animation
    const availableAnimations = Object.keys(actionsRef.current);
    const animationToPlay = availableAnimations.find(name => 
      name.toLowerCase().includes(targetAnimation.toLowerCase())
    ) || availableAnimations[0];
    
    if (animationToPlay && actionsRef.current[animationToPlay]) {
      actionsRef.current[animationToPlay].reset().play();
    }
  }, [agent.status, enableAnimations]);
  
  // Update camera distance for LOD calculations
  useFrame(({ camera }) => {
    if (groupRef.current && enableLOD) {
      const distance = camera.position.distanceTo(groupRef.current.position);
      setCameraDistance(distance);
    }
  });
  
  // Update spring animations based on agent status
  useEffect(() => {
    const getStatusAnimations = () => {
      switch (agent.status) {
        case 'running':
          return {
            scale: selected ? 1.3 : 1.1,
            positionY: Math.sin(Date.now() * 0.001) * 0.1,
            rotationY: 0
          };
        case 'completed':
          return {
            scale: selected ? 1.4 : 1.2,
            positionY: 0.2,
            rotationY: Math.PI * 2
          };
        case 'error':
          return {
            scale: selected ? 1.1 : 0.9,
            positionY: -0.1,
            rotationY: Math.sin(Date.now() * 0.005) * 0.1
          };
        default:
          return {
            scale: selected ? 1.2 : 1.0,
            positionY: 0,
            rotationY: 0
          };
      }
    };
    
    api.start(getStatusAnimations());
  }, [agent.status, selected, api]);
  
  useFrame((state, delta) => {
    if (mixerRef.current && enableAnimations) {
      mixerRef.current.update(delta);
    }
  });
  
  
  return (
    <animated.group 
      ref={groupRef}
      scale={springs.scale}
      position-y={springs.positionY}
      rotation-y={springs.rotationY}
    >
      {scene && modelLoaded && (performanceLevel === 'ultra' || performanceLevel === 'high') ? (
        <primitive 
          object={scene.clone()} 
          scale={1.5}
          castShadow
          receiveShadow
        />
      ) : enableLOD ? (
        // LOD-based geometric representation
        <LODGeometries 
          agent={agent}
          theme={theme}
          selected={selected}
          distance={cameraDistance}
        />
      ) : (
        // Simple fallback for low performance
        <mesh castShadow receiveShadow>
          <BoxGeometry args={[0.8, 1.8, 0.4]} />
          <meshBasicMaterial color={theme === 'cyber' ? '#00d4ff' : '#ffffff'} />
        </mesh>
      )}
    </animated.group>
  );
}

// Main Advanced Agent Avatar component
export function AdvancedAgentAvatar({ 
  agent, 
  position, 
  onClick, 
  onHover, 
  selected = false,
  theme = 'studio',
  enableLOD = true,
  enableAnimations = true,
  enableParticles = true,
  performanceLevel = 'high'
}: AdvancedAgentAvatarProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(true);
  };
  
  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(false);
  };
  
  const handleClick = () => {
    onClick?.();
  };
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {/* Avatar Model */}
      <Avatar3DModel 
        agent={agent} 
        selected={selected || hovered}
        theme={theme}
        enableLOD={enableLOD}
        enableAnimations={enableAnimations}
        performanceLevel={performanceLevel}
      />
      
      {/* Status Indicators */}
      <StatusIndicators status={agent.status} theme={theme} />
      
      {/* Particle Effects */}
      {enableParticles && (
        <AgentParticleSystem 
          status={agent.status} 
          position={[0, 0, 0]} 
          theme={theme}
          intensity={performanceLevel === 'low' ? 0.3 : performanceLevel === 'medium' ? 0.6 : 1.0}
          enabled={enableParticles}
        />
      )}
      
      {/* Agent Name Label */}
      <Html
        position={[0, 3.5, 0]}
        center
        distanceFactor={10}
        occlude={[groupRef]}
        className="pointer-events-none"
      >
        <div className={`
          px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300
          ${theme === 'cyber' 
            ? 'bg-cyan-900/90 text-cyan-100 border border-cyan-400/50' 
            : theme === 'space'
            ? 'bg-indigo-900/90 text-indigo-100 border border-indigo-400/50'
            : 'bg-black/80 text-white border border-gray-600/50'
          }
          ${hovered || selected ? 'scale-110 shadow-lg' : ''}
        `}>
          {agent.name}
          {agent.performance && (
            <div className="text-xs opacity-75 mt-1">
              {agent.performance.tasksCompleted} tasks | {agent.performance.successRate}% success
            </div>
          )}
        </div>
      </Html>
      
      {/* Agent Type and Status Labels */}
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.3}
        color={
          theme === 'cyber' ? '#00d4ff' :
          theme === 'space' ? '#4a90e2' : '#28a745'
        }
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-medium.woff"
      >
        {agent.type.toUpperCase()}
      </Text>
      
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.2}
        color={
          theme === 'cyber' ? '#ffffff' :
          theme === 'space' ? '#e8eaed' : '#ffffff'
        }
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-regular.woff"
      >
        {agent.status.toUpperCase()}
      </Text>
      
      {/* Performance indicators for selected agents */}
      {(selected || hovered) && agent.performance && (
        <Html
          position={[2, 1, 0]}
          transform
          occlude={[groupRef]}
          className="pointer-events-none"
        >
          <div className={`
            p-2 rounded text-xs 
            ${theme === 'cyber' 
              ? 'bg-cyan-900/95 text-cyan-100 border border-cyan-400/50' 
              : 'bg-black/90 text-white border border-gray-600/50'
            }
          `}>
            <div>Tasks: {agent.performance.tasksCompleted}</div>
            <div>Success: {agent.performance.successRate}%</div>
            <div>Avg Time: {agent.performance.avgResponseTime}ms</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Preload the GLB model
useGLTF.preload('/models/robot_avatar.glb');

export default AdvancedAgentAvatar;