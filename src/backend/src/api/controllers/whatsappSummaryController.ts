import { Request, Response } from 'express';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppContact from '../../models/WhatsAppContact';
import WhatsAppBaileysService from '../../services/whatsappBaileysService';
import WAHAService from '../../services/wahaService';
import WhatsAppSummarizationService from '../../services/whatsappSummarizationService';
import {
  GroupInfo,
  MessageData,
  SummaryRequest,
  GroupSummaryData,
  ApiResponse,
  MessagesResponse,
  SummaryGenerationOptions
} from '../../types/whatsappSummary';

const summarizationService = new WhatsAppSummarizationService();

/**
 * Get available WhatsApp groups for summary generation
 */
export const getAvailableGroups = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Summary] Fetching available groups...');
    
    // First try to get groups from WAHA service (modern, more reliable)
    let serviceGroups: any[] = [];
    try {
      const wahaService = WAHAService.getInstance();
      serviceGroups = await wahaService.getGroups('default'); // Use default session
      console.log(`[WhatsApp Summary] Got ${serviceGroups.length} groups from WAHA service`);
    } catch (wahaError) {
      console.warn('[WhatsApp Summary] WAHA service failed, trying Baileys fallback:', wahaError);
      
      // Fallback to Baileys service
      try {
        const baileysService = WhatsAppBaileysService.getInstance();
        serviceGroups = baileysService.getGroups();
        console.log(`[WhatsApp Summary] Got ${serviceGroups.length} groups from Baileys fallback`);
      } catch (baileysError) {
        console.warn('[WhatsApp Summary] Both WAHA and Baileys failed:', baileysError);
      }
    }
    
    // Get groups from database (fallback and enhancement)
    const dbGroups = await WhatsAppMessage.aggregate([
      {
        $match: {
          'metadata.isGroup': true,
          'metadata.groupName': { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$metadata.groupName',
          groupId: { $first: '$metadata.groupId' },
          lastActivity: { $max: '$timestamp' },
          totalMessages: { $sum: 1 },
          recentMessages: {
            $sum: {
              $cond: {
                if: { $gte: ['$timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                then: 1,
                else: 0
              }
            }
          },
          participantCount: { $addToSet: '$from' }
        }
      },
      {
        $project: {
          _id: 0,
          id: { $ifNull: ['$groupId', { $toString: '$_id' }] },
          name: '$_id',
          lastActivity: '$lastActivity',
          messageCount: '$recentMessages',
          totalMessages: '$totalMessages',
          participantCount: { $size: '$participantCount' }
        }
      },
      {
        $match: {
          messageCount: { $gt: 0 } // Only include groups with recent activity
        }
      },
      {
        $sort: { messageCount: -1 } // Sort by most active groups first
      }
    ]);
    
    console.log(`[WhatsApp Summary] Got ${dbGroups.length} groups from database`);
    
    // Merge service groups with database groups (prioritize service data)
    const groupsMap = new Map<string, GroupInfo>();
    
    // Add database groups first
    dbGroups.forEach((group) => {
      groupsMap.set(group.name, {
        id: group.id,
        name: group.name,
        participantCount: group.participantCount,
        messageCount: group.messageCount,
        lastActivity: group.lastActivity
      });
    });
    
    // Override with service groups if available (they have more accurate real-time data)
    serviceGroups.forEach((group) => {
      const dbGroup = groupsMap.get(group.name);
      groupsMap.set(group.name, {
        id: group.id,
        name: group.name,
        participantCount: group.participantCount || dbGroup?.participantCount || 0,
        messageCount: dbGroup?.messageCount || 0,
        lastActivity: dbGroup?.lastActivity
      });
    });
    
    const enhancedGroups = Array.from(groupsMap.values());
    
    console.log(`[WhatsApp Summary] Returning ${enhancedGroups.length} enhanced groups`);
    
    res.json({
      success: true,
      data: enhancedGroups.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
    } as ApiResponse<GroupInfo[]>);
  } catch (error) {
    console.error('[WhatsApp Summary] Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WhatsApp groups'
    } as ApiResponse);
  }
};

/**
 * Get messages for a specific group and time range
 */
