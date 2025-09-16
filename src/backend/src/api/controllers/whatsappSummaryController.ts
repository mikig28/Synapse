import { Request, Response } from 'express';
import WhatsAppMessage from '../../models/WhatsAppMessage';
import WhatsAppContact from '../../models/WhatsAppContact';
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
      console.warn('[WhatsApp Summary] WAHA service failed:', wahaError);
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
          lastActivity: { $max: { $ifNull: ['$timestamp', '$createdAt'] } },
          totalMessages: { $sum: 1 },
          recentMessages: {
            $sum: {
              $cond: {
                if: { 
                  $gte: [
                    { $ifNull: ['$timestamp', '$createdAt'] },
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
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
    const wahaService = WAHAService.getInstance();
    const groups = await wahaService.getGroups();
    const groupInfo = groups.find(g => g.id === groupId);
    
    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    // Query messages from database (may be empty if not persisted with expected metadata)
    const query = {
      'metadata.isGroup': true,
      $or: [
        { 'metadata.groupName': groupInfo.name },
        { 'metadata.groupId': groupId },
        { 'metadata.groupName': groupId }
      ],
      $and: [
        {
          $or: [
            { timestamp: { $gte: startDate, $lte: endDate } },
            { createdAt: { $gte: startDate, $lte: endDate } }
          ]
        }
      ],
      isIncoming: true
    } as any;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    let [messages, totalCount] = await Promise.all([
      WhatsAppMessage.find(query)
        .populate('contactId')
        .sort({ timestamp: 1 }) // Chronological order
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WhatsAppMessage.countDocuments(query)
    ]);

    let messageData: MessageData[] = [];

    if (messages.length === 0) {
      // Fallback: use in-memory Baileys store
      console.log('[WhatsApp Summary] No DB messages found, falling back to in-memory store for group:', groupId);
      try {
        // Fetch a large batch from memory and filter by date
        const inMem = await wahaService.getMessages(groupId, 5000);
        const normalized = (inMem as any[])
          .filter((m: any) => m && (m.chatId === groupId || m.id || true))
          .filter((m: any) => {
            // Convert timestamp which may be in seconds to Date
            const ts = typeof m.timestamp === 'number' && m.timestamp < 2e10
              ? new Date(m.timestamp * 1000)
              : new Date(m.timestamp);
            // Keep only incoming (not from me)
            const incoming = m.fromMe === false || m.isIncoming === true;
            return incoming && ts >= startDate && ts <= endDate;
          })
          .sort((a: any, b: any) => {
            const ta = typeof a.timestamp === 'number' && a.timestamp < 2e10 ? a.timestamp * 1000 : +new Date(a.timestamp);
            const tb = typeof b.timestamp === 'number' && b.timestamp < 2e10 ? b.timestamp * 1000 : +new Date(b.timestamp);
            return ta - tb;
          });

        totalCount = normalized.length;
        const paged = normalized.slice(skip, skip + limitNum);
        messages = paged as any[];

        messageData = paged.map((m: any) => {
          const tsDate = typeof m.timestamp === 'number' && m.timestamp < 2e10 ? new Date(m.timestamp * 1000) : new Date(m.timestamp);
          return {
            id: m.id || m.key?.id || `${m.chatId || groupId}-${tsDate.getTime()}`,
            message: m.body || m.text || m.message || '',
            timestamp: tsDate,
            type: m.type || 'text',
            senderName: m.contactName || m.from || 'Unknown',
            senderPhone: m.from || ''
          } as MessageData;
        });
      } catch (fallbackErr) {
        console.warn('[WhatsApp Summary] In-memory fallback failed:', (fallbackErr as Error).message);
      }
    }

    if (messages.length > 0 && messageData.length === 0) {
      // Transform DB result
      messageData = messages.map((msg: any) => ({
        id: msg.messageId || msg._id.toString(),
        message: msg.message || '',
        timestamp: msg.timestamp,
        type: msg.type || 'text',
        senderName: (msg.contactId as any)?.name || `Contact ${msg.from}`,
        senderPhone: msg.from
      }));
    }
    
    const hasMore = totalCount > skip + (messages?.length || 0);
    
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

    // Enforce an overall time budget to avoid 120s proxy timeouts (Render)
    const overallTimeoutMs = Number(process.env.WHATSAPP_SUMMARY_TIMEOUT_MS || 60000);
    const startedAt = Date.now();
    const timeLeft = () => Math.max(1000, overallTimeoutMs - (Date.now() - startedAt));
    const withTimeout = async <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
      return await Promise.race<Promise<T>>([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
      ]) as T;
    };
    
// Get group info from WAHA, then fallbacks to DB/name inference
    const wahaService = WAHAService.getInstance();
    const wahaGroups = await wahaService.getGroups('default');
    let groupInfo: any = wahaGroups.find((g: any) => g.id === groupId);

    // Additional fallbacks when the frontend provided a group name instead of an ID
    const looksLikeGroupName = !String(groupId).includes('@') && /[^\d]/.test(String(groupId));

    if (!groupInfo && looksLikeGroupName) {
      // Treat the provided groupId as a group name directly
      groupInfo = { id: String(groupId), name: String(groupId), participantCount: 0 };
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

      const dbGroupName = (lastMsg as any)?.metadata?.groupName as string | undefined;
      if (typeof dbGroupName === 'string' && dbGroupName.length > 0) {
        groupInfo = { id: groupId, name: dbGroupName, participantCount: 0 };
      }
    }

    if (!groupInfo) {
      // Final DB fallback: try by group name equal to provided id
      const lastByName = await WhatsAppMessage.findOne({
        'metadata.isGroup': true,
        'metadata.groupName': groupId
      })
        .sort({ timestamp: -1 })
        .lean();
      if (lastByName) {
        groupInfo = { id: lastByName.metadata?.groupId || String(groupId), name: lastByName.metadata?.groupName || String(groupId), participantCount: 0 };
      }
    }

    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    

    // Diagnostic: Check what fields exist in the database
    const diagnosticSample = await WhatsAppMessage.findOne({ 'metadata.isGroup': true }).lean();
    if (diagnosticSample) {
      console.log('[WhatsApp Summary] Sample message structure:', {
        hasTimestamp: !!diagnosticSample.timestamp,
        hasCreatedAt: !!diagnosticSample.createdAt,
        timestampType: typeof diagnosticSample.timestamp,
        createdAtType: typeof diagnosticSample.createdAt,
        timestampValue: diagnosticSample.timestamp,
        createdAtValue: diagnosticSample.createdAt
      });
    } else {
      console.log('[WhatsApp Summary] WARNING: No group messages found in database!');
    }

    // Build comprehensive query for group messages
    // Try both createdAt and timestamp to be robust across historical data variants
    const baseQuery: any = {
      'metadata.isGroup': true
    };

    const dateRangeOr = [
      { createdAt: { $gte: utcStart, $lte: utcEnd } },
      { timestamp: { $gte: utcStart, $lte: utcEnd } }
    ];
    // Try multiple approaches to find group messages
    const queries = [
      // Primary: Direct group ID match
      { 
        ...baseQuery, 
        'metadata.groupId': groupId,
        $or: dateRangeOr
      },
      // Secondary: Group name match (if we have groupInfo)
      ...(groupInfo ? [{ 
        ...baseQuery, 
        'metadata.groupName': groupInfo.name,
        $or: dateRangeOr
      }] : []),
      // Also try when the provided identifier is actually a group name
      { 
        ...baseQuery,
        'metadata.groupName': groupId,
        $or: dateRangeOr
      },
      // Tertiary: Legacy approach for backwards compatibility
      { 
        ...baseQuery,
        to: groupId,
        $or: dateRangeOr
      }
    ];

    let messages: any[] = [];
    let queryUsed = '';

    // Try each query until we find messages
    for (let i = 0; i < queries.length && messages.length === 0; i++) {
      const query = queries[i];
      queryUsed = `Query ${i + 1}`;
      
      console.log(`[WhatsApp Summary] ${queryUsed} for groupId ${groupId}:`, JSON.stringify(query, null, 2));
      
      messages = await WhatsAppMessage.find(query)
        .populate('contactId')
        .sort({ createdAt: 1, timestamp: 1 })
        .lean();
        
      console.log(`[WhatsApp Summary] ${queryUsed} returned ${messages.length} messages`);
      
      if (messages.length > 0) {
        const firstMsg = messages[0];
        const lastMsg = messages[messages.length - 1];
        const firstTs = (firstMsg as any).timestamp || (firstMsg as any).createdAt;
        const lastTs = (lastMsg as any).timestamp || (lastMsg as any).createdAt;
        if (firstTs && lastTs) {
          console.log(`[WhatsApp Summary] Messages time range: ${new Date(firstTs).toISOString()} to ${new Date(lastTs).toISOString()}`);
        }
      }
    }
    
    // If DB has no messages for this period, fall back to pulling directly from WAHA for this group
    if (messages.length === 0) {
      try {
        console.log('[WhatsApp Summary] No DB messages found, trying WAHA direct fetch fallback');
        const wahaService = WAHAService.getInstance();
        // Pull a smaller batch and filter client-side by our UTC window; cap by remaining budget
        const limit = 150; // smaller for faster response
        const wahaFetch = wahaService.getMessages(groupId, limit, 'default');
        const raw = await withTimeout(wahaFetch, Math.min(20000, timeLeft()), 'WAHA messages fetch');
        const startMs = utcStart.getTime();
        const endMs = utcEnd.getTime();
        const filtered = raw.filter((m: any) => {
          const tsNum = Number(m?.timestamp);
          if (!isFinite(tsNum)) return false;
          // WAHA timestamps are seconds; convert to ms if needed
          const tsMs = tsNum > 1000000000000 ? tsNum : tsNum * 1000;
          return tsMs >= startMs && tsMs <= endMs;
        });
        console.log(`[WhatsApp Summary] WAHA fallback found ${filtered.length} messages in time range`);
        if (filtered.length > 0) {
          // Normalize to the minimal fields we use downstream
          messages = filtered.map((m: any) => ({
            messageId: m.id,
            message: m.body || '',
            // Store as Date for downstream sorting/mapping
            timestamp: new Date((Number(m.timestamp) > 1000000000000 ? Number(m.timestamp) : Number(m.timestamp) * 1000) || Date.now()),
            createdAt: new Date((Number(m.timestamp) > 1000000000000 ? Number(m.timestamp) : Number(m.timestamp) * 1000) || Date.now()),
            type: m.type || 'text',
            from: m.from
          }));
          queryUsed = 'WAHA direct fetch';
        }
      } catch (wahaFallbackError: any) {
        console.warn('[WhatsApp Summary] WAHA fallback failed:', wahaFallbackError?.message || wahaFallbackError);
      }
    }
    
    // Fallback: if no messages found for the calendar day, use last 24 hours
    if (messages.length === 0) {
      console.log('[WhatsApp Summary] No messages found for calendar day, trying 24h fallback');
      const fallbackWindow = getLast24HoursWindow(validTimezone);
      const { start: fallbackStart, end: fallbackEnd } = getQueryBounds(fallbackWindow);
      
      logTimeWindow(fallbackWindow, 'Fallback 24h');
      
      const fallbackQuery = {
        'metadata.isGroup': true,
        $and: [
          {
            $or: [
              { 'metadata.groupId': groupId },
              ...(groupInfo ? [{ 'metadata.groupName': groupInfo.name }] : []),
              { 'metadata.groupName': groupId },
              { to: groupId }
            ]
          },
          {
            $or: [
              { timestamp: { $gte: fallbackStart, $lte: fallbackEnd } },
              { createdAt: { $gte: fallbackStart, $lte: fallbackEnd } }
            ]
          }
        ]
      };
      
      console.log('[WhatsApp Summary] Fallback query:', JSON.stringify(fallbackQuery, null, 2));
      
      messages = await WhatsAppMessage.find(fallbackQuery)
        .populate('contactId')
        .sort({ createdAt: 1, timestamp: 1 })
        .lean();
        
      console.log(`[WhatsApp Summary] Fallback query returned ${messages.length} messages`);

      // If still no messages, return an empty summary
      if (messages.length === 0) {
        console.log('[WhatsApp Summary] No messages found even with fallback, returning empty summary');
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

      // Use fallback time range
      timeWindow = fallbackWindow;
    }
    
    // Transform to MessageData format
    const messageData: MessageData[] = messages.map((msg: any) => ({
      id: msg.messageId || msg._id.toString(),
      message: msg.message || '',
      timestamp: (msg as any).timestamp || (msg as any).createdAt,
      type: msg.type || 'text',
      senderName: (msg.contactId as any)?.name || `Contact ${msg.from}`,
      senderPhone: msg.from
    }));
    
    // Generate summary
    console.log(`[WhatsApp Summary] Generating summary for ${messages.length} messages using ${queryUsed || 'successful query'}`);
    
    let summary: GroupSummaryData;
    try {
      summary = await withTimeout(
        summarizationService.generateGroupSummary(
      groupId,
      groupInfo.name,
      messageData,
      {
        start: timeWindow.localStart,
        end: timeWindow.localEnd,
        label: timeWindow.label || `${date}`,
        type: 'custom'
      },
      { 
        ...options, 
        timezone: validTimezone,
        // Auto-language selection with per-speaker attribution enabled by default
        targetLanguage: (options as any)?.targetLanguage || 'auto',
        speakerAttribution: (options as any)?.speakerAttribution ?? true,
        maxSpeakerAttributions: (options as any)?.maxSpeakerAttributions ?? 5
      }
        ),
        Math.min(30000, timeLeft()),
        'Summarization'
      );
    } catch (summTimeoutErr) {
      console.warn('[WhatsApp Summary] AI summarization timed out, falling back to basic summary:', (summTimeoutErr as Error).message);
      const basicService = new WhatsAppSummarizationService();
      summary = await basicService.generateGroupSummary(
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
    }
    
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

/**
 * Generate summary for current day (today)
 */
export const generateTodaySummary = async (req: Request, res: Response) => {
  try {
    console.log('[WhatsApp Summary] generateTodaySummary called with body:', req.body);
    const { groupId, timezone = 'Asia/Jerusalem' } = req.body;
    
    if (!groupId) {
      console.log('[WhatsApp Summary] generateTodaySummary error: No groupId provided');
      return res.status(400).json({
        success: false,
        error: 'Group ID is required'
      } as ApiResponse);
    }
    
    // Parse and validate timezone
    const validTimezone = parseTimezone(timezone);
    
    // Get today's date in the user's timezone to avoid timezone confusion
    const todayWindow = getTodayWindow(validTimezone);
    const todayDateString = todayWindow.localStart.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`[WhatsApp Summary] generateTodaySummary using date: ${todayDateString} in timezone: ${validTimezone}`);
    
    // Forward to generateDailySummary with today's date
    req.body = { groupId, date: todayDateString, timezone: validTimezone };
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
    const wahaService = WAHAService.getInstance();
    const groups = await wahaService.getGroups('default');
    let groupInfo = groups.find(g => g.id === groupId);

    if (!groupInfo) {
      const lastMsg = await WhatsAppMessage.findOne({
        'metadata.isGroup': true,
        $or: [
          { 'metadata.groupId': groupId },
          { 'metadata.groupName': groupId }
        ]
      }).sort({ timestamp: -1 }).lean();

      if (lastMsg) {
        groupInfo = {
          id: lastMsg.metadata?.groupId || String(groupId),
          name: lastMsg.metadata?.groupName || String(groupId),
          participantCount: 0
        } as any;
      }
    }
    
    if (!groupInfo) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      } as ApiResponse);
    }
    
    const dateRanges = [] as any[];

    const tz = 'Asia/Jerusalem';

    // Today
    const today = getTodayWindow(tz);
    const { start: todayStart, end: todayEnd } = getQueryBounds(today);
    const todayCount = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      $and: [
        {
          $or: [
            { 'metadata.groupName': groupInfo.name },
            { 'metadata.groupId': groupId },
            { 'metadata.groupName': groupId }
          ]
        },
        {
          $or: [
            { createdAt: { $gte: todayStart, $lte: todayEnd } },
            { timestamp: { $gte: todayStart, $lte: todayEnd } }
          ]
        }
      ],
      isIncoming: true
    });

    dateRanges.push({ ...today, messageCount: todayCount });
    
    // Yesterday
    const yesterday = getYesterdayWindow(tz);
    const { start: yesterdayStart, end: yesterdayEnd } = getQueryBounds(yesterday);

    const yesterdayCount = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      $and: [
        {
          $or: [
            { 'metadata.groupName': groupInfo.name },
            { 'metadata.groupId': groupId },
            { 'metadata.groupName': groupId }
          ]
        },
        {
          $or: [
            { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } },
            { timestamp: { $gte: yesterdayStart, $lte: yesterdayEnd } }
          ]
        }
      ],
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
    const last24h = getLast24HoursWindow(tz);
    const { start: last24hStart, end: last24hEnd } = getQueryBounds(last24h);
    const last24hCount = await WhatsAppMessage.countDocuments({
      'metadata.isGroup': true,
      $and: [
        {
          $or: [
            { 'metadata.groupName': groupInfo.name },
            { 'metadata.groupId': groupId },
            { 'metadata.groupName': groupId }
          ]
        },
        {
          $or: [
            { createdAt: { $gte: last24hStart, $lte: last24hEnd } },
            { timestamp: { $gte: last24hStart, $lte: last24hEnd } }
          ]
        }
      ],
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
 * Debug endpoint to diagnose message query issues
 */
export const debugMessages = async (req: Request, res: Response) => {
  try {
    const { groupId, date, timezone = 'Asia/Jerusalem' } = req.query;
    
    if (!groupId || !date) {
      return res.status(400).json({
        success: false,
        error: 'groupId and date are required'
      });
    }
    
    const validTimezone = parseTimezone(timezone as string);
    const timeWindow = getLocalDayWindow(validTimezone, date as string);
    const { start: utcStart, end: utcEnd } = getQueryBounds(timeWindow);
    
    // Test different query approaches
    const queries = [
      { 
        name: 'Group ID + metadata.isGroup',
        query: {
          'metadata.isGroup': true,
          'metadata.groupId': groupId,
          timestamp: { $gte: utcStart, $lte: utcEnd }
        }
      },
      {
        name: 'to field (legacy)',
        query: {
          to: groupId,
          timestamp: { $gte: utcStart, $lte: utcEnd }
        }
      },
      {
        name: 'All messages in time range',
        query: {
          timestamp: { $gte: utcStart, $lte: utcEnd }
        }
      }
    ];
    
    const results = [];
    
    for (const { name, query } of queries) {
      const count = await WhatsAppMessage.countDocuments(query);
      const sample = await WhatsAppMessage.find(query).limit(3).lean();
      
      results.push({
        queryName: name,
        query,
        matchCount: count,
        sampleMessages: sample.map(msg => ({
          id: msg._id,
          from: msg.from,
          to: msg.to,
          timestamp: msg.timestamp,
          message: msg.message.substring(0, 100),
          metadata: msg.metadata,
          isIncoming: msg.isIncoming
        }))
      });
    }
    
    res.json({
      success: true,
      debugInfo: {
        groupId,
        date,
        timezone: validTimezone,
        timeWindow: {
          localStart: timeWindow.localStart.toISOString(),
          localEnd: timeWindow.localEnd.toISOString(),
          utcStart: utcStart.toISOString(),
          utcEnd: utcEnd.toISOString()
        },
        queryResults: results
      }
    });
    
  } catch (error) {
    console.error('[WhatsApp Summary] Debug error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed: ' + (error as Error).message
    });
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
    
    const wahaService = WAHAService.getInstance();
    const groups = await wahaService.getGroups('default');
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
        $and: [
          {
            $or: [
              { 'metadata.groupName': groupInfo.name },
              { 'metadata.groupId': groupId },
              { 'metadata.groupName': groupId }
            ]
          },
          {
            $or: [
              { timestamp: { $gte: startDate } },
              { createdAt: { $gte: startDate } }
            ]
          },
          { isIncoming: true }
        ]
      }),
      
      WhatsAppMessage.distinct('from', {
        'metadata.isGroup': true,
        $and: [
          {
            $or: [
              { 'metadata.groupName': groupInfo.name },
              { 'metadata.groupId': groupId },
              { 'metadata.groupName': groupId }
            ]
          },
          {
            $or: [
              { timestamp: { $gte: startDate } },
              { createdAt: { $gte: startDate } }
            ]
          },
          { isIncoming: true }
        ]
      }),
      
      WhatsAppMessage.aggregate([
        {
          $match: {
            'metadata.isGroup': true,
            $and: [
              {
                $or: [
                  { 'metadata.groupName': groupInfo.name },
                  { 'metadata.groupId': groupId },
                  { 'metadata.groupName': groupId }
                ]
              },
              {
                $or: [
                  { timestamp: { $gte: startDate } },
                  { createdAt: { $gte: startDate } }
                ]
              },
              { isIncoming: true }
            ]
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