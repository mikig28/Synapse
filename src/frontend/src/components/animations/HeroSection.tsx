import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useScroll, useTransform } from 'framer-motion';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Brain, Sparkles, Zap, Layers, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  onGetStarted?: () => void;
  onLearnMore?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onGetStarted, 
  onLearnMore 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ opacity }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          background: [
            'radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.2) 0%, transparent 50%), radial-gradient(circle at 50% 50%, hsl(var(--secondary) / 0.1) 0%, transparent 70%)',
            'radial-gradient(circle at 80% 80%, hsl(var(--primary) / 0.2) 0%, transparent 50%), radial-gradient(circle at 20% 20%, hsl(var(--accent) / 0.2) 0%, transparent 50%), radial-gradient(circle at 50% 50%, hsl(var(--secondary) / 0.1) 0%, transparent 70%)',
            'radial-gradient(circle at 20% 80%, hsl(var(--primary) / 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.2) 0%, transparent 50%), radial-gradient(circle at 50% 50%, hsl(var(--secondary) / 0.1) 0%, transparent 70%)'
          ]
        }}
        transition={{
          duration: 10,
          ease: "linear",
          repeat: Infinity
        }}
      />

      {/* Floating particles */}
      <ParticleField />

      {/* Hero content */}
      <motion.div 
        className="relative z-10 max-w-6xl mx-auto px-4 text-center"
        style={{ y }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI-Powered Second Brain</span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          <span className="gradient-text">Transform Your Mind</span>
          <br />
          <span className="text-foreground">Into Digital Brilliance</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto"
        >
          Capture, organize, and enhance your knowledge with SYNAPSE - 
          your intelligent companion for lifelong learning and productivity.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <AnimatedButton
            variant="primary"
            size="lg"
            onClick={onGetStarted}
            className="min-w-[200px] group"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </AnimatedButton>
          <AnimatedButton
            variant="secondary"
            size="lg"
            onClick={onLearnMore}
            className="min-w-[200px]"
          >
            Watch Demo
          </AnimatedButton>
        </motion.div>

        {/* Feature icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          <FeatureIcon icon={Brain} label="AI-Powered" delay={0.6} />
          <FeatureIcon icon={Zap} label="Lightning Fast" delay={0.7} />
          <FeatureIcon icon={Layers} label="Organized" delay={0.8} />
          <FeatureIcon icon={Sparkles} label="Intelligent" delay={0.9} />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-1"
        >
          <motion.div
            animate={{ height: ["20%", "80%", "20%"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 bg-foreground/40 rounded-full"
          />
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

// Feature icon component
interface FeatureIconProps {
  icon: React.ElementType;
  label: string;
  delay: number;
}

const FeatureIcon: React.FC<FeatureIconProps> = ({ icon: Icon, label, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.1 }}
      className="flex flex-col items-center gap-2 group cursor-pointer"
    >
      <div className="p-4 rounded-2xl glass group-hover:bg-primary/10 transition-colors">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </motion.div>
  );
};

// Animated particle field
const ParticleField: React.FC = () => {
  const particles = Array.from({ length: 20 });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/20 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}; 