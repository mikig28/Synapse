import { useState, useEffect } from 'react';
import axiosInstance from '@/services/axiosConfig';
import { useToast } from '@/hooks/use-toast';
import useAuthStore from '@/store/authStore';

interface BotStatus {
  hasBot: boolean;
  isActive: boolean;
  botUsername?: string;
  monitoredChats: number;
  sendReportsToTelegram: boolean;
}

interface UseTelegramBotReturn {
  botStatus: BotStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshBotStatus: () => Promise<void>;
  removeBotConfiguration: () => Promise<boolean>;
}

export const useTelegramBot = (): UseTelegramBotReturn => {
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { toast } = useToast();

  const fetchBotStatus = async () => {
    if (!isAuthenticated) {
      setBotStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await axiosInstance.get('/users/me/telegram-bot');
      
      if (response.data) {
        setBotStatus({
          hasBot: response.data.hasBot || false,
          isActive: response.data.isActive || false,
          botUsername: response.data.botUsername,
          monitoredChats: response.data.monitoredChats || 0,
          sendReportsToTelegram: response.data.sendReportsToTelegram || false
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch bot status';
      setError(errorMessage);
      
      // Don't show error toast for 401 errors (user not authenticated)
      if (error.response?.status !== 401) {
        toast({
          title: "Bot Status Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBotStatus = async () => {
    setIsLoading(true);
    await fetchBotStatus();
  };

  const removeBotConfiguration = async (): Promise<boolean> => {
    try {
      await axiosInstance.delete('/users/me/telegram-bot');
      
      toast({
        title: "Bot Removed",
        description: "Your Telegram bot configuration has been removed",
      });
      
      // Refresh status after removal
      await fetchBotStatus();
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove bot configuration';
      toast({
        title: "Removal Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchBotStatus();
  }, [isAuthenticated]);

  return {
    botStatus,
    isLoading,
    error,
    refreshBotStatus,
    removeBotConfiguration
  };
};