export const getGroupMessages = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { start, end, page = 1, limit = 1000 } = req.query;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      } as ApiResponse);
    }
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end timestamps are required'
      } as ApiResponse);
    }
    
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      } as ApiResponse);
    }
    
    // Get group info from WhatsApp service
    const whatsappService = WhatsAppBaileysService.getInstance();
    const groups = whatsappService.getGroups();
    const groupInfo = groups.find(g => g.id === groupId);
    
    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    // Query messages from database
    const query = {
      'metadata.isGroup': true,
      $or: [
        { 'metadata.groupName': groupInfo.name },
        { 'metadata.groupId': groupId }
      ],
      timestamp: {
        $gte: startDate,
        $lte: endDate
      },
      isIncoming: true // Only incoming messages for summary
    };
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const [messages, totalCount] = await Promise.all([
      WhatsAppMessage.find(query)
        .populate('contactId')
        .sort({ timestamp: 1 }) // Chronological order
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WhatsAppMessage.countDocuments(query)
    ]);
    
    // Transform to MessageData format
    const messageData: MessageData[] = messages.map(msg => ({
      id: msg.messageId || msg._id.toString(),
      message: msg.message || '',
      timestamp: msg.timestamp,
      type: msg.type || 'text',
      senderName: (msg.contactId as any)?.name || `Contact ${msg.from}`,
      senderPhone: msg.from
    }));
    
    const hasMore = totalCount > skip + messages.length;
    
    res.json({
      success: true,
      data: messageData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        hasMore
      },
      groupInfo: {
        id: groupInfo.id,
        name: groupInfo.name,
        participantCount: groupInfo.participantCount || 0
      },
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    } as MessagesResponse);
    
  } catch (error) {
    console.error('[WhatsApp Summary] Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    } as ApiResponse);
  }
};

/**
 * Generate daily summary for a specific group
 */
export const generateDailySummary = async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      date,
      timezone = 'UTC',
      options = {}
    }: {
      groupId: string;
      date: string;
      timezone?: string;
      options?: Partial<SummaryGenerationOptions>;
    } = req.body;
    
    if (!groupId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Group ID and date are required'
      } as ApiResponse);
    }
    
    // Parse date and create day boundaries
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      } as ApiResponse);
    }
    
    // Create start and end of day in user's timezone
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get group info with fallbacks: Baileys -> WAHA -> Database
    const baileysService = WhatsAppBaileysService.getInstance();
    const baileysGroups = baileysService.getGroups();
    let groupInfo: any = baileysGroups.find((g: any) => g.id === groupId);

    if (!groupInfo) {
      try {
        const wahaService = WAHAService.getInstance();
        const wahaGroups = await wahaService.getGroups('default');
        const wahaMatch = wahaGroups.find((g: any) => g.id === groupId);
        if (wahaMatch) {
          groupInfo = { id: wahaMatch.id, name: wahaMatch.name, participantCount: wahaMatch.participantCount };
        }
      } catch (wahaError) {
        console.warn('[WhatsApp Summary] WAHA group lookup failed:', wahaError);
      }
    }

    if (!groupInfo) {
      // Fallback to database for last known group name by groupId
      const lastMsg = await WhatsAppMessage.findOne({
        'metadata.isGroup': true,
        'metadata.groupId': groupId,
        'metadata.groupName': { $exists: true, $nin: [null, ''] }
      })
        .sort({ timestamp: -1 })
        .lean();

      if (lastMsg?.metadata?.groupName) {
        groupInfo = { id: groupId, name: lastMsg.metadata.groupName, participantCount: 0 };
      }
    }

    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    // Fetch messages for the day
    const messages = await WhatsAppMessage.find({
      'metadata.isGroup': true,
      $or: [
        { 'metadata.groupName': groupInfo.name },
        { 'metadata.groupId': groupId }
      ],
      timestamp: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      isIncoming: true,
      message: { $ne: '', $exists: true }
    })
    .populate('contactId')
    .sort({ timestamp: 1 })
    .lean();
    
    if (messages.length === 0) {
      return res.json({
        success: true,
        data: {
          groupId,
          groupName: groupInfo.name,
          timeRange: { start: startOfDay, end: endOfDay },
          totalMessages: 0,
          activeParticipants: 0,
          senderInsights: [],
          overallSummary: 'No messages found for this day.',
          topKeywords: [],
          topEmojis: [],
          activityPeaks: [],
          messageTypes: { text: 0, image: 0, video: 0, audio: 0, document: 0, other: 0 },
          processingStats: { processingTimeMs: 0, messagesAnalyzed: 0, participantsFound: 0 }
        } as GroupSummaryData
      } as ApiResponse<GroupSummaryData>);
    }
    
    // Transform to MessageData format
    const messageData: MessageData[] = messages.map(msg => ({
      id: msg.messageId || msg._id.toString(),
      message: msg.message || '',
      timestamp: msg.timestamp,
      type: msg.type || 'text',
      senderName: (msg.contactId as any)?.name || `Contact ${msg.from}`,
      senderPhone: msg.from
    }));
    
    // Generate summary
    const summary = await summarizationService.generateGroupSummary(
      groupId,
      groupInfo.name,
      messageData,
      {
        start: startOfDay,
        end: endOfDay,
        label: `${date}`,
        type: 'custom'
      },
      { ...options, timezone }
    );
    
    res.json({
      success: true,
      data: summary
    } as ApiResponse<GroupSummaryData>);
    
  } catch (error) {
    console.error('[WhatsApp Summary] Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary: ' + (error as Error).message
    } as ApiResponse);
  }
};

/**
 * Generate summary for current day (today)
 */
