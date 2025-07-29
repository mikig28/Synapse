import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { Group } from 'three';

interface InteractiveButtonProps {
  position: [number, number, number];
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  size?: 'small' | 'medium' | 'large';
}

export function InteractiveButton({
  position,
  label,
  onClick,
  disabled = false,
  variant = 'primary',
  theme = 'studio',
  size = 'medium'
}: InteractiveButtonProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { width: 1, height: 0.3, fontSize: 0.08, padding: 0.05 };
      case 'large':
        return { width: 2, height: 0.6, fontSize: 0.15, padding: 0.1 };
      case 'medium':
      default:
        return { width: 1.5, height: 0.4, fontSize: 0.1, padding: 0.08 };
    }
  };
  
  const getVariantColors = () => {
    const baseColors = {
      studio: {
        primary: { bg: '#007bff', hover: '#0056b3', text: '#ffffff' },
        secondary: { bg: '#6c757d', hover: '#545b62', text: '#ffffff' },
        danger: { bg: '#dc3545', hover: '#c82333', text: '#ffffff' },
        success: { bg: '#28a745', hover: '#1e7e34', text: '#ffffff' }
      },
      cyber: {
        primary: { bg: '#00d4ff', hover: '#0099cc', text: '#000000' },
        secondary: { bg: '#8338ec', hover: '#6a1b9a', text: '#ffffff' },
        danger: { bg: '#ff006e', hover: '#cc0055', text: '#ffffff' },
        success: { bg: '#06ffa5', hover: '#04cc84', text: '#000000' }
      },
      space: {
        primary: { bg: '#4a90e2', hover: '#357abd', text: '#ffffff' },
        secondary: { bg: '#7f8fa6', hover: '#718096', text: '#ffffff' },
        danger: { bg: '#e24a4a', hover: '#d32f2f', text: '#ffffff' },
        success: { bg: '#27ae60', hover: '#1e8449', text: '#ffffff' }
      },
      minimal: {
        primary: { bg: '#007bff', hover: '#0056b3', text: '#ffffff' },
        secondary: { bg: '#f8f9fa', hover: '#e9ecef', text: '#212529' },
        danger: { bg: '#dc3545', hover: '#c82333', text: '#ffffff' },
        success: { bg: '#28a745', hover: '#1e7e34', text: '#ffffff' }
      }
    };
    
    return baseColors[theme][variant];
  };
  
  const sizeConfig = getSizeConfig();
  const colors = getVariantColors();
  
  useFrame((state) => {
    if (groupRef.current && !disabled) {
      // Hover and press animations
      if (pressed) {
        groupRef.current.scale.setScalar(0.95);
      } else if (hovered) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.02;
        groupRef.current.scale.setScalar(scale);
      } else {
        groupRef.current.scale.setScalar(1);
      }
      
      // Floating animation
      if (theme === 'cyber' || theme === 'space') {
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.01;
      }
    }
  });
  
  const handlePointerOver = () => {
    if (!disabled) {
      setHovered(true);
      document.body.style.cursor = 'pointer';
    }
  };
  
  const handlePointerOut = () => {
    setHovered(false);
    setPressed(false);
    document.body.style.cursor = 'default';
  };
  
  const handlePointerDown = () => {
    if (!disabled) {
      setPressed(true);
    }
  };
  
  const handlePointerUp = () => {
    if (!disabled && pressed) {
      setPressed(false);
      onClick();
    }
  };
  
  const currentBg = disabled 
    ? '#666666' 
    : pressed 
    ? colors.hover 
    : hovered 
    ? colors.hover 
    : colors.bg;
    
  const currentOpacity = disabled ? 0.5 : 1;
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Button background */}
      <RoundedBox
        args={[sizeConfig.width, sizeConfig.height, 0.05]}
        radius={0.02}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={currentBg}
          transparent
          opacity={currentOpacity}
          metalness={theme === 'cyber' ? 0.8 : 0.1}
          roughness={theme === 'cyber' ? 0.2 : 0.7}
          emissive={theme === 'cyber' ? currentBg : '#000000'}
          emissiveIntensity={theme === 'cyber' && !disabled ? 0.1 : 0}
        />
      </RoundedBox>
      
      {/* Border highlight for hover */}
      {(hovered || pressed) && !disabled && (
        <RoundedBox
          args={[sizeConfig.width + 0.02, sizeConfig.height + 0.02, 0.06]}
          radius={0.02}
          smoothness={4}
        >
          <meshBasicMaterial
            color={colors.hover}
            transparent
            opacity={0.3}
            wireframe
          />
        </RoundedBox>
      )}
      
      {/* Button text */}
      <Text
        position={[0, 0, 0.03]}
        fontSize={sizeConfig.fontSize}
        color={disabled ? '#cccccc' : colors.text}
        anchorX="center"
        anchorY="middle"
        font={theme === 'cyber' ? "/fonts/orbitron-bold.woff" : undefined}
      >
        {label.toUpperCase()}
      </Text>
      
      {/* Holographic effect lines for cyber theme */}
      {theme === 'cyber' && !disabled && (
        <group position={[0, 0, 0.04]}>
          {Array.from({ length: 3 }).map((_, i) => (
            <mesh
              key={i}
              position={[0, (i - 1) * sizeConfig.height * 0.2, 0]}
            >
              <planeGeometry args={[sizeConfig.width * 0.8, 0.01]} />
              <meshBasicMaterial
                color={colors.bg}
                transparent
                opacity={0.2 + i * 0.1}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Disabled overlay */}
      {disabled && (
        <RoundedBox
          args={[sizeConfig.width, sizeConfig.height, 0.055]}
          radius={0.02}
          smoothness={4}
        >
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.3}
          />
        </RoundedBox>
      )}
    </group>
  );
}

export default InteractiveButton;