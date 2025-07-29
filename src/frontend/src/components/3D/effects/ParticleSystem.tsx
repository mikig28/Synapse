import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { 
  BufferGeometry, 
  Float32BufferAttribute, 
  Points, 
  PointsMaterial, 
  AdditiveBlending, 
  Vector3, 
  Color,
  MathUtils
} from 'three';

interface Particle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
  alpha: number;
}

interface ParticleSystemProps {
  count?: number;
  position?: [number, number, number];
  spread?: number;
  velocity?: number;
  life?: number;
  size?: number;
  color?: string;
  theme?: 'studio' | 'cyber' | 'space' | 'minimal';
  type?: 'ambient' | 'flow' | 'burst' | 'trail';
  enabled?: boolean;
  direction?: Vector3;
  emissionRate?: number;
}

// Particle system class for efficient management
class ParticleManager {
  particles: Particle[] = [];
  deadParticles: Particle[] = [];
  geometry: BufferGeometry;
  positions: Float32BufferAttribute;
  colors: Float32BufferAttribute;
  sizes: Float32BufferAttribute;
  alphas: Float32BufferAttribute;

  constructor(maxParticles: number) {
    this.geometry = new BufferGeometry();
    
    // Initialize buffers
    this.positions = new Float32BufferAttribute(maxParticles * 3, 3);
    this.colors = new Float32BufferAttribute(maxParticles * 3, 3);
    this.sizes = new Float32BufferAttribute(maxParticles, 1);
    this.alphas = new Float32BufferAttribute(maxParticles, 1);
    
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('color', this.colors);
    this.geometry.setAttribute('size', this.sizes);
    this.geometry.setAttribute('alpha', this.alphas);
  }

  createParticle(
    position: Vector3,
    velocity: Vector3,
    life: number,
    size: number,
    color: Color
  ): Particle {
    // Reuse dead particles for efficiency
    let particle = this.deadParticles.pop();
    
    if (!particle) {
      particle = {
        position: new Vector3(),
        velocity: new Vector3(),
        life: 0,
        maxLife: 0,
        size: 0,
        color: new Color(),
        alpha: 1
      };
    }

    particle.position.copy(position);
    particle.velocity.copy(velocity);
    particle.life = life;
    particle.maxLife = life;
    particle.size = size;
    particle.color.copy(color);
    particle.alpha = 1;

    this.particles.push(particle);
    return particle;
  }

  update(deltaTime: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update particle position
      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );
      
      // Update life
      particle.life -= deltaTime;
      particle.alpha = particle.life / particle.maxLife;
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.deadParticles.push(particle);
        this.particles.splice(i, 1);
      }
    }
    
    this.updateBuffers();
  }

  updateBuffers() {
    const count = this.particles.length;
    
    for (let i = 0; i < count; i++) {
      const particle = this.particles[i];
      
      // Update positions
      this.positions.setXYZ(
        i,
        particle.position.x,
        particle.position.y,
        particle.position.z
      );
      
      // Update colors
      this.colors.setXYZ(
        i,
        particle.color.r,
        particle.color.g,
        particle.color.b
      );
      
      // Update sizes
      this.sizes.setX(i, particle.size * particle.alpha);
      
      // Update alphas
      this.alphas.setX(i, particle.alpha);
    }
    
    // Clear unused particles
    for (let i = count; i < this.positions.count; i++) {
      this.sizes.setX(i, 0);
      this.alphas.setX(i, 0);
    }
    
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.sizes.needsUpdate = true;
    this.alphas.needsUpdate = true;
    
    this.geometry.setDrawRange(0, count);
  }

  dispose() {
    this.geometry.dispose();
    this.particles.length = 0;
    this.deadParticles.length = 0;
  }
}

