import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';

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
  private client: Client | null = null;
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
  private readonly MAX_RECONNECT_ATTEMPTS = 10; // Increased from 5 to 10
  private protocolErrorCount = 0;
  private readonly MAX_PROTOCOL_ERRORS = 10; // Increased from 3 to 10

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
        lastUpdate: Date.now()
      };
      const sessionPath = path.join(process.cwd(), 'whatsapp_session_backup.json');
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
      console.log('📥 WhatsApp session data saved');
    } catch (error) {
      console.log('❌ Failed to save WhatsApp session:', (error as Error).message);
    }
  }

  async testBrowserEnvironment(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('🧪 Testing browser environment for WhatsApp compatibility...');
      
      const startTime = Date.now();
      const puppeteer = require('puppeteer');
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
      
      // Test 1: Check if Chrome binary exists and is executable
      try {
        const fs = require('fs');
        const chromeStats = fs.statSync(executablePath);
        console.log(`✅ Chrome binary found: ${executablePath} (size: ${chromeStats.size} bytes)`);
      } catch (chromeError) {
        console.log(`❌ Chrome binary check failed: ${(chromeError as Error).message}`);
        return { 
          success: false, 
          error: `Chrome binary not found at ${executablePath}`,
          details: { executablePath, chromeError: (chromeError as Error).message }
        };
      }
      
      // Test 2: Basic browser launch with minimal flags
      console.log('🧪 Testing basic browser launch...');
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
          ],
          timeout: 30000
        });
        console.log('✅ Basic browser launch successful');
      } catch (launchError) {
        console.log(`❌ Basic browser launch failed: ${(launchError as Error).message}`);
        return { 
          success: false, 
          error: 'Browser launch failed',
          details: { 
            executablePath,
            launchError: (launchError as Error).message,
            stack: (launchError as Error).stack
          }
        };
      }
      
      // Test 3: Page creation and navigation
      console.log('🧪 Testing page creation and navigation...');
      let page;
      try {
        page = await browser.newPage();
        await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
        const title = await page.evaluate(() => document.querySelector('h1')?.textContent);
        console.log(`✅ Page navigation successful, content: "${title}"`);
      } catch (pageError) {
        await browser.close();
        console.log(`❌ Page navigation failed: ${(pageError as Error).message}`);
        return { 
          success: false, 
          error: 'Page navigation failed',
          details: { 
            executablePath,
            pageError: (pageError as Error).message
          }
        };
      }
      
      // Test 4: WhatsApp Web URL access (without login)
      console.log('🧪 Testing WhatsApp Web URL access...');
      try {
        await page.goto('https://web.whatsapp.com', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        const pageTitle = await page.title();
        console.log(`✅ WhatsApp Web accessible, title: "${pageTitle}"`);
      } catch (whatsappError) {
        await browser.close();
        console.log(`❌ WhatsApp Web access failed: ${(whatsappError as Error).message}`);
        return { 
          success: false, 
          error: 'WhatsApp Web access failed',
          details: { 
            executablePath,
            whatsappError: (whatsappError as Error).message
          }
        };
      }
      
      // Cleanup
      await page.close();
      await browser.close();
      
      const endTime = Date.now();
      const testDuration = endTime - startTime;
      
      console.log(`✅ Browser environment test completed successfully in ${testDuration}ms`);
      return { 
        success: true, 
        details: { 
          executablePath,
          testDuration,
          chromeVersion: await this.getChromeVersion(executablePath),
          environment: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            puppeteerVersion: require('puppeteer/package.json').version
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Browser environment test failed:', (error as Error).message);
      return { 
        success: false, 
        error: (error as Error).message,
        details: { 
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          stack: (error as Error).stack
        }
      };
    }
  }

  private async getChromeVersion(executablePath: string): Promise<string> {
    try {
      const { execSync } = require('child_process');
      const version = execSync(`${executablePath} --version`, { encoding: 'utf8' });
      return version.trim();
    } catch (error) {
      return 'Unknown';
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing WhatsApp client...');
      console.log(`📊 Current state: attempts=${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}, protocolErrors=${this.protocolErrorCount}/${this.MAX_PROTOCOL_ERRORS}`);
      
      this.isClientReady = false;
      this.isReady = false;
      this.connectionStatus = 'initializing';
      this.qrString = null;
      
      this.emit('status', { ready: false, message: 'Initializing WhatsApp...' });
      
      if (this.client) {
        try {
          await this.client.destroy();
          console.log('🗑️ Previous WhatsApp client destroyed');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (destroyError) {
          console.log('⚠️ Warning during WhatsApp client cleanup:', (destroyError as Error).message);
        }
      }

      // Configure Puppeteer for containerized environment
      let executablePath: string | undefined;
      
      // Try different Chrome paths in order of preference
      const chromePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];
      
      // Check if environment variable is set and file exists
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        try {
          if (require('fs').existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log('🔧 Using environment Chrome path:', executablePath);
          }
        } catch (e) {
          console.log('⚠️ Environment Chrome path check failed, trying alternatives');
        }
      }
      
      // If no environment path, try system paths
      if (!executablePath) {
        for (const chromePath of chromePaths) {
          try {
            if (require('fs').existsSync(chromePath)) {
              executablePath = chromePath;
              console.log('🔧 Using system Chrome path:', executablePath);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // If still no path found, let Puppeteer use its bundled Chrome
      if (!executablePath) {
        console.log('🔧 Using Puppeteer bundled Chrome');
      }
      
      console.log('🔧 Final Chromium configuration:', executablePath || 'Puppeteer default');

      // Use fallback configuration for repeated protocol errors
      const useMinimalConfig = this.protocolErrorCount >= 3;
      
      console.log('🔧 Browser configuration selection:');
      console.log(`   - Protocol errors: ${this.protocolErrorCount}/${this.MAX_PROTOCOL_ERRORS}`);
      console.log(`   - Using minimal config: ${useMinimalConfig}`);
      console.log(`   - Will use ultra-minimal: ${this.protocolErrorCount >= 8}`);
      
      const puppeteerConfig = this.getBrowserConfig(executablePath, useMinimalConfig);
      console.log('🔧 Browser config applied:', {
        timeout: puppeteerConfig.timeout,
        args: puppeteerConfig.args?.length || 0,
        viewport: puppeteerConfig.defaultViewport,
        pipe: puppeteerConfig.pipe
      });

      console.log('📦 Creating WhatsApp client with configuration...');
      
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './whatsapp_auth_data',
          clientId: 'synapse-whatsapp'
        }),
        puppeteer: puppeteerConfig,
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        qrMaxRetries: 3,
        authTimeoutMs: 300000, // 5 minutes
        takeoverOnConflict: false,
        restartOnAuthFail: true
      });
      
      console.log('✅ WhatsApp client created, setting up handlers...');
      this.setupClientHandlers();
      
      console.log('🚀 Starting WhatsApp client initialization...');
      const startTime = Date.now();
      
      // Add timeout wrapper for initialization with better error handling
      const initPromise = this.client.initialize().catch((initError) => {
        const duration = Date.now() - startTime;
        console.log(`❌ Client initialization failed after ${duration}ms: ${initError.message}`);
        
        // Handle specific protocol errors
        if (initError.message.includes('Protocol error') || initError.message.includes('Target closed')) {
          console.log('🔧 Detected protocol error, implementing recovery strategy...');
          throw new Error('Browser protocol error - will retry with clean state');
        }
        throw initError;
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(`⏰ WhatsApp initialization timeout after ${duration}ms`);
          reject(new Error('WhatsApp initialization timeout after 5 minutes'));
        }, 300000);
      });
      
      await Promise.race([initPromise, timeoutPromise]);
      
      const successDuration = Date.now() - startTime;
      console.log(`✅ WhatsApp client initialization completed in ${successDuration}ms`);
      
      this.reconnectAttempts = 0;
      this.protocolErrorCount = 0; // Reset protocol error count on success
      console.log('✅ WhatsApp Client initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp client:', (error as Error).message);
      this.connectionStatus = 'error';
      this.emit('status', { ready: false, message: `Initialization failed: ${(error as Error).message}` });
      
      // Handle protocol errors with more aggressive cleanup
      const isProtocolError = (error as Error).message.includes('Protocol error') || 
                              (error as Error).message.includes('Target closed') ||
                              (error as Error).message.includes('Browser protocol error');
      
      if (isProtocolError) {
        console.log('🧹 Protocol error detected - performing deep cleanup...');
        await this.performDeepCleanup();
      }
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        // Exponential backoff with longer delays for protocol errors
        const baseDelay = isProtocolError ? 30000 : 10000; // 30 seconds for protocol errors
        const delay = baseDelay + (this.reconnectAttempts * (isProtocolError ? 20000 : 5000));
        console.log(`🔄 Retrying WhatsApp initialization in ${delay/1000}s... Attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
        console.log(`🔧 ${isProtocolError ? 'Protocol error detected - using extended delay' : 'Standard retry'}`);
        setTimeout(() => this.initialize(), delay);
      } else {
        console.error('❌ Max WhatsApp reconnection attempts reached');
        this.connectionStatus = 'failed';
        this.emit('status', { ready: false, message: 'WhatsApp connection failed. Please restart the service.' });
      }
    }
  }

  private setupClientHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', (qr) => {
      console.log('🔗 WhatsApp QR Code received');
      this.qrString = qr;
      this.connectionStatus = 'qr_ready';
      
      qrcode.toDataURL(qr, (err, url) => {
        if (!err) {
          console.log('📱 WhatsApp QR Code generated');
          this.qrDataUrl = url;
          this.emit('qr', { qr: url, status: 'qr_ready' });
        } else {
          console.error('❌ Error generating WhatsApp QR code:', err);
          this.qrDataUrl = null;
          this.emit('qr', { qr: qr, status: 'qr_ready' });
        }
      });
    });

    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp authenticated successfully!');
      this.connectionStatus = 'authenticated';
      this.emit('status', { ready: false, message: 'WhatsApp authenticating...' });
    });

    this.client.on('auth_failure', (message) => {
      console.log('❌ WhatsApp authentication failed:', message);
      this.isClientReady = false;
      this.isReady = false;
      this.connectionStatus = 'auth_failed';
      this.qrString = null;
      this.qrDataUrl = null;
      this.emit('status', { ready: false, message: 'WhatsApp authentication failed. Please scan QR code again.' });
      this.emit('auth_failure', { status: 'auth_failed' });
      
      // Clear auth data and retry
      setTimeout(async () => {
        console.log('🔄 Clearing auth and re-initializing WhatsApp after auth failure...');
        try {
          await this.clearAuth();
          await new Promise(resolve => setTimeout(resolve, 3000));
          this.initialize();
        } catch (error) {
          console.error('❌ Error during auth failure recovery:', (error as Error).message);
        }
      }, 10000);
    });

    this.client.on('ready', async () => {
      console.log('✅ WhatsApp Client is ready!');
      this.isClientReady = true;
      this.isReady = true;
      this.connectionStatus = 'connected';
      this.qrString = null;
      this.qrDataUrl = null;
      
      this.emit('status', { ready: true, message: 'WhatsApp connected successfully!' });
      this.emit('ready', { status: 'connected' });
      
      console.log('🎯 WhatsApp monitoring keywords:', this.monitoredKeywords.join(', '));
      
      console.log('⏳ Waiting for WhatsApp to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Automatically fetch all chats and groups when ready
      try {
        console.log('🔄 Auto-fetching WhatsApp chats and groups...');
        await this.refreshChats();
        console.log('✅ Successfully auto-fetched chats on ready');
      } catch (autoFetchError) {
        console.log('⚠️ Auto-fetch failed, will rely on message discovery:', (autoFetchError as Error).message);
        // Emit with empty groups as fallback
        this.emit('chats_updated', { 
          groups: this.groups, 
          privateChats: this.privateChats,
          groupsCount: this.groups.length,
          privateChatsCount: this.privateChats.length,
          timestamp: new Date().toISOString(),
          discoveryMode: true,
          message: 'Ready - discovering chats from incoming messages'
        });
      }
      
      this.saveSession();
    });

    this.client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(message);
      } catch (error) {
        console.error('❌ Error handling WhatsApp message:', (error as Error).message);
      }
    });

    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp Client disconnected:', reason);
      this.isClientReady = false;
      this.isReady = false;
      this.connectionStatus = 'disconnected';
      this.emit('status', { ready: false, message: `WhatsApp disconnected: ${reason}` });
      
      // Handle protocol-related disconnections with extended delay
      const isProtocolError = reason && (
        reason.includes('Protocol error') || 
        reason.includes('Target closed') ||
        reason.includes('Connection terminated')
      );
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        const delay = isProtocolError ? 20000 + (this.reconnectAttempts * 15000) : 10000;
        console.log(`🔄 Attempting to reconnect WhatsApp... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
        console.log(`⏱️ Using ${delay/1000}s delay ${isProtocolError ? '(protocol error detected)' : ''}`);
        
        setTimeout(async () => {
          try {
            // Clean up client instance before reinitializing
            if (this.client) {
              try {
                await this.client.destroy();
              } catch (destroyError) {
                console.log('⚠️ Client destroy warning:', (destroyError as Error).message);
              }
              this.client = null;
            }
            // Add extra delay for protocol errors
            if (isProtocolError) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
            this.initialize();
          } catch (reconnectError) {
            console.error('❌ Error during reconnection:', (reconnectError as Error).message);
          }
        }, delay);
      } else {
        console.error('❌ Max WhatsApp reconnection attempts reached');
        this.connectionStatus = 'failed';
        this.emit('status', { ready: false, message: 'WhatsApp connection failed after maximum retries. Please restart the service.' });
      }
    });
  }

  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      if (message.from === 'status@broadcast' || message.id.remote === 'status@broadcast') {
        return;
      }
      
      const chat = await message.getChat();
      const contact = await message.getContact();
      
      if (chat.id._serialized === 'status@broadcast') {
        return;
      }
      
      await this.updateChatFromMessage(chat);

      const messageData: WhatsAppMessage = {
        id: message.id._serialized,
        body: message.body,
        from: message.from,
        fromMe: message.fromMe,
        timestamp: message.timestamp,
        type: message.type,
        isGroup: chat.isGroup,
        groupName: chat.isGroup ? chat.name : undefined,
        contactName: contact.pushname || contact.name || 'Unknown',
        chatId: chat.id._serialized,
        time: new Date().toLocaleString('he-IL'),
        isMedia: message.hasMedia || message.type !== 'chat'
      };

      this.messages.unshift(messageData);
      if (this.messages.length > 100) {
        this.messages = this.messages.slice(0, 100);
      }

      if (chat.isGroup) {
        const isMonitored = this.checkGroupAgainstKeywords(chat.name);
        if (isMonitored) {
          console.log('🎯 MONITORED WhatsApp GROUP MESSAGE DETECTED!');
          this.emit('monitoredMessage', {
            ...messageData,
            isMonitored: true,
            alert: true
          });
        }
      }

      this.emit('newMessage', messageData);
      
    } catch (error) {
      console.error('❌ Error processing WhatsApp message:', (error as Error).message);
    }
  }

  private async updateChatFromMessage(chat: any): Promise<void> {
    try {
      if (!chat || !chat.id || !chat.id._serialized) {
        return;
      }

      let participantCount = 0;
      let description = '';
      
      if (chat.isGroup) {
        try {
          // Use type assertion to handle TypeScript limitations with whatsapp-web.js types
          const participants = (chat as any).participants;
          participantCount = participants ? participants.length : 0;
          description = (chat as any).description || '';
        } catch (participantError) {
          console.log(`⚠️ Could not get participant count for WhatsApp group ${chat.name}`);
        }
      }

      const chatData: WhatsAppChat = {
        id: chat.id._serialized,
        name: chat.name || 'Unknown',
        lastMessage: new Date().toISOString(),
        timestamp: Date.now(),
        isGroup: chat.isGroup,
        participantCount: participantCount,
        description: description
      };

      if (chat.isGroup) {
        const existingGroupIndex = this.groups.findIndex(g => g.id === chat.id._serialized);
        
        if (existingGroupIndex === -1) {
          this.groups.push(chatData);
          console.log(`📁 New WhatsApp group discovered: "${chat.name}"`);
          
          if (this.checkGroupAgainstKeywords(chat.name)) {
            console.log('🎯 DISCOVERED MONITORED WhatsApp GROUP VIA MESSAGE!');
          }
          
          this.emit('chats_updated', { 
            groups: this.groups, 
            privateChats: this.privateChats,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            timestamp: new Date().toISOString(),
            newGroup: chatData
          });
        }
      } else {
        const existingChatIndex = this.privateChats.findIndex(c => c.id === chat.id._serialized);
        
        if (existingChatIndex === -1) {
          this.privateChats.push(chatData);
          console.log(`👤 New WhatsApp private chat discovered: "${chat.name}"`);
          
          if (this.privateChats.length > 100) {
            this.privateChats = this.privateChats.slice(-100);
          }
          
          this.emit('chats_updated', { 
            groups: this.groups, 
            privateChats: this.privateChats,
            groupsCount: this.groups.length,
            privateChatsCount: this.privateChats.length,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Error updating WhatsApp chat from message:', (error as Error).message);
    }
  }

  private checkGroupAgainstKeywords(groupName: string): boolean {
    if (!groupName) return false;
    const lowerGroupName = groupName.toLowerCase();
    return this.monitoredKeywords.some(keyword => 
      lowerGroupName.includes(keyword.toLowerCase())
    );
  }

  async sendMessage(to: string, message: string): Promise<void> {
    if (!this.isReady || !this.client) {
      throw new Error('WhatsApp not connected');
    }
    
    const messageText = Buffer.from(message, 'utf8').toString('utf8');
    console.log(`📤 Sending WhatsApp message to ${to}: "${messageText}"`);
    
    await this.client.sendMessage(to, messageText);
  }

  async refreshChats(): Promise<void> {
    if (!this.isClientReady || !this.client) {
      throw new Error('WhatsApp client not ready');
    }

    try {
      console.log('🔄 Refreshing WhatsApp chats...');
      const chats = await this.client.getChats();
      
      const groupChats = chats.filter(chat => chat.isGroup);
      const privateChatsData = chats.filter(chat => !chat.isGroup && chat.id._serialized !== 'status@broadcast').slice(0, 100);
      
      this.groups = [];
      this.privateChats = [];
      
      for (const chat of groupChats) {
        try {
          if (!chat || !chat.id || !chat.id._serialized || !chat.name) {
            continue;
          }
          
          const groupData: WhatsAppChat = {
            id: chat.id._serialized,
            name: chat.name,
            lastMessage: new Date().toISOString(),
            timestamp: Date.now(),
            isGroup: true,
            participantCount: 0,
            description: ''
          };
          
          try {
            // Use type assertion to handle TypeScript limitations
            const participants = (chat as any).participants;
            groupData.participantCount = participants ? participants.length : 0;
            groupData.description = (chat as any).description || '';
          } catch (participantError) {
            console.log(`⚠️ Could not get participant count for ${chat.name}`);
          }
          
          this.groups.push(groupData);
          
          if (this.checkGroupAgainstKeywords(chat.name)) {
            console.log(`🎯 Found monitored WhatsApp group: "${chat.name}"`);
          }
        } catch (chatError) {
          console.log(`⚠️ Error processing WhatsApp group:`, (chatError as Error).message);
          continue;
        }
      }
      
      for (const chat of privateChatsData) {
        try {
          if (!chat || !chat.id || !chat.id._serialized) {
            continue;
          }
          
          const contact = await chat.getContact();
          const name = contact.pushname || contact.name || chat.name || chat.id.user;
          
          this.privateChats.push({
            id: chat.id._serialized,
            name: name,
            lastMessage: new Date().toISOString(),
            timestamp: Date.now(),
            isGroup: false
          });
        } catch (chatError) {
          console.log(`⚠️ Error processing WhatsApp private chat:`, (chatError as Error).message);
          continue;
        }
      }
      
      this.saveSession();
      console.log(`✅ WhatsApp chats refreshed - ${this.groups.length} groups, ${this.privateChats.length} private chats`);
      
      this.emit('chats_updated', { 
        groups: this.groups, 
        privateChats: this.privateChats,
        groupsCount: this.groups.length,
        privateChatsCount: this.privateChats.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error refreshing WhatsApp chats:', (error as Error).message);
      throw error;
    }
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
    return this.qrDataUrl;
  }

  async forceQRGeneration(): Promise<{ success: boolean; qrCode?: string; message: string }> {
    try {
      console.log('🔄 Force generating QR code for WhatsApp authentication...');
      
      // If already connected, don't generate QR
      if (this.isReady && this.isClientReady) {
        return {
          success: false,
          message: 'WhatsApp is already connected. No QR code needed.'
        };
      }

      // If we have a recent QR code, return it
      if (this.qrDataUrl) {
        console.log('📱 Returning existing QR code');
        return {
          success: true,
          qrCode: this.qrDataUrl,
          message: 'Existing QR code available for scanning'
        };
      }

      // Clear any existing failed client
      if (this.client) {
        try {
          await this.performDeepCleanup();
        } catch (cleanupError) {
          console.log('⚠️ Cleanup warning during force QR generation:', (cleanupError as Error).message);
        }
      }

      // Force a fresh initialization with QR focus
      console.log('🔄 Starting fresh initialization for QR generation...');
      this.connectionStatus = 'initializing';
      this.isReady = false;
      this.isClientReady = false;
      
      // Use minimal config for QR generation to avoid protocol errors
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable';
      const qrPuppeteerConfig = {
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-extensions',
          '--disable-web-security'
        ],
        timeout: 120000, // 2 minutes for QR generation
        defaultViewport: { width: 800, height: 600 },
        protocolTimeout: 120000,
        slowMo: 100,
        pipe: true,
        ignoreHTTPSErrors: true
      };

      // Create a temporary client just for QR generation
      const tempClient = new (require('whatsapp-web.js').Client)({
        authStrategy: new (require('whatsapp-web.js').LocalAuth)({
          dataPath: './whatsapp_auth_data',
          clientId: 'synapse-whatsapp-qr'
        }),
        puppeteer: qrPuppeteerConfig,
        qrMaxRetries: 1,
        authTimeoutMs: 120000
      });

      return new Promise((resolve) => {
        let qrReceived = false;
        let timeoutId: NodeJS.Timeout;

        // Set up QR handler
        tempClient.on('qr', (qr: string) => {
          if (qrReceived) return;
          qrReceived = true;
          
          console.log('📱 QR Code generated for force request');
          this.qrString = qr;
          this.connectionStatus = 'qr_ready';
          
          const qrcode = require('qrcode');
          qrcode.toDataURL(qr, (err: any, url: string) => {
            clearTimeout(timeoutId);
            
            // Clean up temp client
            tempClient.destroy().catch(() => {});
            
            if (!err && url) {
              this.qrDataUrl = url;
              this.emit('qr', { qr: url, status: 'qr_ready' });
              
              resolve({
                success: true,
                qrCode: url,
                message: 'QR code generated successfully for authentication'
              });
            } else {
              resolve({
                success: false,
                message: 'Failed to generate QR code image'
              });
            }
          });
        });

        // Handle auth success - user scanned QR
        tempClient.on('authenticated', () => {
          console.log('✅ QR Code scanned successfully!');
          clearTimeout(timeoutId);
          tempClient.destroy().catch(() => {});
          
          // Start normal initialization
          setTimeout(() => {
            this.initialize();
          }, 2000);
          
          if (!qrReceived) {
            resolve({
              success: true,
              message: 'QR code scanned successfully! WhatsApp is connecting...'
            });
          }
        });

        // Handle failures
        tempClient.on('auth_failure', () => {
          clearTimeout(timeoutId);
          tempClient.destroy().catch(() => {});
          
          if (!qrReceived) {
            resolve({
              success: false,
              message: 'QR code authentication failed. Please try again.'
            });
          }
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          tempClient.destroy().catch(() => {});
          
          if (!qrReceived) {
            resolve({
              success: false,
              message: 'QR code generation timed out. Please try restarting the service.'
            });
          }
        }, 120000); // 2 minutes timeout

        // Initialize temp client
        tempClient.initialize().catch((initError: Error) => {
          clearTimeout(timeoutId);
          tempClient.destroy().catch(() => {});
          
          if (!qrReceived) {
            console.error('❌ Temp client initialization failed:', initError.message);
            resolve({
              success: false,
              message: 'Failed to initialize QR generation client: ' + initError.message
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Error in force QR generation:', (error as Error).message);
      return {
        success: false,
        message: 'Force QR generation failed: ' + (error as Error).message
      };
    }
  }

  private resetErrorCounters(): void {
    console.log('🔄 Resetting error counters...');
    const oldReconnectAttempts = this.reconnectAttempts;
    const oldProtocolErrors = this.protocolErrorCount;
    
    this.reconnectAttempts = 0;
    this.protocolErrorCount = 0;
    
    console.log(`📊 Error counters reset: reconnectAttempts ${oldReconnectAttempts}→0, protocolErrors ${oldProtocolErrors}→0`);
  }

  async restart(): Promise<void> {
    console.log('🔄 Restarting WhatsApp client...');
    
    // Reset error counters on restart
    this.resetErrorCounters();
    
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('🗑️ WhatsApp client destroyed successfully');
      } catch (destroyError) {
        console.log('⚠️ Warning during WhatsApp client destruction:', (destroyError as Error).message);
      }
    }
    
    this.qrString = null;
    this.qrDataUrl = null;
    this.isReady = false;
    this.isClientReady = false;
    this.connectionStatus = 'disconnected';
    this.groups = [];
    this.privateChats = [];
    this.messages = [];
    
    this.emit('status', { ready: false, message: 'Restarting WhatsApp client...' });
    
    setTimeout(() => {
      this.initialize();
    }, 3000);
  }

  async clearAuth(): Promise<void> {
    console.log('🗑️ Clearing WhatsApp authentication data...');
    
    // Reset error counters when clearing auth
    this.resetErrorCounters();
    
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('🛑 WhatsApp client stopped');
      } catch (error) {
        console.log('⚠️ Warning during WhatsApp client stop:', (error as Error).message);
      }
    }
    
    try {
      await fs.remove('./whatsapp_auth_data');
      console.log('🗂️ WhatsApp auth data directory cleared');
    } catch (error) {
      console.log('⚠️ Warning clearing WhatsApp auth data:', (error as Error).message);
    }
    
    try {
      const sessionPath = path.join(process.cwd(), 'whatsapp_session_backup.json');
      if (fs.existsSync(sessionPath)) {
        await fs.remove(sessionPath);
        console.log('📄 WhatsApp session backup cleared');
      }
    } catch (error) {
      console.log('⚠️ Warning clearing WhatsApp session backup:', (error as Error).message);
    }
    
    this.qrString = null;
    this.qrDataUrl = null;
    this.isReady = false;
    this.isClientReady = false;
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.groups = [];
    this.privateChats = [];
    this.messages = [];
    
    this.emit('status', { ready: false, message: 'WhatsApp authentication data cleared. Restarting...' });
    
    setTimeout(() => {
      console.log('🔄 Restarting WhatsApp with clean state...');
      this.initialize();
    }, 2000);
  }

  private async performDeepCleanup(): Promise<void> {
    console.log('🧹 Starting deep cleanup process...');
    
    try {
      // Reset client state
      this.isReady = false;
      this.isClientReady = false;
      this.qrString = null;
      this.qrDataUrl = null;
      
      // Safely destroy client if it exists
      if (this.client) {
        try {
          // Check if client has a browser instance with defensive checks
          const clientWithPuppeteer = this.client as any;
          if (clientWithPuppeteer && clientWithPuppeteer.pupBrowser) {
            console.log('🧹 Closing Puppeteer browser...');
            try {
              // Additional null checks for browser methods
              if (typeof clientWithPuppeteer.pupBrowser.close === 'function') {
                await clientWithPuppeteer.pupBrowser.close();
              } else {
                console.log('⚠️ Browser close method not available');
              }
            } catch (browserError) {
              console.log('⚠️ Browser close warning:', (browserError as Error).message);
            }
          }
          
          // Try multiple destroy strategies
          console.log('🧹 Destroying WhatsApp client...');
          
          // Strategy 1: Standard destroy
          try {
            if (typeof this.client.destroy === 'function') {
              await this.client.destroy();
              console.log('✅ Client destroyed successfully');
            } else {
              console.log('⚠️ Client destroy method not available');
            }
          } catch (destroyError) {
            console.log('⚠️ Standard destroy failed:', (destroyError as Error).message);
            
            // Strategy 2: Try to access and close browser directly
            try {
              const client = this.client as any;
              if (client && client.pupPage && typeof client.pupPage.close === 'function') {
                await client.pupPage.close();
                console.log('✅ Closed browser page directly');
              }
              if (client && client.pupBrowser && typeof client.pupBrowser.close === 'function') {
                await client.pupBrowser.close();
                console.log('✅ Closed browser directly');
              }
            } catch (directCloseError) {
              console.log('⚠️ Direct browser close failed:', (directCloseError as Error).message);
            }
          }
          
        } catch (destroyError) {
          console.log('⚠️ Client cleanup error:', (destroyError as Error).message);
        } finally {
          // Force null the client regardless of cleanup success
          this.client = null;
          console.log('🔄 Client reference cleared');
        }
      } else {
        console.log('🔄 No client to cleanup');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        console.log('🧹 Running garbage collection...');
        global.gc();
      }
      
      // Increment protocol error count for fallback config
      this.protocolErrorCount++;
      console.log(`🔧 Protocol error count: ${this.protocolErrorCount}/${this.MAX_PROTOCOL_ERRORS}`);
      
      // Wait before allowing next initialization
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('✅ Deep cleanup completed');
    } catch (cleanupError) {
      console.error('❌ Error during deep cleanup:', (cleanupError as Error).message);
    }
  }

  private getBrowserConfig(executablePath: string | undefined, useMinimalConfig: boolean): any {
    // Ultra-minimal config for extreme environments (containers with severe limitations)
    if (this.protocolErrorCount >= 8) {
      console.log('🔧 Using ULTRA-MINIMAL browser configuration for maximum compatibility');
      return {
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        timeout: 600000, // 10 minutes for ultra-minimal
        defaultViewport: { width: 400, height: 300 },
        protocolTimeout: 600000,
        slowMo: 500, // Very slow for stability
        pipe: false, // Use websockets instead of pipes
        ignoreHTTPSErrors: true,
        dumpio: false,
        ignoreDefaultArgs: ['--disable-dev-shm-usage'], // Allow system to handle shm
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
      };
    }
    
    if (useMinimalConfig) {
      console.log('🔧 Using minimal browser configuration for maximum stability');
      return {
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows'
        ],
        timeout: 360000, // 6 minutes for minimal config
        defaultViewport: { width: 800, height: 600 },
        protocolTimeout: 360000,
        slowMo: 200, // Even slower for stability
        pipe: true,
        ignoreHTTPSErrors: true,
        dumpio: false
      };
    }

    // Full configuration
    return {
      headless: true,
      executablePath: executablePath,
      args: [
        // Core stability flags
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-gpu-sandbox',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI,VizDisplayCompositor,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-component-update',
        '--disable-client-side-phishing-detection',
        '--disable-sync',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-print-preview',
        '--disable-permissions-api',
        '--disable-prompt-on-repost',
        '--disable-hang-monitor',
        '--disable-background-mode',
        '--disable-plugins-discovery',
        '--disable-translate',
        '--disable-notifications',
        
        // Memory and resource management
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--js-flags="--max-old-space-size=4096"',
        '--aggressive-cache-discard',
        '--disable-histogram-customizer',
        '--disable-logging',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        
        // Network and stability
        '--no-zygote',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-experiments',
        '--single-process',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-accelerated-video-decode',
        '--disable-accelerated-video-encode',
        '--disable-gpu-memory-buffer-compositor-resources',
        '--disable-gpu-memory-buffer-video-frames',
        '--disable-partial-raster',
        '--disable-skia-runtime-opts',
        '--disable-system-font-check',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling',
        '--disable-in-process-stack-traces',
        '--disable-gl-extensions',
        '--disable-composited-antialiasing',
        '--disable-canvas-aa',
        '--disable-3d-apis',
        '--disable-app-list-dismiss-on-blur',
        '--force-color-profile=srgb',
        '--hide-scrollbars',
        '--mute-audio',
        '--shm-size=3gb'
      ],
      timeout: 300000, // 5 minutes
      defaultViewport: { width: 1280, height: 720 },
      ignoreDefaultArgs: false,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      protocolTimeout: 300000,
      slowMo: 100,
      devtools: false,
      ignoreHTTPSErrors: true,
      dumpio: false,
      pipe: true
    };
  }
}

export default WhatsAppService;