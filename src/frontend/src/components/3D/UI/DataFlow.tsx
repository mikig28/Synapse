import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, BufferGeometry, Float32BufferAttribute, Vector3, CatmullRomCurve3, TubeGeometry } from 'three';

interface DataFlowProps {
  from: [number, number, number];
  to: [number, number, number];
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  animated?: boolean;
  intensity?: number;
  particleCount?: number;
}

interface FlowNetworkProps {
  connections: Array<{
    from: [number, number, number];
    to: [number, number, number];
    intensity: number;
    type?: 'data' | 'command' | 'feedback';
  }>;
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  animated?: boolean;
}

// Single data flow line with particles
export function DataFlow({
  from,
  to,
  theme = 'studio',
  animated = true,
  intensity = 1,
  particleCount = 20
}: DataFlowProps) {
  const groupRef = useRef<Group>(null);
  const particlesRef = useRef<Group>(null);
  
  // Create curved path between points
  const curve = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const distance = start.distanceTo(end);
    
    // Create control points for smooth curve
    const mid = start.clone().lerp(end, 0.5);
    mid.y += distance * 0.2; // Arc upward
    
    return new CatmullRomCurve3([start, mid, end]);
  }, [from, to]);
  
  // Create tube geometry for the flow line
  const tubeGeometry = useMemo(() => {
    return new TubeGeometry(curve, 50, 0.02, 8, false);
  }, [curve]);
  
  // Create particles along the curve
  const particleGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute(particleCount * 3, 3);
    const colors = new Float32BufferAttribute(particleCount * 3, 3);
    const sizes = new Float32BufferAttribute(particleCount, 1);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const point = curve.getPoint(t);
      
      positions.setXYZ(i, point.x, point.y, point.z);
      
      // Set particle colors based on theme
      const color = getParticleColor(theme);
      colors.setXYZ(i, color.r, color.g, color.b);
      
      sizes.setX(i, Math.random() * 0.5 + 0.5);
    }
    
    geometry.setAttribute('position', positions);
    geometry.setAttribute('color', colors);
    geometry.setAttribute('size', sizes);
    
    return geometry;
  }, [curve, particleCount, theme]);
  
  const getParticleColor = (theme: string) => {
    switch (theme) {
      case 'cyber':
        return { r: 0, g: 0.83, b: 1 }; // #00d4ff
      case 'space':
        return { r: 0.29, g: 0.56, b: 0.89 }; // #4a90e2
      case 'minimal':
        return { r: 0, g: 0.48, b: 1 }; // #007bff
      case 'studio':
      default:
        return { r: 0, g: 0.4, b: 0.8 }; // #0066cc
    }
  };
  
  const getLineColor = () => {
    switch (theme) {
      case 'cyber': return '#00d4ff';
      case 'space': return '#4a90e2';
      case 'minimal': return '#007bff';
      case 'studio':
      default: return '#0066cc';
    }
  };
  
  useFrame((state) => {
    if (animated && particlesRef.current) {
      // Animate particles along the curve
      const particles = particlesRef.current.children;
      particles.forEach((particle, index) => {
        const progress = (state.clock.elapsedTime * intensity + index * 0.1) % 1;
        const point = curve.getPoint(progress);
        particle.position.copy(point);
        
        // Fade particles based on position
        const material = (particle as any).material;
        if (material) {
          material.opacity = Math.sin(progress * Math.PI) * 0.8 + 0.2;
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Flow line */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial
          color={getLineColor()}
          transparent
          opacity={0.6}
          emissive={theme === 'cyber' ? getLineColor() : '#000000'}
          emissiveIntensity={theme === 'cyber' ? 0.2 : 0}
        />
      </mesh>
      
      {/* Particles */}
      <group ref={particlesRef}>
        {Array.from({ length: particleCount }).map((_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial
              color={getLineColor()}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
      
      {/* Pulsing effect at endpoints */}
      <mesh position={from}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={getLineColor()}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      <mesh position={to}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={getLineColor()}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

// Network of data flows
export function FlowNetwork({
  connections,
  theme = 'studio',
  animated = true
}: FlowNetworkProps) {
  const groupRef = useRef<Group>(null);
  
  const getFlowColor = (type: string) => {
    switch (type) {
      case 'command':
        return theme === 'cyber' ? '#ff006e' : '#dc3545';
      case 'feedback':
        return theme === 'cyber' ? '#8338ec' : '#28a745';
      case 'data':
      default:
        return theme === 'cyber' ? '#00d4ff' : '#007bff';
    }
  };
  
  useFrame((state) => {
    if (animated && groupRef.current) {
      // Subtle animation for the entire network
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
    }
  });
  
  return (
    <group ref={groupRef}>
      {connections.map((connection, index) => (
        <DataFlow
          key={index}
          from={connection.from}
          to={connection.to}
          theme={theme}
          animated={animated}
          intensity={connection.intensity}
        />
      ))}
      
      {/* Central hub effect for cyber theme */}
      {theme === 'cyber' && connections.length > 0 && (
        <group>
          {/* Calculate center point */}
          {(() => {
            const allPoints = connections.flatMap(c => [c.from, c.to]);
            const center = allPoints.reduce(
              (acc, point) => [
                acc[0] + point[0] / allPoints.length,
                acc[1] + point[1] / allPoints.length,
                acc[2] + point[2] / allPoints.length
              ],
              [0, 0, 0] as [number, number, number]
            );
            
            return (
              <mesh position={center}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshBasicMaterial
                  color="#00d4ff"
                  transparent
                  opacity={0.5}
                />
              </mesh>
            );
          })()}
        </group>
      )}
    </group>
  );
}

export default DataFlow;