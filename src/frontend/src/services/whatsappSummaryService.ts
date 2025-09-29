import api from './axiosConfig';
import { 
  GroupInfo, 
  GroupSummaryData, 
  DateRange, 
  MessagesResponse,
  ApiResponse,
  SummaryRequest,
  TodaySummaryRequest,
  MessageData
} from '../types/whatsappSummary';

export class WhatsAppSummaryService {
  /**
   * Get available WhatsApp groups for summary generation
   */
  public static async getAvailableGroups(): Promise<GroupInfo[]> {
    try {
      const response = await api.get<ApiResponse<GroupInfo[]>>('/whatsapp-summary/groups');
      
      if (response.data.success && response.data.data) {
        return response.data.data.map(group => ({
          ...group,
          lastActivity: group.lastActivity ? new Date(group.lastActivity) : undefined
        }));
      }
      
      throw new Error(response.data.error || 'Failed to fetch groups');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error fetching groups:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch groups');
    }
  }

  /**
   * Get messages for a specific group and time range
   */
  public static async getGroupMessages(
    groupId: string,
    start: Date,
    end: Date,
    page: number = 1,
    limit: number = 1000
  ): Promise<MessagesResponse> {
    try {
      const response = await api.get<MessagesResponse>(`/whatsapp-summary/groups/${groupId}/messages`, {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
          page,
          limit
        }
      });
      
      if (response.data.success) {
        return response.data;
      }
      
      throw new Error(response.data.error || 'Failed to fetch messages');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error fetching messages:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch messages');
    }
  }

  /**
   * Generate daily summary for a specific group and date
   */
  public static async generateDailySummary(
    groupId: string,
    date: string,
    timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
    chatType?: 'group' | 'private'
  ): Promise<GroupSummaryData> {
    try {
      const request: SummaryRequest = {
        groupId,
        date,
        timezone,
        chatType,
        options: {
          maxSummaryLength: 500,
          maxSenderSummaryLength: 60,
          includeEmojis: true,
          includeKeywords: true,
          minMessageCount: 1,
          keywordMinCount: 2,
          emojiMinCount: 2,
          excludeSystemMessages: true,
          // Ask backend to auto-detect language and include per-speaker attributions
          targetLanguage: 'auto',
          speakerAttribution: true,
          maxSpeakerAttributions: 5
        }
      };

      const response = await api.post<ApiResponse<GroupSummaryData>>('/whatsapp-summary/generate', request);

      if (response.data.success && response.data.data) {
        // Convert date strings back to Date objects
        const summary = response.data.data;
        summary.timeRange.start = new Date(summary.timeRange.start);
        summary.timeRange.end = new Date(summary.timeRange.end);

        // Convert rawMessages timestamps if present
        if (summary.rawMessages && Array.isArray(summary.rawMessages)) {
          summary.rawMessages = summary.rawMessages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }

        return summary;
      }
      
      throw new Error(response.data.error || 'Failed to generate summary');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error generating summary:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to generate summary');
    }
  }

  /**
   * Generate summary for today
   */
  public static async generateTodaySummary(
    groupId: string,
    timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
    chatType?: 'group' | 'private'
  ): Promise<GroupSummaryData> {
    try {
      const request: TodaySummaryRequest = {
        groupId,
        timezone,
        chatType
      };

      // Use authenticated route in production, with fallback to /generate
      let response = await api.post<ApiResponse<GroupSummaryData>>('/whatsapp-summary/generate-today', request);
      if (!response.data?.success || !response.data?.data) {
        const today = new Date().toISOString().split('T')[0];
        response = await api.post<ApiResponse<GroupSummaryData>>('/whatsapp-summary/generate', { groupId, date: today, timezone, chatType });
      }

      if (response.data.success && response.data.data) {
        // Convert date strings back to Date objects
        const summary = response.data.data;
        summary.timeRange.start = new Date(summary.timeRange.start);
        summary.timeRange.end = new Date(summary.timeRange.end);

        // Convert rawMessages timestamps if present
        if (summary.rawMessages && Array.isArray(summary.rawMessages)) {
          summary.rawMessages = summary.rawMessages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }

        return summary;
      }
      
      throw new Error(response.data.error || 'Failed to generate today summary');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error generating today summary:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to generate today summary');
    }
  }

  /**
   * Get available date ranges with message counts
   */
  public static async getAvailableDateRanges(groupId: string): Promise<DateRange[]> {
    try {
      const response = await api.get<ApiResponse<DateRange[]>>(`/whatsapp-summary/groups/${groupId}/date-ranges`);
      
      if (response.data.success && response.data.data) {
        return response.data.data.map(range => ({
          ...range,
          start: new Date(range.start),
          end: new Date(range.end)
        }));
      }
      
      throw new Error(response.data.error || 'Failed to fetch date ranges');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error fetching date ranges:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch date ranges');
    }
  }

  /**
   * Get summary statistics for a group
   */
  public static async getGroupStats(
    groupId: string,
    days: number = 7
  ): Promise<{
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
  }> {
    try {
      const response = await api.get<ApiResponse<any>>(`/whatsapp-summary/groups/${groupId}/stats`, {
        params: { days }
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Failed to fetch group stats');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error fetching group stats:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch group stats');
    }
  }

  /**
   * Get user's timezone
   */
  public static getUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }

  /**
   * Format date for API (YYYY-MM-DD)
   */
  public static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Create date range for today
   */
  public static getTodayRange(timezone?: string): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    return {
      start,
      end,
      label: 'Today',
      type: 'today'
    };
  }

  /**
   * Create date range for yesterday
   */
  public static getYesterdayRange(timezone?: string): DateRange {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    
    return {
      start,
      end,
      label: 'Yesterday',
      type: 'yesterday'
    };
  }

  /**
   * Create date range for last 24 hours
   */
  public static getLast24HoursRange(): DateRange {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      start,
      end,
      label: 'Last 24 Hours',
      type: 'last24h'
    };
  }

  /**
   * Create custom date range
   */
  public static createCustomRange(startDate: Date, endDate: Date, label?: string): DateRange {
    return {
      start: startDate,
      end: endDate,
      label: label || `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      type: 'custom'
    };
  }

  /**
   * Get predefined date ranges
   */
  public static getPredefinedRanges(): DateRange[] {
    return [
      this.getTodayRange(),
      this.getYesterdayRange(),
      this.getLast24HoursRange()
    ];
  }

  /**
   * Get recent summaries for the authenticated user
   */
  public static async getRecentSummaries(
    limit: number = 10,
    days: number = 7
  ): Promise<GroupSummaryData[]> {
    try {
      const response = await api.get<ApiResponse<any[]>>('/whatsapp-summary/summaries/recent', {
        params: { limit, days }
      });

      if (response.data.success && response.data.data) {
        return response.data.data.map(summary => {
          const normalizeKeyword = (keywordEntry: any) => {
            if (!keywordEntry) return null;
            if (typeof keywordEntry === 'string') {
              return { keyword: keywordEntry, count: 0, percentage: 0 };
            }
            return {
              keyword: keywordEntry.keyword ?? keywordEntry.word ?? '',
              count: keywordEntry.count ?? keywordEntry.frequency ?? 0,
              percentage: keywordEntry.percentage ?? keywordEntry.percent ?? 0
            };
          };

          const normalizeEmoji = (emojiEntry: any) => {
            if (!emojiEntry) return null;
            if (typeof emojiEntry === 'string') {
              return { emoji: emojiEntry, count: 0, percentage: 0 };
            }
            return {
              emoji: emojiEntry.emoji ?? emojiEntry.value ?? '',
              count: emojiEntry.count ?? emojiEntry.frequency ?? 0,
              percentage: emojiEntry.percentage ?? emojiEntry.percent ?? 0
            };
          };

          const normalizeInsights = (insights: any[] | undefined, legacy?: boolean) => {
            if (!insights) return [];
            return insights
              .map(entry => {
                if (!entry) return null;
                const baseKeywords = legacy ? entry.topKeywords : entry.topKeywords ?? entry.keywords;
                const baseEmojis = legacy ? entry.topEmojis : entry.topEmojis ?? entry.emojis;

                return {
                  senderName: entry.senderName ?? entry.name ?? 'Unknown',
                  senderPhone: entry.senderPhone ?? entry.phone ?? '',
                  messageCount: entry.messageCount ?? entry.messages ?? 0,
                  summary: entry.summary ?? entry.insight ?? '',
                  topKeywords: (baseKeywords ?? [])
                    .map(normalizeKeyword)
                    .filter((k): k is { keyword: string; count: number; percentage: number } => Boolean(k)),
                  topEmojis: (baseEmojis ?? [])
                    .map(normalizeEmoji)
                    .filter((e): e is { emoji: string; count: number; percentage: number } => Boolean(e)),
                  activityPattern: {
                    peakHour: entry.activityPattern?.peakHour
                      ?? entry.peakHour
                      ?? 12,
                    messageDistribution: entry.activityPattern?.messageDistribution
                      ?? entry.messageDistribution
                      ?? []
                  },
                  engagement: {
                    averageMessageLength: entry.engagement?.averageMessageLength
                      ?? entry.averageMessageLength
                      ?? 0,
                    mediaCount: entry.engagement?.mediaCount
                      ?? entry.mediaCount
                      ?? 0,
                    questionCount: entry.engagement?.questionCount
                      ?? entry.questionCount
                      ?? 0
                  }
                };
              })
              .filter(Boolean) as GroupSummaryData['senderInsights'];
          };

          const summaryDate = summary.summaryDate ? new Date(summary.summaryDate) : new Date();
          const timeRange = {
            start: summary.timeRange?.start ? new Date(summary.timeRange.start) : summaryDate,
            end: summary.timeRange?.end ? new Date(summary.timeRange.end) : summaryDate
          };

          const groupAnalytics = summary.groupAnalytics
            ? {
                ...summary.groupAnalytics,
                timeRange: {
                  start: summary.groupAnalytics.timeRange?.start
                    ? new Date(summary.groupAnalytics.timeRange.start)
                    : timeRange.start,
                  end: summary.groupAnalytics.timeRange?.end
                    ? new Date(summary.groupAnalytics.timeRange.end)
                    : timeRange.end
                }
              }
            : undefined;

          const totalMessages = summary.totalMessages
            ?? summary.groupAnalytics?.totalMessages
            ?? groupAnalytics?.totalMessages
            ?? 0;

          const activeParticipants = summary.activeParticipants
            ?? summary.groupAnalytics?.activeParticipants
            ?? groupAnalytics?.activeParticipants
            ?? 0;

          const keywordsSource = summary.topKeywords
            ?? summary.groupAnalytics?.topKeywords
            ?? groupAnalytics?.topKeywords
            ?? [];

          const emojisSource = summary.topEmojis
            ?? summary.groupAnalytics?.topEmojis
            ?? groupAnalytics?.topEmojis
            ?? [];

          const messageTypes = summary.messageTypes
            ?? (summary.groupAnalytics?.messageTypes
              ? {
                  text: summary.groupAnalytics.messageTypes.text ?? 0,
                  image: summary.groupAnalytics.messageTypes.image ?? 0,
                  video: summary.groupAnalytics.messageTypes.video ?? 0,
                  audio: summary.groupAnalytics.messageTypes.audio ?? 0,
                  document: summary.groupAnalytics.messageTypes.document ?? 0,
                  other: summary.groupAnalytics.messageTypes.other ?? 0
                }
              : {
                  text: totalMessages,
                  image: 0,
                  video: 0,
                  audio: 0,
                  document: 0,
                  other: 0
                });

          const processingStats = summary.processingStats ?? {
            processingTimeMs: summary.processingTimeMs ?? 0,
            messagesAnalyzed: summary.processingStats?.messagesAnalyzed
              ?? totalMessages,
            participantsFound: summary.processingStats?.participantsFound
              ?? activeParticipants
          };

          const senderInsights = summary.senderInsights && summary.senderInsights.length > 0
            ? normalizeInsights(summary.senderInsights)
            : normalizeInsights(summary.senderSummaries, true);

          return {
            ...summary,
            scheduleId: summary.scheduleId,
            summaryDate,
            timeRange,
            generatedAt: summary.generatedAt ? new Date(summary.generatedAt) : new Date(),
            overallSummary: summary.overallSummary ?? summary.summary ?? '',
            totalMessages,
            activeParticipants,
            senderInsights,
            topKeywords: keywordsSource
              .map(normalizeKeyword)
              .filter((k): k is { keyword: string; count: number; percentage: number } => Boolean(k)),
            topEmojis: emojisSource
              .map(normalizeEmoji)
              .filter((e): e is { emoji: string; count: number; percentage: number } => Boolean(e)),
            activityPeaks: summary.activityPeaks ?? summary.groupAnalytics?.activityPeaks ?? [],
            messageTypes,
            processingStats,
            aiInsights: summary.aiInsights ?? undefined
          } as GroupSummaryData;
        });
      }

      throw new Error(response.data.error || 'Failed to fetch recent summaries');
    } catch (error: any) {
      console.error('[WhatsApp Summary Service] Error fetching recent summaries:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch recent summaries');
    }
  }
}

export default WhatsAppSummaryService;
