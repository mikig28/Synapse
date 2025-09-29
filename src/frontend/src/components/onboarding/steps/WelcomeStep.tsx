import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Bot, Database, Compass } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';

export const WelcomeStep: React.FC = () => {
  const navigate = useNavigate();
  const { completeStep, nextStep, showNextTip } = useOnboardingStore();

  const highlights = [
    {
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: 'Personalised workspace',
      description: 'Tailor Synapse to the way you capture knowledge and automate follow-ups.',
    },
    {
      icon: <Database className="w-5 h-5 text-blue-500" />,
      title: 'Connected sources',
      description: 'Bring WhatsApp, Telegram, documents, and more into a single searchable hub.',
    },
    {
      icon: <Bot className="w-5 h-5 text-emerald-500" />,
      title: 'Your first agent',
      description: 'Spin up an automation that summarises, tags, and alerts you in minutes.',
    },
    {
      icon: <Compass className="w-5 h-5 text-amber-500" />,
      title: 'Guided exploration',
      description: 'Learn the key areas of Synapse and how to get value right away.',
    },
  ];

  const handleBegin = () => {
    completeStep('welcome');
    showNextTip();
    nextStep();
  };

  const handleSkip = () => {
    completeStep('welcome');
    nextStep();
  };

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard className="relative overflow-hidden p-8 bg-gradient-to-br from-primary/10 to-transparent">
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
        >
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        </motion.div>

        <div className="relative z-10 space-y-4 text-center">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Sparkles className="w-4 h-4" />
            Welcome to Synapse
          </motion.div>

          <motion.h2
            className="text-3xl md:text-4xl font-semibold text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            Let’s turn your scattered knowledge into a reliable system
          </motion.h2>

          <motion.p
            className="mx-auto max-w-2xl text-base md:text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            This guided setup will connect your data, create your first automation, and show you how to
            find anything instantly. You can skip or return to any step at any time.
          </motion.p>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        {highlights.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
          >
            <GlassCard className="h-full p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted/60 p-3">{item.icon}</div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center">
        <Button size="lg" onClick={handleBegin} className="min-w-[180px]">
          Begin setup
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleSkip}
          className="min-w-[180px]"
        >
          Skip welcome
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="min-w-[180px] text-muted-foreground hover:text-foreground"
        >
          Visit dashboard first
        </Button>
      </div>
    </motion.div>
  );
};

