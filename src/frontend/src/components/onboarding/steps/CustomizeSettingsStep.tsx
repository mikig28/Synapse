import React, { useEffect, useState } from 'react';
import { Loader2, Settings2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnboardingStore } from '@/store/onboardingStore';
import telegramBotService from '@/services/telegramBotService';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export const CustomizeSettingsStep: React.FC = () => {
  const { toast } = useToast();
  const {
    userPreferences,
    updateUserPreferences,
    completeStep,
    showAchievement,
    skipStep,
  } = useOnboardingStore();

  const [reportEnabled, setReportEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConfigured, setHasConfigured] = useState(false);

  useEffect(() => {
    const loadReportSettings = async () => {
      try {
        const response = await telegramBotService.getReportSettings();
        setReportEnabled(response.sendAgentReportsToTelegram);
      } catch (error) {
        console.warn('Unable to load report settings', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReportSettings();
  }, []);

  const toggleNotification = (key: keyof typeof userPreferences.notifications) => (value: boolean) => {
    updateUserPreferences({
      notifications: {
        ...userPreferences.notifications,
        [key]: value,
      },
    });
    setHasConfigured(true);
  };

  const handleReportToggle = async (value: boolean) => {
    setIsSaving(true);
    try {
      await telegramBotService.updateReportSettings(value);
      setReportEnabled(value);
      toast({ title: 'Telegram reports updated', description: value ? 'We will send agent summaries to your bot.' : 'Telegram reports disabled.' });
      setHasConfigured(true);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unable to update report settings.';
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (hasConfigured) {
      completeStep('customize-settings');
      showAchievement('Notifications configured. Synapse will reach you the way you prefer.');
    }
  }, [completeStep, hasConfigured, showAchievement]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Tune how Synapse talks to you</h2>
          <p className="text-sm text-muted-foreground">
            Pick the channels you want for alerts and automate Telegram summaries for your agents.
          </p>
        </div>
        <Button variant="ghost" onClick={skipStep} className="text-muted-foreground hover:text-foreground">
          Skip for now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <GlassCard className="p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Settings2 className="h-5 w-5" />
          </div>
          <div className="space-y-5 flex-1">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Notification channels</h3>
              <p className="text-sm text-muted-foreground">
                Toggle the channels you want Synapse to use. You can refine this further in Settings later.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Email alerts</p>
                  <p className="text-xs text-muted-foreground">Receive weekly digests and critical notifications.</p>
                </div>
                <Switch
                  checked={userPreferences.notifications.email}
                  onCheckedChange={toggleNotification('email')}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Push notifications</p>
                  <p className="text-xs text-muted-foreground">Ideal when you keep Synapse open in your browser.</p>
                </div>
                <Switch
                  checked={userPreferences.notifications.push}
                  onCheckedChange={toggleNotification('push')}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Telegram agent summaries</p>
                  <p className="text-xs text-muted-foreground">
                    Send a digest of agent output directly to your Telegram bot after each run.
                  </p>
                </div>
                <Switch
                  checked={reportEnabled}
                  onCheckedChange={handleReportToggle}
                  disabled={isLoading || isSaving}
                />
              </div>
              {(isLoading || isSaving) && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {isLoading ? 'Loading current setting…' : 'Updating preferences…'}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.open('/settings', '_blank')}>
                Open full settings
              </Button>
              {hasConfigured && (
                <span className="inline-flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Preferences saved
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};


