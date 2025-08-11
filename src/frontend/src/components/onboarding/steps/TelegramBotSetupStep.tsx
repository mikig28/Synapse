import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/store/onboardingStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Bot,
  Key,
  MessageCircle,
  ArrowRight,
  Loader2,
  Info
} from 'lucide-react';

interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export const TelegramBotSetupStep: React.FC = () => {
  const { 
    integrationStatus, 
    updateIntegrationStatus, 
    completeStep,
    showAchievement,
    userPreferences,
    updateUserPreferences
  } = useOnboardingStore();

  const [botToken, setBotToken] = useState(userPreferences.integrations.telegram.botToken || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);

  const setupSteps: SetupStep[] = [
    {
      id: 1,
      title: 'Open Telegram',
      description: 'Launch the Telegram app on your phone or computer',
      completed: true
    },
    {
      id: 2,
      title: 'Find BotFather',
      description: 'Search for @BotFather and start a chat',
      completed: true
    },
    {
      id: 3,
      title: 'Create New Bot',
      description: 'Send "/newbot" command to BotFather',
      completed: true
    },
    {
      id: 4,
      title: 'Name Your Bot',
      description: 'Choose a display name (e.g., "My Synapse Bot")',
      completed: true
    },
    {
      id: 5,
      title: 'Set Username',
      description: 'Choose a unique username ending with "bot" (e.g., "mysynapse_bot")',
      completed: true
    },
    {
      id: 6,
      title: 'Copy Token',
      description: 'BotFather will provide your bot token - copy it',
      completed: false
    },
    {
      id: 7,
      title: 'Paste Token Below',
      description: 'Enter the token in the field below to connect your bot',
      completed: !!botToken && !validationError
    }
  ];

  const validateBotToken = useCallback(async (token: string) => {
    if (!token || token.length < 30) {
      return 'Token is too short or empty';
    }

    if (!token.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      return 'Invalid token format. Should be like: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789';
    }

    try {
      // In production, this would validate against the Telegram API
      // For demo purposes, we'll simulate validation
      setIsValidating(true);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Simulate validation success for properly formatted tokens
      return null;
    } catch (error) {
      return 'Failed to validate token. Please check your internet connection.';
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleTokenSubmit = useCallback(async () => {
    if (!botToken.trim()) {
      setValidationError('Please enter a bot token');
      return;
    }

    const error = await validateBotToken(botToken.trim());
    
    if (error) {
      setValidationError(error);
      return;
    }

    // Update preferences and integration status
    updateUserPreferences({
      integrations: {
        ...userPreferences.integrations,
        telegram: {
          ...userPreferences.integrations.telegram,
          enabled: true,
          botToken: botToken.trim()
        }
      }
    });

    updateIntegrationStatus('telegram', {
      status: 'connected',
      chatId: 'demo_chat_id'
    });

    setValidationError('');
    completeStep('telegram-bot-setup');
    showAchievement('🤖 Telegram bot connected successfully! You can now receive notifications.');
  }, [botToken, validateBotToken, updateUserPreferences, userPreferences, updateIntegrationStatus, completeStep, showAchievement]);

  const handleSkip = useCallback(() => {
    showAchievement('⏭️ Skipped Telegram setup - you can configure this later in Settings');
    completeStep('telegram-bot-setup');
  }, [showAchievement, completeStep]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAchievement('📋 Copied to clipboard!');
  };

  const isTokenValid = botToken && !validationError;
  const isConnected = integrationStatus.telegram.status === 'connected';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Set Up Your Telegram Bot
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create a personal Telegram bot to receive notifications, updates, and interact with Synapse directly from Telegram.
        </p>
      </motion.div>

      {/* Connection Status */}
      {isConnected && (
        <motion.div
          className="flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Badge className="bg-green-500/20 text-green-300 px-4 py-2">
            <CheckCircle className="w-4 h-4 mr-2" />
            Telegram Bot Connected
          </Badge>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Setup Instructions */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-foreground">
                Bot Creation Steps
              </h2>
            </div>

            <div className="space-y-4">
              {setupSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/20 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.completed ? <CheckCircle className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${step.completed ? 'text-green-300' : 'text-foreground'}`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://t.me/botfather', '_blank')}
                  className="text-xs"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open BotFather
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard('/newbot')}
                  className="text-xs"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Command
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Why Telegram Bot Card */}
          <GlassCard className="p-6 mt-6 bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-foreground">Why Use a Telegram Bot?</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                Get instant notifications about important content
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                Send quick notes and voice messages to Synapse
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                Query your knowledge base using bot commands
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                Receive AI analysis and insights directly in Telegram
              </li>
            </ul>
          </GlassCard>
        </motion.div>

        {/* Token Input Section */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-semibold text-foreground">
                Bot Token
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="bot-token" className="block text-sm font-medium text-foreground mb-2">
                  Paste your bot token here:
                </label>
                <div className="relative">
                  <Input
                    id="bot-token"
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789"
                    value={botToken}
                    onChange={(e) => {
                      setBotToken(e.target.value);
                      setValidationError('');
                    }}
                    className={`pr-12 font-mono text-sm ${
                      validationError ? 'border-red-500 focus-visible:ring-red-500' : ''
                    } ${
                      isTokenValid ? 'border-green-500 focus-visible:ring-green-500' : ''
                    }`}
                    disabled={isConnected}
                  />
                  {isValidating && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
                  )}
                </div>
                
                {validationError && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    {validationError}
                  </div>
                )}
                
                {isTokenValid && !isConnected && (
                  <div className="flex items-center gap-2 mt-2 text-green-400 text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Token format looks correct!
                  </div>
                )}
              </div>

              {/* Token Format Info */}
              <div className="bg-muted/20 border border-border/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Token Format:</p>
                    <p>Bot tokens look like: <code className="bg-muted px-1 rounded">123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789</code></p>
                    <p className="mt-1">They contain numbers, a colon, and alphanumeric characters.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                {isConnected ? (
                  <Button
                    size="lg"
                    onClick={() => completeStep('telegram-bot-setup')}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Bot Connected - Continue
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleTokenSubmit}
                    disabled={!botToken.trim() || isValidating}
                    className="w-full"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating Token...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Connect Telegram Bot
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSkip}
                  className="w-full"
                >
                  Skip for now - I'll set this up later
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Security Notice */}
          <GlassCard className="p-4 mt-6 bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-300 text-sm">Security Notice</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep your bot token secure! Don't share it publicly or store it in unsecured locations. 
                  Synapse encrypts and stores your token securely.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};