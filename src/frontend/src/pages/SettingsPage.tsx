import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useOnboardingStore } from '@/store/onboardingStore';
import LinkTelegramChatUpdated from '@/components/settings/LinkTelegramChatUpdated';
import TelegramBotSettings from '@/components/settings/TelegramBotSettings';
import DataExport from '@/components/settings/DataExport';
import { UsageDashboard } from '@/components/usage/UsageDashboard';
import { FloatingParticles } from '@/components/common/FloatingParticles';
import { Settings, Sparkles, User, Shield, Bell, Palette, Download, BarChart3, Bot } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startOnboarding, initializeFromServer } = useOnboardingStore((state) => ({
    startOnboarding: state.startOnboarding,
    initializeFromServer: state.initializeFromServer,
  }));

  const handleRestartOnboarding = () => {
    startOnboarding();
    toast({
      title: 'Guided setup relaunched',
      description: "We'll walk through connections, automations, and preferences step by step.",
    });
    navigate('/onboarding');
    initializeFromServer().catch((error) => {
      console.error('Failed to refresh onboarding data', error);
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const settingsSections = [
    {
      icon: <Sparkles className="w-6 h-6 text-primary" />,
      iconBg: 'bg-primary/20',
      title: 'Guided Setup',
      description: 'Run the Synapse onboarding flow again whenever you need a refresher.',
      content: (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground/80 sm:max-w-xl">
            We'll guide you through reconnecting data sources, rebuilding agents, and revisiting notification preferences.
          </p>
          <Button onClick={handleRestartOnboarding} className="w-full sm:w-auto">
            Launch onboarding
          </Button>
        </div>
      ),
    },
    {
      icon: <Bot className="w-6 h-6 text-blue-400" />,
      iconBg: "bg-blue-500/20",
      title: "Telegram Bot Setup",
      description: "Configure your personal Telegram bot for secure monitoring and notifications.",
      content: <TelegramBotSettings />
    },
    {
      icon: <Bell className="w-6 h-6 text-purple-400" />,
      iconBg: "bg-purple-500/20", 
      title: "Telegram Chat Management",
      description: "Manage monitored chats and notification settings.",
      content: <LinkTelegramChatUpdated />
    },
    {
      icon: <Download className="w-6 h-6 text-green-400" />,
      iconBg: "bg-green-500/20",
      title: "Data Export",
      description: "Export your data for backup, migration, or analysis purposes.",
      content: <DataExport />
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-orange-400" />,
      iconBg: "bg-orange-500/20",
      title: "Usage & Billing",
      description: "Monitor your platform usage, limits, and billing information.",
      content: <UsageDashboard />
    },
    {
      icon: <User className="w-6 h-6 text-emerald-400" />,
      iconBg: "bg-emerald-500/20",
      title: "Profile Settings",
      description: "Manage your personal information and preferences",
      content: <p className="text-gray-300/60">Profile settings will be available in a future update.</p>
    },
    {
      icon: <Shield className="w-6 h-6 text-red-400" />,
      iconBg: "bg-red-500/20",
      title: "Security & Privacy",
      description: "Control your account security and privacy settings",
      content: <p className="text-gray-300/60">Security settings will be available in a future update.</p>
    },
    {
      icon: <Palette className="w-6 h-6 text-purple-400" />,
      iconBg: "bg-purple-500/20",
      title: "Appearance",
      description: "Customize the look and feel of your interface",
      content: <p className="text-gray-300/60">Theme and appearance settings will be available in a future update.</p>
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <FloatingParticles items={25} particleClassName="bg-primary/10" />
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl"
          style={{ top: '10%', right: '10%' }}
          animate={{
            x: [0, -40, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-secondary/10 to-primary/10 rounded-full blur-3xl"
          style={{ bottom: '20%', left: '10%' }}
          animate={{
            x: [0, 40, 0],
            y: [0, -20, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <motion.div 
        className="relative z-10 container mx-auto p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          variants={itemVariants}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Settings className="w-12 h-12 text-muted-foreground" />
            </motion.div>
            <motion.div
              className="ml-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Customize your SYNAPSE experience and manage your preferences
          </p>
        </motion.div>

        {/* Settings Sections */}
        <motion.div 
          className="space-y-8 max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {settingsSections.map((section, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
            >
              <GlassCard className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-lg ${section.iconBg}`}>
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
                    <p className="text-muted-foreground/80">{section.description}</p>
                  </div>
                </div>
                {/* Ensure section.content also uses themed text/components when implemented */}
                {React.isValidElement(section.content) && section.content.type === 'p' && section.content.props.children.includes("future update") ? 
                  React.cloneElement(section.content, { className: "text-muted-foreground/70" }) : 
                  section.content
                }
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;