import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppContact from '../models/WhatsAppContact';
import WhatsAppGroupSummary, { IWhatsAppGroupSummary } from '../models/WhatsAppGroupSummary';
import { 
  MessageData, 
  SummaryRequest, 
  GroupSummaryData, 
  SummaryGenerationOptions,
  DateRange 
} from '../types/whatsappSummary';
import { generateCompleteGroupSummary } from '../utils/summarization';

export class MessageSummarizationService {
  private static instance: MessageSummarizationService;

  public static getInstance(): MessageSummarizationService {
    if (!MessageSummarizationService.instance) {
      MessageSummarizationService.instance = new MessageSummarizationService();
    }
    return MessageSummarizationService.instance;
  }

  private constructor() {}

  /**
   * Generates date range based on request parameters
   */
  public generateDateRange(request: SummaryRequest): DateRange {
    const timezone = request.timezone || 'UTC';
    const now = new Date();

    // If specific start/end times provided
    if (request.startTime && request.endTime) {
      const start = parseISO(request.startTime);
      const end = parseISO(request.endTime);
      
      if (isValid(start) && isValid(end)) {
        return {
          start,
          end,
          label: `Custom range`,
          type: 'custom'
        };
      }
    }

    // If specific date provided
    if (request.date) {
      const date = parseISO(request.date);
      if (isValid(date)) {
        // Use simple day boundaries (UTC)
        const start = startOfDay(date);
        const end = endOfDay(date);
        
        return {
          start,
          end,
          label: date.toLocaleDateString(),
          type: 'custom'
        };
      }
    }

    // Default to today (UTC)
    const start = startOfDay(now);
    const end = endOfDay(now);

    return {
      start,
      end,
      label: 'Today',
      type: 'today'
    };
  }

