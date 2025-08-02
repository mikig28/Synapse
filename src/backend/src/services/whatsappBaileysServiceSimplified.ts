import { EventEmitter } from 'events';
import makeWASocket, { WASocket, useMultiFileAuthState, DisconnectReason, MessageUpsertType } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode';
import qrTerminal from 'qrcode-terminal';
import fs from 'fs-extra';
import path from 'path';
import WhatsAppMessage, { IWhatsAppMessage } from '../models/WhatsAppMessage';
import { WhatsAppConnectionManager, WhatsAppErrorClassifier, WhatsAppHealthMonitor } from './whatsappConnectionManager';

export interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  timestamp?: number;
  participantCount?: number;
  description?: string;
}

export interface SimpleWhatsAppMessage {
  messageId: string;
  from: string;
  to: string;
  message: string;
  timestamp: Date;
  type: string;
  status: string;
  isIncoming: boolean;
  contactId: string;
}

export interface WhatsAppStatus {
  status: string;
  isReady: boolean;
  isClientReady: boolean;
  groupsCount: number;
  privateChatsCount: number;
  messagesCount: number;
  monitoredKeywords: string[];
  qrAvailable: boolean;
  timestamp: string;
  circuitState?: any;
  healthStatus?: boolean;
}

/**
 * Simplified WhatsApp Baileys Service with Circuit Breaker Pattern
 * Reduced from 1600+ lines to ~500 lines with better reliability
 */
class WhatsAppBaileysServiceSimplified extends EventEmitter {
  private static instance: WhatsAppBaileysServiceSimplified | null = null;
  private socket: WASocket | null = null;
  
  // Core state
  private isReady = false;
  private isClientReady = false;
  private connectionStatus: string = 'disconnected';
  private qrString: string | null = null;
  private qrDataUrl: string | null = null;

