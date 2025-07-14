import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { Agent3DAvatar } from './Agent3DAvatar';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { AgentStatus } from '../types/aguiTypes';
import { detectWebGLSupport, getWebGLInfo } from '../utils/webglSupport';
import { AlertCircle, Box, RefreshCw, Monitor } from 'lucide-react';
import Agent2DFallback from './Agent2DFallback';

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
      <div className={`w-full h-full ${className}`}>
        {/* Fallback Header */}
        <div className="p-4 bg-muted/20 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-sm font-medium">Agent Visualization</h3>
                <p className="text-xs text-muted-foreground">2D mode - full functionality available</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRetry}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                title="Try to enable 3D mode"
              >
                <RefreshCw className="w-3 h-3" />
                Try 3D
              </button>
            </div>
          </div>
        </div>
        
        {/* 2D Fallback Component */}
        <Agent2DFallback agents={agents} className="flex-1" />
        
        {/* Optional troubleshooting info */}
        {webglInfo && !webglInfo.supported && retryCount > 2 && (
          <div className="p-3 m-4 mt-0 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  3D visualization not available
                </p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-yellow-700 dark:text-yellow-300 hover:underline">
                    Troubleshooting tips
                  </summary>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-yellow-700 dark:text-yellow-300">
                    <li>Update your graphics drivers</li>
                    <li>Try Chrome, Firefox, or Edge browser</li>
                    <li>Enable hardware acceleration in browser settings</li>
                    <li>Disable extensions that might block WebGL</li>
                  </ul>
                </details>
              </div>
            </div>
          </div>
        )}
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