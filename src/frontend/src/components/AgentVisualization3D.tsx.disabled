import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Agent3DAvatar } from './Agent3DAvatar';
import { Enhanced3DContainer } from './3D/Enhanced3DContainer';
import { ThreeErrorBoundary } from './ThreeErrorBoundary';
import { AgentStatus } from '../types/aguiTypes';
import { SceneConfig, SceneTheme, PerformanceMetrics } from './3D/types';
import { detectWebGLSupport, getWebGLInfo } from '../utils/webglSupport';
import { runDeviceTests, applyDeviceOptimizations } from './3D/utils/deviceTesting';
import { AlertCircle, Box, RefreshCw, Monitor, Settings, Zap } from 'lucide-react';
import Agent2DFallback from './Agent2DFallback';

interface AgentVisualization3DProps {
  agents: AgentStatus[];
  className?: string;
  enableEnhanced3D?: boolean;
  theme?: SceneTheme;
  enablePerformanceMonitoring?: boolean;
  enableAccessibility?: boolean;
  onAgentSelect?: (agentId: string | null) => void;
}

function Loading() {
  return (
    <Html center>
      <div className="text-white">Loading 3D Scene...</div>
    </Html>
  );
}

export function AgentVisualization3D({ 
  agents, 
  className, 
  enableEnhanced3D = true,
  theme = 'studio',
  enablePerformanceMonitoring = true,
  enableAccessibility = false,
  onAgentSelect
}: AgentVisualization3DProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [webglInfo, setWebglInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [currentTheme, setCurrentTheme] = useState<SceneTheme>(theme);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

  const checkWebGLSupport = async () => {
    const supported = detectWebGLSupport();
    const info = getWebGLInfo();
    
    console.log('WebGL Support Check:', { supported, info });
    
    // Run comprehensive device tests if enhanced 3D is enabled
    if (supported && enableEnhanced3D) {
      try {
        const deviceTests = await runDeviceTests();
        console.log('Device Test Results:', deviceTests);
        
        // Apply device-specific optimizations
        const optimizations = applyDeviceOptimizations(deviceTests.capabilities);
        
        // Update scene configuration based on device capabilities
        setCurrentTheme(optimizations.sceneConfig.theme as SceneTheme);
        
        // Show warnings if any
        if (deviceTests.recommendations.warnings.length > 0) {
          console.warn('Device Performance Warnings:', deviceTests.recommendations.warnings);
        }
      } catch (error) {
        console.error('Device testing failed:', error);
      }
    }
    
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

  // Handle agent selection
  const handleAgentSelect = (agentId: string | null) => {
    setSelectedAgent(agentId);
    onAgentSelect?.(agentId);
  };

  // Handle performance metrics updates
  const handlePerformanceChange = (level: any, metrics: PerformanceMetrics) => {
    if (enablePerformanceMonitoring) {
      setPerformanceMetrics(metrics);
    }
  };

  // Scene configuration
  const sceneConfig: SceneConfig = {
    theme: currentTheme,
    enableParticles: true,
    enablePostProcessing: true,
    enableShadows: true,
    enableEnvironment: true,
    performanceMode: 'high'
  };

  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* Enhanced 3D Controls Panel */}
      {enableEnhanced3D && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Theme Selector */}
          <div className="bg-black/80 rounded-lg p-2 text-white">
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value as SceneTheme)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="studio">Studio</option>
              <option value="cyber">Cyber</option>
              <option value="space">Space</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          {/* Performance Toggle */}
          {enablePerformanceMonitoring && (
            <button
              onClick={() => setShowPerformancePanel(!showPerformancePanel)}
              className="bg-black/80 p-2 rounded-lg text-white hover:bg-black/90 transition-colors"
              title="Toggle Performance Panel"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Performance Panel */}
      {showPerformancePanel && performanceMetrics && (
        <div className="absolute top-4 left-4 z-10 bg-black/90 rounded-lg p-3 text-white text-sm">
          <h3 className="font-semibold mb-2">Performance</h3>
          <div className="space-y-1">
            <div>FPS: {performanceMetrics.fps}</div>
            <div>Draw Calls: {performanceMetrics.drawCalls}</div>
            <div>Theme: {currentTheme}</div>
          </div>
        </div>
      )}

      {/* Agent Selection Info */}
      {selectedAgent && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/90 rounded-lg p-3 text-white">
          <h3 className="font-semibold">Selected Agent</h3>
          <p className="text-sm text-gray-300">{selectedAgent}</p>
        </div>
      )}

      <ThreeErrorBoundary>
        <Canvas
          camera={{ position: [0, 5, 10], fov: 45 }}
          gl={{ 
            antialias: true, 
            alpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false
          }}
          dpr={[1, 2]}
          shadows
          onCreated={() => {
            console.log('Three.js Canvas created successfully');
          }}
          onError={(error) => {
            console.error('Three.js Canvas error:', error);
          }}
        >
          <Suspense fallback={<Loading />}>
            {enableEnhanced3D ? (
              // Enhanced 3D Scene
              <Enhanced3DContainer
                agents={agents}
                config={sceneConfig}
                selectedAgent={selectedAgent}
                enableAccessibility={enableAccessibility}
                onAgentSelect={handleAgentSelect}
                onPerformanceChange={handlePerformanceChange}
              />
            ) : (
              // Basic 3D Scene (Legacy)
              <>
                {/* Basic Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight 
                  position={[10, 10, 5]} 
                  intensity={1} 
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.3} />
                
                {/* Basic Agent Avatars */}
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
              </>
            )}
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}