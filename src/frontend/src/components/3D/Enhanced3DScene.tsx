import React, { useRef, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { 
  Environment, 
  Stars, 
  Sparkles, 
  ContactShadows,
  AccumulativeShadows,
  RandomizedLight,
  OrbitControls,
  PerspectiveCamera,
  Lightformer,
  GradientTexture,
  Cloud,
  Clouds,
  Float,
  Html
} from '@react-three/drei';
import { Color, Fog, PCFSoftShadowMap, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, AdditiveBlending, BackSide, Vector3 } from 'three';
import * as THREE from 'three';

// Environment themes
export type SceneTheme = 'studio' | 'cyber' | 'space' | 'minimal';

// Advanced particle systems
function AdvancedParticleSystem({ theme, intensity = 1.0 }: { theme: SceneTheme; intensity?: number }) {
  const pointsRef = useRef<Points>(null);
  const particleCount = Math.floor(500 * intensity);
  
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const getThemeColors = () => {
      switch (theme) {
        case 'cyber':
          return [new Color('#00d4ff'), new Color('#ff006e'), new Color('#8338ec')];
        case 'space':
          return [new Color('#4a90e2'), new Color('#f5a623'), new Color('#e8eaed')];
        case 'studio':
          return [new Color('#ffffff'), new Color('#e6f3ff'), new Color('#f0f8ff')];
        default:
          return [new Color('#ffffff')];
      }
    };
    
    const themeColors = getThemeColors();
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Create varied distribution based on theme
      if (theme === 'space') {
        // Spherical distribution for space theme
        const radius = Math.random() * 100 + 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.cos(phi);
        positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      } else if (theme === 'cyber') {
        // Grid-based distribution with some randomness
        const gridSize = 20;
        const gridX = (Math.floor(Math.random() * gridSize) - gridSize/2) * 5;
        const gridZ = (Math.floor(Math.random() * gridSize) - gridSize/2) * 5;
        const gridY = Math.random() * 40 + 5;
        
        positions[i3] = gridX + (Math.random() - 0.5) * 2;
        positions[i3 + 1] = gridY;
        positions[i3 + 2] = gridZ + (Math.random() - 0.5) * 2;
      } else {
        // Random distribution for other themes
        positions[i3] = (Math.random() - 0.5) * 80;
        positions[i3 + 1] = Math.random() * 30 + 5;
        positions[i3 + 2] = (Math.random() - 0.5) * 80;
      }
      
      // Assign colors
      const color = themeColors[Math.floor(Math.random() * themeColors.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // Assign sizes
      sizes[i] = Math.random() * 2 + 1;
    }
    
    return { positions, colors, sizes };
  }, [theme, particleCount]);
  
  const geometry = useMemo(() => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geom.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    return geom;
  }, [positions, colors, sizes]);
  
  useFrame((state) => {
    if (pointsRef.current) {
      if (theme === 'cyber') {
        // Data flow effect
        pointsRef.current.rotation.y += 0.002;
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] += Math.sin(state.clock.elapsedTime + i) * 0.01;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
      } else if (theme === 'space') {
        // Gentle rotation for space theme
        pointsRef.current.rotation.x += 0.0005;
        pointsRef.current.rotation.y += 0.001;
      }
    }
  });
  
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={theme === 'cyber' ? 3 : 2}
        vertexColors
        transparent
        opacity={theme === 'cyber' ? 0.8 : 0.6}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Holographic grid effect for cyber theme
