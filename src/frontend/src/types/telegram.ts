export interface TelegramItemType {
  _id: string; // Can be TelegramItem ID or Task/Note/Idea ID
  telegramMessageId?: number; // Original Telegram message_id
  chatId?: number;
  chatTitle?: string;
  fromUsername?: string;
  text?: string; // For TelegramItem, this is the original text. For Task/Note/Idea, this could be the title/content.
  urls?: string[];
  messageType?: string; // Original message type from Telegram
  mediaFileId?: string;
  mediaGridFsId?: string;
  receivedAt: string; // Original message receivedAt
  createdAt: string; // Document createdAt
  updatedAt: string;
  
  // Fields for items created from analysis (Tasks, Notes, Ideas)
  source?: string; // e.g., 'telegram_voice_memo', 'telegram_text', 'whatsapp', 'telegram'
  rawTranscription?: string; // Full transcription if applicable
  
  // Fields for WhatsApp integration
  from?: string; // Sender information for cross-platform support
  whatsappMessageId?: string; // Reference to original WhatsApp message
  
  // Fields specific to Task (if the item is a Task)
  title?: string; // If it's a Task, text might be here, or in a dedicated title field
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'deferred';
  priority?: 'low' | 'medium' | 'high';

  // If it's a Note or Idea, content might be in 'text' or a specific 'content' field
  content?: string;
  
  // AI Analysis fields for images
  aiAnalysis?: {
    isAnalyzed: boolean;
    analyzedAt?: string;
    description?: string;
    mainCategory?: string;
    categories?: string[];
    tags?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    confidence?: number;
    error?: string;
  };
} 