export const generateTodaySummary = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Summary] generateTodaySummary called with body:', req.body);
    const { groupId, timezone = 'UTC' } = req.body;
    
    if (!groupId) {
      console.log('[WhatsApp Summary] generateTodaySummary error: No groupId provided');
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      } as ApiResponse);
    }
    
    // Use today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Forward to generateDailySummary with today's date
    req.body = { groupId, date: today, timezone };
    await generateDailySummary(req, res);
    
  } catch (error) {
    console.error('[WhatsApp Summary] Error generating today summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate today summary'
    } as ApiResponse);
  }
};

/**
 * Get available date ranges with message counts
 */
export const getAvailableDateRanges = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      } as ApiResponse);
    }
    
    // Get group info
    const whatsappService = WhatsAppBaileysService.getInstance();
    const groups = whatsappService.getGroups();
    const groupInfo = groups.find(g => g.id === groupId);
    
    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    // Get date ranges with message counts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dateRanges = [];
    
    // Today
    const today = WhatsAppSummarizationService.getTodayRange();
    const todayCount = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      $or: [
        { 'metadata.groupName': groupInfo.name },
        { 'metadata.groupId': groupId }
      ],
      timestamp: { $gte: today.start, $lte: today.end },
      isIncoming: true
    });
    
    dateRanges.push({ ...today, messageCount: todayCount });
    
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    
    const yesterdayCount = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      $or: [
        { 'metadata.groupName': groupInfo.name },
        { 'metadata.groupId': groupId }
      ],
      timestamp: { $gte: yesterdayStart, $lte: yesterdayEnd },
      isIncoming: true
    });
    
    dateRanges.push({
      start: yesterdayStart,
      end: yesterdayEnd,
      label: 'Yesterday',
      type: 'yesterday' as const,
      messageCount: yesterdayCount
    });
    
    // Last 24 hours
    const last24h = WhatsAppSummarizationService.getLast24HoursRange();
    const last24hCount = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      $or: [
        { 'metadata.groupName': groupInfo.name },
        { 'metadata.groupId': groupId }
      ],
      timestamp: { $gte: last24h.start, $lte: last24h.end },
      isIncoming: true
    });
    
    dateRanges.push({ ...last24h, messageCount: last24hCount });
    
    res.json({
      success: true,
      data: dateRanges
    } as ApiResponse);
    
  } catch (error) {
    console.error('[WhatsApp Summary] Error fetching date ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch date ranges'
    } as ApiResponse);
  }
};

/**
 * Get summary statistics for a group
 */
export const getGroupSummaryStats = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { days = 7 } = req.query;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      } as ApiResponse);
    }
    
    const whatsappService = WhatsAppBaileysService.getInstance();
    const groups = whatsappService.getGroups();
    const groupInfo = groups.find(g => g.id === groupId);
    
    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    const daysBack = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Get message statistics
    const [totalMessages, uniqueSenders, messageTypes] = await Promise.all([
      WhatsAppMessage.countDocuments({
        'metadata.isGroup': true,
        $or: [
          { 'metadata.groupName': groupInfo.name },
          { 'metadata.groupId': groupId }
        ],
        timestamp: { $gte: startDate },
        isIncoming: true
      }),
      
      WhatsAppMessage.distinct('from', {
        'metadata.isGroup': true,
        $or: [
          { 'metadata.groupName': groupInfo.name },
          { 'metadata.groupId': groupId }
        ],
        timestamp: { $gte: startDate },
        isIncoming: true
      }),
      
      WhatsAppMessage.aggregate([
        {
          $match: {
            'metadata.isGroup': true,
            $or: [
              { 'metadata.groupName': groupInfo.name },
              { 'metadata.groupId': groupId }
            ],
            timestamp: { $gte: startDate },
            isIncoming: true
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const typeStats = messageTypes.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        groupId,
        groupName: groupInfo.name,
        period: `Last ${daysBack} days`,
        totalMessages,
        activeSenders: uniqueSenders.length,
        messageTypes: {
          text: typeStats.text || typeStats.conversation || 0,
          image: typeStats.image || typeStats.imageMessage || 0,
          video: typeStats.video || typeStats.videoMessage || 0,
          audio: typeStats.audio || typeStats.audioMessage || 0,
          document: typeStats.document || typeStats.documentMessage || 0,
          // Calculate "other" types by summing all type counts and subtracting known types
          other: 0 // Temporarily disabled due to TypeScript build issues
        },
        averageMessagesPerDay: Math.round(Number(totalMessages) / Number(daysBack)),
        averageMessagesPerSender: uniqueSenders.length > 0 ? Math.round(Number(totalMessages) / Number(uniqueSenders.length)) : 0
      }
    } as ApiResponse);
    
  } catch (error) {
    console.error('[WhatsApp Summary] Error fetching group stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group statistics'
    } as ApiResponse);
  }
};