function HolographicGrid({ theme }: { theme: SceneTheme }) {
  const gridRef = useRef<THREE.Mesh>(null);
  const scanlineRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (gridRef.current && theme === 'cyber') {
      // Animated grid intensity
      const material = gridRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      
      // Moving scanline effect
      if (scanlineRef.current) {
        scanlineRef.current.position.z = -40 + (state.clock.elapsedTime * 10) % 80;
      }
    }
  });
  
  if (theme !== 'cyber') return null;
  
  return (
    <group>
      {/* Main holographic grid */}
      <mesh 
        ref={gridRef} 
        position={[0, -1.9, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[100, 100, 50, 50]} />
        <meshBasicMaterial 
          color="#00d4ff" 
          transparent 
          opacity={0.15} 
          wireframe 
        />
      </mesh>
      
      {/* Moving scanline */}
      <mesh 
        ref={scanlineRef}
        position={[0, -1.85, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[100, 2, 1, 1]} />
        <meshBasicMaterial 
          color="#ff006e" 
          transparent 
          opacity={0.6} 
          side={BackSide}
        />
      </mesh>
      
      {/* Vertical grid lines */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`v-${i}`} position={[(i - 4.5) * 10, 15, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 30, 8]} />
          <meshBasicMaterial 
            color="#00d4ff" 
            transparent 
            opacity={0.3} 
          />
        </mesh>
      ))}
      
      {/* Horizontal grid lines */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`h-${i}`} position={[0, 15, (i - 4.5) * 10]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 30, 8]} />
          <meshBasicMaterial 
            color="#00d4ff" 
            transparent 
            opacity={0.3} 
          />
        </mesh>
      ))}
    </group>
  );
}

// Dynamic nebula effect for space theme
function SpaceNebula({ theme }: { theme: SceneTheme }) {
  if (theme !== 'space') return null;
  
  return (
    <group>
      <Clouds material={THREE.MeshLambertMaterial}>
        <Cloud 
          seed={1} 
          segments={40} 
          bounds={[40, 5, 40]} 
          volume={6} 
          color="#4a90e2" 
          opacity={0.3} 
          growth={2} 
        />
        <Cloud 
          seed={2} 
          segments={40} 
          bounds={[40, 5, 40]} 
          volume={4} 
          color="#f5a623" 
          opacity={0.2} 
          growth={3} 
        />
      </Clouds>
    </group>
  );
}

interface SceneConfig {
  theme: SceneTheme;
  enableParticles: boolean;
  enablePostProcessing: boolean;
  enableShadows: boolean;
  enableEnvironment: boolean;
  performanceMode: 'high' | 'medium' | 'low';
}

interface Enhanced3DSceneProps {
  config: SceneConfig;
  children: React.ReactNode;
  onPerformanceChange?: (fps: number, drawCalls: number) => void;
}

// Performance monitoring hook
function usePerformanceMonitor(onPerformanceChange?: (fps: number, drawCalls: number) => void) {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fps = useRef(60);

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    
    if (now - lastTime.current >= 1000) {
      fps.current = frameCount.current;
      frameCount.current = 0;
      lastTime.current = now;
      
      const info = gl.info;
      if (onPerformanceChange) {
        onPerformanceChange(fps.current, info.render.calls);
      }
    }
  });

  return fps.current;
}

