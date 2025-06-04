export interface BookmarkItemType {
  _id: string;
  userId: string;
  telegramMessageId?: string;
  originalUrl: string;
  sourcePlatform: 'X' | 'LinkedIn' | 'Reddit' | 'Other';
  title?: string;
  summary?: string;
  tags?: string[];
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string;
  status?: 'pending_summary' | 'summarized' | 'error' | 'metadata_fetched' | 'pending' | 'processing' | 'failed';
  fetchedTitle?: string;
  fetchedDescription?: string;
  fetchedImageUrl?: string;
  fetchedVideoUrl?: string;
  tweetData?: any; // Added - consider a more specific type e.g. from react-tweet
  linkedInData?: any; // Added - consider a more specific type
}
