import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Ring, Text, Circle } from '@react-three/drei';
import { Group, Color, BufferGeometry, Float32BufferAttribute } from 'three';

export interface StatusRingProps {
  position: [number, number, number];
  status: 'idle' | 'running' | 'completed' | 'error';
  progress?: number; // 0-1 for progress indication
  radius?: number;
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  animated?: boolean;
  showLabel?: boolean;
  label?: string;
}

// Animated progress ring component
function ProgressRing({ 
  progress, 
  radius, 
  color, 
  animated = true 
}: { 
  progress: number;
  radius: number;
  color: string;
  animated: boolean;
}) {
  const ringRef = useRef<Group>(null);
  
  // Create geometry for progress arc
  const progressGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const segments = Math.max(3, Math.floor(progress * 64));
    const angle = progress * Math.PI * 2;
    
    const positions = new Float32BufferAttribute((segments + 1) * 3, 3);
    const colors = new Float32BufferAttribute((segments + 1) * 3, 3);
    
    const color3 = new Color(color);
    
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * angle - Math.PI / 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      
      positions.setXYZ(i, x, y, 0);
      colors.setXYZ(i, color3.r, color3.g, color3.b);
    }
    
    geometry.setAttribute('position', positions);
    geometry.setAttribute('color', colors);
    
    return geometry;
  }, [progress, radius, color]);
  
  useFrame((state) => {
    if (animated && ringRef.current) {
      ringRef.current.rotation.z += 0.01;
    }
  });
  
  return (
    <group ref={ringRef}>
      <line geometry={progressGeometry}>
        <lineBasicMaterial
          vertexColors
          linewidth={3}
          transparent
          opacity={0.8}
        />
      </line>
    </group>
  );
}

// Pulsing effect for active status
function PulsingEffect({ 
  status, 
  radius, 
  color, 
  theme 
}: { 
  status: string;
  radius: number;
  color: string;
  theme: string;
}) {
  const pulseRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (pulseRef.current && status === 'running') {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      pulseRef.current.scale.setScalar(scale);
      
      // Update opacity based on pulse
      const opacity = 0.2 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      if (pulseRef.current.children[0]) {
        const material = (pulseRef.current.children[0] as any).material;
        if (material) {
          material.opacity = opacity;
        }
      }
    }
  });
  
  // Only show pulsing effect for running status
  if (status !== 'running') return null;
  
  return (
    <group ref={pulseRef}>
      <Ring
        args={[radius * 1.2, radius * 1.5, 32]}
        material-color={color}
        material-transparent
        material-opacity={0.2}
        material-emissive={theme === 'cyber' ? color : '#000000'}
        material-emissiveIntensity={theme === 'cyber' ? 0.1 : 0}
      />
    </group>
  );
}

