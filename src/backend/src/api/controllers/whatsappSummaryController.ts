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
    console.log('[WhatsApp Summary] Fetching available conversations...');

    const wahaService = WAHAService.getInstance();

    let chats: any[] = [];
    try {
      chats = await wahaService.getChats('default');
      console.log(`[WhatsApp Summary] Got ${chats.length} chats from WAHA service`);
    } catch (wahaError) {
      console.warn('[WhatsApp Summary] WAHA chats service failed:', wahaError);
    }

    const chatById = new Map<string, any>();
    const chatAlternates = new Map<string, any>();

    const registerAlternate = (key: string, value: any) => {
      if (!key) return;
      const lower = key.toLowerCase();
      if (!chatAlternates.has(lower)) {
        chatAlternates.set(lower, value);
      }
    };

    chats.forEach(chat => {
      if (!chat || !chat.id) return;
      chatById.set(chat.id, chat);

      if (typeof chat.id === 'string' && chat.id.includes('@')) {
        const bare = chat.id.split('@')[0];
        registerAlternate(`${bare}@s.whatsapp.net`, chat);
        registerAlternate(`${bare}@c.us`, chat);
        registerAlternate(`${bare}@g.us`, chat);
        registerAlternate(bare, chat);
      }

      if (chat.name && typeof chat.name === 'string') {
        registerAlternate(chat.name, chat);
      }
    });

    const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dbChats: Array<{
      id: string;
      isGroup: boolean;
      groupName?: string;
      lastActivity?: Date;
      totalMessages: number;
      messageCount: number;
      participantPhones?: string[];
      contactIds?: string[];
      firstContactId?: string;
    }> = await WhatsAppMessage.aggregate([
      {
        $addFields: {
          chatId: {
            $cond: [
              { $eq: ['$metadata.isGroup', true] },
              { $ifNull: ['$metadata.groupId', '$to'] },
              { $ifNull: ['$to', '$from'] }
            ]
          },
          activityTimestamp: { $ifNull: ['$timestamp', '$createdAt'] },
          isGroup: { $eq: ['$metadata.isGroup', true] }
        }
      },
      {
        $match: {
          chatId: { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$chatId',
          isGroup: { $first: '$isGroup' },
          groupName: { $first: '$metadata.groupName' },
          lastActivity: { $max: '$activityTimestamp' },
          totalMessages: { $sum: 1 },
          recentMessages: {
            $sum: {
              $cond: [
                { $gte: ['$activityTimestamp', recentThreshold] },
                1,
                0
              ]
            }
          },
          participantPhones: { $addToSet: '$from' },
          contactIds: { $addToSet: '$contactId' },
          firstContactId: { $first: '$contactId' }
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          isGroup: 1,
          groupName: 1,
          lastActivity: 1,
          totalMessages: 1,
          messageCount: '$recentMessages',
          participantPhones: 1,
          contactIds: 1,
          firstContactId: 1
        }
      },
      {
        $match: {
          messageCount: { $gt: 0 }
        }
      },
      {
        $sort: { messageCount: -1 }
      }
    ]);

    console.log(`[WhatsApp Summary] Got ${dbChats.length} active conversations from database`);

    const uniqueContactIds = new Set<string>();
    dbChats.forEach(chat => {
      if (!chat.isGroup && Array.isArray(chat.contactIds)) {
        chat.contactIds.forEach(id => {
          if (id) uniqueContactIds.add(String(id));
        });
      }
    });

    const contacts = uniqueContactIds.size > 0
      ? await WhatsAppContact.find({ _id: { $in: Array.from(uniqueContactIds) } })
          .select('name phoneNumber avatar totalMessages lastMessage lastMessageTimestamp')
          .lean()
      : [];

    const contactsById = new Map<string, any>();
    const contactsByPhone = new Map<string, any>();
    contacts.forEach(contact => {
      if (!contact) return;
      contactsById.set(String(contact._id), contact);
      if (contact.phoneNumber) {
        contactsByPhone.set(String(contact.phoneNumber), contact);
      }
    });

    const normalizeId = (id: string): string => {
      if (!id) return id;
      if (!id.includes('@')) return id;
      const [bare, domain] = id.split('@');
      if (!domain) return id;
      if (domain.startsWith('g.')) {
        return `${bare}@g.us`;
      }
      if (domain.startsWith('s.') || domain.startsWith('c.')) {
        return `${bare}@s.whatsapp.net`;
      }
      return id;
    };

    const enhancedGroups: GroupInfo[] = dbChats.map(chat => {
      const normalizedId = normalizeId(chat.id);
      const bareId = typeof normalizedId === 'string' && normalizedId.includes('@')
        ? normalizedId.split('@')[0]
        : normalizedId;

      const serviceChat = chatById.get(chat.id)
        || chatById.get(normalizedId)
        || chatAlternates.get((chat.id || '').toLowerCase())
        || chatAlternates.get((normalizedId || '').toLowerCase())
        || (chat.groupName ? chatAlternates.get(String(chat.groupName).toLowerCase()) : undefined);

      const isGroup = chat.isGroup === true
        || serviceChat?.isGroup === true
        || (typeof normalizedId === 'string' && normalizedId.includes('@g.us'));

      const contactCandidate = !isGroup
        ? (() => {
            const byId = chat.firstContactId ? contactsById.get(String(chat.firstContactId)) : undefined;
            if (byId) return byId;
            if (bareId && contactsByPhone.has(bareId)) return contactsByPhone.get(bareId);
            return undefined;
          })()
        : undefined;

      const participantBase = Array.isArray(chat.participantPhones)
        ? chat.participantPhones.filter(Boolean).length
        : 0;

      const participantCount = isGroup
        ? serviceChat?.participantCount || participantBase || 0
        : Math.max(2, participantBase || (contactCandidate ? 2 : 1));

      const phoneNumber = !isGroup
        ? contactCandidate?.phoneNumber || bareId || undefined
        : undefined;

      const displayName = isGroup
        ? serviceChat?.name || chat.groupName || normalizedId
        : contactCandidate?.name || serviceChat?.name || bareId || normalizedId;

      const avatarUrl = isGroup
        ? serviceChat?.picture
        : contactCandidate?.avatar;

      return {
        id: serviceChat?.id || normalizedId,
        name: displayName,
        participantCount,
        messageCount: chat.messageCount,
        totalMessages: chat.totalMessages,
        lastActivity: chat.lastActivity,
        isGroup,
        chatType: isGroup ? 'group' : 'private',
        phoneNumber,
        avatarUrl
      } as GroupInfo;
    });

    const sortedGroups = enhancedGroups.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));

    console.log(`[WhatsApp Summary] Returning ${sortedGroups.length} conversations with recent activity`);

    res.json({
      success: true,
      data: sortedGroups
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
      options = {},
      chatType
    }: {
      groupId: string;
      date: string;
      timezone?: string;
      options?: Partial<SummaryGenerationOptions>;
      chatType?: 'group' | 'private';
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

    const requestedChatType = chatType as 'group' | 'private' | undefined;

    const wahaService = WAHAService.getInstance();
    let serviceChats: any[] = [];
    try {
      serviceChats = await wahaService.getChats('default');
      console.log(`[WhatsApp Summary] Loaded ${serviceChats.length} chats from WAHA service for context resolution`);
    } catch (chatErr) {
      console.warn('[WhatsApp Summary] Failed to load chats from WAHA service:', chatErr);
    }

    const serviceChatIndex = new Map<string, any>();
    const registerChatKey = (key: string | undefined | null, chat: any) => {
      if (!key) return;
      const normalized = String(key).trim();
      if (!normalized) return;
      serviceChatIndex.set(normalized, chat);
      serviceChatIndex.set(normalized.toLowerCase(), chat);
    };

    serviceChats.forEach(chat => {
      if (!chat || !chat.id) return;
      registerChatKey(chat.id, chat);
      if (typeof chat.id === 'string' && chat.id.includes('@')) {
        const bare = chat.id.split('@')[0];
        registerChatKey(bare, chat);
        registerChatKey(`${bare}@s.whatsapp.net`, chat);
        registerChatKey(`${bare}@c.us`, chat);
        registerChatKey(`${bare}@g.us`, chat);
      }
      if (chat.name) {
        registerChatKey(chat.name, chat);
      }
    });

    const normalizeChatId = (value: string): string => {
      if (!value) return value;
      const trimmed = value.trim();
      if (!trimmed.includes('@')) return trimmed;
      const [bare, domain] = trimmed.split('@');
      if (!domain) return trimmed;
      if (domain.startsWith('g.')) return `${bare}@g.us`;
      if (domain.startsWith('s.') || domain.startsWith('c.')) return `${bare}@s.whatsapp.net`;
      return trimmed;
    };

    const candidateIds = new Set<string>();
    const candidateNames = new Set<string>();
    const candidateContactIds = new Set<string>();

    const addCandidateId = (value?: string | null) => {
      if (!value) return;
      const normalized = normalizeChatId(String(value));
      candidateIds.add(normalized);
      if (normalized.includes('@')) {
        const bare = normalized.split('@')[0];
        candidateIds.add(bare);
      }
    };

    const addCandidateName = (value?: string | null) => {
      if (!value) return;
      const trimmed = String(value).trim();
      if (!trimmed) return;
      candidateNames.add(trimmed);
      candidateNames.add(trimmed.toLowerCase());
    };

    addCandidateId(groupId);
    addCandidateName(req.body?.groupName);

    if (groupId && typeof groupId === 'string' && !groupId.includes('@')) {
      addCandidateId(`${groupId}@g.us`);
      addCandidateId(`${groupId}@s.whatsapp.net`);
      addCandidateId(`${groupId}@c.us`);
    }

    const serviceChat = serviceChatIndex.get(String(groupId))
      || serviceChatIndex.get(String(groupId).toLowerCase())
      || serviceChatIndex.get(normalizeChatId(String(groupId)))
      || serviceChatIndex.get(normalizeChatId(String(groupId)).toLowerCase())
      || (req.body?.groupName ? serviceChatIndex.get(String(req.body.groupName)) || serviceChatIndex.get(String(req.body.groupName).toLowerCase()) : undefined);

    if (serviceChat) {
      addCandidateId(serviceChat.id);
      addCandidateName(serviceChat.name);
    }

    const looksLikeGroupName = !String(groupId).includes('@') && /[^\d]/.test(String(groupId));
    if (looksLikeGroupName) {
      addCandidateName(String(groupId));
    }

    const dbFallback = await WhatsAppMessage.findOne({
      $or: [
        { 'metadata.groupId': { $in: Array.from(candidateIds) } },
        { 'metadata.groupName': { $in: Array.from(candidateNames) } },
        { to: { $in: Array.from(candidateIds) } },
        { from: { $in: Array.from(candidateIds) } }
      ]
    })
      .populate('contactId', 'name phoneNumber avatar')
      .sort({ timestamp: -1 })
      .lean();

    if (dbFallback) {
      addCandidateId((dbFallback as any)?.metadata?.groupId);
      addCandidateName((dbFallback as any)?.metadata?.groupName);
      addCandidateId((dbFallback as any)?.to);
      addCandidateId((dbFallback as any)?.from);
      const populatedContact = dbFallback.contactId as any;
      if (populatedContact?._id) {
        candidateContactIds.add(String(populatedContact._id));
      }
      if (populatedContact?.phoneNumber) {
        addCandidateId(populatedContact.phoneNumber);
      }
    }

    let isGroup = requestedChatType === 'group'
      ? true
      : requestedChatType === 'private'
        ? false
        : (serviceChat?.isGroup ?? ((dbFallback as any)?.metadata?.isGroup ?? (typeof groupId === 'string' && (groupId.includes('@g.us') || groupId.includes('-')))));

    const contactDoc = dbFallback && typeof dbFallback.contactId === 'object'
      ? (dbFallback.contactId as any)
      : undefined;

    let groupInfo: any = {
      id: serviceChat?.id || (dbFallback as any)?.metadata?.groupId || normalizeChatId(String(groupId)),
      name: serviceChat?.name || (dbFallback as any)?.metadata?.groupName || contactDoc?.name || String(groupId),
      participantCount: serviceChat?.participantCount || undefined,
      isGroup,
      phoneNumber: !isGroup ? (contactDoc?.phoneNumber || (typeof groupId === 'string' && groupId.includes('@') ? groupId.split('@')[0] : undefined)) : undefined
    };

    if (!groupInfo.name || !String(groupInfo.name).trim()) {
      groupInfo.name = isGroup ? (serviceChat?.name || String(groupId)) : (contactDoc?.phoneNumber || String(groupId));
    }

    if (!groupInfo.id) {
      groupInfo.id = normalizeChatId(String(groupId));
    }

    if (!groupInfo.participantCount) {
      groupInfo.participantCount = isGroup
        ? serviceChat?.participantCount || 0
        : 2;
    }

    addCandidateId(groupInfo.id);
    addCandidateName(groupInfo.name);
    if (!isGroup && groupInfo.phoneNumber) {
      addCandidateId(groupInfo.phoneNumber);
      addCandidateId(`${groupInfo.phoneNumber}@s.whatsapp.net`);
      addCandidateId(`${groupInfo.phoneNumber}@c.us`);
    }

    if (!groupInfo || !groupInfo.id) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      } as ApiResponse);
    }
    

    // Diagnostic: Check what fields exist in the database
    const diagnosticSample = await WhatsAppMessage.findOne(
      isGroup
        ? { 'metadata.isGroup': true }
        : { $or: [{ 'metadata.isGroup': { $exists: false } }, { 'metadata.isGroup': false }] }
    ).lean();
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
      console.log('[WhatsApp Summary] WARNING: No messages found in database for this chat type!');
    }

    const candidateIdArray = Array.from(candidateIds).filter(Boolean);
    const candidateNameArray = Array.from(candidateNames).filter(Boolean);
    const candidateContactArray = Array.from(candidateContactIds).filter(Boolean);

    const baseQuery: any = isGroup
      ? { 'metadata.isGroup': true }
      : { $or: [{ 'metadata.isGroup': { $exists: false } }, { 'metadata.isGroup': false }] };

    const dateRangeOr = [
      { createdAt: { $gte: utcStart, $lte: utcEnd } },
      { timestamp: { $gte: utcStart, $lte: utcEnd } }
    ];

    type QueryCandidate = { label: string; query: any };
    const queryCandidates: QueryCandidate[] = [];

    if (isGroup) {
      if (candidateIdArray.length > 0) {
        queryCandidates.push({
          label: 'Group metadata by id/to',
          query: {
            ...baseQuery,
            $and: [
              { $or: dateRangeOr },
              {
                $or: [
                  { 'metadata.groupId': { $in: candidateIdArray } },
                  { to: { $in: candidateIdArray } }
                ]
              }
            ]
          }
        });
      }

      if (candidateNameArray.length > 0) {
        queryCandidates.push({
          label: 'Group metadata by name',
          query: {
            ...baseQuery,
            $and: [
              { $or: dateRangeOr },
              { 'metadata.groupName': { $in: candidateNameArray } }
            ]
          }
        });
      }

      if (looksLikeGroupName) {
        queryCandidates.push({
          label: 'Provided groupId treated as name',
          query: {
            ...baseQuery,
            'metadata.groupName': groupId,
            $or: dateRangeOr
          }
        });
      }
    } else {
      const orClauses: any[] = [];
      if (candidateIdArray.length > 0) {
        orClauses.push({ to: { $in: candidateIdArray } });
        orClauses.push({ from: { $in: candidateIdArray } });
      }
      if (candidateContactArray.length > 0) {
        orClauses.push({ contactId: { $in: candidateContactArray } });
      }
      if (candidateNameArray.length > 0) {
        orClauses.push({ 'metadata.groupName': { $in: candidateNameArray } });
      }

      if (orClauses.length > 0) {
        queryCandidates.push({
          label: 'Private chat composite identifiers',
          query: {
            ...baseQuery,
            $and: [
              { $or: dateRangeOr },
              { $or: orClauses }
            ]
          }
        });
      }
    }

    queryCandidates.push({
      label: 'Legacy direct match',
      query: {
        ...baseQuery,
        $and: [
          { $or: dateRangeOr },
          {
            $or: [
              { to: groupId },
              { from: groupId },
              { 'metadata.groupName': groupId },
              { 'metadata.groupId': groupId }
            ]
          }
        ]
      }
    });

    let messages: any[] = [];
    let queryUsed = '';

    for (const candidate of queryCandidates) {
      if (messages.length > 0) break;
      const { label, query } = candidate;
      queryUsed = label;

      console.log(`[WhatsApp Summary] ${label} for chatId ${groupInfo.id}:`, JSON.stringify(query, null, 2));

      messages = await WhatsAppMessage.find(query)
        .populate('contactId')
        .sort({ createdAt: 1, timestamp: 1 })
        .lean();

      console.log(`[WhatsApp Summary] ${label} returned ${messages.length} messages`);

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

    if (!isGroup && messages.length > 0 && candidateIdArray.length > 0) {
      const validIds = new Set(candidateIdArray.map(normalizeChatId));
      messages = messages.filter(msg => {
        const fromId = normalizeChatId(String((msg as any).from || ''));
        const toId = normalizeChatId(String((msg as any).to || ''));
        const contactRef = (msg as any).contactId;
        const contactMatch = contactRef
          ? candidateContactArray.includes(String((contactRef as any)?._id ?? contactRef))
          : false;
        return validIds.has(fromId) || validIds.has(toId) || contactMatch;
      });
      console.log(`[WhatsApp Summary] Filtered messages to ${messages.length} items matching private chat identifiers`);
    }
    
    // If DB has no messages for this period, fall back to pulling directly from WAHA for this chat
    if (messages.length === 0) {
      try {
        console.log('[WhatsApp Summary] No DB messages found, trying WAHA direct fetch fallback');

        let fetchChatId = normalizeChatId(String(groupInfo.id || groupId));
        const serviceMatch = serviceChat
          || serviceChats.find((c: any) => String(c.id) === String(groupInfo.id))
          || serviceChats.find((c: any) => String(c.name) === String(groupInfo.name));

        if (serviceMatch?.id) {
          fetchChatId = normalizeChatId(String(serviceMatch.id));
        }

        const limit = 150;
        const wahaFetched = await withTimeout(
          wahaService.getMessages(fetchChatId, limit),
          Math.min(12000, timeLeft()),
          'WAHA messages fetch'
        );

        const normalized = (wahaFetched as any[])
          .filter((m: any) => m)
          .map((m: any) => {
            const rawTs = Number(m.timestamp);
            const tsMs = rawTs > 1000000000000 ? rawTs : rawTs * 1000;
            const tsDate = new Date(tsMs);
            return { ...m, _computedTimestamp: tsDate };
          })
          .filter((m: any) => m._computedTimestamp >= utcStart && m._computedTimestamp <= utcEnd)
          .sort((a: any, b: any) => a._computedTimestamp.getTime() - b._computedTimestamp.getTime());

        if (normalized.length > 0) {
          messages = normalized.map((m: any) => ({
            messageId: m.id || `${fetchChatId}-${m.timestamp}`,
            message: m.body || m.text || '',
            timestamp: m._computedTimestamp,
            createdAt: m._computedTimestamp,
            type: m.type || 'text',
            from: m.from,
            to: m.chatId || fetchChatId
          }));
          queryUsed = 'WAHA direct fetch';
          console.log(`[WhatsApp Summary] WAHA fallback produced ${messages.length} messages`);
        }
      } catch (wahaFallbackError: any) {
        console.warn('[WhatsApp Summary] WAHA fallback failed:', wahaFallbackError?.message || wahaFallbackError);
      }
    }

    // Fallback: if no messages found for the calendar day, try last 24h window
    if (messages.length === 0) {
      console.log('[WhatsApp Summary] No messages found for calendar day, trying 24h fallback');
      const fallbackWindow = getLast24HoursWindow(validTimezone);
      const { start: fallbackStart, end: fallbackEnd } = getQueryBounds(fallbackWindow);

      logTimeWindow(fallbackWindow, 'Fallback 24h');

      const fallbackDateOr = [
        { createdAt: { $gte: fallbackStart, $lte: fallbackEnd } },
        { timestamp: { $gte: fallbackStart, $lte: fallbackEnd } }
      ];

      const fallbackCandidates: QueryCandidate[] = [];

      if (isGroup) {
        if (candidateIdArray.length > 0) {
          fallbackCandidates.push({
            label: 'Fallback group id/to',
            query: {
              ...baseQuery,
              $and: [
                { $or: fallbackDateOr },
                {
                  $or: [
                    { 'metadata.groupId': { $in: candidateIdArray } },
                    { to: { $in: candidateIdArray } }
                  ]
                }
              ]
            }
          });
        }

        if (candidateNameArray.length > 0) {
          fallbackCandidates.push({
            label: 'Fallback group name',
            query: {
              ...baseQuery,
              $and: [
                { $or: fallbackDateOr },
                { 'metadata.groupName': { $in: candidateNameArray } }
              ]
            }
          });
        }
      } else {
        const fallbackOr: any[] = [];
        if (candidateIdArray.length > 0) {
          fallbackOr.push({ to: { $in: candidateIdArray } });
          fallbackOr.push({ from: { $in: candidateIdArray } });
        }
        if (candidateContactArray.length > 0) {
          fallbackOr.push({ contactId: { $in: candidateContactArray } });
        }
        if (candidateNameArray.length > 0) {
          fallbackOr.push({ 'metadata.groupName': { $in: candidateNameArray } });
        }

        if (fallbackOr.length > 0) {
          fallbackCandidates.push({
            label: 'Fallback private identifiers',
            query: {
              ...baseQuery,
              $and: [
                { $or: fallbackDateOr },
                { $or: fallbackOr }
              ]
            }
          });
        }
      }

      fallbackCandidates.push({
        label: 'Fallback legacy direct match',
        query: {
          ...baseQuery,
          $and: [
            { $or: fallbackDateOr },
            {
              $or: [
                { to: groupInfo.id },
                { from: groupInfo.id },
                { 'metadata.groupName': groupInfo.name },
                { 'metadata.groupId': groupInfo.id }
              ]
            }
          ]
        }
      });

      for (const candidate of fallbackCandidates) {
        if (messages.length > 0) break;
        console.log(`[WhatsApp Summary] ${candidate.label}:`, JSON.stringify(candidate.query, null, 2));
        messages = await WhatsAppMessage.find(candidate.query)
          .populate('contactId')
          .sort({ createdAt: 1, timestamp: 1 })
          .lean();
        console.log(`[WhatsApp Summary] ${candidate.label} returned ${messages.length} messages`);
      }

      if (!isGroup && messages.length > 0 && candidateIdArray.length > 0) {
        const validIds = new Set(candidateIdArray.map(normalizeChatId));
        messages = messages.filter(msg => {
          const fromId = normalizeChatId(String((msg as any).from || ''));
          const toId = normalizeChatId(String((msg as any).to || ''));
          const contactRef = (msg as any).contactId;
          const contactMatch = contactRef
            ? candidateContactArray.includes(String((contactRef as any)?._id ?? contactRef))
            : false;
          return validIds.has(fromId) || validIds.has(toId) || contactMatch;
        });
      }

      if (messages.length === 0) {
        console.log('[WhatsApp Summary] No messages found even with fallback, returning empty summary');
        return res.json({
          success: true,
          data: {
            groupId: groupInfo.id,
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
      groupInfo.id,
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
        groupInfo.id,
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
    const { groupId, timezone = 'Asia/Jerusalem', chatType } = req.body;
    
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
    req.body = { groupId, date: todayDateString, timezone: validTimezone, chatType };
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