// Dynamic lighting component
function DynamicLighting({ theme, enableShadows }: { theme: SceneTheme; enableShadows: boolean }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  
  useFrame((state) => {
    if (lightRef.current && theme === 'cyber') {
      // Subtle movement for cyber theme
      lightRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 2;
      lightRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  const getLightingConfig = () => {
    switch (theme) {
      case 'studio':
        return {
          ambient: { intensity: 0.4, color: '#ffffff' },
          directional: { intensity: 1.2, position: [10, 15, 10], color: '#ffffff' },
          fill: { intensity: 0.3, position: [-5, 5, -5], color: '#e6f3ff' },
          rim: { intensity: 0.5, position: [0, 10, -10], color: '#fff5e6' }
        };
      case 'cyber':
        return {
          ambient: { intensity: 0.2, color: '#001a2e' },
          directional: { intensity: 0.8, position: [5, 10, 5], color: '#00d4ff' },
          fill: { intensity: 0.4, position: [-5, 5, -5], color: '#ff006e' },
          rim: { intensity: 0.6, position: [0, 5, -10], color: '#8338ec' }
        };
      case 'space':
        return {
          ambient: { intensity: 0.1, color: '#0a0a2e' },
          directional: { intensity: 0.6, position: [0, 10, 0], color: '#ffffff' },
          fill: { intensity: 0.2, position: [-10, 0, -10], color: '#4a90e2' },
          rim: { intensity: 0.3, position: [10, 0, 10], color: '#f5a623' }
        };
      case 'minimal':
      default:
        return {
          ambient: { intensity: 0.6, color: '#ffffff' },
          directional: { intensity: 0.8, position: [5, 10, 5], color: '#ffffff' },
          fill: { intensity: 0.2, position: [-5, 5, -5], color: '#f8f9fa' },
          rim: { intensity: 0.1, position: [0, 5, -10], color: '#e9ecef' }
        };
    }
  };

  const config = getLightingConfig();

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight 
        intensity={config.ambient.intensity} 
        color={config.ambient.color} 
      />
      
      {/* Main directional light */}
      <directionalLight
        ref={lightRef}
        position={config.directional.position}
        intensity={config.directional.intensity}
        color={config.directional.color}
        castShadow={enableShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      {/* Fill light */}
      <directionalLight
        position={config.fill.position}
        intensity={config.fill.intensity}
        color={config.fill.color}
      />
      
      {/* Rim light */}
      <pointLight
        position={config.rim.position}
        intensity={config.rim.intensity}
        color={config.rim.color}
        distance={30}
        decay={2}
      />
    </>
  );
}

// Enhanced scene environment component
function SceneEnvironment({ theme, enableParticles }: { theme: SceneTheme; enableParticles: boolean }) {
  const { scene } = useThree();
  
  useEffect(() => {
    // Set scene background and fog based on theme
    switch (theme) {
      case 'studio':
        scene.background = new Color('#f8f9fa');
        scene.fog = new Fog('#f8f9fa', 50, 200);
        break;
      case 'cyber':
        scene.background = new Color('#000510');
        scene.fog = new Fog('#000510', 30, 150);
        break;
      case 'space':
        scene.background = new Color('#000002');
        scene.fog = new Fog('#000008', 80, 300);
        break;
      case 'minimal':
      default:
        scene.background = new Color('#ffffff');
        scene.fog = new Fog('#ffffff', 40, 180);
        break;
    }
  }, [theme, scene]);

  return (
    <>
      {/* Enhanced Environment mapping with custom lighting */}
      {theme === 'studio' && (
        <Environment background blur={0.5}>
          <Lightformer intensity={2} color="white" position={[0, 5, -9]} rotation={[0, 0, Math.PI / 3]} scale={[10, 10, 1]} />
          <Lightformer intensity={0.8} color="#e6f3ff" position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[20, 0.1, 1]} />
          <Lightformer intensity={0.8} color="#fff5e6" position={[5, 1, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[20, 0.1, 1]} />
        </Environment>
      )}
      
      {theme === 'cyber' && (
        <Environment background blur={0.8}>
          <Lightformer intensity={1} color="#00d4ff" position={[0, 5, -9]} rotation={[0, 0, Math.PI / 3]} scale={[10, 10, 1]} />
          <Lightformer intensity={0.5} color="#ff006e" position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[20, 0.1, 1]} />
          <Lightformer intensity={0.3} color="#8338ec" position={[5, 1, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[20, 0.1, 1]} />
        </Environment>
      )}
      
      {theme === 'space' && (
        <>
          <Environment preset="sunset" background blur={1.0} />
          <Stars 
            radius={300} 
            depth={60} 
            count={2000} 
            factor={7} 
            saturation={0.8} 
            fade 
          />
        </>
      )}
      
      {theme === 'minimal' && <Environment preset="dawn" background blur={0.2} />}
      
      {/* Advanced particle systems */}
      {enableParticles && (
        <>
          <AdvancedParticleSystem theme={theme} intensity={1.0} />
          
          {/* Additional sparkles for enhanced effects */}
          {theme === 'cyber' && (
            <>
              <Sparkles 
                count={150} 
                scale={[30, 30, 30]} 
                size={3} 
                speed={0.4}
                opacity={0.7}
                color="#00d4ff"
              />
              <Sparkles 
                count={75} 
                scale={[25, 25, 25]} 
                size={2} 
                speed={0.2}
                opacity={0.5}
                color="#ff006e"
              />
            </>
          )}
          
          {(theme === 'studio' || theme === 'minimal') && (
            <Sparkles 
              count={80} 
              scale={[20, 20, 20]} 
              size={1.5} 
              speed={0.25}
              opacity={0.4}
              color="#ffffff"
            />
          )}
        </>
      )}
      
      {/* Theme-specific effects */}
      <HolographicGrid theme={theme} />
      <SpaceNebula theme={theme} />
    </>
  );
}

// Ground plane component
function GroundPlane({ theme, enableShadows }: { theme: SceneTheme; enableShadows: boolean }) {
  const getGroundConfig = () => {
    switch (theme) {
      case 'studio':
        return { color: '#e9ecef', metalness: 0.1, roughness: 0.7 };
      case 'cyber':
        return { color: '#001122', metalness: 0.8, roughness: 0.2 };
      case 'space':
        return { color: '#1a1a2e', metalness: 0.3, roughness: 0.8 };
      case 'minimal':
      default:
        return { color: '#f8f9fa', metalness: 0.0, roughness: 0.9 };
    }
  };

  const config = getGroundConfig();

  return (
    <>
      {/* Main ground plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -2, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color={config.color}
          metalness={config.metalness}
          roughness={config.roughness}
          transparent={theme !== 'minimal'}
          opacity={theme === 'minimal' ? 1 : 0.8}
        />
      </mesh>
      
      {/* Enhanced shadows */}
      {enableShadows && theme === 'studio' && (
        <AccumulativeShadows 
          position={[0, -1.99, 0]} 
          frames={100} 
          alphaTest={0.9} 
          scale={50}
          opacity={0.8}
        >
          <RandomizedLight 
            amount={8} 
            radius={10} 
            ambient={0.5} 
            intensity={1} 
            position={[5, 10, -10]} 
            bias={0.001}
          />
        </AccumulativeShadows>
      )}
      
      {/* Contact shadows for other themes */}
      {enableShadows && theme !== 'studio' && (
        <ContactShadows 
          position={[0, -1.99, 0]} 
          opacity={0.6} 
          scale={50} 
          blur={2.5} 
          far={20}
        />
      )}
    </>
  );
}

// Enhanced visual effects with floating elements
function AdvancedEffects({ theme }: { theme: SceneTheme }) {
  const effectsGroupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (effectsGroupRef.current) {
      // Gentle floating motion for the entire effects group
      effectsGroupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
      effectsGroupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={effectsGroupRef}>
      {/* Floating energy orbs for studio theme */}
      {theme === 'studio' && (
        <group>
          {Array.from({ length: 5 }, (_, i) => (
            <Float key={i} speed={2 + i * 0.5} rotationIntensity={0.5} floatIntensity={0.5}>
              <mesh position={[
                Math.cos((i / 5) * Math.PI * 2) * 15,
                5 + i * 2,
                Math.sin((i / 5) * Math.PI * 2) * 15
              ]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial 
                  color="#ffffff" 
                  emissive="#e6f3ff" 
                  emissiveIntensity={0.2}
                  transparent 
                  opacity={0.7}
                />
              </mesh>
            </Float>
          ))}
        </group>
      )}
      
      {/* Data nodes for cyber theme */}
      {theme === 'cyber' && (
        <group>
          {Array.from({ length: 8 }, (_, i) => (
            <Float key={i} speed={1.5 + i * 0.3} rotationIntensity={1} floatIntensity={0.8}>
              <mesh position={[
                Math.cos((i / 8) * Math.PI * 2) * 20,
                8 + Math.sin(i) * 3,
                Math.sin((i / 8) * Math.PI * 2) * 20
              ]}>
                <octahedronGeometry args={[0.8]} />
                <meshStandardMaterial 
                  color="#00d4ff" 
                  emissive="#00d4ff" 
                  emissiveIntensity={0.3}
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>
            </Float>
          ))}
        </group>
      )}
      
      {/* Asteroid field for space theme */}
      {theme === 'space' && (
        <group>
          {Array.from({ length: 12 }, (_, i) => (
            <Float key={i} speed={0.5 + i * 0.1} rotationIntensity={0.3} floatIntensity={0.3}>
              <mesh position={[
                (Math.random() - 0.5) * 60,
                Math.random() * 20 + 10,
                (Math.random() - 0.5) * 60
              ]} rotation={[
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
              ]}>
                <dodecahedronGeometry args={[Math.random() * 0.5 + 0.3]} />
                <meshStandardMaterial 
                  color={Math.random() > 0.5 ? '#4a90e2' : '#f5a623'} 
                  metalness={0.5}
                  roughness={0.8}
                />
              </mesh>
            </Float>
          ))}
        </group>
      )}
    </group>
  );
}

// Main Enhanced 3D Scene component
export function Enhanced3DScene({ 
  config, 
  children, 
  onPerformanceChange 
}: Enhanced3DSceneProps) {
  const { gl, scene } = useThree();
  const [adaptiveConfig, setAdaptiveConfig] = useState(config);
  
  // Performance monitoring
  const currentFPS = usePerformanceMonitor(onPerformanceChange);
  
  // Adaptive performance adjustment
  useEffect(() => {
    if (currentFPS < 30 && config.performanceMode === 'high') {
      setAdaptiveConfig({
        ...config,
        enablePostProcessing: false,
        enableParticles: false,
        performanceMode: 'medium'
      });
    } else if (currentFPS < 20 && config.performanceMode === 'medium') {
      setAdaptiveConfig({
        ...config,
        enablePostProcessing: false,
        enableParticles: false,
        enableShadows: false,
        performanceMode: 'low'
      });
    }
  }, [currentFPS, config]);

  // Configure renderer
  useEffect(() => {
    gl.shadowMap.enabled = adaptiveConfig.enableShadows;
    gl.shadowMap.type = PCFSoftShadowMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    
    // Performance optimizations
    if (adaptiveConfig.performanceMode === 'low') {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    } else if (adaptiveConfig.performanceMode === 'medium') {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  }, [gl, adaptiveConfig]);

  return (
    <>
      {/* Camera setup */}
      <PerspectiveCamera 
        makeDefault 
        position={[0, 5, 10]} 
        fov={45}
        near={0.1}
        far={1000}
      />
      
      {/* Lighting system */}
      <DynamicLighting 
        theme={adaptiveConfig.theme} 
        enableShadows={adaptiveConfig.enableShadows} 
      />
      
      {/* Scene environment */}
      <SceneEnvironment 
        theme={adaptiveConfig.theme} 
        enableParticles={adaptiveConfig.enableParticles} 
      />
      
      {/* Ground plane */}
      <GroundPlane 
        theme={adaptiveConfig.theme} 
        enableShadows={adaptiveConfig.enableShadows} 
      />
      
      {/* Advanced visual effects */}
      <AdvancedEffects theme={adaptiveConfig.theme} />
      
      {/* Performance-based quality indicators */}
      {adaptiveConfig.performanceMode === 'low' && (
        <Html center>
          <div className="text-xs text-yellow-600 bg-black/80 px-2 py-1 rounded">
            Performance Mode: Low Quality
          </div>
        </Html>
      )}
      
      {/* Children (agents, UI components, etc.) */}
      {children}
      
      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 6}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.8}
      />
    </>
  );
}

export default Enhanced3DScene;