// Ambient particle system for background effects
export function AmbientParticles({
  count = 100,
  position = [0, 0, 0],
  spread = 20,
  velocity = 0.5,
  life = 10,
  size = 0.1,
  color = '#ffffff',
  theme = 'studio',
  enabled = true
}: Omit<ParticleSystemProps, 'type'>) {
  const pointsRef = useRef<Points>(null);
  const particleManager = useRef<ParticleManager>(new ParticleManager(count));
  const emissionTimer = useRef(0);
  
  const getThemeColor = () => {
    switch (theme) {
      case 'cyber': return new Color('#00d4ff');
      case 'space': return new Color('#4a90e2');
      case 'minimal': return new Color('#007bff');
      case 'studio':
      default: return new Color(color);
    }
  };

  useFrame((state, deltaTime) => {
    if (!enabled) return;

    const manager = particleManager.current;
    
    // Emit new particles
    emissionTimer.current += deltaTime;
    if (emissionTimer.current > 0.1 && manager.particles.length < count) {
      emissionTimer.current = 0;
      
      // Create particle at random position within spread
      const particlePos = new Vector3(
        position[0] + (Math.random() - 0.5) * spread,
        position[1] + (Math.random() - 0.5) * spread,
        position[2] + (Math.random() - 0.5) * spread
      );
      
      // Random velocity
      const vel = new Vector3(
        (Math.random() - 0.5) * velocity,
        (Math.random() - 0.5) * velocity,
        (Math.random() - 0.5) * velocity
      );
      
      manager.createParticle(
        particlePos,
        vel,
        life + Math.random() * life * 0.5,
        size + Math.random() * size * 0.5,
        getThemeColor()
      );
    }
    
    manager.update(deltaTime);
  });

  useEffect(() => {
    return () => {
      particleManager.current.dispose();
    };
  }, []);

  return (
    <points ref={pointsRef} geometry={particleManager.current.geometry}>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.6}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Data flow particle system
export function DataFlowParticles({
  count = 50,
  position = [0, 0, 0],
  velocity = 2,
  life = 3,
  size = 0.05,
  color = '#00d4ff',
  theme = 'cyber',
  enabled = true,
  direction = new Vector3(1, 0, 0),
  emissionRate = 10
}: Omit<ParticleSystemProps, 'type'>) {
  const pointsRef = useRef<Points>(null);
  const particleManager = useRef<ParticleManager>(new ParticleManager(count));
  const emissionTimer = useRef(0);
  
  const getFlowColor = () => {
    switch (theme) {
      case 'cyber': return new Color('#00d4ff');
      case 'space': return new Color('#4a90e2');
      case 'minimal': return new Color('#007bff');
      case 'studio':
      default: return new Color(color);
    }
  };

  useFrame((state, deltaTime) => {
    if (!enabled) return;

    const manager = particleManager.current;
    
    // Emit new particles at specified rate
    emissionTimer.current += deltaTime;
    const emissionInterval = 1 / emissionRate;
    
    if (emissionTimer.current > emissionInterval && manager.particles.length < count) {
      emissionTimer.current = 0;
      
      // Create particle at emission point
      const particlePos = new Vector3(...position);
      
      // Add slight randomness to direction
      const vel = direction.clone().normalize();
      vel.multiplyScalar(velocity);
      vel.add(new Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      ));
      
      manager.createParticle(
        particlePos,
        vel,
        life,
        size,
        getFlowColor()
      );
    }
    
    manager.update(deltaTime);
  });

  useEffect(() => {
    return () => {
      particleManager.current.dispose();
    };
  }, []);

  return (
    <points ref={pointsRef} geometry={particleManager.current.geometry}>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.8}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Burst particle effect
export function BurstParticles({
  count = 30,
  position = [0, 0, 0],
  velocity = 5,
  life = 2,
  size = 0.1,
  color = '#ffaa00',
  theme = 'studio',
  enabled = true
}: Omit<ParticleSystemProps, 'type' | 'emissionRate'>) {
  const pointsRef = useRef<Points>(null);
  const particleManager = useRef<ParticleManager>(new ParticleManager(count));
  const [triggered, setTriggered] = React.useState(false);
  
  const getBurstColor = () => {
    switch (theme) {
      case 'cyber': return new Color('#ff006e');
      case 'space': return new Color('#f5a623');
      case 'minimal': return new Color('#ffc107');
      case 'studio':
      default: return new Color(color);
    }
  };

  useEffect(() => {
    if (enabled && !triggered) {
      setTriggered(true);
      
      // Create burst of particles
      const manager = particleManager.current;
      const burstColor = getBurstColor();
      
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
        
        const vel = new Vector3(
          Math.cos(angle) * Math.cos(elevation),
          Math.sin(elevation),
          Math.sin(angle) * Math.cos(elevation)
        );
        vel.multiplyScalar(velocity * (0.5 + Math.random() * 0.5));
        
        manager.createParticle(
          new Vector3(...position),
          vel,
          life + Math.random() * life * 0.5,
          size + Math.random() * size * 0.5,
          burstColor
        );
      }
    }
  }, [enabled, triggered, count, position, velocity, life, size, getBurstColor]);

  useFrame((state, deltaTime) => {
    particleManager.current.update(deltaTime);
    
    // Reset when all particles are dead
    if (triggered && particleManager.current.particles.length === 0) {
      setTriggered(false);
    }
  });

  useEffect(() => {
    return () => {
      particleManager.current.dispose();
    };
  }, []);

  return (
    <points ref={pointsRef} geometry={particleManager.current.geometry}>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.7}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Trail particle effect
export function TrailParticles({
  count = 20,
  position = [0, 0, 0],
  velocity = 1,
  life = 1,
  size = 0.03,
  color = '#ffffff',
  theme = 'studio',
  enabled = true,
  direction = new Vector3(0, 1, 0)
}: Omit<ParticleSystemProps, 'type' | 'emissionRate'>) {
  const pointsRef = useRef<Points>(null);
  const particleManager = useRef<ParticleManager>(new ParticleManager(count));
  const lastPosition = useRef(new Vector3(...position));
  
  const getTrailColor = () => {
    switch (theme) {
      case 'cyber': return new Color('#8338ec');
      case 'space': return new Color('#9b59b6');
      case 'minimal': return new Color('#6c757d');
      case 'studio':
      default: return new Color(color);
    }
  };

  useFrame((state, deltaTime) => {
    if (!enabled) return;

    const manager = particleManager.current;
    const currentPos = new Vector3(...position);
    
    // Create trail particles between last and current position
    if (lastPosition.current.distanceTo(currentPos) > 0.1) {
      const steps = Math.floor(lastPosition.current.distanceTo(currentPos) * 10);
      
      for (let i = 0; i < Math.min(steps, 3); i++) {
        const t = i / steps;
        const particlePos = lastPosition.current.clone().lerp(currentPos, t);
        
        manager.createParticle(
          particlePos,
          direction.clone().multiplyScalar(velocity * (Math.random() * 0.5 + 0.5)),
          life,
          size,
          getTrailColor()
        );
      }
      
      lastPosition.current.copy(currentPos);
    }
    
    manager.update(deltaTime);
  });

  useEffect(() => {
    return () => {
      particleManager.current.dispose();
    };
  }, []);

  return (
    <points ref={pointsRef} geometry={particleManager.current.geometry}>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={0.5}
        blending={AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// Main particle system component that can switch between types
export function ParticleSystem({
  type = 'ambient',
  ...props
}: ParticleSystemProps) {
  switch (type) {
    case 'flow':
      return <DataFlowParticles {...props} />;
    case 'burst':
      return <BurstParticles {...props} />;
    case 'trail':
      return <TrailParticles {...props} />;
    case 'ambient':
    default:
      return <AmbientParticles {...props} />;
  }
}

export default ParticleSystem;