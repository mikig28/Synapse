import { Request, Response } from 'express';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppContact from '../../models/WhatsAppContact';
import WhatsAppBaileysService from '../../services/whatsappBaileysService';
import WAHAService from '../../services/wahaService';
import WhatsAppSummarizationService from '../../services/whatsappSummarizationService';
import WhatsAppAISummarizationService from '../../services/whatsappAISummarizationService';
import {
  GroupInfo,
  MessageData,
  SummaryRequest,
  GroupSummaryData,
  ApiResponse,
  MessagesResponse,
  SummaryGenerationOptions
} from '../../types/whatsappSummary';
import { 
  getLocalDayWindow, 
  getTodayWindow, 
  getYesterdayWindow, 
  getLast24HoursWindow, 
  parseTimezone, 
  logTimeWindow,
  getQueryBounds
} from '../../utils/timeWindow';

// Use AI-enhanced summarization service if available, otherwise fall back to basic
const summarizationService = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY
  ? new WhatsAppAISummarizationService()
  : new WhatsAppSummarizationService();

console.log('[WhatsApp Summary] Using', summarizationService.constructor.name);

/**
 * Generate daily summary for a specific group (FIXED VERSION)
 */
export const generateDailySummaryFixed = async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      date,
      timezone = 'Asia/Jerusalem',
      options = {}
    }: {
      groupId: string;
      date: string;
      timezone?: string;
      options?: Partial<SummaryGenerationOptions>;
    } = req.body;
    
    if (!groupId || !date) {
      console.log('[WhatsApp Summary] generateDailySummary validation failed:', { groupId, date });
      return res.status(400).json({
        success: false,
        error: 'Group ID and date are required'
      } as ApiResponse);
    }
    
    // Parse and validate timezone
    const validTimezone = parseTimezone(timezone);
    console.log(`[WhatsApp Summary] Processing request for groupId: ${groupId}, date: ${date}, timezone: ${validTimezone}`);
    
    // Create timezone-safe day boundaries
    let timeWindow;
    try {
      timeWindow = getLocalDayWindow(validTimezone, date);
      logTimeWindow(timeWindow, 'Daily Summary');
    } catch (error) {
      console.error('[WhatsApp Summary] Invalid date or timezone:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      } as ApiResponse);
    }
    
    const { start: utcStart, end: utcEnd } = getQueryBounds(timeWindow);
    console.log(`[WhatsApp Summary] Query time range: ${utcStart.toISOString()} to ${utcEnd.toISOString()}`);
    
    // Get group info with fallbacks
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
      // Fallback to database for last known group name
      const lastMsg = await WhatsAppMessage.findOne({
        'metadata.isGroup': true,
        $or: [
          { 'metadata.groupId': groupId },
          { 'metadata.groupName': groupId }
        ]
      })
        .sort({ timestamp: -1, createdAt: -1 })
        .lean();

      if (lastMsg) {
        groupInfo = { 
          id: groupId, 
          name: (lastMsg as any)?.metadata?.groupName || groupId, 
          participantCount: 0 
        };
      }
    }

    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    console.log(`[WhatsApp Summary] Found group info:`, groupInfo);
    
    // FIXED: Build comprehensive query for group messages
    // Don't filter by isIncoming to get ALL messages
    // Try multiple field combinations
    const queries = [
      // Query 1: By groupId with flexible timestamp
      {
        'metadata.isGroup': true,
        'metadata.groupId': groupId,
        $or: [
          { timestamp: { $gte: utcStart, $lte: utcEnd } },
          { createdAt: { $gte: utcStart, $lte: utcEnd } }
        ]
      },
      // Query 2: By groupName with flexible timestamp
      {
        'metadata.isGroup': true,
        'metadata.groupName': groupInfo.name,
        $or: [
          { timestamp: { $gte: utcStart, $lte: utcEnd } },
          { createdAt: { $gte: utcStart, $lte: utcEnd } }
        ]
      },
      // Query 3: By to field (legacy)
      {
        to: { $regex: groupId },
        $or: [
          { timestamp: { $gte: utcStart, $lte: utcEnd } },
          { createdAt: { $gte: utcStart, $lte: utcEnd } }
        ]
      },
      // Query 4: Broader search without metadata.isGroup requirement
      {
        $or: [
          { 'metadata.groupId': groupId },
          { 'metadata.groupName': groupInfo.name },
          { to: { $regex: groupId } }
        ],
        $or: [
          { timestamp: { $gte: utcStart, $lte: utcEnd } },
          { createdAt: { $gte: utcStart, $lte: utcEnd } }
        ]
      }
    ];

    let messages: any[] = [];
    let successfulQuery = -1;

    // Try each query until we find messages
    for (let i = 0; i < queries.length && messages.length === 0; i++) {
      const query = queries[i];
      console.log(`[WhatsApp Summary] Trying Query ${i + 1}:`, JSON.stringify(query, null, 2));
      
      try {
        messages = await WhatsAppMessage.find(query)
          .populate('contactId')
          .sort({ timestamp: -1, createdAt: -1 })
          .limit(1000)
          .lean();
        
        // Reverse to get chronological order
        messages = messages.reverse();
        
        if (messages.length > 0) {
          successfulQuery = i + 1;
          console.log(`[WhatsApp Summary] Query ${successfulQuery} successful: ${messages.length} messages found`);
          
          // Log sample message for debugging
          const sampleMsg = messages[0];
          console.log(`[WhatsApp Summary] Sample message structure:`, {
            id: sampleMsg._id,
            from: sampleMsg.from,
            to: sampleMsg.to,
            timestamp: sampleMsg.timestamp,
            createdAt: sampleMsg.createdAt,
            metadata: sampleMsg.metadata,
            isIncoming: sampleMsg.isIncoming,
            message: sampleMsg.message?.substring(0, 50)
          });
          
          // Count unique senders
          const uniqueSenders = new Set(messages.map(m => m.from));
          console.log(`[WhatsApp Summary] Found ${uniqueSenders.size} unique participants`);
        }
      } catch (queryError) {
        console.error(`[WhatsApp Summary] Query ${i + 1} failed:`, queryError);
      }
    }
    
    // If still no messages, try a very broad fallback
    if (messages.length === 0) {
      console.log('[WhatsApp Summary] All queries failed, trying ultimate fallback');
      
      const fallbackWindow = getLast24HoursWindow(validTimezone);
      const { start: fallbackStart, end: fallbackEnd } = getQueryBounds(fallbackWindow);
      
      const ultimateFallback = {
        $or: [
          { 'metadata.groupId': groupId },
          { 'metadata.groupName': { $regex: groupInfo.name, $options: 'i' } },
          { to: { $regex: groupId } },
          { from: { $regex: groupId } }
        ]
      };
      
      console.log('[WhatsApp Summary] Ultimate fallback query:', JSON.stringify(ultimateFallback, null, 2));
      
      try {
        messages = await WhatsAppMessage.find(ultimateFallback)
          .populate('contactId')
          .sort({ timestamp: -1, createdAt: -1 })
          .limit(100)
          .lean();
        
        // Filter by date in memory if we got results
        if (messages.length > 0) {
          messages = messages.filter(msg => {
            const msgDate = msg.timestamp || msg.createdAt;
            return msgDate >= fallbackStart && msgDate <= fallbackEnd;
          });
          
          messages = messages.reverse();
          console.log(`[WhatsApp Summary] Ultimate fallback found ${messages.length} messages after filtering`);
        }
      } catch (error) {
        console.error('[WhatsApp Summary] Ultimate fallback failed:', error);
      }
    }

    // Return empty summary if no messages
    if (messages.length === 0) {
      console.log('[WhatsApp Summary] No messages found for this group and date range');
      return res.json({
        success: true,
        data: {
          groupId,
          groupName: groupInfo.name,
          timeRange: { start: timeWindow.localStart, end: timeWindow.localEnd },
          totalMessages: 0,
          activeParticipants: 0,
          senderInsights: [],
          overallSummary: 'No messages found for this period.',
          topKeywords: [],
          topEmojis: [],
          activityPeaks: [],
          messageTypes: { text: 0, image: 0, video: 0, audio: 0, document: 0, other: 0 },
          processingStats: { processingTimeMs: 0, messagesAnalyzed: 0, participantsFound: 0 }
        } as GroupSummaryData
      } as ApiResponse<GroupSummaryData>);
    }
    
    // Transform messages to MessageData format with better sender name handling
    const messageData: MessageData[] = messages.map(msg => {
      // Extract sender name from various sources
      let senderName = 'Unknown';
      if (msg.contactId && typeof msg.contactId === 'object') {
        senderName = (msg.contactId as any).name || 
                    (msg.contactId as any).pushName || 
                    (msg.contactId as any).number ||
                    senderName;
      }
      if (senderName === 'Unknown' && msg.from) {
        // Try to extract from phone number
        senderName = msg.from.split('@')[0] || msg.from;
      }
      
      return {
        id: msg.messageId || msg._id.toString(),
        message: msg.message || msg.caption || '',
        timestamp: msg.timestamp || msg.createdAt,
        type: msg.type || 'text',
        senderName,
        senderPhone: msg.from || 'unknown'
      };
    });
    
    // Count unique participants
    const uniqueParticipants = new Set(messageData.map(m => m.senderPhone));
    console.log(`[WhatsApp Summary] Processing ${messageData.length} messages from ${uniqueParticipants.size} participants`);
    
    // Generate summary
    const summary = await summarizationService.generateGroupSummary(
      groupId,
      groupInfo.name,
      messageData,
      {
        start: timeWindow.localStart,
        end: timeWindow.localEnd,
        label: timeWindow.label || `${date}`,
        type: 'custom'
      },
      { ...options, timezone: validTimezone }
    );
    
    console.log(`[WhatsApp Summary] Summary generated successfully: ${summary.totalMessages} messages, ${summary.activeParticipants} participants`);
    
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