
import { makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket, MessageUpsertType, BaileysEventMap, Browsers } from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import * as qrcode from 'qrcode';
import * as qrTerminal from 'qrcode-terminal';
import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import pino from 'pino';

export interface WhatsAppMessage {
  id: string;
  body: string;
  from: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
  isGroup: boolean;
  groupName?: string;
  contactName: string;
  chatId: string;
  time: string;
  isMedia: boolean;
}

export interface WhatsAppChat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  isGroup: boolean;
  participantCount?: number;
  description?: string;
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
  fallbackMode?: boolean;
  fallbackReason?: string | null;
  lastSuccessfulConnection?: string | null;
  protocolErrors?: number;
  reconnectAttempts?: number;
}

class WhatsAppBaileysService extends EventEmitter {
  private static instance: WhatsAppBaileysService | null = null;
  private socket: WASocket | null = null;
  private isReady = false;
  private isClientReady = false;
  private connectionStatus = 'disconnected';
  private qrString: string | null = null;
  private qrDataUrl: string | null = null;
  private groups: WhatsAppChat[] = [];
  private privateChats: WhatsAppChat[] = [];
  private messages: Map<string, WhatsAppMessage[]> = new Map(); // Chat ID -> Messages
  private monitoredKeywords: string[] = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private authDir = './baileys_auth_info';
  private chatDataFile = './baileys_chat_data.json';
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private readonly MAX_MESSAGES_PER_CHAT = 100;
  private readonly MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly CONNECTION_TIMEOUT = 120000; // 120 seconds (increased)
  private readonly KEEP_ALIVE_INTERVAL = 30000; // 30 seconds (increased)
  
  // Added fields for pairing/diagnostics to satisfy TS and enable pairing flow
  private pairingSocket: WASocket | null = null;
  private pairingPhone: string = '';
  private pairingAuthPath: string = '';
  private AUTH_PATH: string = this.authDir; // Alias used by pairing code
  private logger = pino({ level: 'silent' });

  private constructor() {
    super();
    this.loadSession();
    // Ensure AUTH_PATH mirrors current authDir on construction
    this.AUTH_PATH = this.authDir;
    
    // Cleanup timers on process exit
    process.on('SIGINT', this.cleanup.bind(this));
    process.on('SIGTERM', this.cleanup.bind(this));
  }

  public static getInstance(): WhatsAppBaileysService {
    if (!WhatsAppBaileysService.instance) {
      WhatsAppBaileysService.instance = new WhatsAppBaileysService();
    }
    return WhatsAppBaileysService.instance;
  }

  private loadSession(): void {
    try {
      const sessionPath = path.join(process.cwd(), 'whatsapp_session_backup.json');
      if (fs.existsSync(sessionPath)) {
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        this.groups = sessionData.groups || [];
        this.privateChats = sessionData.privateChats || [];
        this.monitoredKeywords = sessionData.monitoredKeywords || this.monitoredKeywords;
        console.log(`📤 WhatsApp session loaded: ${this.groups.length} groups, ${this.privateChats.length} chats`);
      }
    } catch (error) {
      console.log('❌ Failed to load WhatsApp session:', (error as Error).message);
    }
  }

  private saveSession(): void {
    try {
      const sessionData = {
        groups: this.groups,
        privateChats: this.privateChats,
        monitoredKeywords: this.monitoredKeywords,
        timestamp: new Date().toISOString()
      };
      
      const sessionPath = path.join(process.cwd(), 'whatsapp_session_backup.json');
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
      console.log('💾 WhatsApp session saved successfully');
    } catch (error) {
      console.log('❌ Failed to save WhatsApp session:', (error as Error).message);
    }
  }

