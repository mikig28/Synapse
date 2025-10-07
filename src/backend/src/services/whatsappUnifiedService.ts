/**
 * WhatsApp Unified Service
 * Combines WAHA service (monitoring/reading) with Enhanced Puppeteer (sending/media)
 * Provides complete WhatsApp Web functionality through a single interface
 */

import { EventEmitter } from 'events';
import WAHAService, { WAHAChat, WAHAMessage } from './wahaService';
import WhatsAppImageExtractor from './whatsappImageExtractor';

export interface UnifiedChat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: {
    text: string;
    timestamp: number;
    sender?: string;
  };
  unreadCount?: number;
  timestamp?: number;
  participantCount?: number;
  avatar?: string;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
}

export interface MessageContent {
  text?: string;
  media?: {
    type: 'image' | 'video' | 'document' | 'audio';
    url?: string;
    caption?: string;
    filename?: string;
  };
  replyTo?: string;
}

export interface UnifiedMessage {
  id: string;
  chatId: string;
  text?: string;
  timestamp: number;
  sender: {
    id: string;
    name?: string;
    isMe: boolean;
  };
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
  media?: {
    url?: string;
    filename?: string;
    mimeType?: string;
    size?: number;
    downloaded?: boolean;
  };
  replyTo?: {
    messageId: string;
    text: string;
    sender: string;
  };
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
  isForwarded?: boolean;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read';
}

export interface ChatSendOptions {
  chatId: string;
  content: MessageContent;
  sessionName?: string;
}

export interface MediaDownloadOptions {
  messageId: string;
  chatId: string;
  autoExtract?: boolean;
}

class WhatsAppUnifiedService extends EventEmitter {
  private static instance: WhatsAppUnifiedService;
  private wahaService: WAHAService;
  private puppeteerService: WhatsAppImageExtractor;
  private isInitialized = false;
  private enhancedPuppeteerEnabled = true; // Feature flag for enhanced Puppeteer features

  private constructor() {
    super();
    this.wahaService = WAHAService.getInstance();
    this.puppeteerService = new WhatsAppImageExtractor();
    
    // Forward WAHA events
    this.wahaService.on('message', (message) => {
      this.emit('message', this.convertWAHAMessage(message));
    });
    
    this.wahaService.on('auth_failure', (data) => {
      this.emit('auth_failure', data);
    });
    
    this.wahaService.on('authenticated', (data) => {
      this.emit('authenticated', data);
    });
  }

  static getInstance(): WhatsAppUnifiedService {
    if (!WhatsAppUnifiedService.instance) {
      WhatsAppUnifiedService.instance = new WhatsAppUnifiedService();
    }
    return WhatsAppUnifiedService.instance;
  }

