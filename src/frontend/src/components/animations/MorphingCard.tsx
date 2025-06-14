import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

interface MorphingCardProps {
  children: React.ReactNode;
  backContent?: React.ReactNode;
  className?: string;
  flipOnHover?: boolean;
  tiltEffect?: boolean;
  glowEffect?: boolean;
  morphOnClick?: boolean;
}

export const MorphingCard: React.FC<MorphingCardProps> = ({
  children,
  backContent,
  className,
  flipOnHover = false,
  tiltEffect = true,
  glowEffect = true,
  morphOnClick = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMorphed, setIsMorphed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tiltEffect || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = (e.clientX - centerX) / (rect.width / 2);
    const mouseY = (e.clientY - centerY) / (rect.height / 2);

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    if (flipOnHover) {
      setIsFlipped(false);
    }
  };

  const handleMouseEnter = () => {
    if (flipOnHover) {
      setIsFlipped(true);
    }
  };

  const handleClick = () => {
    if (morphOnClick) {
      setIsMorphed(!isMorphed);
    }
    if (backContent && !flipOnHover) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div className="perspective-1000 relative">
      <motion.div
        ref={cardRef}
        className={cn("relative cursor-pointer", className)}
        style={{
          rotateX: tiltEffect ? rotateX : 0,
          rotateY: tiltEffect ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Front face */}
        <motion.div
          className="w-full h-full"
          animate={{
            rotateY: isFlipped ? 180 : 0,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
          }}
        >
          <GlassCard 
            className={cn(
              "relative overflow-hidden transition-all duration-300",
              glowEffect && "hover:shadow-2xl hover:shadow-primary/20"
            )}
          >
            {/* Glow effect */}
            {glowEffect && (
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100"
                style={{
                  background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--primary) / 0.15) 0%, transparent 50%)',
                }}
                animate={{
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}

            {/* Morphing content */}
            <motion.div
              animate={{
                scale: isMorphed ? 1.05 : 1,
                borderRadius: isMorphed ? "2rem" : "1rem",
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {children}
            </motion.div>

            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                backgroundSize: '200% 200%',
              }}
              animate={{
                backgroundPosition: ['200% 200%', '-200% -200%'],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </GlassCard>
        </motion.div>

        {/* Back face */}
        {backContent && (
          <motion.div
            className="absolute inset-0 w-full h-full"
            animate={{
              rotateY: isFlipped ? 0 : -180,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
            }}
          >
            <GlassCard className="h-full">
              {backContent}
            </GlassCard>
          </motion.div>
        )}

        {/* Floating particles around card */}
        <FloatingParticles />
      </motion.div>
    </div>
  );
};

// Floating particles component
const FloatingParticles: React.FC = () => {
  const particles = Array.from({ length: 6 });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          style={{
            left: `${20 + (i * 15)}%`,
            top: `${30 + (i * 10)}%`,
          }}
          animate={{
            y: [-10, -30, -10],
            x: [-5, 5, -5],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

// Preset card variants
export const FeatureCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  stats?: { label: string; value: string }[];
}> = ({ title, description, icon, stats }) => {
  const frontContent = (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );

  const backContent = stats ? (
    <div className="p-6">
      <h4 className="text-lg font-semibold mb-4">Statistics</h4>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-muted-foreground">{stat.label}</span>
            <span className="font-semibold">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <MorphingCard
      flipOnHover={Boolean(backContent)}
      backContent={backContent}
    >
      {frontContent}
    </MorphingCard>
  );
}; 