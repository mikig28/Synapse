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
        return response.data.data;
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
    timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): Promise<GroupSummaryData> {
    try {
      const request: SummaryRequest = {
        groupId,
        date,
        timezone,
        options: {
          maxSummaryLength: 500,
          maxSenderSummaryLength: 60,
          includeEmojis: true,
          includeKeywords: true,
          minMessageCount: 1,
          keywordMinCount: 2,
          emojiMinCount: 2,
          excludeSystemMessages: true
        }
      };

      const response = await api.post<ApiResponse<GroupSummaryData>>('/whatsapp-summary/generate', request);
      
      if (response.data.success && response.data.data) {
        // Convert date strings back to Date objects
        const summary = response.data.data;
        summary.timeRange.start = new Date(summary.timeRange.start);
        summary.timeRange.end = new Date(summary.timeRange.end);
        
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
    timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  ): Promise<GroupSummaryData> {
    try {
      const request: TodaySummaryRequest = {
        groupId,
        timezone
      };

      // Use authenticated route in production, with fallback to /generate
      let response = await api.post<ApiResponse<GroupSummaryData>>('/whatsapp-summary/generate-today', request);
      if (!response.data?.success || !response.data?.data) {
        const today = new Date().toISOString().split('T')[0];
        response = await api.post<ApiResponse<GroupSummaryData>>('/whatsapp-summary/generate', { groupId, date: today, timezone });
      }
      
      if (response.data.success && response.data.data) {
        // Convert date strings back to Date objects
        const summary = response.data.data;
        summary.timeRange.start = new Date(summary.timeRange.start);
        summary.timeRange.end = new Date(summary.timeRange.end);
        
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
}

export default WhatsAppSummaryService;