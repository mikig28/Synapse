export interface SummaryRequest {
  groupId: string;
  groupName: string;
  date?: string; // ISO date string for specific date
  startTime?: string; // ISO datetime string
  endTime?: string; // ISO datetime string
  timezone?: string; // User's timezone
}

export interface MessageGroup {
  senderPhone: string;
  senderName: string;
  messages: MessageData[];
  messageCount: number;
  firstMessage: Date;
  lastMessage: Date;
}

export interface MessageData {
  id: string;
  message: string;
  timestamp: Date;
  type: string;
  senderName: string;
  senderPhone: string;
}

export interface KeywordAnalysis {
  keyword: string;
  count: number;
  percentage: number;
}

export interface EmojiAnalysis {
  emoji: string;
  count: number;
  percentage: number;
}

export interface SenderInsights {
  senderName: string;
  senderPhone: string;
  messageCount: number;
  summary: string;
  topKeywords: KeywordAnalysis[];
  topEmojis: EmojiAnalysis[];
  activityPattern: {
    peakHour: number;
    messageDistribution: number[];
  };
  engagement: {
    averageMessageLength: number;
    mediaCount: number;
    questionCount: number;
  };
}

export interface GroupSummaryData {
  groupId: string;
  groupName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  totalMessages: number;
  activeParticipants: number;
  senderInsights: SenderInsights[];
  overallSummary: string;
  topKeywords: KeywordAnalysis[];
  topEmojis: EmojiAnalysis[];
  activityPeaks: {
    hour: number;
    count: number;
  }[];
  messageTypes: {
    text: number;
    image: number;
    video: number;
    audio: number;
    document: number;
    other: number;
  };
  processingStats: {
    processingTimeMs: number;
    messagesAnalyzed: number;
    participantsFound: number;
  };
}

export interface SummaryResponse {
  success: boolean;
  data?: GroupSummaryData;
  error?: string;
  cached?: boolean;
  cacheTimestamp?: string;
}

export interface SummaryGenerationOptions {
  maxSummaryLength?: number; // Default 500 words
  maxSenderSummaryLength?: number; // Default 60 words
  includeEmojis?: boolean; // Default true
  includeKeywords?: boolean; // Default true  
  minMessageCount?: number; // Minimum messages to include sender (default 1)
  keywordMinCount?: number; // Minimum count for keyword inclusion (default 2)
  emojiMinCount?: number; // Minimum count for emoji inclusion (default 2)
  excludeSystemMessages?: boolean; // Default true
  timezone?: string; // User's timezone for date boundaries
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  type: 'today' | 'yesterday' | 'last24h' | 'custom';
}

export interface GroupInfo {
  id: string;
  name: string;
  participantCount?: number;
  lastActivity?: Date;
  messageCount?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface MessagesResponse extends PaginatedResponse<MessageData> {
  groupInfo?: {
    id: string;
    name: string;
    participantCount: number;
  };
  timeRange?: {
    start: string;
    end: string;
  };
}