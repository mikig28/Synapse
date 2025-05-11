export interface BookmarkItemType {
  _id: string;
  userId: string;
  telegramMessageId?: string;
  originalUrl: string;
  sourcePlatform: 'X' | 'LinkedIn' | 'Other';
  title?: string;
  summary?: string;
  tags?: string[];
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string;
  status?: 'pending_summary' | 'summarized' | 'error';
} 