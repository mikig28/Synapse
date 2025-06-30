import axiosInstance from "./axiosConfig";

interface TelegramItem {
  _id: string;
  synapseUserId: string;
  telegramMessageId: number;
  chatId: number;
  chatTitle?: string;
  fromUsername?: string;
  text?: string;
  urls?: string[];
  messageType: 'text' | 'photo' | 'document' | 'voice' | 'video' | 'other';
  mediaFileId?: string;
  mediaGridFsId?: string;
  receivedAt: string; // Date as string from JSON
  createdAt: string;
  updatedAt: string;
}

export const getCapturedTelegramItems = async (): Promise<TelegramItem[]> => {
  try {
    const response = await axiosInstance.get('/capture/telegram');
    return response.data as TelegramItem[];
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch captured items');
  }
};

export const deleteCapturedTelegramItem = async (itemId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.delete(`/capture/telegram/${itemId}`);
    return response.data || { message: `Item ${itemId} deleted successfully.` };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || `Failed to delete item ${itemId}`);
  }
};

// We can add other capture-related services here later 