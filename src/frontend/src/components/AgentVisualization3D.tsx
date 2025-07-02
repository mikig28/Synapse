import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { Agent3DAvatar } from './Agent3DAvatar';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { AgentStatus } from '../types/aguiTypes';
import { detectWebGLSupport } from '../utils/webglSupport';
import { AlertCircle, Box } from 'lucide-react';

interface AgentVisualization3DProps {
  agents: AgentStatus[];
  className?: string;
}

function Loading() {
  return (
    <Html center>
      <div className="text-white">Loading 3D Scene...</div>
    </Html>
  );
}

export function AgentVisualization3D({ agents, className }: AgentVisualization3DProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglSupported(detectWebGLSupport());
  }, []);

  if (webglSupported === null) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Box className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Initializing 3D...</p>
        </div>
      </div>
    );
  }

  if (!webglSupported) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">3D visualization not supported</p>
          <p className="text-xs text-muted-foreground">WebGL required for 3D view</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <ThreeErrorBoundary>
        <Canvas
          camera={{ position: [0, 5, 10], fov: 45 }}
          style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 2]}
        >
          <Suspense fallback={<Loading />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          
          {/* Environment */}
          <Environment preset="city" />
          
          {/* Agent Avatars */}
          {agents.map((agent, index) => (
            <Agent3DAvatar
              key={agent.id}
              agent={agent}
              position={[
                (index % 3) * 4 - 4, // X position in grid
                0,
                Math.floor(index / 3) * 4 - 4 // Z position in grid
              ]}
            />
          ))}
          
          {/* Ground plane */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -2, 0]}
            receiveShadow
          >
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial 
              color="#2a2a2a" 
              transparent 
              opacity={0.3}
            />
          </mesh>
          
          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
          />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}