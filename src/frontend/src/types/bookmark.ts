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
  status?: 'pending' | 'summarized' | 'error' | 'metadata_fetched' | 'processing' | 'failed';
  fetchedTitle?: string;
  fetchedDescription?: string;
  fetchedImageUrl?: string;
  fetchedVideoUrl?: string;
  // Reddit-specific content fields
  redditPostContent?: string;
  redditAuthor?: string;
  redditSubreddit?: string;
  redditUpvotes?: number;
  redditNumComments?: number;
  redditCreatedUtc?: number;
  tweetData?: any; // Added - consider a more specific type e.g. from react-tweet
  linkedInData?: any; // Added - consider a more specific type
}
