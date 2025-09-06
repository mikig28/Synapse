// WhatsApp Summary Types for Frontend

export interface GroupInfo {
  id: string;
  name: string;
  participantCount?: number;
  lastActivity?: Date;
  messageCount?: number;
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
}

export interface TodaySummaryRequest {
  groupId: string;
  timezone?: string;
  options?: Partial<SummaryGenerationOptions>;
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

// UI State types
export interface GroupMonitorState {
  selectedGroups: GroupSelection[];
  selectedDateRange: DateRange;
  customDateRange: {
    start: Date | null;
    end: Date | null;
  };
  loading: boolean;
  error: string | null;
  summaries: Map<string, GroupSummaryData>; // groupId -> summary
  availableGroups: GroupInfo[];
}

// Summary display types
export interface SummaryDisplayProps {
  summary: GroupSummaryData;
  onClose: () => void;
  loading?: boolean;
}

// Date picker types
export interface DatePickerProps {
  selectedRange: DateRange;
  onChange: (range: DateRange) => void;
  availableRanges?: DateRange[];
}

// Group selector types
export interface GroupSelectorProps {
  groups: GroupSelection[];
  onChange: (groups: GroupSelection[]) => void;
  loading?: boolean;
}

export interface GroupCardProps {
  group: GroupSelection;
  onToggle: (groupId: string) => void;
  onGenerateSummary: (groupId: string) => void;
  summary?: GroupSummaryData;
  loading?: boolean;
}

// Constants for UI
export const DATE_RANGE_PRESETS = {
  TODAY: 'today' as const,
  YESTERDAY: 'yesterday' as const,
  LAST_24H: 'last24h' as const,
  CUSTOM: 'custom' as const,
};

export const MESSAGE_TYPES = {
  TEXT: 'text' as const,
  IMAGE: 'image' as const,
  VIDEO: 'video' as const,
  AUDIO: 'audio' as const,
  DOCUMENT: 'document' as const,
  OTHER: 'other' as const,
};