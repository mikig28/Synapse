import React, { useState } from 'react';
import axiosInstance from '@/services/axiosConfig'; // Your configured axios for authenticated requests
import useAuthStore from '@/store/authStore'; // To check if user is authenticated
import { Input } from '@/components/ui/input';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Label } from '@/components/ui/label';

interface TelegramChatResponse {
  message: string;
  monitoredTelegramChats?: { chatId: number; linkedAt: string }[]; // Example specific type
  // other potential fields can be added here
}

const LinkTelegramChat: React.FC = () => {
  const [chatIdInput, setChatIdInput] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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
    <div className="max-w-md mx-auto">
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
      {message && 
        <p className={`mt-3 text-sm ${message.startsWith('Error:') || message.startsWith('Please enter') ? 'text-destructive' : 'text-success'}`}>
          {message}
        </p>}
    </div>
  );
};

export default LinkTelegramChat; 