import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle, XCircle, Eye, EyeOff, ExternalLink, AlertTriangle, Info, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/ui/GlassCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useAuthStore from '@/store/authStore';
import telegramBotService, { BotStatus, BotValidationResult } from '@/services/telegramBotService';

interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  validationResult: BotValidationResult | null;
  error: string | null;
}

const TelegramBotSettings: React.FC = () => {
  const [botToken, setBotToken] = useState<string>('');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    validationResult: null,
    error: null
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [newChatId, setNewChatId] = useState<string>('');
  const [isAddingChat, setIsAddingChat] = useState<boolean>(false);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Load bot status on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadBotStatus();
    }
  }, [isAuthenticated]);

  const loadBotStatus = async () => {
    try {
      const status = await telegramBotService.getBotStatus();
      setBotStatus(status);
    } catch (error: any) {
      console.error('Error loading bot status:', error);
    }
  };

  const validateToken = async () => {
    if (!botToken.trim()) {
      setValidation({
        isValidating: false,
        isValid: false,
        validationResult: null,
        error: 'Please enter a bot token'
      });
      return;
    }

    setValidation({ isValidating: true, isValid: null, validationResult: null, error: null });

    try {
      const result = await telegramBotService.validateBotToken(botToken);
      setValidation({
        isValidating: false,
        isValid: result.valid,
        validationResult: result,
        error: result.valid ? null : result.error || 'Invalid token'
      });
    } catch (error: any) {
      setValidation({
        isValidating: false,
        isValid: false,
        validationResult: null,
        error: error.message
      });
    }
  };

  const saveBotToken = async () => {
    if (!validation.isValid) {
      setMessage({ type: 'error', text: 'Please validate the token first' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramBotService.setBotToken(botToken);
      setMessage({ type: 'success', text: result.message });
      setBotToken('');
      setValidation({ isValidating: false, isValid: null, validationResult: null, error: null });
      await loadBotStatus();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setIsLoading(false);
  };

  const removeBot = async () => {
    if (!confirm('Are you sure you want to remove your Telegram bot? This will stop all monitoring.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramBotService.removeBotToken();
      setMessage({ type: 'success', text: result.message });
      await loadBotStatus();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setIsLoading(false);
  };

  const addChat = async () => {
    const chatIdNum = parseInt(newChatId, 10);
    if (!newChatId || isNaN(chatIdNum)) {
      setMessage({ type: 'error', text: 'Please enter a valid numeric Chat ID' });
      return;
    }

    setIsAddingChat(true);
    try {
      const result = await telegramBotService.addMonitoredChat(chatIdNum);
      setMessage({ type: 'success', text: result.message });
      setNewChatId('');
      await loadBotStatus();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
    setIsAddingChat(false);
  };

  const toggleReports = async (checked: boolean) => {
    try {
      await telegramBotService.updateReportSettings(checked);
      setMessage({ type: 'success', text: `Agent reports ${checked ? 'enabled' : 'disabled'}` });
      await loadBotStatus();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (!isAuthenticated) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>Please log in to configure your Telegram bot.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Bot Status */}
      {botStatus && botStatus.hasBot && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${botStatus.isActive ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                  <Bot className={`w-5 h-5 ${botStatus.isActive ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Current Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    @{botStatus.botUsername} • {botStatus.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <AnimatedButton
                variant="destructive"
                onClick={removeBot}
                loading={isLoading}
                className="h-9"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Bot
              </AnimatedButton>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1">
                  {botStatus.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={botStatus.isActive ? 'text-green-400' : 'text-red-400'}>
                    {botStatus.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monitored Chats:</span>
                <span className="text-foreground font-medium">{botStatus.monitoredChats}</span>
              </div>
            </div>

            {/* Agent Reports Toggle */}
            <div className="mt-4 pt-4 border-t border-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground font-medium">Agent Reports</Label>
                  <p className="text-xs text-muted-foreground">Send agent execution reports to Telegram</p>
                </div>
                <Switch
                  checked={botStatus.sendReportsToTelegram}
                  onCheckedChange={toggleReports}
                />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Bot Token Setup */}
      {(!botStatus?.hasBot || !botStatus.isActive) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Setup Telegram Bot</h3>
                <p className="text-sm text-muted-foreground">Configure your personal Telegram bot for monitoring</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Bot Token Input */}
              <div>
                <Label htmlFor="botToken" className="text-foreground">Bot Token</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      id="botToken"
                      type={showToken ? 'text' : 'password'}
                      value={botToken}
                      onChange={(e) => {
                        setBotToken(e.target.value);
                        setValidation({ isValidating: false, isValid: null, validationResult: null, error: null });
                      }}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatedButton
                    onClick={validateToken}
                    loading={validation.isValidating}
                    variant="outline"
                    disabled={!botToken.trim()}
                  >
                    Validate
                  </AnimatedButton>
                </div>

                {/* Validation Result */}
                {validation.error && (
                  <Alert className="mt-2 border-red-500/50 bg-red-500/10">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-400">{validation.error}</AlertDescription>
                  </Alert>
                )}

                {validation.isValid && validation.validationResult && (
                  <Alert className="mt-2 border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-400">
                      ✅ Valid bot: @{validation.validationResult.botInfo?.username} ({validation.validationResult.botInfo?.firstName})
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Save Button */}
              {validation.isValid && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatedButton
                    onClick={saveBotToken}
                    loading={isLoading}
                    variant="primary"
                    className="w-full"
                  >
                    Save Bot Token
                  </AnimatedButton>
                </motion.div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Chat Management */}
      {botStatus?.hasBot && botStatus.isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Plus className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Add Monitored Chat</h3>
                <p className="text-sm text-muted-foreground">Add your bot to a group and enter the Chat ID</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value)}
                placeholder="Enter Chat ID (e.g., -123456789)"
                className="flex-1"
              />
              <AnimatedButton
                onClick={addChat}
                loading={isAddingChat}
                variant="outline"
                disabled={!newChatId.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Chat
              </AnimatedButton>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Setup Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Info className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">How to Create Your Bot</h3>
              <p className="text-sm text-muted-foreground">Step-by-step guide to set up your Telegram bot</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">1</div>
              <div>
                <p className="text-foreground font-medium">Message @BotFather on Telegram</p>
                <p className="text-muted-foreground">Start a chat with @BotFather (official bot creator)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">2</div>
              <div>
                <p className="text-foreground font-medium">Create your bot</p>
                <p className="text-muted-foreground">Send <code className="bg-muted/30 px-1 rounded">/newbot</code> and follow the instructions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">3</div>
              <div>
                <p className="text-foreground font-medium">Choose names</p>
                <p className="text-muted-foreground">Pick a display name and username for your bot</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">4</div>
              <div>
                <p className="text-foreground font-medium">Copy the bot token</p>
                <p className="text-muted-foreground">BotFather will give you a token - paste it in the field above</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium mt-0.5">5</div>
              <div>
                <p className="text-foreground font-medium">Add bot to groups</p>
                <p className="text-muted-foreground">Add your bot to the Telegram groups you want to monitor</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium text-sm">Important</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Each user needs their own bot for proper isolation. Don't share bot tokens between users.
              Your bot token is stored securely and only used for your account.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <a
              href="https://t.me/botfather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open @BotFather in Telegram
            </a>
          </div>
        </GlassCard>
      </motion.div>

      {/* Status Messages */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className={`border-${message.type === 'success' ? 'green' : message.type === 'error' ? 'red' : 'blue'}-500/50 bg-${message.type === 'success' ? 'green' : message.type === 'error' ? 'red' : 'blue'}-500/10`}>
            {message.type === 'success' ? (
              <CheckCircle className={`h-4 w-4 text-green-400`} />
            ) : message.type === 'error' ? (
              <XCircle className={`h-4 w-4 text-red-400`} />
            ) : (
              <Info className={`h-4 w-4 text-blue-400`} />
            )}
            <AlertDescription className={`text-${message.type === 'success' ? 'green' : message.type === 'error' ? 'red' : 'blue'}-400`}>
              {message.text}
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </div>
  );
};

export default TelegramBotSettings;