import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import telegramBotService from '@/services/telegramBotService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const BOT_FATHER_URL = 'https://t.me/BotFather';

export const TelegramBotSetupStep: React.FC = () => {
  const { toast } = useToast();
  const {
    integrationStatus,
    updateIntegrationStatus,
    completeStep,
    skipStep,
    showAchievement,
  } = useOnboardingStore();

  const [botToken, setBotToken] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

  const connectionStatus = integrationStatus.telegram.status;
  const botUsername = integrationStatus.telegram.botUsername || undefined;

  const hasActiveBot = connectionStatus === 'connected';

  const tokenExample = useMemo(
    () => '123456789:ABCdefGHIjklMNOpqrSTUvwxYZ123456789',
    [],
  );

  const refreshStatus = useCallback(async () => {
    setIsBusy(true);
    setValidationMessage(null);
    setTestMessage(null);
    try {
      const status = await telegramBotService.getBotStatus();
      const isConnected = status.hasBot && status.isActive;
      updateIntegrationStatus('telegram', {
        status: isConnected ? 'connected' : status.hasBot ? 'connecting' : 'disconnected',
        botUsername: status.botUsername ?? null,
        error: null,
      });
      if (isConnected) {
        completeStep('telegram-bot-setup');
      }
      if (status.hasBot) {
        showAchievement('Telegram bot saved. You can now capture messages directly.');
      }
    } catch (error: any) {
      console.error('Failed to load telegram status', error);
      updateIntegrationStatus('telegram', {
        status: 'disconnected',
        error: 'Unable to verify bot status right now.',
      });
      toast({
        variant: 'destructive',
        title: 'Could not check bot status',
        description: 'Please try again in a moment.',
      });
    } finally {
      setIsBusy(false);
    }
  }, [completeStep, showAchievement, toast, updateIntegrationStatus]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const validateLocally = (token: string): string | null => {
    if (!token.trim()) {
      return 'Enter the token that BotFather generated for you.';
    }
    if (!/^\d+:[A-Za-z0-9_-]{35}$/.test(token.trim())) {
      return 'Token format looks wrong. Copy it exactly as BotFather provided.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const trimmedToken = botToken.trim();
    const localError = validateLocally(trimmedToken);
    if (localError) {
      setValidationMessage(localError);
      return;
    }

    setIsBusy(true);
    setValidationMessage(null);
    setTestMessage(null);

    try {
      const validation = await telegramBotService.validateBotToken(trimmedToken);
      if (!validation.valid) {
        setValidationMessage(validation.error || 'Token could not be validated.');
        return;
      }

      await telegramBotService.setBotToken(trimmedToken);
      await refreshStatus();

      updateIntegrationStatus('telegram', {
        status: 'connected',
        botUsername: validation.username ?? validation.firstName ?? null,
        error: null,
      });

      completeStep('telegram-bot-setup');
      showAchievement('Telegram bot connected. Synapse can now deliver updates.');
      toast({
        title: 'Telegram bot connected',
        description: 'We will keep you updated directly in Telegram.',
      });
      setBotToken('');
    } catch (error: any) {
      console.error('Failed to connect Telegram bot', error);
      const message = error?.response?.data?.message || error?.message || 'Telegram API returned an error.';
      setValidationMessage(message);
      toast({ variant: 'destructive', title: 'Connection failed', description: message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleTestConnectivity = async () => {
    setIsBusy(true);
    setTestMessage(null);
    setTestSuccess(null);
    try {
      const result = await telegramBotService.testBotConnectivity();
      setTestSuccess(result.success);
      setTestMessage(result.message);
      if (result.success) {
        toast({ title: 'Bot is online', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Test failed', description: result.message });
      }
    } catch (error: any) {
      console.error('Bot connectivity test failed', error);
      const message = error?.response?.data?.message || error?.message || 'Something went wrong while testing the bot.';
      setTestSuccess(false);
      setTestMessage(message);
      toast({ variant: 'destructive', title: 'Test failed', description: message });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    try {
      await telegramBotService.removeBotConfiguration();
      updateIntegrationStatus('telegram', {
        status: 'disconnected',
        botUsername: null,
        error: null,
      });
      toast({ title: 'Telegram bot removed', description: 'You can reconnect at any time.' });
      setBotToken('');
      setValidationMessage(null);
      setTestMessage(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unable to remove the bot right now.';
      toast({ variant: 'destructive', title: 'Removal failed', description: message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Connect your Telegram bot</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We use your personal bot to notify you about new insights and capture information on the go.
                </p>
              </div>
            </div>
            <Badge variant={hasActiveBot ? 'outline' : 'secondary'} className="uppercase tracking-wide">
              {hasActiveBot ? 'Connected' : connectionStatus === 'connecting' ? 'Pending' : 'Not connected'}
            </Badge>
          </div>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="bot-token" className="text-sm font-medium text-foreground">
                Bot token
              </label>
              <div className="flex flex-col gap-2">
                <Input
                  id="bot-token"
                  type="password"
                  autoComplete="off"
                  placeholder={tokenExample}
                  value={botToken}
                  disabled={isBusy || hasActiveBot}
                  onChange={(event) => {
                    setBotToken(event.target.value);
                    setValidationMessage(null);
                  }}
                  className={validationMessage ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {validationMessage && (
                  <p className="text-sm text-destructive">{validationMessage}</p>
                )}
                {!hasActiveBot && (
                  <p className="text-xs text-muted-foreground">
                    Keep this secret. Only paste the token directly from BotFather.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="link"
                className="px-0"
                onClick={() => window.open(BOT_FATHER_URL, '_blank')}
              >
                Talk to BotFather
                <ExternalLink className="ml-1 h-4 w-4" />
              </Button>
              <span className="text-muted-foreground/60">•</span>
              <span>Send <code className="rounded bg-muted px-1">/newbot</code> and follow the prompts.</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {hasActiveBot ? (
                <Button onClick={handleTestConnectivity} disabled={isBusy} className="sm:w-auto">
                  {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Test bot connection
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isBusy} className="sm:w-auto">
                  {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Connect bot
                </Button>
              )}

              <Button
                variant="outline"
                onClick={refreshStatus}
                disabled={isBusy}
                className="sm:w-auto"
              >
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh status
              </Button>

              <Button
                variant="ghost"
                onClick={skipStep}
                className="sm:w-auto text-muted-foreground hover:text-foreground"
              >
                Skip for now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {testMessage && (
                <motion.div
                  key="test-result"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`rounded-md border p-3 text-sm ${
                    testSuccess ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700' : 'border-destructive/40 bg-destructive/10 text-destructive'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testSuccess ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    <span>{testMessage}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {hasActiveBot && (
              <div className="rounded-md border border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">Connected as {botUsername}</span>
                  <span>
                    Your bot can now deliver summaries, alerts, and run commands. Add it to a private chat and say
                    <code className="mx-1 rounded bg-background px-1">/help</code> to see what it can do.
                  </span>
                  <Button
                    variant="secondary"
                    onClick={handleRemove}
                    disabled={isBusy}
                    className="mt-3 w-fit"
                  >
                    Disconnect bot
                  </Button>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Quick guide</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 font-semibold text-foreground">1.</span>
              Message BotFather and run <code className="rounded bg-muted px-1">/newbot</code> to create your bot.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 font-semibold text-foreground">2.</span>
              Copy the long token BotFather sends you and paste it into Synapse.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 font-semibold text-foreground">3.</span>
              Add your bot to a private chat or group and grant admin if you want capture commands.
            </li>
          </ol>

          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4" />
              <p>
                Telegram will revoke tokens if you regenerate them via BotFather. Paste the new token here if that happens.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

