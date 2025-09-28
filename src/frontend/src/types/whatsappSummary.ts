import type { SummaryGenerationOptions } from '../../../shared/types/whatsappSummaryOptions';

export type { SummaryGenerationOptions } from '../../../shared/types/whatsappSummaryOptions';

// WhatsApp Summary Types for Frontend

export interface GroupInfo {
  id: string;
  name: string;
  participantCount?: number;
  lastActivity?: Date;
  messageCount?: number;
  totalMessages?: number;
  isGroup?: boolean;
  chatType?: 'group' | 'private';
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface GroupSelection extends GroupInfo {
  isSelected: boolean;
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

export interface AIInsights {
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  actionItems: string[];
  importantEvents: string[];
  decisionsMade: string[];
  speakerAttributions?: { speakerName: string; bullets: string[] }[];
}

export interface GroupSummaryData {
  groupId: string;
  groupName: string;
  scheduleId?: string;
  summaryDate: Date;
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
  aiInsights?: AIInsights; // Optional AI-generated insights
  rawMessages?: MessageData[]; // Optional raw messages for transparency
  generatedAt: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  type: 'today' | 'yesterday' | 'last24h' | 'custom';
  messageCount?: number;
}

// API Response interfaces
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

// Summary generation request types
export interface SummaryRequest {
  groupId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timezone?: string;
  options?: Partial<SummaryGenerationOptions>;
  chatType?: 'group' | 'private';
}

export interface TodaySummaryRequest {
  groupId: string;
  timezone?: string;
  options?: Partial<SummaryGenerationOptions>;
  chatType?: 'group' | 'private';
}

// Date range preset types
export const DATE_RANGE_PRESETS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_24H: 'last24h',
  LAST_WEEK: 'lastWeek',
  LAST_MONTH: 'lastMonth',
  CUSTOM: 'custom'
} as const;

export type DateRangePreset = typeof DATE_RANGE_PRESETS[keyof typeof DATE_RANGE_PRESETS];

// Group statistics interface
export interface GroupStatistics {
  groupId: string;
  groupName: string;
  period: string;
  totalMessages: number;
  activeSenders: number;
  messageTypes: {
    text: number;
    image: number;
    video: number;
    audio: number;
    document: number;
    other: number;
  };
  averageMessagesPerDay: number;
  averageMessagesPerSender: number;
}

// Message type enums
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  STICKER: 'sticker',
  LOCATION: 'location',
  CONTACT: 'contact',
  OTHER: 'other'
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// Summary display formatting
export interface SummaryDisplayData {
  title: string;
  subtitle: string;
  stats: Array<{
    label: string;
    value: string | number;
    icon?: string;
  }>;
  topSenders: Array<{
    name: string;
    count: number;
    summary: string;
  }>;
  keywords: string[];
  emojis: string[];
  insights?: {
    topics: string[];
    sentiment: string;
    actionItems: string[];
    events: string[];
    decisions: string[];
  };
}

// Props for the SummaryModal component
export interface SummaryDisplayProps {
  summary: GroupSummaryData;
  onClose: () => void;
  loading?: boolean;
}

