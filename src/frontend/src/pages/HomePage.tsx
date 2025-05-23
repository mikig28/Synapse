import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Brain, Zap, Globe, Sparkles, ArrowRight, Star } from 'lucide-react';
import TelegramFeed from "@/components/Dashboard/TelegramFeed";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-violet-400/30 to-purple-400/30 rounded-full blur-3xl"
          style={{ top: '10%', left: '10%' }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl"
          style={{ top: '60%', right: '10%' }}
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-64 h-64 bg-gradient-to-r from-pink-400/20 to-rose-400/20 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '30%' }}
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -100, -20],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="flex items-center justify-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative">
              <Brain className="w-16 h-16 text-violet-300" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-amber-300" />
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-violet-200 via-blue-200 to-purple-200 bg-clip-text text-transparent mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            SYNAPSE
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-blue-100/80 mb-4 max-w-3xl leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Your Revolutionary AI-Powered Second Brain
          </motion.p>

          <motion.p
            className="text-lg md:text-xl text-blue-200/60 mb-12 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Capture, organize, and amplify your thoughts with the power of artificial intelligence
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link to="/login">
              <AnimatedButton 
                size="lg" 
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-2xl shadow-violet-500/25 px-8 py-4 text-lg font-semibold"
              >
                <span className="flex items-center gap-2">
                  Launch Your Brain
                  <ArrowRight className="w-5 h-5" />
                </span>
              </AnimatedButton>
            </Link>
            
            <AnimatedButton 
              variant="outline" 
              size="lg"
              className="border-2 border-blue-300/30 text-blue-100 hover:bg-blue-500/10 px-8 py-4 text-lg font-semibold backdrop-blur-sm"
            >
              <span className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Learn More
              </span>
            </AnimatedButton>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-6xl w-full"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          {[
            {
              icon: Brain,
              title: "AI-Powered Intelligence",
              description: "Advanced AI algorithms help organize and connect your thoughts intelligently"
            },
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "Instant capture and retrieval of your ideas with blazing-fast performance"
            },
            {
              icon: Globe,
              title: "Universal Access",
              description: "Access your second brain from anywhere, on any device, anytime"
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
            >
              <GlassCard className="p-6 text-center h-full hover:scale-105 transition-transform duration-300">
                <div className="flex justify-center mb-4">
                  <feature.icon className="w-12 h-12 text-violet-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-blue-100/70 leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Live Feed Section */}
        <motion.div
          className="w-full max-w-4xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <GlassCard className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Live Intelligence Feed
              </h2>
              <p className="text-blue-100/70">
                See how SYNAPSE processes information in real-time
              </p>
            </div>
            <TelegramFeed />
          </GlassCard>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <p className="text-lg text-blue-100/80 mb-6 max-w-2xl">
            Join thousands of users who have revolutionized their thinking with SYNAPSE
          </p>
          
          <Link to="/register">
            <AnimatedButton 
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-2xl shadow-emerald-500/25 px-8 py-4 text-lg font-semibold"
            >
              <span className="flex items-center gap-2">
                Start Your Journey
                <Sparkles className="w-5 h-5" />
              </span>
            </AnimatedButton>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage; 