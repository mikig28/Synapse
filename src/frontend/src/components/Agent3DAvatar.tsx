import React, { useRef, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Text, Html } from '@react-three/drei';
import { Group, AnimationMixer, AnimationAction } from 'three';
import { AgentStatus } from '../types/aguiTypes';

interface Agent3DAvatarProps {
  agent: AgentStatus;
  position: [number, number, number];
}

export function Agent3DAvatar({ agent, position }: Agent3DAvatarProps) {
  const groupRef = useRef<Group>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<{ [key: string]: AnimationAction }>({});
  
  // Load the GLB model
  const { scene, animations } = useGLTF('/models/robot_avatar.glb');
  
  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#00ff00';
      case 'idle': return '#0066ff';
      case 'error': return '#ff0000';
      case 'completed': return '#ffaa00';
      default: return '#666666';
    }
  };

  // Initialize animations
  useEffect(() => {
    if (animations.length > 0 && scene) {
      mixerRef.current = new AnimationMixer(scene);
      
      animations.forEach((clip) => {
        const action = mixerRef.current!.clipAction(clip);
        actionsRef.current[clip.name] = action;
      });
      
      // Start idle animation by default
      if (actionsRef.current['Idle']) {
        actionsRef.current['Idle'].play();
      } else if (Object.keys(actionsRef.current).length > 0) {
        // Play first available animation if no idle
        Object.values(actionsRef.current)[0].play();
      }
    }
    
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
    };
  }, [animations, scene]);

  // Play appropriate animation based on agent status
  useEffect(() => {
    if (!mixerRef.current) return;
    
    // Stop all animations
    Object.values(actionsRef.current).forEach(action => action.stop());
    
    // Play animation based on status
    let targetAnimation = 'Idle';
    switch (agent.status) {
      case 'running':
        targetAnimation = 'Running';
        break;
      case 'error':
        targetAnimation = 'Death';
        break;
      case 'completed':
        targetAnimation = 'Victory';
        break;
      default:
        targetAnimation = 'Idle';
    }
    
    // Find and play the best matching animation
    const availableAnimations = Object.keys(actionsRef.current);
    const animationToPlay = availableAnimations.find(name => 
      name.toLowerCase().includes(targetAnimation.toLowerCase())
    ) || availableAnimations[0];
    
    if (animationToPlay && actionsRef.current[animationToPlay]) {
      actionsRef.current[animationToPlay].reset().play();
    }
  }, [agent.status]);

  // Animation loop
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    
    // Floating animation for active agents
    if (groupRef.current && agent.status === 'running') {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Avatar Model */}
      <primitive 
        object={scene.clone()} 
        scale={1.5}
        castShadow
        receiveShadow
      />
      
      {/* Status Indicator Ring */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.4, 32]} />
        <meshBasicMaterial 
          color={getStatusColor(agent.status)} 
          transparent 
          opacity={0.6}
        />
      </mesh>
      
      {/* Pulsing effect for active agents */}
      {agent.status === 'running' && (
        <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.8, 32]} />
          <meshBasicMaterial 
            color={getStatusColor(agent.status)} 
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Agent Name Label */}
      <Html
        position={[0, 3, 0]}
        center
        distanceFactor={10}
        occlude
      >
        <div className="bg-black/80 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
          {agent.name}
        </div>
      </Html>
      
      {/* Agent Type Label */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.3}
        color={getStatusColor(agent.status)}
        anchorX="center"
        anchorY="middle"
      >
        {agent.type.toUpperCase()}
      </Text>
      
      {/* Status Text */}
      <Text
        position={[0, 2.1, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {agent.status.toUpperCase()}
      </Text>
    </group>
  );
}

// Preload the GLB model
useGLTF.preload('/models/robot_avatar.glb');