// Sparkle effects for completed status
function SparkleEffect({ 
  status, 
  radius, 
  color 
}: { 
  status: string;
  radius: number;
  color: string;
}) {
  const sparkleRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (sparkleRef.current && status === 'completed') {
      sparkleRef.current.rotation.z += 0.02;
      
      // Animate individual sparkles
      sparkleRef.current.children.forEach((child, index) => {
        const offset = index * 0.5;
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + offset) * 0.5;
        child.scale.setScalar(scale);
      });
    }
  });
  
  // Only show sparkles for completed status
  if (status !== 'completed') return null;
  
  const sparklePositions = [
    [radius * 0.8, radius * 0.8, 0],
    [-radius * 0.8, radius * 0.8, 0],
    [radius * 0.8, -radius * 0.8, 0],
    [-radius * 0.8, -radius * 0.8, 0],
    [radius * 1.1, 0, 0],
    [-radius * 1.1, 0, 0],
    [0, radius * 1.1, 0],
    [0, -radius * 1.1, 0],
  ];
  
  return (
    <group ref={sparkleRef}>
      {sparklePositions.map((pos, index) => (
        <mesh key={index} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// Error indicator with warning effects
function ErrorEffect({ 
  status, 
  radius, 
  color 
}: { 
  status: string;
  radius: number;
  color: string;
}) {
  const errorRef = useRef<Group>(null);
  
  useFrame((state) => {
    if (errorRef.current && status === 'error') {
      // Sharp, jarring movement for error state
      const intensity = Math.sin(state.clock.elapsedTime * 8) > 0.7 ? 1.2 : 1;
      errorRef.current.scale.setScalar(intensity);
    }
  });
  
  // Only show error effects for error status
  if (status !== 'error') return null;
  
  return (
    <group ref={errorRef}>
      {/* Warning triangle indicators */}
      {[0, 1, 2].map((index) => {
        const angle = (index * Math.PI * 2) / 3;
        const x = Math.cos(angle) * radius * 1.3;
        const y = Math.sin(angle) * radius * 1.3;
        
        return (
          <mesh key={index} position={[x, y, 0]} rotation={[0, 0, angle + Math.PI / 2]}>
            <coneGeometry args={[0.1, 0.2, 3]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Main StatusRing component
export function StatusRing({
  position,
  status,
  progress = 0,
  radius = 1,
  theme = 'studio',
  animated = true,
  showLabel = true,
  label
}: StatusRingProps) {
  const groupRef = useRef<Group>(null);
  
  const getStatusColor = (status: string, theme: string) => {
    const colorMap = {
      cyber: {
        idle: '#0088ff',
        running: '#00ff88',
        completed: '#ffaa00',
        error: '#ff0066'
      },
      space: {
        idle: '#7f8fa6',
        running: '#4a90e2',
        completed: '#f5a623',
        error: '#e24a4a'
      },
      minimal: {
        idle: '#6c757d',
        running: '#28a745',
        completed: '#ffc107',
        error: '#dc3545'
      },
      studio: {
        idle: '#007bff',
        running: '#28a745',
        completed: '#ffc107',
        error: '#dc3545'
      }
    };
    
    return colorMap[theme as keyof typeof colorMap][status as keyof typeof colorMap.studio] || '#666666';
  };
  
  const statusColor = getStatusColor(status, theme);
  
  useFrame((state) => {
    if (groupRef.current && animated) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      
      // Subtle rotation for idle state
      if (status === 'idle') {
        groupRef.current.rotation.z += 0.005;
      }
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Base ring */}
      <Ring
        args={[radius * 0.8, radius, 32]}
        material-color={statusColor}
        material-transparent
        material-opacity={0.6}
        material-emissive={theme === 'cyber' ? statusColor : '#000000'}
        material-emissiveIntensity={theme === 'cyber' ? 0.1 : 0}
      />
      
      {/* Inner ring for depth */}
      <Ring
        args={[radius * 0.6, radius * 0.75, 32]}
        material-color={statusColor}
        material-transparent
        material-opacity={0.3}
        position={[0, 0, -0.01]}
      />
      
      {/* Progress indicator */}
      {status === 'running' && progress > 0 && (
        <ProgressRing
          progress={progress}
          radius={radius * 0.9}
          color={statusColor}
          animated={animated}
        />
      )}
      
      {/* Center dot */}
      <Circle
        args={[radius * 0.1, 16]}
        material-color={statusColor}
        material-emissive={theme === 'cyber' ? statusColor : '#000000'}
        material-emissiveIntensity={theme === 'cyber' ? 0.3 : 0}
        position={[0, 0, 0.01]}
      />
      
      {/* Status-specific effects */}
      <PulsingEffect
        status={status}
        radius={radius}
        color={statusColor}
        theme={theme}
      />
      
      <SparkleEffect
        status={status}
        radius={radius}
        color={statusColor}
      />
      
      <ErrorEffect
        status={status}
        radius={radius}
        color={statusColor}
      />
      
      {/* Status label */}
      {showLabel && (
        <Text
          position={[0, -radius * 1.5, 0]}
          fontSize={radius * 0.2}
          color={statusColor}
          anchorX="center"
          anchorY="middle"
          font="/fonts/orbitron-medium.woff"
        >
          {label || status.toUpperCase()}
        </Text>
      )}
      
      {/* Progress percentage for running status */}
      {status === 'running' && progress > 0 && (
        <Text
          position={[0, 0, 0.02]}
          fontSize={radius * 0.15}
          color={theme === 'minimal' ? '#000000' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          font="/fonts/orbitron-bold.woff"
        >
          {Math.round(progress * 100)}%
        </Text>
      )}
    </group>
  );
}

export default StatusRing;