  /**
   * Initialize both services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[WhatsApp Unified] Initializing services...');
    
    try {
      // Initialize WAHA service (primary for monitoring)
      await this.wahaService.initialize();
      
      // Initialize Puppeteer service (enhanced features)
      if (this.enhancedPuppeteerEnabled) {
        try {
          await this.puppeteerService.initialize();
          console.log('[WhatsApp Unified] ✅ Enhanced Puppeteer features enabled');
        } catch (error) {
          console.warn('[WhatsApp Unified] ⚠️ Enhanced Puppeteer features unavailable, using WAHA only:', error);
          this.enhancedPuppeteerEnabled = false;
        }
      }
      
      this.isInitialized = true;
      console.log('[WhatsApp Unified] ✅ Unified service initialized');
    } catch (error) {
      console.error('[WhatsApp Unified] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get all chats (groups + private) - unified interface
   */
  async getAllChats(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'conversationTimestamp' | 'name';
    sortOrder?: 'desc' | 'asc';
    includeArchived?: boolean;
  }): Promise<UnifiedChat[]> {
    console.log('[WhatsApp Unified] Fetching all chats (groups + private)...');
    
    try {
      // Get chats from WAHA (no filtering - get everything)
      const wahaChats = await this.wahaService.getChats(undefined, { // Use instance's defaultSession
        limit: options?.limit,
        offset: options?.offset,
        sortBy: 'id', // Fixed to only supported sortBy value
        sortOrder: options?.sortOrder
      });

      // Get groups separately to ensure we have everything
      const wahaGroups = await this.wahaService.getGroups(undefined, { // Use instance's defaultSession
        limit: options?.limit,
        offset: options?.offset,
        sortBy: options?.sortBy === 'name' ? 'subject' : (options?.sortBy as 'id' | 'subject'),
        sortOrder: options?.sortOrder
      });
      
      // Combine and deduplicate chats
      const allChats = [...wahaChats, ...wahaGroups];
      const uniqueChats = this.deduplicateChats(allChats);
      
      // Convert to unified format
      const unifiedChats = uniqueChats.map(chat => this.convertWAHAChat(chat));
      
      // Sort by timestamp (most recent first)
      unifiedChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      console.log(`[WhatsApp Unified] ✅ Retrieved ${unifiedChats.length} chats (${unifiedChats.filter(c => c.isGroup).length} groups, ${unifiedChats.filter(c => !c.isGroup).length} private)`);
      
      return unifiedChats;
    } catch (error) {
      console.error('[WhatsApp Unified] ❌ Failed to get all chats:', error);
      throw error;
    }
  }

  /**
   * Get private chats only
   */
  async getPrivateChats(options?: any): Promise<UnifiedChat[]> {
    const allChats = await this.getAllChats(options);
    return allChats.filter(chat => !chat.isGroup);
  }

  /**
   * Get group chats only
   */
  async getGroups(options?: any): Promise<UnifiedChat[]> {
    const allChats = await this.getAllChats(options);
    return allChats.filter(chat => chat.isGroup);
  }

  /**
   * Get messages for a specific chat
   */
  async getMessages(chatId: string, options?: {
    limit?: number;
    offset?: number;
    sessionName?: string;
  }): Promise<UnifiedMessage[]> {
    console.log(`[WhatsApp Unified] Getting messages for chat: ${chatId}`);
    
    try {
      const wahaMessages = await this.wahaService.getMessages(
        chatId, 
        options?.limit || 50, 
        options?.sessionName
      );
      
      const unifiedMessages = wahaMessages.map(msg => this.convertWAHAMessage(msg));
      
      console.log(`[WhatsApp Unified] ✅ Retrieved ${unifiedMessages.length} messages for chat ${chatId}`);
      return unifiedMessages;
    } catch (error) {
      console.error(`[WhatsApp Unified] ❌ Failed to get messages for chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Send message with enhanced capabilities
   */
  async sendMessage(options: ChatSendOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[WhatsApp Unified] Sending message to chat: ${options.chatId}`);
    
    try {
      if (options.content.text && !options.content.media) {
        // Send text message via WAHA
        const result = await this.wahaService.sendMessage(
          options.chatId,
          options.content.text,
          options.sessionName
        );
        
        return {
          success: true,
          messageId: result.id
        };
      } else if (options.content.media) {
        // Send media message via WAHA
        const result = await this.wahaService.sendMedia(
          options.chatId,
          options.content.media.url!,
          options.content.media.caption,
          options.sessionName
        );
        
        return {
          success: true,
          messageId: result.id
        };
      } else {
        throw new Error('Invalid message content');
      }
    } catch (error: any) {
      console.error(`[WhatsApp Unified] ❌ Failed to send message:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download media with enhanced capabilities
   */
  async downloadMedia(options: MediaDownloadOptions): Promise<{
    success: boolean;
    localPath?: string;
    metadata?: any;
    error?: string;
  }> {
    console.log(`[WhatsApp Unified] Downloading media for message: ${options.messageId}`);
    
    try {
      if (this.enhancedPuppeteerEnabled && options.autoExtract) {
        // Use enhanced Puppeteer for automatic extraction
        const result = await this.puppeteerService.extractImage(options.messageId, options.chatId);
        
        return {
          success: result.success,
          localPath: result.localPath,
          metadata: result.metadata,
          error: result.error
        };
      } else {
        // Fallback: return media URL from WAHA if available
        console.log('[WhatsApp Unified] Enhanced media download not available, using WAHA metadata only');
        return {
          success: false,
          error: 'Enhanced media download requires Puppeteer service'
        };
      }
    } catch (error: any) {
      console.error(`[WhatsApp Unified] ❌ Failed to download media:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    isReady: boolean;
    wahaStatus: any;
    puppeteerStatus: boolean;
    features: {
      canSendMessages: boolean;
      canDownloadMedia: boolean;
      realTimeUpdates: boolean;
    };
  }> {
    const wahaStatus = await this.wahaService.getStatus();
    
    let puppeteerLoggedIn = false;
    if (this.enhancedPuppeteerEnabled) {
      try {
        puppeteerLoggedIn = await this.puppeteerService.isLoggedIn();
      } catch (error) {
        console.warn('[WhatsApp Unified] Could not check Puppeteer status:', error);
      }
    }
    
    return {
      isReady: wahaStatus.isReady,
      wahaStatus,
      puppeteerStatus: puppeteerLoggedIn,
      features: {
        canSendMessages: wahaStatus.isReady,
        canDownloadMedia: this.enhancedPuppeteerEnabled && puppeteerLoggedIn,
        realTimeUpdates: wahaStatus.isReady
      }
    };
  }

  /**
   * Get QR code for authentication
   */
  async getQRCode(sessionName?: string): Promise<string> {
    return this.wahaService.getQRCode(sessionName);
  }

  // Private helper methods

  private convertWAHAChat(wahaChat: WAHAChat): UnifiedChat {
    return {
      id: wahaChat.id,
      name: wahaChat.name,
      isGroup: wahaChat.isGroup,
      lastMessage: wahaChat.lastMessage ? {
        text: wahaChat.lastMessage,
        timestamp: wahaChat.timestamp || Date.now(),
      } : undefined,
      timestamp: wahaChat.timestamp,
      participantCount: wahaChat.participantCount,
      // Enhanced properties (will be added later via Puppeteer)
      isPinned: false,
      isMuted: false,
      isArchived: false
    };
  }

  private convertWAHAMessage(wahaMessage: WAHAMessage): UnifiedMessage {
    return {
      id: wahaMessage.id,
      chatId: wahaMessage.chatId,
      text: wahaMessage.body,
      timestamp: wahaMessage.timestamp,
      sender: {
        id: wahaMessage.from,
        name: wahaMessage.contactName,
        isMe: wahaMessage.fromMe
      },
      type: this.detectMessageType(wahaMessage),
      media: wahaMessage.isMedia ? {
        url: undefined, // WAHA message doesn't include direct URL
        filename: undefined,
        mimeType: undefined,
        downloaded: false
      } : undefined,
      deliveryStatus: 'sent' // Default status since WAHA doesn't provide ack
    };
  }

  private detectMessageType(message: WAHAMessage): UnifiedMessage['type'] {
    if (message.type === 'image') return 'image';
    if (message.type === 'video') return 'video';
    if (message.type === 'audio') return 'audio';
    if (message.type === 'document') return 'document';
    if (message.body?.includes('System:')) return 'system';
    return 'text';
  }

  private deduplicateChats(chats: WAHAChat[]): WAHAChat[] {
    const seen = new Set<string>();
    return chats.filter(chat => {
      if (seen.has(chat.id)) {
        return false;
      }
      seen.add(chat.id);
      return true;
    });
  }
}

export default WhatsAppUnifiedService;