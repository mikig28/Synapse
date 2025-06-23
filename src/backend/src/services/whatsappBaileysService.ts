import { makeWASocket, DisconnectReason, useMultiFileAuthState, WASocket, MessageUpsertType, BaileysEventMap } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import qrTerminal from 'qrcode-terminal';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
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
  private messages: WhatsAppMessage[] = [];
  private monitoredKeywords: string[] = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private authDir = './baileys_auth_info';
  private chatDataFile = './baileys_chat_data.json';

  private constructor() {
    super();
    this.loadSession();
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
        this.messages = chatData.messages || [];
        console.log(`📥 Loaded chat data: ${this.groups.length} groups, ${this.privateChats.length} chats, ${this.messages.length} messages`);
      }
    } catch (error) {
      console.log('⚠️ Failed to load chat data:', (error as Error).message);
    }
  }

  private saveChatData(): void {
    try {
      const chatData = {
        groups: this.groups,
        privateChats: this.privateChats,
        messages: this.messages.slice(0, 1000), // Save only last 1000 messages
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
      
      // Create WhatsApp socket
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll handle QR code generation ourselves
        // Use pino logger with silent level to reduce noise
        logger: pino({ level: 'silent' }),
        browser: ['Synapse Bot', 'Chrome', '120.0.0'],
        generateHighQualityLinkPreview: false,
        syncFullHistory: true, // Enable history sync to get existing chats
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: 60000,
        shouldSyncHistoryMessage: () => true, // Enable message history sync
        // Additional connection options to handle conflicts
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
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
        const delay = 10000 + (this.reconnectAttempts * 5000);
        console.log(`🔄 Retrying WhatsApp initialization in ${delay/1000}s... Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
        setTimeout(() => this.initialize(), delay);
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
        const isConflictError = errorMessage.includes('Stream Errored (conflict)');
        
        console.log('❌ WhatsApp connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        
        if (isConflictError) {
          console.log('🔄 Detected conflict error - WhatsApp session may be open elsewhere');
          console.log('💡 Waiting longer before reconnect to allow other sessions to close...');
          // For conflict errors, wait longer to allow other sessions to close
          const delay = 30000 + (this.reconnectAttempts * 10000);
          setTimeout(() => this.initialize(), delay);
          return;
        }
        
        this.isClientReady = false;
        this.isReady = false;
        this.connectionStatus = 'disconnected';
        this.emit('status', { ready: false, message: `WhatsApp disconnected: ${errorMessage}` });
        
        if (shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          const delay = 10000 + (this.reconnectAttempts * 5000);
          console.log(`🔄 Attempting to reconnect WhatsApp... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
          setTimeout(() => this.initialize(), delay);
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
        
        this.emit('status', { ready: true, message: 'WhatsApp connected successfully!' });
        this.emit('ready', { status: 'connected' });
        
        console.log('🎯 WhatsApp monitoring keywords:', this.monitoredKeywords.join(', '));
        
        // Enhanced auto-fetch with active chat list request
        setTimeout(async () => {
          try {
            console.log('🔄 Enhanced auto-fetching WhatsApp chats and groups...');
            
            // Step 1: Set presence
            console.log('📡 Step 1: Setting presence as available...');
            await this.socket!.sendPresenceUpdate('available');
            
            // Step 2: Request chat list explicitly
            console.log('📡 Step 2: Requesting chat list from WhatsApp...');
            try {
              // Force request for chat list - this should trigger chats.set event
              await this.socket!.query({
                tag: 'iq',
                attrs: {
                  to: '@s.whatsapp.net',
                  type: 'get',
                  xmlns: 'w:chat',
                  id: this.socket!.generateMessageTag()
                },
                content: [{ tag: 'query', attrs: {} }]
              });
            } catch (queryError) {
              console.log('⚠️ Direct chat query failed, using alternative method');
            }
            
            // Step 3: Wait for events to process
            console.log('📡 Step 3: Waiting for sync events...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Step 4: Fallback refresh
            console.log('📡 Step 4: Fallback refresh...');
            await this.refreshChats();
            
            console.log('✅ Enhanced auto-fetch completed');
          } catch (autoFetchError) {
            console.log('⚠️ Enhanced auto-fetch failed, using discovery mode:', (autoFetchError as Error).message);
            this.emitChatsUpdate();
          }
          this.saveSession();
        }, 3000);
      }
    });

    // Credentials update handler
    this.socket.ev.on('creds.update', saveCreds);

    // Handle initial history sync - this is where existing chats come from!
    this.socket.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
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
            
            this.messages.unshift(whatsappMessage);
            
            // If this is a private chat, ensure we add it to our private chats list
            if (!isGroup && chatId) {
              await this.ensurePrivateChatExists(chatId, whatsappMessage.contactName, whatsappMessage.body, whatsappMessage.timestamp);
            }
          } catch (msgError) {
            console.log('⚠️ Error processing historical message:', (msgError as Error).message);
          }
        }
        
        // Limit messages array size
        if (this.messages.length > 1000) {
          this.messages = this.messages.slice(0, 1000);
        }
        
        console.log(`📊 History processed: ${this.groups.length} groups, ${this.privateChats.length} private chats, ${this.messages.length} messages`);
        
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
      
      for (const message of messages) {
        if (!message.message || message.key.fromMe) continue; // Skip our own messages
        
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
        
        this.messages.unshift(whatsappMessage);
        if (this.messages.length > 1000) {
          this.messages = this.messages.slice(0, 1000); // Keep last 1000 messages
        }
        
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
        }
      }
    } catch (error) {
      console.error('❌ Error in handleIncomingMessages batch:', (error as Error).message);
    }
  }

  private extractMessageText(message: any): string {
    try {
      if (!message || !message.message) {
        return '';
      }

      const msgContent = message.message;
      
      // Handle different message types
      if (msgContent.conversation) {
        return msgContent.conversation;
      }
      
      if (msgContent.extendedTextMessage?.text) {
        return msgContent.extendedTextMessage.text;
      }
      
      if (msgContent.imageMessage?.caption) {
        return msgContent.imageMessage.caption;
      }
      
      if (msgContent.videoMessage?.caption) {
        return msgContent.videoMessage.caption;
      }
      
      if (msgContent.documentMessage?.caption) {
        return msgContent.documentMessage.caption;
      }
      
      // For messages without text content, return a placeholder
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
    }
    
    return '';
  }

  private isMediaMessage(message: any): boolean {
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
      
      // If we have existing groups, try to refresh their metadata
      for (const group of this.groups) {
        try {
          const groupMetadata = await this.socket.groupMetadata(group.id);
          group.name = groupMetadata.subject || group.name;
          group.participantCount = groupMetadata.participants?.length || 0;
          group.description = groupMetadata.desc || '';
          console.log(`👥 Refreshed group: "${group.name}" (${group.participantCount} members)`);
        } catch (groupError) {
          console.log(`⚠️ Could not refresh metadata for group ${group.id}`);
        }
      }
      
      // Force a chat list sync by sending a presence update
      console.log('📡 Requesting fresh chat list from WhatsApp...');
      await this.socket.sendPresenceUpdate('available');
      
      // Try multiple approaches to get chat data
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
      
      // Wait longer for events to be processed
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      console.log(`📊 Current chats after refresh: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
      
      // If we still have no chats, inform about the discovery mode
      if (this.groups.length === 0 && this.privateChats.length === 0) {
        console.log('📞 No chats found. Chats will be discovered as messages arrive or during history sync.');
        console.log('💡 To see existing chats, try Force Restart to trigger history sync');
      }
      
      this.emitChatsUpdate();
      this.saveSession();
      this.saveChatData();
      
      console.log(`✅ WhatsApp chats refreshed: ${this.groups.length} groups, ${this.privateChats.length} private chats`);
      
    } catch (error) {
      console.error('❌ Error refreshing WhatsApp chats:', (error as Error).message);
      throw error;
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
      messagesCount: this.messages.length,
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
    let filteredMessages = this.messages;
    
    if (chatId) {
      filteredMessages = this.messages.filter(msg => msg.chatId === chatId);
    }
    
    return filteredMessages.slice(0, limit);
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
      this.messages = [];
      
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
      
      for (const message of this.messages) {
        if (!message.isGroup && message.chatId && !message.chatId.endsWith('@g.us')) {
          uniquePrivateChats.add(message.chatId);
        }
      }
      
      console.log(`📊 Found ${uniquePrivateChats.size} unique private chats in message history`);
      
      // Ensure all discovered private chats are in our list
      for (const chatId of uniquePrivateChats) {
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
}

export default WhatsAppBaileysService;