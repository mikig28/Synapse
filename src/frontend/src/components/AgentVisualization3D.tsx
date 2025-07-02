import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { Agent3DAvatar } from './Agent3DAvatar';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { AgentStatus } from '../types/aguiTypes';
import { detectWebGLSupport, getWebGLInfo } from '../utils/webglSupport';
import { AlertCircle, Box, RefreshCw } from 'lucide-react';

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
  const [webglInfo, setWebglInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkWebGLSupport = () => {
    const supported = detectWebGLSupport();
    const info = getWebGLInfo();
    
    console.log('WebGL Support Check:', { supported, info });
    
    setWebglSupported(supported);
    setWebglInfo(info);
  };

  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(checkWebGLSupport, 100);
    return () => clearTimeout(timer);
  }, [retryCount]);

  const handleRetry = () => {
    setWebglSupported(null);
    setRetryCount(prev => prev + 1);
  };

  if (webglSupported === null) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Box className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Initializing 3D...</p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Retry attempt {retryCount}</p>
          )}
        </div>
      </div>
    );
  }

  if (!webglSupported) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div className="text-center p-4 max-w-md">
          <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">3D visualization unavailable</p>
          <p className="text-xs text-muted-foreground mb-3">
            {webglInfo?.error || 'WebGL or Three.js support required'}
          </p>
          
          {webglInfo && !webglInfo.supported && (
            <div className="text-xs text-muted-foreground mb-3 p-2 bg-muted rounded">
              <p><strong>Troubleshooting:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Update your graphics drivers</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
                <li>Check if hardware acceleration is enabled</li>
                <li>Disable browser extensions that might block WebGL</li>
              </ul>
            </div>
          )}
          
          <button 
            onClick={handleRetry}
            className="flex items-center gap-2 mx-auto px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
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
          gl={{ 
            antialias: true, 
            alpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false
          }}
          dpr={[1, 2]}
          onCreated={() => {
            console.log('Three.js Canvas created successfully');
          }}
          onError={(error) => {
            console.error('Three.js Canvas error:', error);
          }}
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