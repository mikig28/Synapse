import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Search, 
  MessageSquare, 
  FileText, 
  Bot,
  Sparkles,
  Zap,
  Target,
  Users
} from 'lucide-react';

export const WelcomeStep: React.FC = () => {
  const { completeStep } = useOnboardingStore();

  const handleMarkAsRead = () => {
    completeStep('welcome');
  };

  const features = [
    {
      icon: <Brain className="w-6 h-6 text-blue-400" />,
      title: "AI-Powered Analysis",
      description: "Intelligent agents analyze and organize your content automatically"
    },
    {
      icon: <Search className="w-6 h-6 text-green-400" />,
      title: "Universal Search",
      description: "Find information across all your connected sources instantly"
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
      title: "Multi-Platform Integration",
      description: "Connect WhatsApp, Telegram, documents, and more"
    },
    {
      icon: <Bot className="w-6 h-6 text-orange-400" />,
      title: "Custom AI Agents",
      description: "Create specialized agents for different tasks and workflows"
    }
  ];

  const benefits = [
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      text: "Save 5+ hours per week on information management"
    },
    {
      icon: <Target className="w-5 h-5 text-red-400" />,
      text: "Never lose important information again"
    },
    {
      icon: <Users className="w-5 h-5 text-green-400" />,
      text: "Collaborate seamlessly with AI-powered insights"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    }
  };

  const featureVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 200
      }
    }
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        className="text-center space-y-6"
        variants={itemVariants}
      >
        <div className="relative">
          <motion.div
            className="text-8xl md:text-9xl mb-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: 0.1,
              type: "spring",
              damping: 15,
              stiffness: 200
            }}
          >
            🧠
          </motion.div>
          
          {/* Floating sparkles around brain */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${30 + (i * 8)}%`,
                top: `${20 + (i % 3) * 15}%`
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1, 0], 
                opacity: [0, 1, 0],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 3,
                delay: 1 + (i * 0.3),
                repeat: Infinity,
                repeatDelay: 4
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold gradient-text"
            variants={itemVariants}
          >
            Welcome to Synapse
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            variants={itemVariants}
          >
            Your AI-powered knowledge management platform that transforms how you capture, 
            organize, and discover information.
          </motion.p>
        </div>

        {/* Benefits */}
        <motion.div 
          className="flex flex-wrap justify-center gap-4 mt-8"
          variants={itemVariants}
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2 bg-muted/30 px-4 py-2 rounded-full"
              variants={featureVariants}
              whileHover={{ scale: 1.05 }}
            >
              {benefit.icon}
              <span className="text-sm font-medium">{benefit.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Features Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-center mb-8 text-foreground">
          What You'll Discover
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={featureVariants}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <GlassCard className="p-6 h-full">
                <div className="flex items-start gap-4">
                  <motion.div 
                    className="p-3 bg-muted/30 rounded-lg flex-shrink-0"
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div 
        className="text-center space-y-4"
        variants={itemVariants}
      >
        <GlassCard className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">
              Let's Get Started!
            </h3>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            In just a few minutes, you'll have your personalized AI knowledge assistant 
            up and running. Ready to transform how you work with information?
          </p>

          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <motion.div
                className="w-2 h-2 bg-primary rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span>Ready to begin your journey...</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAsRead}
              className="text-xs border-2"
              style={{ color: 'inherit', borderColor: 'currentColor' }}
            >
              <span style={{ color: 'inherit' }}>Mark as Read ✓</span>
            </Button>
          </motion.div>
        </GlassCard>
      </motion.div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-32 h-32 bg-primary/5 rounded-full blur-xl"
          style={{ top: '20%', left: '10%' }}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-24 h-24 bg-accent/5 rounded-full blur-xl"
          style={{ bottom: '30%', right: '15%' }}
          animate={{
            x: [0, -25, 0],
            y: [0, 25, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
    </motion.div>
  );
};