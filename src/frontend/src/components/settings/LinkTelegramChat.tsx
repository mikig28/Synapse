import React, { useState, useEffect } from 'react';
import axiosInstance from '@/services/axiosConfig'; // Your configured axios for authenticated requests
import useAuthStore from '@/store/authStore'; // To check if user is authenticated
import { Input } from '@/components/ui/input';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface TelegramChatResponse {
  message: string;
  monitoredTelegramChats?: { chatId: number; linkedAt: string }[]; // Example specific type
  // other potential fields can be added here
}

const LinkTelegramChat: React.FC = () => {
  const [chatIdInput, setChatIdInput] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sendAgentReports, setSendAgentReports] = useState<boolean>(false);
  const [isUpdatingReports, setIsUpdatingReports] = useState<boolean>(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch current setting on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserSettings();
    }
  }, [isAuthenticated]);

  const fetchUserSettings = async () => {
    try {
      // We need to create a user profile endpoint to get current settings
      // For now, we'll assume the default is false
      // TODO: Add user profile endpoint to get current sendAgentReportsToTelegram setting
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  const handleReportsToggle = async (checked: boolean) => {
    setIsUpdatingReports(true);
    try {
      await axiosInstance.put('/users/me/telegram-report-settings', {
        sendAgentReportsToTelegram: checked
      });
      setSendAgentReports(checked);
      setMessage(`Agent reports to Telegram ${checked ? 'enabled' : 'disabled'} successfully!`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update report settings. Please try again.';
      setMessage(`Error: ${errorMessage}`);
      console.error('Error updating Telegram report settings:', error);
    }
    setIsUpdatingReports(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!isAuthenticated) {
      setMessage('Error: You must be logged in to link a chat.');
      setIsLoading(false);
      return;
    }

    // Log the token right before the API call
    const currentToken = useAuthStore.getState().token;
    console.log('[LinkTelegramChat] Token from store just before API call:', currentToken ? 'Present' : 'Absent');
    if (currentToken) {
        console.log('[LinkTelegramChat] Token value (first 20 chars):', currentToken.substring(0,20) + '...');
    }

    const chatIdNum = parseInt(chatIdInput, 10);
    if (!chatIdInput || isNaN(chatIdNum)) {
      setMessage('Please enter a valid numeric Chat ID.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post<TelegramChatResponse>(
        '/users/me/telegram-chats',
        { chatId: chatIdNum }
      );
      setMessage(response.data.message || 'Chat ID submitted successfully!');
      console.log('Updated monitored chats:', response.data.monitoredTelegramChats);
      setChatIdInput(''); // Clear input on success
    } catch (err: any) {
      // Type assertion for axios error structure if needed, or ensure backend sends consistent error response
      const errorMessage = err.response?.data?.message || 'Failed to add chat ID. Please try again.';
      setMessage(errorMessage);
      console.error('Error linking Telegram chat:', err);
    }
    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return <p className="text-muted-foreground">Please log in to link your Telegram chats.</p>;
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Chat Linking Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Link Telegram Chat</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Enter a Telegram Chat ID that you want this Synapse account to monitor for new messages.
          You can often find your Chat ID by messaging a bot like "@userinfobot" on Telegram.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="chatId" className="text-foreground">Telegram Chat ID</Label>
            <Input
              id="chatId"
              type="text" 
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
              placeholder="E.g., 123456789"
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <AnimatedButton type="submit" loading={isLoading} variant="primary" className="w-full">
            Link Chat ID
          </AnimatedButton>
        </form>
      </div>

      {/* Agent Reports Toggle Section */}
      <div className="pt-4 border-t border-muted/20">
        <h3 className="text-lg font-semibold mb-3 text-foreground">Agent Reports</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Automatically send agent execution reports to your linked Telegram chats when agents complete their tasks.
        </p>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="agent-reports-toggle" className="text-foreground font-medium">
              Send Agent Reports to Telegram
            </Label>
            <p className="text-xs text-muted-foreground">
              Get notified when agents complete tasks and view execution summaries
            </p>
          </div>
          <Switch 
            id="agent-reports-toggle"
            checked={sendAgentReports}
            onCheckedChange={handleReportsToggle}
            disabled={isUpdatingReports}
            className="ml-4"
          />
        </div>
      </div>

      {/* Message display */}
      {message && 
        <p className={`mt-3 text-sm ${message.startsWith('Error:') || message.startsWith('Please enter') ? 'text-destructive' : 'text-success'}`}>
          {message}
        </p>}
    </div>
  );
};

export default LinkTelegramChat; 