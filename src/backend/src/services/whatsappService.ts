// WhatsApp service temporarily disabled for build compatibility
// import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
// import qrcode from 'qrcode';
import { EventEmitter } from 'events';
// import fs from 'fs-extra';
import path from 'path';
import fs from 'fs';

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
}

class WhatsAppService extends EventEmitter {
  private static instance: WhatsAppService | null = null;
  // private client: Client | null = null;
  private isReady = false;
  private isClientReady = false;
  private connectionStatus = 'disconnected';
  private qrString: string | null = null;
  private groups: WhatsAppChat[] = [];
  private privateChats: WhatsAppChat[] = [];
  private messages: WhatsAppMessage[] = [];
  private monitoredKeywords: string[] = ['פתק 2', 'פתק2', 'petak 2', 'petak2', 'פתק'];
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  private constructor() {
    super();
    this.loadSession();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private loadSession(): void {
    // Mock session loading - no file system operations in mock mode
    console.log('📤 WhatsApp mock session initialized');
  }

  private saveSession(): void {
    // Mock session saving - no file system operations in mock mode
    console.log('📥 WhatsApp mock session state preserved');
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 WhatsApp service initialized in mock mode...');
      
      this.isClientReady = false;
      this.isReady = false;
      this.connectionStatus = 'disconnected';
      this.qrString = null;
      
      this.emit('status', { ready: false, message: 'WhatsApp service initialized in mock mode' });
      
      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ WhatsApp Mock Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp service:', (error as Error).message);
      this.connectionStatus = 'error';
      this.emit('status', { ready: false, message: `Initialization failed: ${(error as Error).message}` });
    }
  }

  private setupClientHandlers(): void {
    // Mock client handlers - no actual WhatsApp Web.js client
    console.log('🔧 Mock WhatsApp client handlers set up');
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    // Mock message handler - no actual message processing in mock mode
    console.log('📥 Mock message handler called');
  }

  private async updateChatFromMessage(chat: any): Promise<void> {
    // Mock chat update - no actual chat processing in mock mode
    console.log('📝 Mock chat update called');
  }

  private checkGroupAgainstKeywords(groupName: string): boolean {
    if (!groupName) return false;
    const lowerGroupName = groupName.toLowerCase();
    return this.monitoredKeywords.some(keyword => 
      lowerGroupName.includes(keyword.toLowerCase())
    );
  }

  async sendMessage(to: string, message: string): Promise<void> {
    throw new Error('WhatsApp service is in mock mode - message sending not available');
  }

  async refreshChats(): Promise<void> {
    throw new Error('WhatsApp service is in mock mode - chat refresh not available');
  }

  addMonitoredKeyword(keyword: string): void {
    const trimmedKeyword = keyword.trim();
    if (!this.monitoredKeywords.some(k => k.toLowerCase() === trimmedKeyword.toLowerCase())) {
      this.monitoredKeywords.push(trimmedKeyword);
      this.saveSession();
      console.log(`🔍 Now monitoring WhatsApp keyword: "${trimmedKeyword}"`);
    }
  }

  removeMonitoredKeyword(keyword: string): boolean {
    const index = this.monitoredKeywords.findIndex(k => k.toLowerCase() === keyword.toLowerCase());
    if (index > -1) {
      this.monitoredKeywords.splice(index, 1);
      this.saveSession();
      console.log(`🗑️ Stopped monitoring WhatsApp keyword: "${keyword}"`);
      return true;
    }
    return false;
  }

  getStatus(): WhatsAppStatus {
    const monitoredGroupsFound = this.groups.filter(group => 
      this.checkGroupAgainstKeywords(group.name)
    );
    
    return {
      status: this.connectionStatus,
      isReady: this.isReady,
      isClientReady: this.isClientReady,
      groupsCount: this.groups.length,
      privateChatsCount: this.privateChats.length,
      messagesCount: this.messages.length,
      monitoredKeywords: this.monitoredKeywords,
      qrAvailable: !!this.qrString,
      timestamp: new Date().toISOString()
    };
  }

  getGroups(): WhatsAppChat[] {
    return this.groups;
  }

  getPrivateChats(): WhatsAppChat[] {
    return this.privateChats;
  }

  getMessages(limit: number = 50, groupId?: string): WhatsAppMessage[] {
    let filteredMessages = this.messages;
    
    if (groupId) {
      filteredMessages = this.messages.filter(msg => msg.chatId === groupId);
    }
    
    return filteredMessages.slice(0, limit);
  }

  getMonitoredKeywords(): string[] {
    return this.monitoredKeywords;
  }

  getQRCode(): string | null {
    return this.qrString;
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting WhatsApp mock service...');
    
    this.qrString = null;
    this.isReady = false;
    this.isClientReady = false;
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.groups = [];
    this.privateChats = [];
    this.messages = [];
    
    this.emit('status', { ready: false, message: 'Restarting WhatsApp mock service...' });
    
    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  async clearAuth(): Promise<void> {
    console.log('🗑️ Clearing WhatsApp mock service data...');
    
    this.qrString = null;
    this.isReady = false;
    this.isClientReady = false;
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.groups = [];
    this.privateChats = [];
    this.messages = [];
    
    this.emit('status', { ready: false, message: 'WhatsApp mock service data cleared. Restarting...' });
    
    setTimeout(() => {
      console.log('🔄 Restarting WhatsApp mock service with clean state...');
      this.initialize();
    }, 1000);
  }
}

export default WhatsAppService;