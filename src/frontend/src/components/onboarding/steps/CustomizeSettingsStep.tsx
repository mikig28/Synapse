import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Bell, 
  Mail, 
  Smartphone, 
  Bot,
  CheckCircle,
  Sparkles
} from 'lucide-react';

export const CustomizeSettingsStep: React.FC = () => {
  const { 
    userPreferences, 
    updateUserPreferences, 
    completeStep, 
    showAchievement 
  } = useOnboardingStore();

  const [hasCustomized, setHasCustomized] = useState(false);

  const handlePreferenceChange = (category: string, key: string, value: any) => {
    const updatedPreferences = {
      ...userPreferences,
      [category]: {
        ...userPreferences[category as keyof typeof userPreferences],
        [key]: value
      }
    };
    
    updateUserPreferences(updatedPreferences);
    
    if (!hasCustomized) {
      setHasCustomized(true);
      showAchievement('⚙️ Settings customized!');
      setTimeout(() => completeStep('customize-settings'), 1000);
    }
  };

  const notificationSettings = [
    {
      key: 'email',
      label: 'Email Notifications',
      description: 'Receive important updates via email',
      icon: <Mail className="w-4 h-4" />,
      value: userPreferences.notifications.email
    },
    {
      key: 'push',
      label: 'Push Notifications',
      description: 'Get instant notifications in your browser',
      icon: <Bell className="w-4 h-4" />,
      value: userPreferences.notifications.push
    },
    {
      key: 'telegram',
      label: 'Telegram Alerts',
      description: 'Receive alerts through Telegram bot',
      icon: <Smartphone className="w-4 h-4" />,
      value: userPreferences.notifications.telegram
    }
  ];

  const aiSettings = [
    {
      key: 'autoAnalysis',
      label: 'Auto Analysis',
      description: 'Automatically analyze new content',
      icon: <Bot className="w-4 h-4" />,
      value: userPreferences.aiAgents.autoAnalysis
    },
    {
      key: 'scheduledReports',
      label: 'Scheduled Reports',
      description: 'Generate weekly insight reports',
      icon: <Sparkles className="w-4 h-4" />,
      value: userPreferences.aiAgents.scheduledReports
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-6xl mb-4">⚙️</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Customize Your Experience
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Adjust your preferences to make Synapse work exactly how you want it to.
        </p>
      </motion.div>

      {/* Success Indicator */}
      {hasCustomized && (
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Badge className="bg-green-500/20 text-green-300 px-4 py-2">
            <CheckCircle className="w-4 h-4 mr-2" />
            Preferences saved!
          </Badge>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to be notified
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {notificationSettings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {setting.icon}
                    </div>
                    <div>
                      <Label className="font-medium text-foreground">
                        {setting.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={setting.value}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('notifications', setting.key, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* AI Agent Settings */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Behavior</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how your AI agents work
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {aiSettings.map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {setting.icon}
                    </div>
                    <div>
                      <Label className="font-medium text-foreground">
                        {setting.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={setting.value}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('aiAgents', setting.key, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick Setup Info */}
      <motion.div
        className="text-center max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard className="p-6 bg-muted/30">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Settings Tip</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Don't worry about getting everything perfect now. You can always 
            change these settings later from your dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Easy to modify
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Saved automatically
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Smart defaults
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};