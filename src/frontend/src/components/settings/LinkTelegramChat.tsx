import React, { useState } from 'react';
import axiosInstance from '@/services/axiosConfig'; // Your configured axios for authenticated requests
import useAuthStore from '@/store/authStore'; // To check if user is authenticated
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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

    const chatIdNum = parseInt(chatIdInput, 10);
    if (!chatIdInput || isNaN(chatIdNum)) {
      setMessage('Please enter a valid numeric Chat ID.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post('/users/me/telegram-chats', { 
        chatId: chatIdNum 
      });
      setMessage(response.data.message || 'Chat ID submitted successfully!');
      console.log('Updated monitored chats:', response.data.monitoredTelegramChats);
      setChatIdInput(''); // Clear input on success
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to add chat ID. Please try again.');
      console.error('Error linking Telegram chat:', err);
    }
    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return <p>Please log in to link your Telegram chats.</p>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-3">Link Telegram Chat</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Enter a Telegram Chat ID that you want this Synapse account to monitor for new messages.
        You can often find your Chat ID by messaging a bot like "@userinfobot" on Telegram.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="chatId">Telegram Chat ID</Label>
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
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Linking...' : 'Link Chat ID'}
        </Button>
      </form>
      {message && <p className={`mt-3 text-sm ${message.startsWith('Error:') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
    </div>
  );
};

export default LinkTelegramChat; 