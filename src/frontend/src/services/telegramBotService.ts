import axiosInstance from './axiosConfig';

export interface BotValidationResponse {
  valid: boolean;
  username?: string;
  firstName?: string;
  error?: string;
}

export interface BotStatusResponse {
  hasBot: boolean;
  isActive: boolean;
  botUsername?: string;
  monitoredChats: number;
  sendReportsToTelegram: boolean;
}

export interface SetBotResponse {
  message: string;
  botInfo?: {
    username: string;
    firstName?: string;
  };
}

class TelegramBotService {
  /**
   * Validate a Telegram bot token
   */
  async validateBotToken(botToken: string): Promise<BotValidationResponse> {
    const response = await axiosInstance.post('/users/me/telegram-bot/validate', {
      botToken
    });
    return response.data;
  }

  /**
   * Set the user's Telegram bot token
   */
  async setBotToken(botToken: string): Promise<SetBotResponse> {
    const response = await axiosInstance.post('/users/me/telegram-bot', {
      botToken
    });
    return response.data;
  }

  /**
   * Get the user's current bot status
   */
  async getBotStatus(): Promise<BotStatusResponse> {
    const response = await axiosInstance.get('/users/me/telegram-bot');
    return response.data;
  }

  /**
   * Remove the user's bot configuration
   */
  async removeBotConfiguration(): Promise<{ message: string }> {
    const response = await axiosInstance.delete('/users/me/telegram-bot');
    return response.data;
  }

  /**
   * Remove a monitored Telegram chat
   */
  async removeMonitoredChat(chatId: number): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/users/me/telegram-chats/${chatId}`);
    return response.data;
  }
}

export const telegramBotService = new TelegramBotService();
export default telegramBotService;