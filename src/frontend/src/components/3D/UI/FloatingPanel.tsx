import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text, Plane, RoundedBox } from '@react-three/drei';
import { Group, Vector3 } from 'three';

interface FloatingPanelProps {
  position: [number, number, number];
  title: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  transparent?: boolean;
  interactive?: boolean;
  autoRotate?: boolean;
}

export function FloatingPanel({
  position,
  title,
  children,
  width = 4,
  height = 3,
  theme = 'studio',
  transparent = true,
  interactive = true,
  autoRotate = false
}: FloatingPanelProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Auto-rotation
      if (autoRotate) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      }
      
      // Floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      
      // Hover effects
      if (hovered) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.02;
        groupRef.current.scale.setScalar(scale);
      } else {
        groupRef.current.scale.setScalar(1);
      }
    }
  });
  
  const getThemeColors = () => {
    switch (theme) {
      case 'cyber':
        return {
          background: '#001122',
          border: '#00d4ff',
          text: '#ffffff',
          accent: '#ff006e'
        };
      case 'space':
        return {
          background: '#1a1a2e',
          border: '#4a90e2',
          text: '#e8eaed',
          accent: '#f5a623'
        };
      case 'minimal':
        return {
          background: '#ffffff',
          border: '#e9ecef',
          text: '#000000',
          accent: '#007bff'
        };
      case 'studio':
      default:
        return {
          background: '#f8f9fa',
          border: '#dee2e6',
          text: '#212529',
          accent: '#28a745'
        };
    }
  };
  
  const colors = getThemeColors();
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={() => interactive && setHovered(true)}
      onPointerOut={() => interactive && setHovered(false)}
    >
      {/* Panel Background */}
      <RoundedBox
        args={[width, height, 0.1]}
        radius={0.05}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={colors.background}
          transparent={transparent}
          opacity={transparent ? 0.9 : 1}
          metalness={theme === 'cyber' ? 0.8 : 0.1}
          roughness={theme === 'cyber' ? 0.2 : 0.7}
          emissive={theme === 'cyber' ? colors.border : '#000000'}
          emissiveIntensity={theme === 'cyber' ? 0.1 : 0}
        />
      </RoundedBox>
      
      {/* Border Frame */}
      <group position={[0, 0, 0.06]}>
        {/* Top border */}
        <mesh position={[0, height/2 - 0.02, 0]}>
          <boxGeometry args={[width, 0.04, 0.02]} />
          <meshBasicMaterial color={colors.border} />
        </mesh>
        
        {/* Bottom border */}
        <mesh position={[0, -height/2 + 0.02, 0]}>
          <boxGeometry args={[width, 0.04, 0.02]} />
          <meshBasicMaterial color={colors.border} />
        </mesh>
        
        {/* Left border */}
        <mesh position={[-width/2 + 0.02, 0, 0]}>
          <boxGeometry args={[0.04, height, 0.02]} />
          <meshBasicMaterial color={colors.border} />
        </mesh>
        
        {/* Right border */}
        <mesh position={[width/2 - 0.02, 0, 0]}>
          <boxGeometry args={[0.04, height, 0.02]} />
          <meshBasicMaterial color={colors.border} />
        </mesh>
      </group>
      
      {/* Title */}
      <Text
        position={[0, height/2 - 0.3, 0.07]}
        fontSize={0.2}
        color={colors.accent}
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-bold.woff"
      >
        {title.toUpperCase()}
      </Text>
      
      {/* Content Area */}
      <Html
        position={[0, -0.2, 0.07]}
        transform
        distanceFactor={10}
        className="pointer-events-auto"
        style={{
          width: `${width * 100}px`,
          height: `${(height - 0.8) * 100}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div className={`
          w-full h-full p-4 
          ${theme === 'cyber' 
            ? 'text-cyan-100' 
            : theme === 'space' 
            ? 'text-gray-100' 
            : theme === 'minimal'
            ? 'text-gray-900'
            : 'text-gray-800'
          }
        `}>
          {children}
        </div>
      </Html>
      
      {/* Holographic effect lines for cyber theme */}
      {theme === 'cyber' && (
        <group position={[0, 0, 0.08]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh
              key={i}
              position={[0, height/2 - 0.5 - i * 0.4, 0]}
              rotation={[0, 0, 0]}
            >
              <planeGeometry args={[width - 0.2, 0.02]} />
              <meshBasicMaterial
                color={colors.border}
                transparent
                opacity={0.3 - i * 0.05}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export default FloatingPanel;