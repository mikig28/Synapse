import React, { useState, useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, Mail, MessageCircle } from 'lucide-react';
import { telegramBotService } from '@/services/telegramBotService';

const ReminderDeliverySettings: React.FC = () => {
  const [sendRemindersToTelegram, setSendRemindersToTelegram] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch current setting on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchReminderSettings();
    }
  }, [isAuthenticated]);

  const fetchReminderSettings = async () => {
    setIsLoading(true);
    try {
      const response = await telegramBotService.getReminderSettings();
      setSendRemindersToTelegram(response.sendRemindersToTelegram);
    } catch (error) {
      console.error('Error fetching reminder settings:', error);
      setMessage('Failed to load reminder settings');
    }
    setIsLoading(false);
  };

  const handleReminderToggle = async (checked: boolean) => {
    setIsUpdating(true);
    setMessage('');
    try {
      await telegramBotService.updateReminderSettings(checked);
      setSendRemindersToTelegram(checked);
      setMessage(
        checked
          ? 'Reminders will now be sent to your monitored Telegram chats'
          : 'Reminders will now be sent via email'
      );

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update reminder delivery settings';
      setMessage(`Error: ${errorMessage}`);
      console.error('Error updating reminder settings:', error);

      // Revert the toggle on error
      setSendRemindersToTelegram(!checked);
    }
    setIsUpdating(false);
  };

  if (!isAuthenticated) {
    return <p className="text-muted-foreground">Please log in to manage reminder settings.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Bell className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-400">
          Choose how you want to receive bookmark reminder notifications.
          Telegram delivery requires configured monitored chats in the section above.
        </AlertDescription>
      </Alert>

      {/* Reminder Delivery Toggle */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Reminder Delivery Method</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive notifications when bookmark reminders are due.
        </p>

        <div className="space-y-4 pt-2">
          {/* Telegram Option */}
          <div className="flex items-start justify-between p-4 rounded-lg border border-muted/20 bg-card/50">
            <div className="flex items-start gap-3">
              <MessageCircle className={`h-5 w-5 mt-0.5 ${sendRemindersToTelegram ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="space-y-1">
                <Label htmlFor="reminder-delivery-toggle" className="text-foreground font-medium cursor-pointer">
                  Send to Telegram
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive reminders in your monitored Telegram chats (recommended)
                </p>
              </div>
            </div>
            <Switch
              id="reminder-delivery-toggle"
              checked={sendRemindersToTelegram}
              onCheckedChange={handleReminderToggle}
              disabled={isLoading || isUpdating}
              className="ml-4"
            />
          </div>

          {/* Email Fallback Info */}
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${!sendRemindersToTelegram ? 'border-amber-500/30 bg-amber-500/5' : 'border-muted/10 bg-muted/5'}`}>
            <Mail className={`h-5 w-5 mt-0.5 ${!sendRemindersToTelegram ? 'text-amber-400' : 'text-muted-foreground'}`} />
            <div className="space-y-1">
              <Label className={!sendRemindersToTelegram ? 'text-amber-400 font-medium' : 'text-muted-foreground'}>
                Email Delivery
              </Label>
              <p className="text-xs text-muted-foreground">
                {sendRemindersToTelegram
                  ? 'Automatic fallback if Telegram delivery fails or no chats are monitored'
                  : 'Active - all reminders will be sent to your registered email'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <Alert className={message.startsWith('Error:') ? 'border-destructive/50 bg-destructive/10' : 'border-green-500/50 bg-green-500/10'}>
          <AlertDescription className={message.startsWith('Error:') ? 'text-destructive' : 'text-green-400'}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Additional Info */}
      <div className="pt-4 border-t border-muted/10">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Regardless of your preference, the system will always attempt to deliver reminders.
          If Telegram delivery is enabled but fails, reminders will automatically be sent via email as a backup.
        </p>
      </div>
    </div>
  );
};

export default ReminderDeliverySettings;
