import axiosInstance from './axiosConfig';

export interface BotValidationResult {
  valid: boolean;
  botInfo?: {
    id: number;
    username: string;
    firstName: string;
    canJoinGroups: boolean;
    canReadAllGroupMessages: boolean;
    supportsInlineQueries: boolean;
  };
  error?: string;
}

export interface BotStatus {
  hasBot: boolean;
  isActive: boolean;
  botUsername?: string;
  monitoredChats: number;
  sendReportsToTelegram: boolean;
}

export interface BotSetupResult {
  success: boolean;
  message: string;
  botInfo?: {
    username: string;
    firstName: string;
    canJoinGroups: boolean;
    canReadAllGroupMessages: boolean;
    supportsInlineQueries: boolean;
  };
  error?: string;
}

export interface BotConnectivityResponse {
  success: boolean;
  message: string;
  details?: {
    botId?: number;
    username?: string;
    canJoinGroups?: boolean;
    canReadAllGroupMessages?: boolean;
    supportsInlineQueries?: boolean;
  };
}

class TelegramBotService {
  /**
   * Validate a bot token without saving it
   */
  async validateBotToken(botToken: string): Promise<BotValidationResult> {
    try {
      const response = await axiosInstance.post('/users/me/telegram-bot/validate', {
        botToken
      });
      return response.data;
    } catch (error: any) {
      console.error('Error validating bot token:', error);
      throw new Error(error.response?.data?.error || 'Failed to validate bot token');
    }
  }

  /**
   * Set user's bot token
   */
  async setBotToken(botToken: string): Promise<BotSetupResult> {
    try {
      const response = await axiosInstance.post('/users/me/telegram-bot', {
        botToken
      });
      return response.data;
    } catch (error: any) {
      console.error('Error setting bot token:', error);
      throw new Error(error.response?.data?.error || 'Failed to set bot token');
    }
  }

  /**
   * Get current bot status
   */
  async getBotStatus(): Promise<BotStatus> {
    try {
      const response = await axiosInstance.get('/users/me/telegram-bot');
      return response.data;
    } catch (error: any) {
      console.error('Error getting bot status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get bot status');
    }
  }

  /**
   * Remove user's bot
   */
  async removeBotToken(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axiosInstance.delete('/users/me/telegram-bot');
      return response.data;
    } catch (error: any) {
      console.error('Error removing bot token:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove bot token');
    }
  }

  /**
   * Add a chat ID to monitoring
   */
  async addMonitoredChat(chatId: number): Promise<{ message: string; monitoredTelegramChats: number[] }> {
    try {
      const response = await axiosInstance.post('/users/me/telegram-chats', {
        chatId
      });
      return response.data;
    } catch (error: any) {
      console.error('Error adding monitored chat:', error);
      throw new Error(error.response?.data?.message || 'Failed to add monitored chat');
    }
  }

  /**
   * Remove a chat ID from monitoring
   */
  async removeMonitoredChat(chatId: number): Promise<{ message: string; monitoredTelegramChats: number[] }> {
    try {
      const response = await axiosInstance.delete(`/users/me/telegram-chats/${chatId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error removing monitored chat:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove monitored chat');
    }
  }

  /**
   * Update Telegram report settings
   */
  async updateReportSettings(sendReports: boolean): Promise<{ message: string; sendAgentReportsToTelegram: boolean }> {
    try {
      const response = await axiosInstance.put('/users/me/telegram-report-settings', {
        sendAgentReportsToTelegram: sendReports
      });
      return response.data;
    } catch (error: any) {
      console.error('Error updating report settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to update report settings');
    }
  }

  /**
   * Test bot connectivity and permissions
   */
  async testBotConnectivity(): Promise<BotConnectivityResponse> {
    const response = await axiosInstance.post('/users/me/telegram-bot/test');
    return response.data;
  }
}

export default new TelegramBotService();