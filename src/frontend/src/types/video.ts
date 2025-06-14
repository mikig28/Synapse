export interface VideoItemType {
  _id: string;
  userId: string;
  originalUrl: string;
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  sourcePlatform: 'YouTube';
  watchedStatus: 'unwatched' | 'watching' | 'watched';
  summary?: string; // AI-generated summary of the video
  telegramMessageId?: string;
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string;
} 