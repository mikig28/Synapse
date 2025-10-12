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
  sendRemindersToTelegram: boolean;
}

export interface SetBotResponse {
  message: string;
  botInfo?: {
    username: string;
    firstName?: string;
  };
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
  async validateBotToken(botToken: string): Promise<BotValidationResponse> {
    const response = await axiosInstance.post('/users/me/telegram-bot/validate', { botToken });
    return response.data;
  }

  async setBotToken(botToken: string): Promise<SetBotResponse> {
    const response = await axiosInstance.post('/users/me/telegram-bot', { botToken });
    return response.data;
  }

  async getBotStatus(): Promise<BotStatusResponse> {
    const response = await axiosInstance.get('/users/me/telegram-bot');
    return response.data;
  }

  async removeBotConfiguration(): Promise<{ message: string }> {
    const response = await axiosInstance.delete('/users/me/telegram-bot');
    return response.data;
  }

  async removeMonitoredChat(chatId: number): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/users/me/telegram-chats/${chatId}`);
    return response.data;
  }

  async updateReportSettings(sendAgentReportsToTelegram: boolean): Promise<{ message: string; sendAgentReportsToTelegram: boolean }> {
    const response = await axiosInstance.put('/users/me/telegram-report-settings', {
      sendAgentReportsToTelegram,
    });
    return response.data;
  }

  async getReportSettings(): Promise<{ sendAgentReportsToTelegram: boolean }> {
    const response = await axiosInstance.get('/users/me/telegram-report-settings');
    return response.data;
  }

  async testBotConnectivity(): Promise<BotConnectivityResponse> {
    const response = await axiosInstance.post('/users/me/telegram-bot/test');
    return response.data;
  }

  async updateReminderSettings(sendRemindersToTelegram: boolean): Promise<{ message: string; sendRemindersToTelegram: boolean }> {
    const response = await axiosInstance.put('/users/me/reminder-settings', {
      sendRemindersToTelegram,
    });
    return response.data;
  }

  async getReminderSettings(): Promise<{ sendRemindersToTelegram: boolean }> {
    const response = await axiosInstance.get('/users/me/reminder-settings');
    return response.data;
  }
}

export const telegramBotService = new TelegramBotService();
export default telegramBotService;
