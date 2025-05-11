export interface TelegramItemType {
  _id: string; // Assuming MongoDB ObjectId is serialized as string
  synapseUserId: string;
  telegramMessageId: number;
  chatId: number;
  chatTitle?: string;
  fromUserId?: number;
  fromUsername?: string;
  text?: string;
  urls?: string[];
  messageType: 'text' | 'photo' | 'document' | 'voice' | 'video' | 'other';
  mediaFileId?: string;
  mediaLocalUrl?: string;
  receivedAt: string; // ISO date string
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
} 