  // Data storage
  private groups: WhatsAppChat[] = [];
  private privateChats: WhatsAppChat[] = [];
  private messages: Map<string, SimpleWhatsAppMessage[]> = new Map();
  private monitoredKeywords: string[] = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];

  // Connection management
  private connectionManager: WhatsAppConnectionManager;
  private healthMonitor: WhatsAppHealthMonitor;
  private connectionTimer: NodeJS.Timeout | null = null;

  // Configuration
  private readonly authDir = './baileys_auth_info';
  private readonly chatDataFile = './baileys_chat_data.json';
  private readonly MAX_MESSAGES_PER_CHAT = 50; // Reduced from 100
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private readonly INITIALIZATION_TIMEOUT = 120000; // 2 minutes

  constructor() {
    super();
    this.connectionManager = new WhatsAppConnectionManager();
    this.healthMonitor = new WhatsAppHealthMonitor();
    this.setupConnectionManager();
    this.setupHealthMonitor();
  }

  public static getInstance(): WhatsAppBaileysServiceSimplified {
    if (!WhatsAppBaileysServiceSimplified.instance) {
      WhatsAppBaileysServiceSimplified.instance = new WhatsAppBaileysServiceSimplified();
    }
    return WhatsAppBaileysServiceSimplified.instance;
  }

  private setupConnectionManager(): void {
    this.connectionManager.on('stateChange', (state) => {
      console.log('[WhatsApp] Circuit breaker state:', state);
      this.emit('circuitStateChange', state);
      
      // Auto-retry when circuit allows it
      if (state.state === 'HALF_OPEN' && !this.isReady) {
        setTimeout(() => {
          if (this.connectionManager.canAttemptConnection()) {
            this.initialize();
          }
        }, 1000);
      }
    });
  }

  private setupHealthMonitor(): void {
    this.healthMonitor.on('healthCheck', async (data) => {
      if (this.socket && this.isClientReady) {
        try {
          await this.socket.sendPresenceUpdate('available');
        } catch (error) {
          this.healthMonitor.emit('healthFailure', { error });
        }
      }
    });

    this.healthMonitor.on('healthFailure', (data) => {
      console.log('[WhatsApp] Health check failed:', data.error.message);
      if (!this.healthMonitor.isHealthy()) {
        console.log('[WhatsApp] Service unhealthy - triggering reconnection');
        this.handleConnectionFailure(data.error);
      }
    });
  }

  async initialize(): Promise<void> {
    // Check circuit breaker
    if (!this.connectionManager.canAttemptConnection()) {
      const state = this.connectionManager.getState();
      console.log(`[WhatsApp] ⏸️ Connection blocked by circuit breaker. Next attempt in ${Math.ceil(state.timeUntilNextAttempt / 1000)}s`);
      this.scheduleNextAttempt(state.timeUntilNextAttempt);
      return;
    }

    console.log('[WhatsApp] 🔄 Initializing WhatsApp service...');
    this.connectionStatus = 'initializing';
    this.isReady = false;
    this.isClientReady = false;
    this.qrString = null;
    this.qrDataUrl = null;

    this.emit('status', { ready: false, message: 'Initializing WhatsApp service...' });

    try {
      // Set initialization timeout
      const initPromise = this.initializeConnection();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timeout')), this.INITIALIZATION_TIMEOUT)
      );

      await Promise.race([initPromise, timeoutPromise]);
      
      console.log('[WhatsApp] ✅ Initialization successful');
      this.connectionManager.onConnectionSuccess();
      
    } catch (error) {
      console.error('[WhatsApp] ❌ Initialization failed:', (error as Error).message);
      this.handleConnectionFailure(error as Error);
    }
  }

  private async initializeConnection(): Promise<void> {
    // Ensure auth directory exists
    await fs.ensureDir(this.authDir);
    this.loadChatData();

    // Create auth state
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    // Create socket with simplified configuration
    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Synapse Bot', 'Chrome', '120.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      defaultQueryTimeoutMs: this.CONNECTION_TIMEOUT,
      connectTimeoutMs: this.CONNECTION_TIMEOUT,
      qrTimeout: 60000, // 1 minute QR timeout
      // Simplified getMessage handler
      getMessage: async () => undefined
    });

    // Set up event handlers
    this.setupEventHandlers(saveCreds);
  }

  private setupEventHandlers(saveCreds: () => Promise<void>): void {
    if (!this.socket) return;

    // Connection updates
    this.socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update);
    });

    // Credentials update
    this.socket.ev.on('creds.update', saveCreds);

    // Message handlers
    this.socket.ev.on('messages.upsert', (m) => {
      this.handleIncomingMessages(m);
    });

    // Chat handlers
    this.socket.ev.on('chats.upsert', (chats) => {
      this.processChatUpdates(chats);
    });

    // History sync
    this.socket.ev.on('messaging-history.set', (historySync) => {
      this.processHistorySync(historySync);
    });
  }

  private handleConnectionUpdate(update: any): void {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.handleQRCode(qr);
    }

    if (connection === 'close') {
      this.handleConnectionClose(lastDisconnect);
    } else if (connection === 'open') {
      this.handleConnectionOpen();
    }
  }

  private async handleQRCode(qr: string): Promise<void> {
    console.log('[WhatsApp] 🔗 QR Code received');
    this.qrString = qr;
    this.connectionStatus = 'qr_ready';

    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      this.qrDataUrl = qrDataUrl;
      this.emit('qr', { qr: qrDataUrl, status: 'qr_ready' });
      qrTerminal.generate(qr, { small: true });
    } catch (error) {
      console.error('[WhatsApp] ❌ QR code generation error:', error);
      this.qrDataUrl = null;
      this.emit('qr', { qr: qr, status: 'qr_ready' });
    }
  }

  private handleConnectionClose(lastDisconnect: any): void {
    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
    const error = lastDisconnect?.error || new Error('Connection closed');
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

    console.log('[WhatsApp] ❌ Connection closed:', error.message, 'shouldReconnect:', shouldReconnect);

    this.isReady = false;
    this.isClientReady = false;
    this.connectionStatus = 'disconnected';
    this.healthMonitor.stop();

    this.emit('status', { ready: false, message: `WhatsApp disconnected: ${error.message}` });

    if (shouldReconnect && WhatsAppErrorClassifier.isRetryableError(error)) {
      this.handleConnectionFailure(error);
    } else {
      console.log('[WhatsApp] 🔐 Logged out or non-retryable error - manual intervention required');
      if (WhatsAppErrorClassifier.shouldClearAuth(error)) {
        this.clearAuth();
      }
    }
  }

  private handleConnectionOpen(): void {
    console.log('[WhatsApp] ✅ Connection established successfully!');
    
    this.isReady = true;
    this.isClientReady = true;
    this.connectionStatus = 'connected';
    this.qrString = null;
    this.qrDataUrl = null;

    this.emit('status', {
      ready: true,
      authenticated: true,
      connected: true,
      message: 'WhatsApp connected successfully!',
      authMethod: 'qr'
    });

    this.emit('ready', { status: 'connected' });
    
    // Start health monitoring
    this.healthMonitor.start();
    
    // Initial chat discovery (simplified)
    setTimeout(() => {
      this.performInitialSync();
    }, 2000);
  }

  private handleConnectionFailure(error: Error): void {
    this.connectionManager.onConnectionFailure(error);
    
    // Clear auth if needed
    if (WhatsAppErrorClassifier.shouldClearAuth(error)) {
      console.log('[WhatsApp] 🧹 Clearing auth due to error type');
      this.clearAuth().catch(console.error);
    }

    // Schedule next attempt based on circuit breaker
    const state = this.connectionManager.getState();
    if (state.timeUntilNextAttempt > 0) {
      this.scheduleNextAttempt(state.timeUntilNextAttempt);
    }
  }

  private scheduleNextAttempt(delay: number): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
    }

    console.log(`[WhatsApp] ⏰ Next connection attempt in ${Math.ceil(delay / 1000)}s`);
    
    this.connectionTimer = setTimeout(() => {
      if (this.connectionManager.canAttemptConnection()) {
        this.initialize();
      }
    }, delay);
  }

  private async performInitialSync(): Promise<void> {
    if (!this.socket || !this.isReady) return;

    try {
      console.log('[WhatsApp] 🔄 Starting initial sync...');
      
      await this.socket.sendPresenceUpdate('available');
      
      // Simple chat discovery
      setTimeout(() => {
        this.emitChatsUpdate();
        this.saveSession();
      }, 3000);
      
    } catch (error) {
      console.error('[WhatsApp] ❌ Initial sync failed:', error);
    }
  }

  // Simplified message handling
  private async handleIncomingMessages(messageUpdate: { messages: any[]; type: MessageUpsertType }): Promise<void> {
    try {
      const { messages } = messageUpdate;
      if (!messages || !Array.isArray(messages)) return;

      for (const message of messages) {
        if (!message?.key || !message?.message || message.key.fromMe) continue;

        const messageText = this.extractMessageText(message);
        if (!messageText) continue;

        const whatsappMessage = {
          messageId: message.key.id || '',
          from: message.key.participant || message.key.remoteJid || '',
          to: message.key.remoteJid || '',
          message: messageText,
          timestamp: new Date(Number(message.messageTimestamp) * 1000 || Date.now()),
          type: Object.keys(message.message)[0] as any || 'text',
          status: 'received' as const,
          isIncoming: !message.key.fromMe,
          contactId: 'temp-contact-id'
        };

        this.addMessageToChat(whatsappMessage.to, whatsappMessage);
        this.emit('newMessage', whatsappMessage);
      }
    } catch (error) {
      console.error('[WhatsApp] ❌ Message handling error:', error);
    }
  }

  // Simplified chat processing
  private async processChatUpdates(chats: any[]): Promise<void> {
    try {
      for (const chat of chats) {
        if (!chat?.id) continue;

        const chatInfo: WhatsAppChat = {
          id: chat.id,
          name: chat.name || (chat.id.endsWith('@g.us') ? 'Unknown Group' : 'Unknown Contact'),
          isGroup: chat.id.endsWith('@g.us'),
          lastMessage: chat.lastMessage?.message || '',
          timestamp: chat.lastMessage?.messageTimestamp || Date.now(),
          participantCount: chat.participantCount,
          description: chat.description
        };

        if (chatInfo.isGroup) {
          const existingIndex = this.groups.findIndex(g => g.id === chat.id);
          if (existingIndex >= 0) {
            this.groups[existingIndex] = chatInfo;
          } else {
            this.groups.push(chatInfo);
          }
        } else {
          const existingIndex = this.privateChats.findIndex(c => c.id === chat.id);
          if (existingIndex >= 0) {
            this.privateChats[existingIndex] = chatInfo;
          } else {
            this.privateChats.push(chatInfo);
          }
        }
      }
      
      this.emitChatsUpdate();
    } catch (error) {
      console.error('[WhatsApp] ❌ Chat update error:', error);
    }
  }

  // Simplified history sync
  private processHistorySync(historySync: any): void {
    try {
      const { chats = [], messages = [] } = historySync;
      console.log(`[WhatsApp] 📚 Processing history: ${chats.length} chats, ${messages.length} messages`);
      
      // Process chats
      this.processChatUpdates(chats);
      
      // Process messages (simplified)
      for (const message of messages.slice(0, 100)) { // Limit to first 100 messages
        try {
          if (!message?.key?.remoteJid || !message?.message) continue;
          
          const messageText = this.extractMessageText(message);
          if (!messageText) continue;

          const whatsappMessage = {
            messageId: message.key.id || '',
            from: message.key.participant || message.key.remoteJid || '',
            to: message.key.remoteJid || '',
            message: messageText,
            timestamp: new Date(Number(message.messageTimestamp) * 1000 || Date.now()),
            type: Object.keys(message.message)[0] as any || 'text',
            status: 'received' as const,
            isIncoming: !message.key.fromMe,
            contactId: 'temp-contact-id'
          };

          this.addMessageToChat(whatsappMessage.to, whatsappMessage);
        } catch (error) {
          console.error('[WhatsApp] ❌ History message error:', error);
        }
      }
      
      this.emitChatsUpdate();
      this.saveChatData();
      
    } catch (error) {
      console.error('[WhatsApp] ❌ History sync error:', error);
    }
  }

  // Utility methods (simplified versions)
  private extractMessageText(message: any): string {
    try {
      if (!message?.message) return '';
      
      const msgContent = message.message;
      
      return msgContent.conversation ||
             msgContent.extendedTextMessage?.text ||
             msgContent.imageMessage?.caption ||
             msgContent.videoMessage?.caption ||
             msgContent.documentMessage?.caption ||
             '[Media]';
             
    } catch (error) {
      return '';
    }
  }

  private isMediaMessage(message: any): boolean {
    if (!message) return false;
    return !!(message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage);
  }

  private addMessageToChat(chatId: string, message: SimpleWhatsAppMessage): void {
    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }
    
    const chatMessages = this.messages.get(chatId)!;
    chatMessages.unshift(message);
    
    // Keep only MAX_MESSAGES_PER_CHAT messages
    if (chatMessages.length > this.MAX_MESSAGES_PER_CHAT) {
      chatMessages.splice(this.MAX_MESSAGES_PER_CHAT);
    }
  }

  private emitChatsUpdate(): void {
    this.emit('chats_updated', {
      groups: this.groups,
      privateChats: this.privateChats,
      groupsCount: this.groups.length,
      privateChatsCount: this.privateChats.length,
      timestamp: new Date().toISOString()
    });
  }

  // Data persistence (simplified)
  private loadChatData(): void {
    try {
      if (fs.existsSync(this.chatDataFile)) {
        const data = JSON.parse(fs.readFileSync(this.chatDataFile, 'utf8'));
        this.groups = data.groups || [];
        this.privateChats = data.privateChats || [];
        
        // Load messages
        if (data.messagesByChat) {
          this.messages.clear();
          for (const [chatId, msgs] of Object.entries(data.messagesByChat)) {
            this.messages.set(chatId, msgs as SimpleWhatsAppMessage[]);
          }
        }
        
        console.log(`[WhatsApp] 📥 Loaded ${this.groups.length} groups, ${this.privateChats.length} chats`);
      }
    } catch (error) {
      console.error('[WhatsApp] ❌ Failed to load chat data:', error);
    }
  }

  private saveChatData(): void {
    try {
      const messagesByChat: Record<string, SimpleWhatsAppMessage[]> = {};
      for (const [chatId, msgs] of this.messages.entries()) {
        messagesByChat[chatId] = msgs.slice(0, this.MAX_MESSAGES_PER_CHAT);
      }
      
      const chatData = {
        groups: this.groups,
        privateChats: this.privateChats,
        messagesByChat,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(this.chatDataFile, JSON.stringify(chatData, null, 2));
    } catch (error) {
      console.error('[WhatsApp] ❌ Failed to save chat data:', error);
    }
  }

  private saveSession(): void {
    // Session is automatically saved by Baileys auth state
    this.saveChatData();
  }

  // Public API methods (simplified)
  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.socket || !this.isReady) {
      return { success: false, error: 'WhatsApp client is not ready' };
    }
    
    try {
      const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const sentMessage = await this.socket.sendMessage(formattedTo, { text: message });
      
      return { 
        success: true, 
        messageId: sentMessage?.key?.id || undefined
      };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  getStatus(): WhatsAppStatus {
    const connectionState = this.connectionManager.getState();
    
    return {
      status: this.connectionStatus,
      isReady: this.isReady,
      isClientReady: this.isClientReady,
      groupsCount: this.groups.length,
      privateChatsCount: this.privateChats.length,
      messagesCount: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
      monitoredKeywords: this.monitoredKeywords,
      qrAvailable: !!this.qrString,
      timestamp: new Date().toISOString(),
      circuitState: connectionState,
      healthStatus: this.healthMonitor.isHealthy()
    };
  }

  getQRCode(): string | null {
    return this.qrDataUrl;
  }

  getGroups(): WhatsAppChat[] {
    return this.groups;
  }

  getPrivateChats(): WhatsAppChat[] {
    return this.privateChats;
  }

  getMessages(limit: number = 50, chatId?: string): SimpleWhatsAppMessage[] {
    if (chatId) {
      const chatMessages = this.messages.get(chatId) || [];
      return chatMessages.slice(0, limit);
    }
    
    const allMessages: SimpleWhatsAppMessage[] = [];
    for (const chatMessages of this.messages.values()) {
      allMessages.push(...chatMessages);
    }
    
    return allMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async clearAuth(): Promise<void> {
    try {
      console.log('[WhatsApp] 🧹 Clearing authentication data...');
      
      if (this.socket) {
        this.socket.end(new Error('Service restart requested'));
        this.socket = null;
      }
      
      if (fs.existsSync(this.authDir)) {
        await fs.remove(this.authDir);
      }
      
      this.isReady = false;
      this.isClientReady = false;
      this.connectionStatus = 'disconnected';
      this.qrString = null;
      this.qrDataUrl = null;
      this.groups = [];
      this.privateChats = [];
      this.messages.clear();
      
      this.connectionManager.reset();
      this.healthMonitor.stop();
      
      console.log('[WhatsApp] ✅ Authentication cleared successfully');
      
    } catch (error) {
      console.error('[WhatsApp] ❌ Error clearing auth:', error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    console.log('[WhatsApp] 🔄 Restarting service...');
    
    try {
      this.healthMonitor.stop();
      
      if (this.connectionTimer) {
        clearTimeout(this.connectionTimer);
        this.connectionTimer = null;
      }
      
      if (this.socket) {
        this.socket.end(new Error('Service restart requested'));
        this.socket = null;
      }
      
      this.isReady = false;
      this.isClientReady = false;
      this.connectionStatus = 'disconnected';
      this.qrString = null;
      this.qrDataUrl = null;
      
      this.connectionManager.reset();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.initialize();
      
    } catch (error) {
      console.error('[WhatsApp] ❌ Restart failed:', error);
      throw error;
    }
  }

  // Cleanup on shutdown
  public cleanup(): void {
    console.log('[WhatsApp] 🧹 Cleaning up service...');
    
    this.healthMonitor.stop();
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.socket) {
      this.socket.end(new Error('Service shutdown'));
      this.socket = null;
    }
    
    this.saveSession();
  }
}

export default WhatsAppBaileysServiceSimplified;