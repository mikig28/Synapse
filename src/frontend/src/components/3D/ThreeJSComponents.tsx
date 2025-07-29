import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Center } from '@react-three/drei';
import { AgentStatus } from '../../types/aguiTypes';
import { SceneTheme } from './ProductionReady3DDashboard';

interface ThreeJSComponentsProps {
  agents: AgentStatus[];
  theme: SceneTheme;
  onAgentSelect?: (agentId: string | null) => void;
  onError?: (error: Error) => void;
}

// Simple animated agent cube component
function AgentCube({ 
  agent, 
  position, 
  onSelect 
}: { 
  agent: AgentStatus; 
  position: [number, number, number]; 
  onSelect?: (agentId: string | null) => void;
}) {
  const meshRef = useRef<any>();

  // Gentle rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  const color = useMemo(() => {
    switch (agent.status) {
      case 'running': return '#10b981'; // green
      case 'idle': return '#6366f1';    // indigo  
      case 'error': return '#ef4444';   // red
      default: return '#f59e0b';        // amber
    }
  }, [agent.status]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={() => onSelect?.(agent.id)}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color={color}
        metalness={0.5}
        roughness={0.2}
      />
    </mesh>
  );
}

// Main 3D scene component
function Scene({ agents, theme, onAgentSelect }: Omit<ThreeJSComponentsProps, 'onError'>) {
  // Position agents in a grid layout
  const agentPositions = useMemo(() => {
    return agents.map((_, index) => {
      const gridSize = Math.ceil(Math.sqrt(agents.length));
      const x = (index % gridSize - (gridSize - 1) / 2) * 2.5;
      const z = (Math.floor(index / gridSize) - Math.floor((agents.length - 1) / gridSize / 2)) * 2.5;
      return [x, 0, z] as [number, number, number];
    });
  }, [agents]);

  return (
    <>
      {/* Lighting setup */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />

      {/* Agent cubes */}
      <Center>
        {agents.map((agent, index) => (
          <AgentCube
            key={agent.id || index}
            agent={agent}
            position={agentPositions[index]}
            onSelect={onAgentSelect}
          />
        ))}
      </Center>

      {/* Controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxDistance={30}
        minDistance={5}
        maxPolarAngle={Math.PI / 2}
      />
      
      {/* Environment */}
      <Environment preset={theme.environment as any || 'studio'} />
    </>
  );
}

// Main ThreeJS wrapper component with error boundary
export function ThreeJSComponents({ 
  agents, 
  theme, 
  onAgentSelect, 
  onError 
}: ThreeJSComponentsProps) {
  const handleCanvasError = (error: any) => {
    console.error('Canvas Error:', error);
    onError?.(error instanceof Error ? error : new Error('Canvas rendering failed'));
  };

  // Wrap in try-catch for additional safety
  try {
    return (
      <Canvas
        camera={{ 
          position: [10, 10, 10], 
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        onError={handleCanvasError}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        shadows
      >
        <Scene 
          agents={agents} 
          theme={theme} 
          onAgentSelect={onAgentSelect}
        />
      </Canvas>
    );
  } catch (error) {
    console.error('ThreeJS Components Error:', error);
    onError?.(error instanceof Error ? error : new Error('Failed to render 3D components'));
    return null;
  }
}

export default ThreeJSComponents;