  private loadChatData(): void {
    try {
      if (fs.existsSync(this.chatDataFile)) {
        const chatData = JSON.parse(fs.readFileSync(this.chatDataFile, 'utf8'));
        this.groups = chatData.groups || [];
        this.privateChats = chatData.privateChats || [];
        
        // Load messages into Map structure
        this.messages.clear();
        if (chatData.messages && Array.isArray(chatData.messages)) {
          // Convert from old array format
          for (const msg of chatData.messages) {
            this.addMessageToChat(msg.chatId, msg);
          }
        } else if (chatData.messagesByChat) {
          // Load from new Map format
          for (const [chatId, msgs] of Object.entries(chatData.messagesByChat)) {
            this.messages.set(chatId, msgs as WhatsAppMessage[]);
          }
        }
        
        const totalMessages = Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0);
        console.log(`📥 Loaded chat data: ${this.groups.length} groups, ${this.privateChats.length} chats, ${totalMessages} messages`);
      }
    } catch (error) {
      console.log('⚠️ Failed to load chat data:', (error as Error).message);
    }
  }

  private saveChatData(): void {
    try {
      // Convert Map to Object for JSON serialization
      const messagesByChat: Record<string, WhatsAppMessage[]> = {};
      const entries = Array.from(this.messages.entries());
      for (const [chatId, msgs] of entries) {
        // Save only last MAX_MESSAGES_PER_CHAT messages per chat
        messagesByChat[chatId] = msgs.slice(0, this.MAX_MESSAGES_PER_CHAT);
      }
      
      const chatData = {
        groups: this.groups,
        privateChats: this.privateChats,
        messagesByChat,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(this.chatDataFile, JSON.stringify(chatData, null, 2));
      console.log('💾 Chat data saved successfully');
    } catch (error) {
      console.log('❌ Failed to save chat data:', (error as Error).message);
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing WhatsApp with Baileys...');
      console.log(`📊 Current state: attempts=${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
      
      this.isClientReady = false;
      this.isReady = false;
      this.connectionStatus = 'initializing';
      this.qrString = null;
      
      this.emit('status', { ready: false, message: 'Initializing WhatsApp with Baileys...' });
      
      // Ensure auth directory exists
      await fs.ensureDir(this.authDir);
      
      // Load existing chat data if available
      this.loadChatData();
      
      // Use multi-file auth state for persistent sessions
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      // Create WhatsApp socket with improved connection settings
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR code generation ourselves
        // Use pino logger with silent level to reduce noise
        logger: this.logger as any,
        // Updated browser info to match WhatsApp Web latest
        browser: Browsers.macOS('Chrome'),  // Use official Baileys browser config
        generateHighQualityLinkPreview: false,
        syncFullHistory: false, // Disable full history sync to improve performance
        markOnlineOnConnect: false, // Reduce server load
        defaultQueryTimeoutMs: this.CONNECTION_TIMEOUT,
        shouldSyncHistoryMessage: (msg: any) => {
          // Only sync messages from last 3 days to improve performance
          const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
          const timestamp = msg.messageTimestamp || msg.timestamp || Date.now() / 1000;
          return (timestamp as number) * 1000 > threeDaysAgo;
        },
        connectTimeoutMs: this.CONNECTION_TIMEOUT,
        keepAliveIntervalMs: this.KEEP_ALIVE_INTERVAL,
        // Enhanced stability options
        retryRequestDelayMs: 1000, // Increased delay between retries
        maxMsgRetryCount: 3, // Reduced retry count
        qrTimeout: 120000, // 2 minutes for QR timeout
        // Reduce aggressive queries
        emitOwnEvents: false,
        fireInitQueries: true, // Enable for proper initialization
        // Add better message handling
        getMessage: async (key) => {
          // Return empty to avoid message retrieval issues
          return undefined;
        },
        // Add connection options for Render deployment
        // Updated version to fix 405 error - using latest WhatsApp Web version
        version: [2, 3000, 1026266956]
      });
      
      // Set up event handlers
      this.setupEventHandlers(saveCreds);
      
      console.log('✅ WhatsApp Baileys client initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp Baileys client:', (error as Error).message);
      this.connectionStatus = 'error';
      this.emit('status', { ready: false, message: `Initialization failed: ${(error as Error).message}` });
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        const delay = this.calculateBackoffDelay(this.reconnectAttempts);
        console.log(`🔄 Retrying WhatsApp initialization in ${delay/1000}s... Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
        this.scheduleReconnect(delay);
      }
    }
  }

  private setupEventHandlers(saveCreds: () => Promise<void>): void {
    if (!this.socket) return;

    // Connection update handler
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('🔗 WhatsApp QR Code received');
        this.qrString = qr;
        this.connectionStatus = 'qr_ready';
        
        // Generate QR code data URL
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          this.qrDataUrl = qrDataUrl;
          console.log('📱 WhatsApp QR Code generated');
          this.emit('qr', { qr: qrDataUrl, status: 'qr_ready' });
          
          // Also display in terminal for debugging
          qrTerminal.generate(qr, { small: true });
        } catch (err) {
          console.error('❌ Error generating WhatsApp QR code:', err);
          this.qrDataUrl = null;
          this.emit('qr', { qr: qr, status: 'qr_ready' });
        }
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        const errorMessage = lastDisconnect?.error?.message || 'Unknown reason';
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const errorData = (lastDisconnect?.error as Boom)?.data;
        
        // Handle 405 error specifically
        const is405Error = statusCode === 405 || errorData?.reason === '405' || errorData?.location === 'frc';
        
        // Enhanced conflict detection
        const isConflictError = errorMessage.includes('Stream Errored (conflict)') ||
                               errorMessage.includes('replaced by new connection') ||
                               statusCode === DisconnectReason.connectionReplaced ||
                               statusCode === DisconnectReason.multideviceMismatch;
        
        const isTimeoutError = errorMessage.includes('Connection was lost') ||
                              errorMessage.includes('timeout') ||
                              statusCode === DisconnectReason.timedOut;
        
        console.log('❌ WhatsApp connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        console.log(`📊 Connection stats: status=${statusCode}, conflict=${isConflictError}, timeout=${isTimeoutError}, is405=${is405Error}`);
        console.log(`📊 Error data:`, errorData);
        
        // Handle 405 error (Method Not Allowed / Protocol mismatch)
        if (is405Error) {
          console.log('⚠️ WhatsApp protocol version mismatch (405 error) detected');
          console.log('🔄 Clearing auth and attempting reconnection with updated protocol...');
          
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts <= 3) {
            // Clear auth and wait before reconnecting
            const delay = 10000 + (this.reconnectAttempts * 5000); // 10s, 15s, 20s
            console.log(`⏳ 405 error recovery attempt ${this.reconnectAttempts}/3: Clearing auth and waiting ${delay/1000}s...`);
            this.connectionStatus = 'reconnecting';
            this.emit('status', { 
              ready: false, 
              message: `WhatsApp protocol mismatch - attempting recovery (${this.reconnectAttempts}/3)...` 
            });
            this.scheduleReconnect(delay, true); // Clear auth for 405 errors
          } else {
            console.log('❌ Max 405 error recovery attempts reached. Manual intervention may be required.');
            console.log('💡 Try: 1) Force Restart, 2) Clear Authentication, or 3) Re-scan QR code');
            this.connectionStatus = 'failed';
            this.emit('status', { 
              ready: false, 
              message: 'WhatsApp protocol mismatch - please clear authentication and re-scan QR code.' 
            });
          }
          return;
        }
        
        if (isConflictError) {
          console.log('⚠️ Session conflict detected - another WhatsApp session is active');
          console.log('🔄 Implementing conflict resolution strategy...');
          
          // Increment conflict-specific counter
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts <= 3) {
            // First few attempts: clear auth and wait longer
            const delay = 90000 + (this.reconnectAttempts * 60000); // 1.5, 2.5, 3.5 minutes
            console.log(`⏳ Conflict resolution attempt ${this.reconnectAttempts}/3: Clearing auth and waiting ${delay/1000}s...`);
            this.scheduleReconnect(delay, true); // Clear auth on conflict
          } else {
            // After 3 attempts: give up on this session
            console.log('❌ Max conflict resolution attempts reached. Manual intervention required.');
            console.log('💡 Please ensure no other WhatsApp sessions are active and restart the service.');
            this.connectionStatus = 'conflict_failed';
            this.emit('status', { 
              ready: false, 
              message: 'Session conflict - manual restart required. Please close other WhatsApp sessions.' 
            });
          }
          return;
        }
        
        if (isTimeoutError) {
          console.log('⏰ Connection timeout detected - implementing enhanced timeout recovery');
          this.reconnectAttempts++;
          
          // For timeout errors, use progressive recovery strategy
          if (this.reconnectAttempts <= 2) {
            // First 2 attempts: Quick retry without clearing auth
            const delay = 5000 + (this.reconnectAttempts * 2000); // 5s, 7s
            console.log(`🔄 Quick timeout recovery attempt ${this.reconnectAttempts}: Reconnecting in ${delay/1000}s...`);
            this.scheduleReconnect(delay, false);
          } else if (this.reconnectAttempts <= 5) {
            // Next 3 attempts: Longer delay, still no auth clear
            const delay = 15000 + (this.reconnectAttempts * 5000); // 20s, 25s, 30s
            console.log(`🔄 Extended timeout recovery attempt ${this.reconnectAttempts}: Reconnecting in ${delay/1000}s...`);
            this.scheduleReconnect(delay, false);
          } else {
            // After 5 attempts: Clear auth and longer delay
            const delay = 60000; // 1 minute
            console.log(`🔄 Deep timeout recovery attempt ${this.reconnectAttempts}: Clearing auth and reconnecting in ${delay/1000}s...`);
            this.scheduleReconnect(delay, true);
          }
          return;
        }
        
        this.isClientReady = false;
        this.isReady = false;
        this.connectionStatus = 'disconnected';
        this.emit('status', { ready: false, message: `WhatsApp disconnected: ${errorMessage}` });
        
        if (shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          const delay = this.calculateBackoffDelay(this.reconnectAttempts);
          console.log(`🔄 Attempting to reconnect WhatsApp... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
          this.scheduleReconnect(delay);
        } else if (!shouldReconnect) {
          console.log('🔐 WhatsApp logged out - need to scan QR code again');
          this.clearAuth();
        } else {
          console.error('❌ Max WhatsApp reconnection attempts reached');
          this.connectionStatus = 'failed';
          this.emit('status', { ready: false, message: 'WhatsApp connection failed after maximum retries.' });
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully!');
        this.isClientReady = true;
        this.isReady = true;
        this.connectionStatus = 'connected';
        this.qrString = null;
        this.qrDataUrl = null;
        this.reconnectAttempts = 0; // Reset on successful connection
        
        this.emit('status', { 
          ready: true, 
          authenticated: true,
          connected: true,
          message: 'WhatsApp connected successfully!',
          authMethod: 'qr'
        });
        this.emit('ready', { status: 'connected' });
        
        console.log('🎯 WhatsApp monitoring keywords:', this.monitoredKeywords.join(', '));
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        // Start memory cleanup
        this.startMemoryCleanup();
        
        // Optimized auto-fetch with performance improvements
        setTimeout(async () => {
          try {
            console.log('🚀 Starting optimized chat discovery...');
            
            // Step 1: Quick presence update
            console.log('📡 Setting presence...');
            await this.socket!.sendPresenceUpdate('available');
            
            // Step 2: Parallel chat discovery
            console.log('📡 Initiating parallel chat discovery...');
            const discoveryPromises = [
              // Chat list query
              this.socket!.query({
                tag: 'iq',
                attrs: {
                  to: '@s.whatsapp.net',
                  type: 'get',
                  xmlns: 'w:chat',
                  id: this.socket!.generateMessageTag()
                },
                content: [{ tag: 'query', attrs: {} }]
              }).catch(() => console.log('⚠️ Chat query failed, continuing...')),
              
              // Group discovery
              this.socket!.query({
                tag: 'iq',
                attrs: {
                  to: '@g.us',
                  type: 'get',
                  xmlns: 'w:g2',
                  id: this.socket!.generateMessageTag()
                },
                content: [{ tag: 'participating', attrs: {} }]
              }).catch(() => console.log('⚠️ Group query failed, continuing...'))
            ];
            
            // Wait for discovery attempts (with timeout)
            await Promise.allSettled(discoveryPromises);
            
            // Step 3: Quick sync wait
            console.log('📡 Waiting for sync events...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Reduced from 5000ms
            
            // Step 4: Emit current state
            this.emitChatsUpdate();
            
            console.log('✅ Optimized chat discovery completed');
          } catch (autoFetchError) {
            console.log('⚠️ Chat discovery failed, using passive mode:', (autoFetchError as Error).message);
            this.emitChatsUpdate();
          }
          this.saveSession();
        }, 1500); // Reduced from 3000ms
      }
    });

    // Credentials update handler
    this.socket.ev.on('creds.update', saveCreds);

    // Handle initial history sync - this is where existing chats come from!
    this.socket.ev.on('messaging-history.set', async (historySync: any) => {
      const { chats = [], contacts = [], messages = [], isLatest = false } = historySync;
      console.log(`🔄 Received messaging history: ${chats.length} chats, ${contacts.length} contacts, ${messages.length} messages`);
      
      try {
        // Process chats from history
        for (const chat of chats) {
          try {
            if (!chat || !chat.id) {
              continue;
            }
            
            const isGroup = chat.id.endsWith('@g.us');
            
            const chatInfo: WhatsAppChat = {
              id: chat.id,
              name: chat.name || (chat as any).subject || (isGroup ? 'Unknown Group' : 'Unknown Contact'),
              lastMessage: (chat as any).lastMessage?.message || '',
              timestamp: (chat as any).lastMessage?.messageTimestamp || Date.now(),
              isGroup,
              participantCount: isGroup ? (chat as any).participantCount : undefined,
              description: (chat as any).description || undefined
            };
          
          if (isGroup) {
            // Get additional group metadata
            try {
              const groupMetadata = await this.socket!.groupMetadata(chat.id);
              chatInfo.name = groupMetadata.subject || chatInfo.name;
              chatInfo.participantCount = groupMetadata.participants?.length || 0;
              chatInfo.description = groupMetadata.desc || '';
              
              const existingIndex = this.groups.findIndex(g => g.id === chat.id);
              if (existingIndex >= 0) {
                this.groups[existingIndex] = chatInfo;
              } else {
                this.groups.push(chatInfo);
              }
              
              console.log(`👥 Added group: "${chatInfo.name}" (${chatInfo.participantCount} members) - ID: ${chatInfo.id}`);
            } catch (groupError) {
              console.log(`⚠️ Could not get metadata for group ${chat.id}:`, (groupError as Error).message);
              // Still add the group without full metadata
              const existingIndex = this.groups.findIndex(g => g.id === chat.id);
              if (existingIndex >= 0) {
                this.groups[existingIndex] = chatInfo;
              } else {
                this.groups.push(chatInfo);
              }
            }
          } else {
            const existingIndex = this.privateChats.findIndex(c => c.id === chat.id);
            if (existingIndex >= 0) {
              this.privateChats[existingIndex] = chatInfo;
            } else {
              this.privateChats.push(chatInfo);
            }
            console.log(`👤 Added private chat: "${chatInfo.name}"`);
          }
          } catch (chatError) {
            console.log(`⚠️ Error processing chat ${chat?.id}:`, (chatError as Error).message);
          }
        }
        
        // Process messages from history
        for (const message of messages) {
          try {
            // Skip messages without proper structure
            if (!message || !message.key || !message.key.remoteJid) {
              continue;
            }
            
            // Add null check for message.message to prevent imageMessage errors
            if (!message.message) {
              console.log('⚠️ Skipping message with null message content');
              continue;
            }
            
            const messageText = this.extractMessageText(message);
            // Allow empty messages if they're media messages
            if (!messageText && !this.isMediaMessage(message.message)) {
              continue;
            }
            
            const chatId = message.key.remoteJid;
            const isGroup = chatId?.endsWith('@g.us') || false;
            
            const timestamp = typeof message.messageTimestamp === 'number' 
              ? message.messageTimestamp 
              : typeof message.messageTimestamp === 'object' && message.messageTimestamp 
                ? (message.messageTimestamp as any).toNumber() 
                : Date.now();

            const whatsappMessage: WhatsAppMessage = {
              id: message.key.id || '',
              body: messageText,
              from: message.key.participant || message.key.remoteJid || '',
              fromMe: message.key.fromMe || false,
              timestamp: timestamp,
              type: Object.keys(message.message || {})[0] || 'text',
              isGroup,
              groupName: isGroup ? await this.getGroupName(chatId || '') : undefined,
              contactName: await this.getContactName(message.key.participant || message.key.remoteJid || ''),
              chatId: chatId || '',
              time: new Date(timestamp * 1000).toLocaleTimeString(),
              isMedia: this.isMediaMessage(message.message)
            };
            
            this.addMessageToChat(whatsappMessage.chatId, whatsappMessage);
            
            // If this is a private chat, ensure we add it to our private chats list
            if (!isGroup && chatId) {
              await this.ensurePrivateChatExists(chatId, whatsappMessage.contactName, whatsappMessage.body, whatsappMessage.timestamp);
            }
          } catch (msgError) {
            console.log('⚠️ Error processing historical message:', (msgError as Error).message);
            // Log the problematic message for debugging
            try {
              console.log('⚠️ Problematic message structure:', JSON.stringify({
                hasKey: !!message.key,
                hasMessage: !!message.message,
                messageKeys: message.message ? Object.keys(message.message) : 'N/A',
                remoteJid: message.key?.remoteJid || 'N/A'
              }, null, 2));
            } catch (logError) {
              console.log('⚠️ Could not log message structure due to circular reference');
            }
          }
        }
        
        // Message limiting is now handled per-chat in addMessageToChat method
        const totalMessages = Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0);
        console.log(`📊 History processed: ${this.groups.length} groups, ${this.privateChats.length} private chats, ${totalMessages} messages`);
        
        // Emit update with the new chat data
        this.emitChatsUpdate();
        this.saveSession();
        this.saveChatData();
        
        if (isLatest) {
          console.log('✅ History sync completed - all chats loaded!');
        }
        
      } catch (error) {
        console.error('❌ Error processing messaging history:', (error as Error).message);
      }
    });

    // Messages handler
    this.socket.ev.on('messages.upsert', async (m) => {
      try {
        await this.handleIncomingMessages(m);
      } catch (error) {
        console.error('❌ Error handling WhatsApp message:', (error as Error).message);
      }
    });

    // Chats handler
    this.socket.ev.on('chats.upsert', async (chats) => {
      try {
        console.log(`📝 Received ${chats.length} chat updates`);
        await this.processChatUpdates(chats);
      } catch (error) {
        console.error('❌ Error processing chat updates:', (error as Error).message);
      }
    });

    // Add comprehensive chat event handlers
    this.socket.ev.on('chats.update', async (chats) => {
      try {
        console.log(`🔄 Received ${chats.length} chat update events`);
        await this.processChatUpdates(chats);
      } catch (error) {
        console.error('❌ Error processing chat update events:', (error as Error).message);
      }
    });

    // Note: chats.set removed as messaging-history.set already handles full chat sets

    // Groups handler
    this.socket.ev.on('groups.upsert', (groups) => {
      try {
        console.log(`👥 Received ${groups.length} group updates`);
        for (const group of groups) {
          const groupChat: WhatsAppChat = {
            id: group.id,
            name: group.subject || 'Unknown Group',
            isGroup: true,
            participantCount: group.participants?.length || 0,
            description: group.desc || undefined,
            timestamp: Date.now()
          };
          
          const existingIndex = this.groups.findIndex(g => g.id === group.id);
          if (existingIndex >= 0) {
            this.groups[existingIndex] = groupChat;
          } else {
            this.groups.push(groupChat);
          }
        }
        
        this.emitChatsUpdate();
      } catch (error) {
        console.error('❌ Error processing group updates:', (error as Error).message);
      }
    });

    // Contacts handler
    this.socket.ev.on('contacts.upsert', (contacts) => {
      try {
        console.log(`👤 Received ${contacts.length} contact updates`);
        // Contacts can help us get better names for chats
        for (const contact of contacts) {
          console.log(`👤 Contact: ${contact.id} - ${contact.name || contact.notify || 'Unknown'}`);
        }
      } catch (error) {
        console.error('❌ Error processing contact updates:', (error as Error).message);
      }
    });

    // Note: Removing contacts.set handler as it's not available in current Baileys version
  }

  private async handleIncomingMessages(messageUpdate: { messages: any[]; type: MessageUpsertType }): Promise<void> {
    try {
      const { messages } = messageUpdate;
      
      if (!messages || !Array.isArray(messages)) {
        console.log('⚠️ Invalid messages array in handleIncomingMessages');
        return;
      }
      
      for (const message of messages) {
        if (!message || !message.key || !message.message || message.key.fromMe) {
          continue; // Skip invalid messages and our own messages
        }
        
        try {
          const messageText = this.extractMessageText(message);
          if (!messageText) continue;
        
        const chatId = message.key.remoteJid;
        const isGroup = chatId?.endsWith('@g.us') || false;
        
        // Create message object
        const whatsappMessage: WhatsAppMessage = {
          id: message.key.id || '',
          body: messageText,
          from: message.key.participant || message.key.remoteJid || '',
          fromMe: false,
          timestamp: message.messageTimestamp || Date.now(),
          type: Object.keys(message.message)[0] || 'text',
          isGroup,
          groupName: isGroup ? await this.getGroupName(chatId) : undefined,
          contactName: await this.getContactName(message.key.participant || message.key.remoteJid),
          chatId: chatId || '',
          time: new Date().toLocaleTimeString(),
          isMedia: this.isMediaMessage(message.message)
        };
        
        this.addMessageToChat(whatsappMessage.chatId, whatsappMessage);
        
        
        // Check for monitored keywords
        const hasKeyword = this.monitoredKeywords.some(keyword => 
          messageText.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          console.log(`🎯 Monitored keyword found in message: ${messageText.substring(0, 50)}...`);
        }
        
        console.log(`📨 New WhatsApp message from ${whatsappMessage.contactName}: ${messageText.substring(0, 100)}...`);
        
        // If this is a private chat, ensure we add it to our private chats list
        if (!isGroup && chatId) {
          await this.ensurePrivateChatExists(chatId, whatsappMessage.contactName, messageText, whatsappMessage.timestamp);
        }
        
          // Emit new message event
          this.emit('newMessage', whatsappMessage);
          
        } catch (error) {
          console.error('❌ Error processing individual WhatsApp message:', (error as Error).message);
          console.error('❌ Message data that caused error:', JSON.stringify(message, null, 2));
        }
      }
    } catch (error) {
      console.error('❌ Error in handleIncomingMessages batch:', (error as Error).message);
      console.error('❌ MessageUpdate data that caused error:', JSON.stringify(messageUpdate, null, 2));
    }
  }

  private extractMessageText(message: any): string {
    try {
      if (!message || !message.message) {
        return '';
      }

      const msgContent = message.message;
      
      // Additional null check for msgContent
      if (!msgContent) {
        return '';
      }
      
      // Handle different message types with null checks
      if (msgContent.conversation) {
        return msgContent.conversation;
      }
      
      if (msgContent.extendedTextMessage && msgContent.extendedTextMessage.text) {
        return msgContent.extendedTextMessage.text;
      }
      
      if (msgContent.imageMessage && msgContent.imageMessage.caption) {
        return msgContent.imageMessage.caption;
      }
      
      if (msgContent.videoMessage && msgContent.videoMessage.caption) {
        return msgContent.videoMessage.caption;
      }
      
      if (msgContent.documentMessage && msgContent.documentMessage.caption) {
        return msgContent.documentMessage.caption;
      }
      
      // For messages without text content, return a placeholder with null checks
      if (msgContent.imageMessage) {
        return '[Image]';
      }
      
      if (msgContent.videoMessage) {
        return '[Video]';
      }
      
      if (msgContent.audioMessage) {
        return '[Audio]';
      }
      
      if (msgContent.documentMessage) {
        return '[Document]';
      }
      
      if (msgContent.stickerMessage) {
        return '[Sticker]';
      }
      
      if (msgContent.locationMessage) {
        return '[Location]';
      }
      
      if (msgContent.contactMessage) {
        return '[Contact]';
      }
      
      // For system messages or unknown types
      const messageType = Object.keys(msgContent)[0];
      if (messageType) {
        return `[${messageType}]`;
      }
      
    } catch (error) {
      console.log('⚠️ Error extracting message text:', (error as Error).message);
      console.log('⚠️ Message data that caused extraction error:', JSON.stringify(message, null, 2));
    }
    
    return '';
  }

  private isMediaMessage(message: any): boolean {
    if (!message) {
      return false;
    }
    return !!(message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage);
  }

  private async getContactName(jid: string | undefined): Promise<string> {
    if (!jid || !this.socket) return 'Unknown';
    
    try {
      // Check if we have contact info in our store
      const contactInfo = await this.socket.onWhatsApp(jid);
      if (contactInfo && contactInfo.length > 0) {
        const contact = contactInfo[0] as any;
        if (contact.notify) {
          return contact.notify;
        }
      }
      
      // Try to get contact from auth state store
      const authState = this.socket.authState as any;
      if (authState?.creds?.contacts?.[jid]) {
        const contact = authState.creds.contacts[jid];
        if (contact.notify || contact.name) {
          return contact.notify || contact.name || contact.vname || 'Unknown';
        }
      }
      
      // Try to extract name from previous messages
      const existingContact = this.privateChats.find(chat => chat.id === jid);
      if (existingContact && existingContact.name && existingContact.name !== 'Unknown Contact') {
        return existingContact.name;
      }
      
      // Fallback to formatted phone number
      const phoneNumber = jid.split('@')[0];
      return phoneNumber || 'Unknown';
    } catch (error) {
      // Ignore errors, fallback to phone number
      const phoneNumber = jid.split('@')[0];
      return phoneNumber || 'Unknown';
    }
  }

  private async getGroupName(jid: string | undefined): Promise<string> {
    if (!jid || !this.socket) return 'Unknown Group';
    
    try {
      // First check if we already have this group in our cache
      const existingGroup = this.groups.find(g => g.id === jid);
      if (existingGroup && existingGroup.name && existingGroup.name !== 'Unknown Group') {
        return existingGroup.name;
      }
      
      const groupMetadata = await this.socket.groupMetadata(jid);
      if (groupMetadata && groupMetadata.subject) {
        return groupMetadata.subject;
      }
      
      // If no subject, try to extract from jid
      const jidParts = jid.split('@')[0];
      return `Group ${jidParts.substring(0, 8)}...`;
    } catch (error) {
      // If metadata fetch fails, try to extract from jid
      const jidParts = jid.split('@')[0];
      return `Group ${jidParts.substring(0, 8)}...`;
    }
  }

  private async ensurePrivateChatExists(chatId: string, contactName: string, lastMessage?: string, timestamp?: number): Promise<void> {
    try {
      const existingIndex = this.privateChats.findIndex(c => c.id === chatId);
      
      const chatInfo: WhatsAppChat = {
        id: chatId,
        name: contactName && contactName !== 'Unknown' ? contactName : await this.getContactName(chatId),
        lastMessage: lastMessage || '',
        timestamp: timestamp || Date.now(),
        isGroup: false
      };
      
      if (existingIndex >= 0) {
        // Update existing chat with latest message
        this.privateChats[existingIndex] = {
          ...this.privateChats[existingIndex],
          lastMessage: lastMessage || this.privateChats[existingIndex].lastMessage,
          timestamp: timestamp || this.privateChats[existingIndex].timestamp,
          name: chatInfo.name // Update name in case we got a better one
        };
      } else {
        // Add new private chat
        this.privateChats.push(chatInfo);
        console.log(`👤 Discovered private chat: "${chatInfo.name}" (${chatId})`);
      }
      
      this.emitChatsUpdate();
      this.saveChatData();
    } catch (error) {
      console.error('❌ Error ensuring private chat exists:', (error as Error).message);
    }
  }

  private async processChatUpdates(chats: any[]): Promise<void> {
    for (const chat of chats) {
      const isGroup = chat.id.endsWith('@g.us');
      
      // Get better name for private chats
      let chatName = chat.name;
      if (!isGroup && (!chatName || chatName === 'Unknown Contact')) {
        chatName = await this.getContactName(chat.id);
      }
      
      const chatInfo: WhatsAppChat = {
        id: chat.id,
        name: chatName || (isGroup ? 'Unknown Group' : 'Unknown Contact'),
        lastMessage: chat.lastMessage?.message || '',
        timestamp: chat.lastMessage?.messageTimestamp || Date.now(),
        isGroup,
        participantCount: isGroup ? chat.participantCount : undefined,
        description: chat.description || undefined
      };
      
      if (isGroup) {
        const existingIndex = this.groups.findIndex(g => g.id === chat.id);
        if (existingIndex >= 0) {
          this.groups[existingIndex] = chatInfo;
        } else {
          this.groups.push(chatInfo);
          console.log(`👥 Added group: "${chatInfo.name}" (${chatInfo.participantCount} members)`);
        }
      } else {
        const existingIndex = this.privateChats.findIndex(c => c.id === chat.id);
        if (existingIndex >= 0) {
          this.privateChats[existingIndex] = chatInfo;
        } else {
          this.privateChats.push(chatInfo);
          console.log(`👤 Added private chat: "${chatInfo.name}" (${chat.id})`);
        }
      }
    }
    
    this.emitChatsUpdate();
  }

  private emitChatsUpdate(): void {
    // Log the actual group data being emitted
    console.log(`📊 Emitting chats update:`);
    console.log(`   Groups (${this.groups.length}):`);
    this.groups.slice(0, 3).forEach((group, index) => {
      console.log(`     ${index + 1}. "${group.name}" (${group.participantCount} members) - ${group.id}`);
    });
    if (this.groups.length > 3) {
      console.log(`     ... and ${this.groups.length - 3} more groups`);
    }
    
    console.log(`   Private Chats (${this.privateChats.length}):`);
    this.privateChats.slice(0, 3).forEach((chat, index) => {
      console.log(`     ${index + 1}. "${chat.name}" - ${chat.id}`);
    });
    if (this.privateChats.length > 3) {
      console.log(`     ... and ${this.privateChats.length - 3} more private chats`);
    }
    
    // Emit chats updated event
    this.emit('chats_updated', {
      groups: this.groups,
      privateChats: this.privateChats,
      groupsCount: this.groups.length,
      privateChatsCount: this.privateChats.length,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📊 Chats updated: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
  }

  private async fetchGroupsManually(): Promise<void> {
    if (!this.socket || !this.isReady) return;
    
    try {
      console.log('👥 Attempting to fetch groups manually...');
      
      // Try to query for groups specifically
      try {
        await this.socket.query({
          tag: 'iq',
          attrs: {
            to: '@g.us',
            type: 'get',
            xmlns: 'w:g2',
            id: this.socket.generateMessageTag()
          },
          content: [
            {
              tag: 'participating',
              attrs: {}
            }
          ]
        });
        console.log('👥 Group query sent, waiting for response...');
      } catch (groupQueryError) {
        console.log('⚠️ Group query failed, using alternative discovery');
      }
      
      console.log('👥 Manual group fetch completed - relying on event-based discovery');
    } catch (error) {
      console.log('⚠️ Manual group fetch failed:', (error as Error).message);
    }
  }

  async refreshChats(): Promise<void> {
    if (!this.socket || !this.isReady) {
      throw new Error('WhatsApp client is not ready. Please ensure connection is established.');
    }
    
    try {
      console.log('🔄 Refreshing WhatsApp chats...');
      
      // Reload chat data from our stored file
      this.loadChatData();
      
      // Refresh group metadata in parallel (limited batches)
      if (this.groups.length > 0) {
        console.log(`🔄 Refreshing metadata for ${this.groups.length} groups...`);
        const batchSize = 5; // Process 5 groups at a time to avoid rate limits
        
        for (let i = 0; i < this.groups.length; i += batchSize) {
          const batch = this.groups.slice(i, i + batchSize);
          const metadataPromises = batch.map(async (group) => {
            try {
              const groupMetadata = await this.socket!.groupMetadata(group.id);
              group.name = groupMetadata.subject || group.name;
              group.participantCount = groupMetadata.participants?.length || 0;
              group.description = groupMetadata.desc || '';
              console.log(`👥 Refreshed group: "${group.name}" (${group.participantCount} members)`);
            } catch (groupError) {
              console.log(`⚠️ Could not refresh metadata for group ${group.id}`);
            }
          });
          
          await Promise.allSettled(metadataPromises);
          
          // Small delay between batches to avoid overwhelming the API
          if (i + batchSize < this.groups.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // Force a chat list sync by sending a presence update (with error handling)
      try {
        console.log('📡 Requesting fresh chat list from WhatsApp...');
        await this.socket.sendPresenceUpdate('available');
      } catch (presenceError) {
        console.log('⚠️ Failed to send presence update, continuing...');
      }
      
      // Try multiple approaches to get chat data (with error handling)
      try {
        console.log('📡 Attempting direct chat list query...');
        await this.socket.query({
          tag: 'iq',
          attrs: {
            to: '@s.whatsapp.net',
            type: 'get',
            xmlns: 'w:chat',
            id: this.socket.generateMessageTag()
          },
          content: [{ tag: 'query', attrs: {} }]
        });
      } catch (queryError) {
        console.log('⚠️ Direct query failed, continuing with presence method');
      }
      
      // Optimized wait time for events to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`📊 Current chats after refresh: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
      
      // If we still have no chats, inform about the discovery mode
      if (this.groups.length === 0 && this.privateChats.length === 0) {
        console.log('📞 No chats found. Chats will be discovered as messages arrive or during history sync.');
        console.log('💡 To see existing chats, try Force Restart to trigger history sync');
      }
      
      // Emit chats update (with error handling)
      try {
        this.emitChatsUpdate();
      } catch (emitError) {
        console.log('⚠️ Failed to emit chats update:', (emitError as Error).message);
      }
      
      // Save data (with error handling)
      try {
        this.saveSession();
        this.saveChatData();
      } catch (saveError) {
        console.log('⚠️ Failed to save session/chat data:', (saveError as Error).message);
      }
      
      console.log(`✅ WhatsApp chats refreshed: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
      
    } catch (error) {
      console.error('❌ Error refreshing WhatsApp chats:', (error as Error).message);
      
      // Don't throw for non-critical errors - log and continue
      if ((error as Error).message.includes('not ready') || 
          (error as Error).message.includes('connection') ||
          (error as Error).message.includes('socket')) {
        throw error; // These are critical - should fail
      }
      
      // For other errors, log but don't fail the entire operation
      console.log('⚠️ Non-critical error during chat refresh, continuing...');
    }
  }

  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.socket || !this.isReady) {
      return { success: false, error: 'WhatsApp client is not ready' };
    }
    
    try {
      // Ensure the 'to' parameter has the correct format
      const formattedTo = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      const sentMessage = await this.socket.sendMessage(formattedTo, { text: message });
      
      console.log(`✅ Message sent to ${to}: ${message.substring(0, 50)}...`);
      
      return { 
        success: true, 
        messageId: sentMessage?.key?.id || undefined
      };
      
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', (error as Error).message);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  // Getter methods for compatibility with existing controller
  getStatus(): WhatsAppStatus {
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
      reconnectAttempts: this.reconnectAttempts
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

  getMessages(limit: number = 50, chatId?: string): WhatsAppMessage[] {
    if (chatId) {
      return this.getChatMessages(chatId, limit);
    }
    
    // If no specific chat, return recent messages from all chats
    const allMessages: WhatsAppMessage[] = [];
    const messageArrays = Array.from(this.messages.values());
    for (const chatMessages of messageArrays) {
      allMessages.push(...chatMessages);
    }
    
    // Sort by timestamp (newest first) and limit
    return allMessages
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  addMonitoredKeyword(keyword: string): void {
    if (!this.monitoredKeywords.includes(keyword)) {
      this.monitoredKeywords.push(keyword);
      this.saveSession();
      console.log(`✅ Added monitored keyword: ${keyword}`);
    }
  }

  removeMonitoredKeyword(keyword: string): boolean {
    const index = this.monitoredKeywords.indexOf(keyword);
    if (index > -1) {
      this.monitoredKeywords.splice(index, 1);
      this.saveSession();
      console.log(`✅ Removed monitored keyword: ${keyword}`);
      return true;
    }
    return false;
  }

  getMonitoredKeywords(): string[] {
    return [...this.monitoredKeywords];
  }

  async clearAuth(): Promise<void> {
    try {
      console.log('🧹 Clearing WhatsApp authentication data...');
      
      if (this.socket) {
        this.socket.end(new Error('Service restart requested'));
        this.socket = null;
      }
      
      // Remove auth directory
      if (fs.existsSync(this.authDir)) {
        await fs.remove(this.authDir);
      }
      
      // Clear chat data file
      if (fs.existsSync(this.chatDataFile)) {
        await fs.remove(this.chatDataFile);
        console.log('🗑️ Chat data file cleared');
      }
      
      this.isReady = false;
      this.isClientReady = false;
      this.connectionStatus = 'disconnected';
      this.qrString = null;
      this.qrDataUrl = null;
      this.reconnectAttempts = 0;
      this.groups = [];
      this.privateChats = [];
      this.messages.clear();
      
      console.log('✅ WhatsApp authentication data and store cleared');
      
    } catch (error) {
      console.error('❌ Error clearing WhatsApp auth data:', (error as Error).message);
      throw error;
    }
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting WhatsApp service...');
    
    try {
      if (this.socket) {
        this.socket.end(new Error('Service restart requested'));
        this.socket = null;
      }
      
      this.isReady = false;
      this.isClientReady = false;
      this.connectionStatus = 'disconnected';
      this.qrString = null;
      this.qrDataUrl = null;
      
      // Wait a moment before reinitializing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.initialize();
      
    } catch (error) {
      console.error('❌ Error restarting WhatsApp service:', (error as Error).message);
      throw error;
    }
  }

  async forceQRGeneration(): Promise<{ success: boolean; qrCode?: string; message: string }> {
    try {
      console.log('🔧 Force generating new QR code...');
      
      // Clear auth and restart to force new QR generation
      await this.clearAuth();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.initialize();
      
      return {
        success: true,
        message: 'QR code generation initiated. Please wait for the QR code to appear.'
      };
      
    } catch (error) {
      console.error('❌ Error force generating QR code:', (error as Error).message);
      return {
        success: false,
        message: `Failed to generate QR code: ${(error as Error).message}`
      };
    }
  }

  async testBrowserEnvironment(): Promise<any> {
    // Baileys doesn't use browser, so this always succeeds
    return {
      success: true,
      message: 'Baileys implementation does not require browser - no browser test needed',
      implementation: 'baileys',
      browserRequired: false
    };
  }

  // New method to force history sync
  async forceHistorySync(): Promise<void> {
    if (!this.socket || !this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    try {
      console.log('🔄 Forcing comprehensive history sync to discover all chats...');
      
      // Force sync by requesting messaging history
      await this.socket.sendPresenceUpdate('available');
      
      // Try to request chat list explicitly
      try {
        console.log('📡 Requesting chat list...');
        await this.socket.query({
          tag: 'iq',
          attrs: {
            to: '@s.whatsapp.net',
            type: 'get',
            xmlns: 'w:chat',
            id: this.socket.generateMessageTag()
          },
          content: [{ tag: 'query', attrs: {} }]
        });
      } catch (queryError) {
        console.log('⚠️ Chat list query failed, continuing with other methods');
      }
      
      // Try to query for groups specifically
      try {
        console.log('👥 Requesting group list...');
        await this.socket.query({
          tag: 'iq',
          attrs: {
            to: '@g.us',
            type: 'get',
            xmlns: 'w:g2',
            id: this.socket.generateMessageTag()
          },
          content: [
            {
              tag: 'participating',
              attrs: {}
            }
          ]
        });
      } catch (groupQueryError) {
        console.log('⚠️ Group query failed, continuing with other methods');
      }
      
      // Extract private chats from existing messages
      console.log('🔍 Analyzing existing messages for private chats...');
      const uniquePrivateChats = new Set<string>();
      
      const messageEntries = Array.from(this.messages.entries());
      for (const [chatId, messages] of messageEntries) {
        if (!chatId.endsWith('@g.us')) {
          for (const message of messages) {
            if (!message.isGroup && message.chatId) {
              uniquePrivateChats.add(message.chatId);
            }
          }
        }
      }
      
      console.log(`📊 Found ${uniquePrivateChats.size} unique private chats in message history`);
      
      // Ensure all discovered private chats are in our list
      const privateChatIds = Array.from(uniquePrivateChats);
      for (const chatId of privateChatIds) {
        const existingChat = this.privateChats.find(c => c.id === chatId);
        if (!existingChat) {
          const contactName = await this.getContactName(chatId);
          await this.ensurePrivateChatExists(chatId, contactName);
        }
      }
      
      // Wait for any pending events
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      this.emitChatsUpdate();
      this.saveChatData();
      
      console.log(`✅ History sync completed: ${this.groups.length} groups, ${this.privateChats.length} private chats discovered`);
      
    } catch (error) {
      console.error('❌ Error during force history sync:', (error as Error).message);
      throw error;
    }
  }

  // Helper method to add message to specific chat with size limit
  private addMessageToChat(chatId: string, message: WhatsAppMessage): void {
    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }
    
    const chatMessages = this.messages.get(chatId)!;
    chatMessages.unshift(message); // Add to beginning (newest first)
    
    // Keep only MAX_MESSAGES_PER_CHAT messages per chat
    if (chatMessages.length > this.MAX_MESSAGES_PER_CHAT) {
      chatMessages.splice(this.MAX_MESSAGES_PER_CHAT);
    }
  }

  // Helper method to get messages for a chat
  private getChatMessages(chatId: string, limit: number = 50): WhatsAppMessage[] {
    const chatMessages = this.messages.get(chatId) || [];
    return chatMessages.slice(0, limit);
  }

  // Helper method to calculate exponential backoff with jitter
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 2000; // 2 seconds (increased from 1 second)
    const maxDelay = 300000; // 5 minutes
    const exponentialDelay = Math.min(baseDelay * Math.pow(1.8, attempt - 1), maxDelay); // Reduced multiplier from 2 to 1.8
    
    // Add jitter (±25% randomization)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.floor(exponentialDelay + jitter);
  }

  // Helper method to schedule reconnection with cleanup
  private scheduleReconnect(delay: number, clearAuth: boolean = false): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (clearAuth) {
          console.log('🧹 Clearing auth due to session conflict...');
          await this.clearAuth();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        await this.initialize();
      } catch (error) {
        console.error('❌ Error in scheduled reconnect:', (error as Error).message);
      }
    }, delay);
  }

  // Enhanced health monitoring to detect connection issues
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Enhanced health monitoring with less aggressive pinging
    this.healthCheckTimer = setInterval(async () => {
      try {
        if (this.socket && this.isClientReady) {
          const now = Date.now();
          
          // Only ping every 2 minutes to reduce server load
          if (now - this.lastPingTime > 120000) { // 2 minutes
            try {
              // Simple presence update instead of aggressive pinging
              await this.socket.sendPresenceUpdate('available');
              this.lastPingTime = now;
              console.log('🏥 WhatsApp health check: OK');
            } catch (pingError) {
              console.log('⚠️ WhatsApp health check failed:', (pingError as Error).message);
              
              // Don't immediately reconnect, wait for actual disconnection
              if (this.reconnectAttempts < 3) {
                console.log('🔄 Attempting gentle recovery...');
                this.reconnectAttempts++;
                
                // Try to refresh connection state
                setTimeout(() => {
                  if (this.socket && this.isClientReady) {
                    this.socket.sendPresenceUpdate('available').catch(() => {
                      console.log('🔄 Gentle recovery failed, waiting for natural reconnect...');
                    });
                  }
                }, 5000);
              }
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Health monitoring error:', (error as Error).message);
      }
    }, 60000); // Check every minute instead of every 30 seconds
  }

  // Memory cleanup to prevent memory leaks
  private startMemoryCleanup(): void {
    setInterval(() => {
      try {
        let totalBefore = 0;
        let totalAfter = 0;
        
        // Calculate total messages before cleanup
        const messageArrays = Array.from(this.messages.values());
        for (const msgs of messageArrays) {
          totalBefore += msgs.length;
        }
        
        // Clean up old messages (older than 24 hours) and limit per chat
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const activeGroupIds = new Set(this.groups.map(g => g.id));
        const activePrivateIds = new Set(this.privateChats.map(c => c.id));
        
        const messageEntries = Array.from(this.messages.entries());
        for (const [chatId, messages] of messageEntries) {
          // Keep messages if chat is active or message is recent
          const filteredMessages = messages.filter(msg => {
            const isRecentMessage = msg.timestamp * 1000 > oneDayAgo;
            const isActiveChatMessage = activeGroupIds.has(chatId) || activePrivateIds.has(chatId);
            return isRecentMessage || isActiveChatMessage;
          });
          
          // Limit to MAX_MESSAGES_PER_CHAT per chat
          const limitedMessages = filteredMessages.slice(0, this.MAX_MESSAGES_PER_CHAT);
          
          if (limitedMessages.length === 0) {
            // Remove empty chat message arrays
            this.messages.delete(chatId);
          } else {
            this.messages.set(chatId, limitedMessages);
            totalAfter += limitedMessages.length;
          }
        }
        
        if (totalBefore !== totalAfter) {
          console.log(`🧹 Memory cleanup: ${totalBefore} -> ${totalAfter} messages across ${this.messages.size} chats`);
          this.saveChatData();
        }
      } catch (error) {
        console.error('❌ Error during memory cleanup:', (error as Error).message);
      }
    }, this.MEMORY_CLEANUP_INTERVAL);
  }

  // Request phone authentication code
  public async requestPhoneCode(phoneNumber: string): Promise<{ success: boolean; code?: string; error?: string }> {
    try {
      // Format phone number for Baileys (ensure it includes country code)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
        formattedPhone = '1' + formattedPhone; // Add US country code if missing
      }
      console.log(`📱 Requesting phone pairing code for: ${formattedPhone}`);

      // Clear any existing pairing socket
      if (this.pairingSocket) {
        this.pairingSocket.end(new Error('Clearing existing pairing socket'));
        this.pairingSocket = null;
      }

      // If already connected, do not start pairing
      if (this.socket && this.isClientReady) {
        return { success: false, error: 'WhatsApp session is already active. Please logout first to pair a new device.' };
      }

      // Create a temporary auth directory for pairing
      const pairingAuthPath = path.join(this.AUTH_PATH, '../pairing-auth');
      await fs.ensureDir(pairingAuthPath);
      await fs.emptyDir(pairingAuthPath);

      // Initialize auth state
      const { state, saveCreds } = await useMultiFileAuthState(pairingAuthPath);

      // Create socket for pairing; passing state is sufficient even if fresh dir
      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: this.logger as any,
        browser: Browsers.macOS('Desktop'),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        emitOwnEvents: true,
        fireInitQueries: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        mobile: false
      });

      // Store socket reference
      this.pairingSocket = socket;
      this.pairingPhone = formattedPhone;
      this.pairingAuthPath = pairingAuthPath;

      // Finalize on successful connection
      socket.ev.on('connection.update', async (update) => {
        if (update.connection === 'open') {
          try {
            await saveCreds();
            await fs.emptyDir(this.AUTH_PATH);
            await fs.copy(pairingAuthPath, this.AUTH_PATH);
            await fs.remove(pairingAuthPath);
            if (this.socket) this.socket.end(new Error('Replacing with paired socket'));
            this.socket = socket;
            this.pairingSocket = null;
            this.isClientReady = true;
            await this.handleConnectionOpen();
          } catch (e) {
            console.error('❌ Error finalizing pairing session:', (e as Error).message);
          }
        }
      });

      // Try to obtain pairing code via event quickly
      let eventCode: string | null = null;
      const eventPromise = new Promise<void>((resolve) => {
        const handler = (update: any) => {
          if (update?.pairingCode && !eventCode) {
            eventCode = String(update.pairingCode);
            resolve();
          }
        };
        socket.ev.on('connection.update', handler);
        setTimeout(() => resolve(), 2500);
      });
      await eventPromise;

      const code = eventCode ?? (await this.pairingSocket?.requestPairingCode?.(formattedPhone)) ?? null;
      if (!code) {
        return { success: false, error: 'Failed to generate pairing code' };
      }

      const formattedCode = String(code).replace(/[\s-]/g, '');
      console.log(`✅ Pairing code ready: ${formattedCode}`);
      return { success: true, code: formattedCode };
    } catch (error: any) {
      console.error('❌ Error requesting pairing code:', error);
      // Clean up on error
      try {
        if (this.pairingSocket) {
          this.pairingSocket.end(new Error('Pairing error cleanup'));
          this.pairingSocket = null;
        }
        if (this.pairingAuthPath) {
          await fs.remove(this.pairingAuthPath).catch(() => {});
        }
      } catch {}

      if (error.message?.includes('timeout')) {
        return { success: false, error: 'Connection timeout. Please check your internet connection and try again.' };
      } else if (error.message?.includes('already exists')) {
        return { success: false, error: 'WhatsApp is already authenticated. Please clear authentication and try again.' };
      } else if (error.message?.includes('requestPairingCode is not a function') || error.message?.includes('not available')) {
        return { success: false, error: 'Phone pairing is not supported by the current WhatsApp Web version. Please use QR code authentication instead.' };
      } else {
        return { success: false, error: error.message || 'Failed to generate pairing code' };
      }
    }
  }

  // Verify phone authentication code
  public async verifyPhoneCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📱 Verifying phone code for: ${phoneNumber}`);
      // With pairing codes, verification completes on the phone; we can only report state
      if (this.pairingSocket && this.pairingPhone === phoneNumber) {
        const state = (this.pairingSocket as any).authState;
        if (state?.creds?.registered) {
          this.socket = this.pairingSocket;
          this.pairingSocket = null;
          this.pairingPhone = '';
          return { success: true };
        }
        return { success: false, error: 'Pairing not yet completed. Please ensure you entered the code in WhatsApp.' };
      }
      if (this.socket && this.isClientReady) {
        return { success: true };
      }
      return { success: false, error: 'No active pairing session found. Please request a new pairing code.' };
    } catch (error: any) {
      console.error('❌ Error verifying phone code:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Called when connection has opened successfully (QR or pairing)
  private async handleConnectionOpen(): Promise<void> {
    try {
      this.isClientReady = true;
      this.isReady = true;
      this.connectionStatus = 'connected';
      this.qrString = null;
      this.qrDataUrl = null;
      this.reconnectAttempts = 0;
      this.emit('status', {
        ready: true,
        authenticated: true,
        connected: true,
        message: 'WhatsApp connected successfully!',
        authMethod: 'pairing'
      });
      this.emit('ready', { status: 'connected' });
      this.startHealthMonitoring();
      this.startMemoryCleanup();
    } catch (error) {
      console.error('❌ Error in handleConnectionOpen:', (error as Error).message);
    }
  }

  // Cleanup method for graceful shutdown
  private cleanup(): void {
    console.log('🧹 Cleaning up WhatsApp service...');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.socket) {
      this.socket.end(new Error('Service shutdown'));
      this.socket = null;
    }
    this.saveSession();
    this.saveChatData();
  }

}

export default WhatsAppBaileysService;