import React, { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { RippleButton } from './RippleButton';

interface ConfettiButtonProps extends React.ComponentProps<typeof RippleButton> {
  confettiColors?: string[];
  confettiCount?: number;
  triggerConfetti?: boolean;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
}

export const ConfettiButton: React.FC<ConfettiButtonProps> = ({
  confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
  confettiCount = 50,
  triggerConfetti = false,
  onClick,
  children,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = React.useState<ConfettiParticle[]>([]);

  const createConfetti = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newParticles: ConfettiParticle[] = [];

    for (let i = 0; i < confettiCount; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: centerX + (Math.random() - 0.5) * 20,
        y: centerY + (Math.random() - 0.5) * 20,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        velocityX: (Math.random() - 0.5) * 400,
        velocityY: -Math.random() * 300 - 100,
        gravity: 300 + Math.random() * 200,
      });
    }

    setParticles(newParticles);

    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
    }, 3000);
  }, [confettiColors, confettiCount]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    createConfetti();
    onClick?.(e);
  }, [createConfetti, onClick]);

  React.useEffect(() => {
    if (triggerConfetti) {
      createConfetti();
    }
  }, [triggerConfetti, createConfetti]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <RippleButton onClick={handleClick} {...props}>
        {children}
      </RippleButton>

      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <ConfettiParticle key={particle.id} particle={particle} />
        ))}
      </div>
    </div>
  );
};

// Individual confetti particle component
const ConfettiParticle: React.FC<{ particle: ConfettiParticle }> = ({ particle }) => {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{
        backgroundColor: particle.color,
        left: particle.x,
        top: particle.y,
      }}
      initial={{
        scale: 0,
        rotate: 0,
        x: 0,
        y: 0,
      }}
      animate={{
        scale: [0, particle.scale, particle.scale * 0.5, 0],
        rotate: [0, particle.rotation, particle.rotation + 180, particle.rotation + 360],
        x: [0, particle.velocityX * 0.5, particle.velocityX],
        y: [0, particle.velocityY * 0.5, particle.velocityY + particle.gravity],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 3,
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.1, 0.8, 1],
      }}
    />
  );
};

// Hook for programmatic confetti
export const useConfetti = () => {
  const [isTriggered, setIsTriggered] = React.useState(false);

  const trigger = useCallback(() => {
    setIsTriggered(true);
    setTimeout(() => setIsTriggered(false), 100);
  }, []);

  return { trigger, isTriggered };
}; 