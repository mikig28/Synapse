import React, { useState } from 'react';
import { X, Bot, ExternalLink, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import axiosInstance from '@/services/axiosConfig';

interface BotConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBotInfo?: {
    hasBot: boolean;
    isActive: boolean;
    botUsername?: string;
    monitoredChats: number;
  };
}

interface BotValidationResult {
  valid: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}

const BotConfigurationModal: React.FC<BotConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBotInfo
}) => {
  const [botToken, setBotToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<BotValidationResult | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const validateBotToken = async () => {
    if (!botToken.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a bot token",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsValidating(true);
      const response = await axiosInstance.post('/users/me/telegram-bot/validate', {
        botToken: botToken.trim()
      });

      if (response.data.valid) {
        setValidationResult({
          valid: true,
          username: response.data.username,
          firstName: response.data.firstName
        });
        toast({
          title: "Bot Token Valid",
          description: `Successfully validated bot: @${response.data.username}`,
        });
      } else {
        setValidationResult({
          valid: false,
          error: response.data.error || 'Invalid bot token'
        });
        toast({
          title: "Invalid Bot Token",
          description: response.data.error || 'Please check your bot token',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Validation failed';
      setValidationResult({
        valid: false,
        error: errorMessage
      });
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const saveBotToken = async () => {
    if (!validationResult?.valid) {
      toast({
        title: "Validation Required",
        description: "Please validate the bot token first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await axiosInstance.post('/users/me/telegram-bot', {
        botToken: botToken.trim()
      });

      toast({
        title: "Bot Configuration Saved",
        description: `Bot @${validationResult.username} is now active for your account`,
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save bot configuration';
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string, step: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(step);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const steps = [
    {
      title: "Open BotFather",
      content: "Go to Telegram and search for @BotFather",
      action: "Start a chat with @BotFather"
    },
    {
      title: "Create New Bot",
      content: "Send /newbot command to BotFather",
      copyText: "/newbot"
    },
    {
      title: "Choose Bot Name",
      content: "Give your bot a name (e.g., 'MyPersonalBot')",
      action: "This is just a display name"
    },
    {
      title: "Choose Username", 
      content: "Choose a unique username ending with 'bot' (e.g., 'mypersonalsynapse_bot')",
      action: "Must end with 'bot' and be unique"
    },
    {
      title: "Get Bot Token",
      content: "BotFather will give you a token like: 123456789:ABCdefGHI...",
      action: "Copy this token - you'll need it here"
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Configure Your Telegram Bot
              </h2>
              <p className="text-sm text-muted-foreground">
                Set up your personal bot to monitor channels and groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          {currentBotInfo && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Current Status
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bot Status:</span>
                  <span className={`ml-2 ${currentBotInfo.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {currentBotInfo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bot Username:</span>
                  <span className="ml-2 font-mono">
                    {currentBotInfo.botUsername ? `@${currentBotInfo.botUsername}` : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Monitored Chats:</span>
                  <span className="ml-2">{currentBotInfo.monitoredChats}</span>
                </div>
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Setup Instructions
            </h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{step.content}</p>
                    {step.action && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{step.action}</p>
                    )}
                  </div>
                  {step.copyText && (
                    <button
                      onClick={() => copyToClipboard(step.copyText!, index)}
                      className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                      title="Copy command"
                    >
                      {copiedStep === index ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bot Token Input */}
          <div>
            <h3 className="font-medium mb-3">Enter Your Bot Token</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBotToken();
              }}
              className="space-y-3"
            >
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz..."
                  value={botToken}
                  onChange={(e) => {
                    setBotToken(e.target.value);
                    setValidationResult(null); // Clear previous validation
                  }}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Validation Result */}
              {validationResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  validationResult.valid 
                    ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                }`}>
                  {validationResult.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm ${
                    validationResult.valid 
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {validationResult.valid 
                      ? `Valid bot: @${validationResult.username}${validationResult.firstName ? ` (${validationResult.firstName})` : ''}`
                      : validationResult.error
                    }
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <AnimatedButton
                  type="button"
                  variant="outline"
                  onClick={validateBotToken}
                  disabled={!botToken.trim() || isValidating}
                  loading={isValidating}
                  className="flex-1"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate Token'
                  )}
                </AnimatedButton>
                
                <AnimatedButton
                  type="submit"
                  disabled={!validationResult?.valid || isSaving}
                  loading={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Bot Configuration'
                  )}
                </AnimatedButton>
              </div>
            </form>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Why do I need my own bot?</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Each user needs their own bot for security and isolation</li>
              <li>• Your bot will only access channels/groups you add it to</li>
              <li>• Messages from your monitored channels will only appear in your account</li>
              <li>• You have full control over which channels your bot monitors</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/20 px-6 py-4 flex justify-end gap-3">
          <AnimatedButton variant="outline" onClick={onClose}>
            Cancel
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};

export default BotConfigurationModal;