  /**
   * Fetches messages for a group within a date range with pagination
   */
  public async fetchGroupMessages(
    groupId: string,
    timeRange: DateRange,
    page: number = 1,
    limit: number = 1000
  ): Promise<{
    messages: MessageData[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      console.log(`[MessageSummarization] Fetching messages for group ${groupId}`, {
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString()
        },
        page,
        limit
      });

      // First get total count
      const totalCount = await WhatsAppMessage.countDocuments({
        timestamp: {
          $gte: timeRange.start,
          $lte: timeRange.end
        },
        $or: [
          { 'metadata.groupName': { $exists: true, $ne: null } },
          { to: groupId },
          { from: groupId }
        ]
      });

      // Fetch paginated messages
      const dbMessages = await WhatsAppMessage.find({
        timestamp: {
          $gte: timeRange.start,
          $lte: timeRange.end
        },
        $or: [
          { 'metadata.groupName': { $exists: true, $ne: null } },
          { to: groupId },
          { from: groupId }
        ]
      })
      .populate('contactId', 'name phoneNumber')
      .sort({ timestamp: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

      console.log(`[MessageSummarization] Found ${dbMessages.length} messages (${totalCount} total)`);

      // Transform to MessageData format
      const messages: MessageData[] = [];
      for (const msg of dbMessages) {
        try {
          const contact = msg.contactId as any;
          const senderPhone = msg.from;
          const senderName = contact?.name || `Contact ${senderPhone}`;

          messages.push({
            id: msg.messageId,
            message: msg.message || '',
            timestamp: msg.timestamp,
            type: msg.type,
            senderName: senderName,
            senderPhone: senderPhone
          });
        } catch (error) {
          console.warn(`[MessageSummarization] Error processing message ${msg.messageId}:`, error);
          // Continue with other messages
        }
      }

      const hasMore = (page * limit) < totalCount;

      return {
        messages,
        hasMore,
        totalCount
      };
    } catch (error) {
      console.error('[MessageSummarization] Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if a summary already exists for the given parameters
   */
  public async checkExistingSummary(
    groupId: string,
    userId: string,
    summaryDate: Date
  ): Promise<IWhatsAppGroupSummary | null> {
    try {
      const existingSummary = await WhatsAppGroupSummary.findOne({
        groupId,
        userId,
        summaryDate: {
          $gte: startOfDay(summaryDate),
          $lt: endOfDay(summaryDate)
        },
        status: 'completed'
      }).sort({ generatedAt: -1 });

      return existingSummary;
    } catch (error) {
      console.error('[MessageSummarization] Error checking existing summary:', error);
      return null;
    }
  }

  /**
   * Creates a new summary record in the database
   */
  public async createSummaryRecord(

    groupId: string,

    groupName: string,

    userId: string,

    summaryDate: Date,

    timeRange: DateRange,

    scheduleId?: string

  ): Promise<IWhatsAppGroupSummary> {

    const summaryRecord = new WhatsAppGroupSummary({
      groupId,
      groupName,
      userId,
      scheduleId,
      summaryDate,
      timeRange: {
        start: timeRange.start,
        end: timeRange.end
      },
      senderSummaries: [],
      groupAnalytics: {
        totalMessages: 0,
        activeParticipants: 0,
        timeRange: {
          start: timeRange.start,
          end: timeRange.end
        },
        topKeywords: [],
        topEmojis: [],
        messageTypes: { text: 0, media: 0, other: 0 },
        activityPeaks: []
      },
      summary: '',
      processingTimeMs: 0,
      status: 'generating'
    });

    return await summaryRecord.save();
  }

  /**
   * Updates summary record with generated data
   */
  public async updateSummaryRecord(
    summaryId: string,
    summaryData: GroupSummaryData
  ): Promise<IWhatsAppGroupSummary> {
    const summaryRecord = await WhatsAppGroupSummary.findById(summaryId);
    if (!summaryRecord) {
      throw new Error('Summary record not found');
    }

    // Transform sender insights to sender summaries
    summaryRecord.senderSummaries = summaryData.senderInsights.map(insight => ({
      senderName: insight.senderName,
      senderPhone: insight.senderPhone,
      messageCount: insight.messageCount,
      summary: insight.summary,
      topKeywords: insight.topKeywords.map(k => k.keyword),
      topEmojis: insight.topEmojis.map(e => e.emoji),
      firstMessageTime: new Date(), // This should be calculated properly
      lastMessageTime: new Date()   // This should be calculated properly
    }));

    // Update group analytics
    summaryRecord.groupAnalytics = {
      totalMessages: summaryData.totalMessages,
      activeParticipants: summaryData.activeParticipants,
      timeRange: summaryRecord.timeRange,
      topKeywords: summaryData.topKeywords.map(k => k.keyword),
      topEmojis: summaryData.topEmojis.map(e => e.emoji),
      messageTypes: {
        text: summaryData.messageTypes.text,
        media: summaryData.messageTypes.image + summaryData.messageTypes.video + 
               summaryData.messageTypes.audio + summaryData.messageTypes.document,
        other: summaryData.messageTypes.other
      },
      activityPeaks: summaryData.activityPeaks
    };

    summaryRecord.summary = summaryData.overallSummary;
    summaryRecord.processingTimeMs = summaryData.processingStats.processingTimeMs;
    summaryRecord.status = 'completed';
    summaryRecord.generatedAt = new Date();

    return await summaryRecord.save();
  }

  /**
   * Fetches all messages for a group (handles pagination internally)
   */
  public async fetchAllGroupMessages(
    groupId: string,
    timeRange: DateRange
  ): Promise<MessageData[]> {
    const allMessages: MessageData[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 1000; // Process in chunks

    while (hasMore) {
      const result = await this.fetchGroupMessages(groupId, timeRange, page, limit);
      allMessages.push(...result.messages);
      hasMore = result.hasMore;
      page++;

      // Safety check to prevent infinite loops
      if (page > 100) {
        console.warn('[MessageSummarization] Reached maximum page limit (100)');
        break;
      }
    }

    console.log(`[MessageSummarization] Fetched ${allMessages.length} total messages across ${page - 1} pages`);
    return allMessages;
  }

  /**
   * Generates a complete group summary
   */
  public async generateGroupSummary(
    request: SummaryRequest,
    userId: string,
    options: SummaryGenerationOptions = {}
  ): Promise<{
    summary: GroupSummaryData;
    cached: boolean;
    summaryId: string;
  }> {
    try {
      console.log('[MessageSummarization] Starting summary generation', {
        groupId: request.groupId,
        groupName: request.groupName,
        userId
      });

      // Generate date range
      const timeRange = this.generateDateRange(request);
      const summaryDate = startOfDay(timeRange.start);

      // Check for existing summary
      const existingSummary = await this.checkExistingSummary(
        request.groupId,
        userId,
        summaryDate
      );

      if (existingSummary) {
        console.log('[MessageSummarization] Found existing summary, returning cached result');
        
        // Transform existing summary to GroupSummaryData format
        const summaryData: GroupSummaryData = {
          groupId: existingSummary.groupId,
          groupName: existingSummary.groupName,
          timeRange: {
            start: existingSummary.timeRange.start,
            end: existingSummary.timeRange.end
          },
          totalMessages: existingSummary.groupAnalytics.totalMessages,
          activeParticipants: existingSummary.groupAnalytics.activeParticipants,
          senderInsights: existingSummary.senderSummaries.map(sender => ({
            senderName: sender.senderName,
            senderPhone: sender.senderPhone,
            messageCount: sender.messageCount,
            summary: sender.summary,
            topKeywords: sender.topKeywords.map(k => ({ keyword: k, count: 0, percentage: 0 })),
            topEmojis: sender.topEmojis.map(e => ({ emoji: e, count: 0, percentage: 0 })),
            activityPattern: {
              peakHour: 12,
              messageDistribution: new Array(24).fill(0)
            },
            engagement: {
              averageMessageLength: 0,
              mediaCount: 0,
              questionCount: 0
            }
          })),
          overallSummary: existingSummary.summary,
          topKeywords: existingSummary.groupAnalytics.topKeywords.map(k => ({ 
            keyword: k, 
            count: 0, 
            percentage: 0 
          })),
          topEmojis: existingSummary.groupAnalytics.topEmojis.map(e => ({ 
            emoji: e, 
            count: 0, 
            percentage: 0 
          })),
          activityPeaks: existingSummary.groupAnalytics.activityPeaks,
          messageTypes: {
            text: existingSummary.groupAnalytics.messageTypes.text,
            image: 0,
            video: 0,
            audio: 0,
            document: 0,
            other: existingSummary.groupAnalytics.messageTypes.other
          },
          processingStats: {
            processingTimeMs: existingSummary.processingTimeMs,
            messagesAnalyzed: existingSummary.groupAnalytics.totalMessages,
            participantsFound: existingSummary.groupAnalytics.activeParticipants
          }
        };

        if (scheduleId && !existingSummary.scheduleId) {
          await WhatsAppGroupSummary.findByIdAndUpdate(existingSummary._id, { scheduleId });
        }

        return {
          summary: summaryData,
          cached: true,
          summaryId: existingSummary._id.toString()
        };
      }

      // Create new summary record
      const summaryRecord = await this.createSummaryRecord(
        request.groupId,
        request.groupName,
        userId,
        summaryDate,
        timeRange
      );

      try {
        // Fetch all messages for the time range
        const messages = await this.fetchAllGroupMessages(request.groupId, timeRange);

        if (messages.length === 0) {
          console.log('[MessageSummarization] No messages found for the specified time range');
          
          // Create empty summary
          const emptySummary: GroupSummaryData = {
            groupId: request.groupId,
            groupName: request.groupName,
            timeRange,
            totalMessages: 0,
            activeParticipants: 0,
            senderInsights: [],
            overallSummary: `No messages found for ${request.groupName} during the specified time period.`,
            topKeywords: [],
            topEmojis: [],
            activityPeaks: [],
            messageTypes: { text: 0, image: 0, video: 0, audio: 0, document: 0, other: 0 },
            processingStats: {
              processingTimeMs: 0,
              messagesAnalyzed: 0,
              participantsFound: 0
            }
          };

          await this.updateSummaryRecord(summaryRecord._id.toString(), emptySummary);

          return {
            summary: emptySummary,
            cached: false,
            summaryId: summaryRecord._id.toString()
          };
        }

        // Generate comprehensive summary
        console.log(`[MessageSummarization] Generating summary for ${messages.length} messages`);
        const summaryData = generateCompleteGroupSummary(
          messages,
          request.groupId,
          request.groupName,
          timeRange,
          {
            maxSummaryLength: 500,
            maxSenderSummaryLength: 60,
            includeEmojis: true,
            includeKeywords: true,
            minMessageCount: 1,
            keywordMinCount: 2,
            emojiMinCount: 2,
            excludeSystemMessages: true,
            ...options
          }
        );

        // Update the summary record with generated data
        await this.updateSummaryRecord(summaryRecord._id.toString(), summaryData);

        console.log('[MessageSummarization] Summary generation completed', {
          messagesAnalyzed: summaryData.processingStats.messagesAnalyzed,
          participantsFound: summaryData.processingStats.participantsFound,
          processingTimeMs: summaryData.processingStats.processingTimeMs
        });

        return {
          summary: summaryData,
          cached: false,
          summaryId: summaryRecord._id.toString()
        };

      } catch (error) {
        // Mark summary as failed
        await summaryRecord.markFailed(
          error instanceof Error ? error.message : 'Unknown error during summary generation'
        );
        throw error;
      }

    } catch (error) {
      console.error('[MessageSummarization] Error generating summary:', error);
      throw new Error(
        `Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets recent summaries for a user
   */
  public async getRecentSummaries(
    userId: string,
    days: number = 7
  ): Promise<IWhatsAppGroupSummary[]> {
    try {
      return await WhatsAppGroupSummary.find({
        userId,
        summaryDate: {
          $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        },
        status: 'completed'
      })
      .sort({ summaryDate: -1 })
      .limit(50);
    } catch (error) {
      console.error('[MessageSummarization] Error fetching recent summaries:', error);
      throw new Error('Failed to fetch recent summaries');
    }
  }

  /**
   * Gets summaries for a specific group
   */
  public async getGroupSummaries(
    groupId: string,
    userId: string,
    limit: number = 10
  ): Promise<IWhatsAppGroupSummary[]> {
    try {
      return await WhatsAppGroupSummary.find({
        groupId,
        userId,
        status: 'completed'
      })
      .sort({ summaryDate: -1 })
      .limit(limit);
    } catch (error) {
      console.error('[MessageSummarization] Error fetching group summaries:', error);
      throw new Error('Failed to fetch group summaries');
    }
  }

  /**
   * Deletes old summaries beyond retention period
   */
  public async cleanupOldSummaries(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await WhatsAppGroupSummary.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`[MessageSummarization] Cleaned up ${result.deletedCount} old summaries`);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('[MessageSummarization] Error cleaning up old summaries:', error);
      return 0;
    }
  }
}






