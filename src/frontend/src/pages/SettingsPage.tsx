import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import LinkTelegramChat from '@/components/settings/LinkTelegramChat';
import { Settings, Sparkles, User, Shield, Bell, Palette } from 'lucide-react';

// Assuming you might have other settings components or sections
// import OtherSettingsSection from '@/components/settings/OtherSettingsSection';

const SettingsPage: React.FC = () => {
  const { ref: headerRef, isInView: headerVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 relative">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-gray-400/10 to-slate-400/10 rounded-full blur-3xl"
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
          className="absolute w-80 h-80 bg-gradient-to-r from-zinc-400/10 to-gray-400/10 rounded-full blur-3xl"
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

      <div className="relative z-10 container mx-auto p-6">
        {/* Header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Settings className="w-12 h-12 text-gray-400" />
            </motion.div>
            <motion.div
              className="ml-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-6 h-6 text-amber-400" />
            </motion.div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-300 to-slate-300 bg-clip-text text-transparent mb-4">
            Settings
          </h1>
          <p className="text-gray-100/80 text-lg max-w-2xl mx-auto">
            Customize your SYNAPSE experience and manage your preferences
          </p>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Telegram Integration Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Telegram Integration</h2>
                  <p className="text-gray-300/70">Connect your Telegram account to receive notifications</p>
                </div>
              </div>
              <LinkTelegramChat />
            </GlassCard>
          </motion.div>

          {/* Profile Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <User className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Profile Settings</h2>
                  <p className="text-gray-300/70">Manage your personal information and preferences</p>
                </div>
              </div>
              <div className="text-gray-300/60">
                <p>Profile settings will be available in a future update.</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Security Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Security & Privacy</h2>
                  <p className="text-gray-300/70">Control your account security and privacy settings</p>
                </div>
              </div>
              <div className="text-gray-300/60">
                <p>Security settings will be available in a future update.</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Appearance Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Palette className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">Appearance</h2>
                  <p className="text-gray-300/70">Customize the look and feel of your interface</p>
                </div>
              </div>
              <div className="text-gray-300/60">
                <p>Theme and appearance settings will be available in a future update.</p>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 