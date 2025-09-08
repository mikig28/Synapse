import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  Send,
  Phone,
  Search,
  QrCode,
  RefreshCw,
  Settings,
  Users,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  History,
  Download,
  ArrowLeft,
  Menu,
  X,
  Camera,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import useAuthStore from '@/store/authStore';
import api from '@/services/axiosConfig';
import SummaryModal from '@/components/whatsapp/SummaryModal';
import { GroupSummaryData } from '@/types/whatsappSummary';

interface WhatsAppMessage {
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

interface WhatsAppChat {
  id: string;
  name: string;
  lastMessage?: string;
  timestamp?: number;
  isGroup: boolean;
  participantCount?: number;
  description?: string;
  // Enhanced WAHA group metadata
  inviteCode?: string;
  picture?: string;
  role?: 'ADMIN' | 'MEMBER' | 'SUPERADMIN';
  settings?: {
    messagesAdminOnly?: boolean;
    infoAdminOnly?: boolean;
  };
}

interface WhatsAppStatus {
  connected: boolean;
  isReady: boolean;
  isClientReady: boolean;
  authenticated?: boolean;
  groupsCount: number;
  privateChatsCount: number;
  messagesCount: number;
  qrAvailable: boolean;
  timestamp: string;
  monitoredKeywords: string[];
  serviceType?: 'waha' | 'baileys'; // Track which service is being used
  sessionStatus?: string;
  // NEW: Enhanced monitoring fields
  imagesCount?: number;
  monitoringActive?: boolean;
  lastActivity?: string;
}

const WhatsAppPage: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [activeService, setActiveService] = useState<'waha' | 'baileys' | null>(null);
  const [groups, setGroups] = useState<WhatsAppChat[]>([]);
  const [privateChats, setPrivateChats] = useState<WhatsAppChat[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, WhatsAppMessage[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMethod, setAuthMethod] = useState<'qr' | 'phone'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isWaitingForCode, setIsWaitingForCode] = useState(false);
  const [phoneAuthStep, setPhoneAuthStep] = useState<'phone' | 'code'>('phone');
  const [phoneAuthSupported, setPhoneAuthSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [monitoredKeywords, setMonitoredKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [chatsFetchAttempts, setChatsFetchAttempts] = useState(0);
  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<GroupSummaryData | null>(null);
  
  // Mobile-specific states
  const [isMobile, setIsMobile] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  
  // NEW: store pairing code returned by backend (if engine supports it)
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isAuthenticated, token } = useAuthStore();

  // Helper function to normalize any chatId to a string (handle both string and object cases)
  const normalizeChatId = (chatId: any, context: string = 'unknown'): string | null => {
    if (!chatId) {
      console.warn(`[WhatsApp Frontend] Empty chatId in ${context}:`, chatId);
      return null;
    }
    
    if (typeof chatId === 'string') {
      return chatId;
    }
    
    if (typeof chatId === 'object' && chatId !== null) {
      // Extract string ID from object formats
      if ('_serialized' in chatId) {
        return chatId._serialized;
      } else if ('id' in chatId) {
        return chatId.id;
      } else {
        // Fallback: convert object to string, but this shouldn't happen
        console.warn(`[WhatsApp Frontend] ⚠️ Had to stringify ${context} ID object:`, chatId);
        return String(chatId);
      }
    }
    
    // Final fallback
    return String(chatId);
  };

  // Helper function to extract chatId from selectedChat.id (handle both string and object cases)
  const extractChatId = (chatObj: WhatsAppChat | null): string | undefined => {
    if (!chatObj || !chatObj.id) {
      console.log('[WhatsApp Frontend] extractChatId: No chat object or ID');
      return undefined;
    }
    
    console.log('[WhatsApp Frontend] extractChatId: Processing chat ID:', {
      chatId: chatObj.id,
      chatIdType: typeof chatObj.id,
      isObject: typeof chatObj.id === 'object',
      chatIdKeys: typeof chatObj.id === 'object' ? Object.keys(chatObj.id) : 'N/A'
    });
    
    if (typeof chatObj.id === 'string') {
      console.log('[WhatsApp Frontend] extractChatId: ID is string, returning:', chatObj.id);
      return chatObj.id;
    } else if (typeof chatObj.id === 'object') {
      // Handle case where id is an object (e.g., { _serialized: "123@g.us" })
      if ('_serialized' in chatObj.id) {
        const extracted = (chatObj.id as any)._serialized;
        console.log('[WhatsApp Frontend] extractChatId: Extracted from _serialized:', extracted);
        return extracted;
      } else if ('id' in chatObj.id) {
        const extracted = (chatObj.id as any).id;
        console.log('[WhatsApp Frontend] extractChatId: Extracted from id:', extracted);
        return extracted;
      } else if ('user' in chatObj.id) {
        const extracted = (chatObj.id as any).user;
        console.log('[WhatsApp Frontend] extractChatId: Extracted from user:', extracted);
        return extracted;
      } else {
        // Fallback: convert to string and check if it's valid
        const stringId = String(chatObj.id);
        console.log('[WhatsApp Frontend] extractChatId: Fallback string conversion:', stringId);
        if (stringId !== '[object Object]' && !stringId.includes('[object')) {
          return stringId;
        }
      }
    }
    
    console.log('[WhatsApp Frontend] extractChatId: Could not extract valid ID');
    return undefined;
  };

  // Helper function to validate chatId
  const isValidChatId = (chatId: string | undefined): boolean => {
    const isValid = chatId && 
           typeof chatId === 'string' && 
           chatId !== '[object Object]' && 
           !chatId.includes('[object');
    
    console.log('[WhatsApp Frontend] isValidChatId:', {
      chatId,
      chatIdType: typeof chatId,
      isValid,
      reason: !chatId ? 'no chatId' : 
              typeof chatId !== 'string' ? 'not a string' :
              chatId === '[object Object]' ? 'is [object Object]' :
              chatId.includes('[object') ? 'contains [object' : 'valid'
    });
    
    return isValid;
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-hide chat list on mobile when a chat is selected
  useEffect(() => {
    if (isMobile && selectedChat) {
      setShowChatList(false);
    }
  }, [isMobile, selectedChat]);

  // Socket.io setup - declare early to avoid hoisting issues
  const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_ROOT_URL || 'https://synapse-backend-7lq6.onrender.com';

  // Backend URL for Socket.io (non-API endpoints)
  const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_ROOT_URL || 'https://synapse-backend-7lq6.onrender.com';
  };

  useEffect(() => {
    fetchStatus();
    fetchGroups();
    fetchPrivateChats();
    fetchMessages();
    fetchMonitoredKeywords();
    
    // Intelligent status monitoring with enhanced exponential backoff (optimized for rate limiting)
    let pollInterval = 30000; // Start with 30 seconds (reduced from 15s to prevent rate limiting)
    let failureCount = 0;
    let connectionFailureDetected = false;
    let statusCheckTimer: NodeJS.Timeout;
    
    const checkStatus = async () => {
      const prevAuthenticated = status?.authenticated;
      const prevConnected = status?.connected;
      
      try {
        await fetchStatus();
        failureCount = 0; // Reset on success
        connectionFailureDetected = false; // Reset connection failure flag
        
        // Use longer base interval to reduce server load and prevent rate limiting
        pollInterval = status?.authenticated ? 45000 : 30000; // 45s when authenticated, 30s when not
        
        // Check if we just became authenticated (polling fallback)
        if (!prevAuthenticated && status?.authenticated) {
          console.log('[WhatsApp Status Polling] Authentication detected, fetching chats...');
          toast({
            title: "WhatsApp Connected",
            description: "Authentication successful! Loading your chats...",
          });
          
          // Fetch data with a small delay to ensure backend is ready
          setTimeout(() => {
            fetchGroups();
            fetchPrivateChats();
            fetchMessages();
          }, 1000);
          
          // Reduce polling frequency after successful auth
          pollInterval = 60000; // 60 seconds when authenticated and stable
        }
        
        // Also check for connection changes
        if (!prevConnected && status?.connected) {
          console.log('[WhatsApp Status Polling] Connection detected, updating UI...');
          fetchMonitoredKeywords();
          // Reduce polling frequency when connected
          pollInterval = 60000; // 60 seconds when connected and stable
        }
      } catch (error: any) {
        failureCount++;
        
        // Check for rate limiting errors (405, 429)
        if (error?.response?.status === 405 || error?.response?.status === 429) {
          console.warn('[WhatsApp Status Polling] 🚨 Rate limiting detected, entering extended backoff');
          connectionFailureDetected = true;
          pollInterval = Math.min(pollInterval * 3, 300000); // More aggressive backoff, max 5 minutes
        } else {
          // Exponential backoff on other failures
          pollInterval = Math.min(pollInterval * 1.5, 120000); // Max 2 minutes for other errors
        }
        
        console.error('[WhatsApp Status Polling] Error checking status:', error?.response?.status || error.message);
        
        // Show user-friendly error for connection issues
        if (connectionFailureDetected && failureCount === 1) {
          toast({
            title: "Connection Issue Detected",
            description: "WhatsApp service is recovering. Polling frequency reduced to prevent rate limiting.",
            variant: "default",
          });
        }
      }
      
      // Schedule next check
      statusCheckTimer = setTimeout(checkStatus, pollInterval);
    };
    
    // Start the status check
    statusCheckTimer = setTimeout(checkStatus, 5000); // Initial check after 5 seconds
    
    return () => {
      if (statusCheckTimer) {
        clearTimeout(statusCheckTimer);
      }
    };
  }, [status?.authenticated]); // Watch for authentication state changes

  // Socket.io connection setup
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsSocketConnected(false);
      }
      return;
    }

    console.log(`[WhatsApp Socket.IO] Attempting to connect to: ${SOCKET_SERVER_URL}`);

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
      forceNew: true,
      upgrade: true,
      rememberUpgrade: false
    });

    setSocket(newSocket);
    newSocket.connect();

    // Connection events
    newSocket.on('connect', () => {
      console.log('[WhatsApp Socket.IO] ✅ Connected to server');
      setIsSocketConnected(true);
      toast({
        title: "WhatsApp Connected",
        description: "Real-time updates enabled",
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('[WhatsApp Socket.IO] ❌ Connection error:', error);
      setIsSocketConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to WhatsApp service",
        variant: "destructive",
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[WhatsApp Socket.IO] 🔌 Disconnected from server:', reason);
      setIsSocketConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`[WhatsApp Socket.IO] 🔄 Reconnected after ${attemptNumber} attempts`);
      setIsSocketConnected(true);
      toast({
        title: "Reconnected",
        description: "WhatsApp service connection restored",
      });
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('[WhatsApp Socket.IO] ❌ Reconnection error:', error);
    });

    // WhatsApp-specific events
    newSocket.on('whatsapp:message', (messageData: WhatsAppMessage) => {
      console.log('[WhatsApp Socket.IO] Received new message:', messageData);
      
      // Add new message to the list 
      setMessages(prevMessages => {
        const exists = prevMessages.find(m => m.id === messageData.id);
        if (exists) return prevMessages;
        const updatedMessages = [messageData, ...prevMessages].slice(0, 100);
        
        // Update cache if this message is for the current chat
        if (messageData.chatId && selectedChat) {
          const selectedChatId = extractChatId(selectedChat);
          if (selectedChatId === messageData.chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [messageData.chatId]: updatedMessages
            }));
          }
        }
        
        return updatedMessages;
      });

      // Show toast notification for monitored messages
      if (messageData.isGroup && monitoredKeywords.some(keyword => 
        messageData.groupName?.toLowerCase().includes(keyword.toLowerCase())
      )) {
        toast({
          title: "🎯 Monitored Message",
          description: `${messageData.contactName} in ${messageData.groupName}: ${messageData.body?.substring(0, 50)}...`,
        });
      }
    });

    newSocket.on('whatsapp:qr', (qrData: { qr: string; status: string }) => {
      console.log('[WhatsApp Socket.IO] QR Code updated');
      setQrCode(qrData.qr);
      if (qrData.status === 'qr_ready') {
        setShowQR(true);
        toast({
          title: "QR Code Ready",
          description: "New QR code available for WhatsApp authentication",
        });
      }
    });

    newSocket.on('whatsapp:status', (statusData: any) => {
      console.log('[WhatsApp Socket.IO] Status updated:', statusData);
      const wasAuthenticated = status?.authenticated;
      const isNowAuthenticated = statusData.authenticated;
      
      setStatus(prevStatus => ({ ...prevStatus, ...statusData }));
      
      // If WhatsApp just became authenticated, fetch chats and groups
      if (!wasAuthenticated && isNowAuthenticated) {
        console.log('[WhatsApp Socket.IO] Authentication successful, fetching chats...');
        setLoadingChats(true);
        
        toast({
          title: "WhatsApp Connected",
          description: "Loading your chats and groups...",
        });
        
        // Fetch data after authentication with loading indicators
        setTimeout(() => {
          Promise.all([
            fetchGroups(true),
            fetchPrivateChats(true),
            fetchMessages()
          ]).then(() => {
            console.log('[WhatsApp Socket.IO] ✅ All data fetched after authentication');
            setLoadingChats(false);
          }).catch((error) => {
            console.error('[WhatsApp Socket.IO] ❌ Error fetching data after authentication:', error);
            setLoadingChats(false);
            toast({
              title: "Chat Loading Issue",
              description: "WhatsApp connected but couldn't load chats. Please refresh.",
              variant: "destructive",
            });
          });
        }, 1000); // Small delay to ensure backend is ready
        
        // Close auth modal if open
        setShowAuth(false);
        setShowQR(false);
      }
      
      // If connection was lost, show notification
      if (wasAuthenticated && !isNowAuthenticated) {
        toast({
          title: "WhatsApp Disconnected", 
          description: "Connection to WhatsApp was lost",
          variant: "destructive",
        });
      }
    });

    newSocket.on('whatsapp:chats_updated', (chatsData: any) => {
      console.log('[WhatsApp Socket.IO] Chats updated:', chatsData);
      
      if (chatsData.groups && Array.isArray(chatsData.groups)) {
        console.log(`[WhatsApp Socket.IO] ✅ Received ${chatsData.groups.length} groups`);
        setGroups(chatsData.groups);
      }
      if (chatsData.privateChats && Array.isArray(chatsData.privateChats)) {
        console.log(`[WhatsApp Socket.IO] ✅ Received ${chatsData.privateChats.length} private chats`);
        setPrivateChats(chatsData.privateChats);
      }
      
      // Track fetch attempts for debugging
      if (chatsData.fetchAttempts) {
        setChatsFetchAttempts(chatsData.fetchAttempts);
      }
      
      // Show success notification when chats are loaded
      if (chatsData.totalCount > 0) {
        toast({
          title: "Chats Loaded Successfully",
          description: `Loaded ${chatsData.totalCount} chats (${chatsData.groups?.length || 0} groups, ${chatsData.privateChats?.length || 0} private)`,
        });
      }
      
      // Show notification for new groups/chats
      if (chatsData.newGroup) {
        toast({
          title: "New Group Discovered",
          description: `Found new WhatsApp group: ${chatsData.newGroup.name}`,
        });
      }
    });

    newSocket.on('whatsapp:authenticated', (authData: any) => {
      console.log('[WhatsApp Socket.IO] 🎉 Authentication event received:', authData);
      toast({
        title: "WhatsApp Authentication Successful",
        description: `Connected via ${authData.method} method`,
      });
      
      // Immediately fetch status and data
      setTimeout(() => {
        fetchStatus();
        fetchGroups();
        fetchPrivateChats();
        fetchMessages();
        fetchMonitoredKeywords();
      }, 500);
      
      // Close auth modals
      setShowAuth(false);
      setShowQR(false);
    });

    // NEW: Image message monitoring for real-time extraction
    newSocket.on('whatsapp:image-message', (imageData: any) => {
      console.log('[WhatsApp Socket.IO] 📷 New image message received:', imageData);
      
      // Update message counts in status
      setStatus(prevStatus => ({
        ...prevStatus,
        messagesCount: (prevStatus?.messagesCount || 0) + 1,
        timestamp: new Date().toISOString()
      }));
      
      // Show notification for extractable images
      if (imageData.extractable && showMonitoring) {
        toast({
          title: "New Image Available",
          description: `${imageData.senderName} shared an image in ${imageData.chatName}`,
          action: {
            label: "Extract",
            onClick: () => extractImageFromMessage(imageData.messageId)
          }
        });
      }
    });

    // NEW: Monitoring statistics updates
    newSocket.on('whatsapp:monitoring-stats', (stats: any) => {
      console.log('[WhatsApp Socket.IO] 📊 Monitoring stats updated:', stats);
      
      // Update status with real-time counts
      setStatus(prevStatus => ({
        ...prevStatus,
        messagesCount: stats.totalMessages || prevStatus?.messagesCount || 0,
        imagesCount: stats.totalImages || 0,
        monitoringActive: stats.active || false,
        lastActivity: stats.lastActivity || new Date().toISOString()
      }));
    });

    // NEW: Group message monitoring for keyword detection
    newSocket.on('whatsapp:keyword-match', (matchData: any) => {
      console.log('[WhatsApp Socket.IO] 🔍 Keyword match detected:', matchData);
      
      if (showMonitoring) {
        toast({
          title: `Keyword Match: "${matchData.keyword}"`,
          description: `${matchData.senderName} in ${matchData.chatName}: ${matchData.message.substring(0, 50)}...`,
          variant: "default"
        });
      }
    });

    return () => {
      console.log('[WhatsApp Socket.IO] Cleaning up socket connection');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('whatsapp:message');
      newSocket.off('whatsapp:qr');
      newSocket.off('whatsapp:status');
      newSocket.off('whatsapp:chats_updated');
      newSocket.off('whatsapp:authenticated');
      newSocket.off('whatsapp:image-message');
      newSocket.off('whatsapp:monitoring-stats');
      newSocket.off('whatsapp:keyword-match');
      if (newSocket.connected) {
        newSocket.close();
      }
      setSocket(null);
      setIsSocketConnected(false);
    };
  }, [isAuthenticated, token, monitoredKeywords]);

  // Automatic message polling for real-time monitoring
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    
    if (status?.authenticated && showMonitoring && isSocketConnected) {
      console.log('[WhatsApp Monitoring] Starting automatic message polling');
      
      const pollForNewMessages = async () => {
        try {
          // Only poll if we're monitoring and have groups
          if (groups.length === 0) return;
          
          console.log('[WhatsApp Monitoring] Polling for new messages...');
          
          // Fetch latest messages from all monitored groups
          const recentMessages = await api.get('/waha/messages?limit=10');
          
          if (recentMessages.data.success && recentMessages.data.data) {
            const newMessages = recentMessages.data.data;
            
            // Update message count
            if (newMessages.length > 0) {
              setStatus(prevStatus => ({
                ...prevStatus,
                messagesCount: Math.max((prevStatus?.messagesCount || 0), newMessages.length),
                lastActivity: new Date().toISOString()
              }));
              
              // Count image messages
              const imageCount = newMessages.filter((msg: any) => 
                msg.isMedia && (msg.type === 'image' || msg.mimeType?.startsWith('image/'))
              ).length;
              
              if (imageCount > 0) {
                setStatus(prevStatus => ({
                  ...prevStatus,
                  imagesCount: (prevStatus?.imagesCount || 0) + imageCount
                }));
              }
            }
          }
        } catch (error) {
          console.error('[WhatsApp Monitoring] Polling error:', error);
        }
      };
      
      // Poll every 30 seconds when monitoring is active
      pollingInterval = setInterval(pollForNewMessages, 30000);
      
      // Initial poll
      pollForNewMessages();
    }
    
    return () => {
      if (pollingInterval) {
        console.log('[WhatsApp Monitoring] Stopping automatic message polling');
        clearInterval(pollingInterval);
      }
    };
  }, [status?.authenticated, showMonitoring, isSocketConnected, groups.length]);

  // Define scrollToBottom function early
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages for selected chat if we don't have any yet
  useEffect(() => {
    if (selectedChat) {
      console.log('[WhatsApp Frontend] selectedChat useEffect triggered:', {
        chatName: selectedChat.name,
        chatId: selectedChat.id,
        chatIdType: typeof selectedChat.id,
        chatIdKeys: typeof selectedChat.id === 'object' ? Object.keys(selectedChat.id) : 'N/A'
      });
      
      // Extract and validate chatId using helper function
      const chatId = extractChatId(selectedChat);
      
      if (isValidChatId(chatId)) {
        console.log(`[WhatsApp Frontend] ✅ Fetching messages for valid chatId: ${chatId}`);
        fetchMessages(chatId).then(() => {
          // If no messages were found, try with a different chat ID format
          const chatMessages = messages.filter(msg => msg.chatId === chatId);
          if (chatMessages.length === 0 && chatId.includes('@')) {
            // Try without domain suffix for some IDs
            const simplifiedId = chatId.split('@')[0];
            console.log(`[WhatsApp Frontend] Trying simplified chat ID: ${simplifiedId}`);
            fetchMessages(simplifiedId);
          }
        });
      } else {
        console.warn('[WhatsApp Frontend] Invalid selectedChat.id, cannot fetch messages:', selectedChat.id);
        console.warn('[WhatsApp Frontend] selectedChat.id structure:', JSON.stringify(selectedChat.id, null, 2));
      }
    }
  }, [selectedChat?.id]); // Only depend on the ID to avoid circular dependencies

  const fetchStatus = async () => {
    try {
      // Try WAHA endpoint first
      const response = await api.get('/waha/status');
      if (response.data.success) {
        const statusData = response.data.data;
        console.log('[WhatsApp Frontend] WAHA Status:', statusData);
        
        // Enhanced status with proper authentication check
        const enhancedStatus = {
          connected: statusData.connected || statusData.isReady || false,
          isReady: statusData.isReady || false,
          isClientReady: statusData.isClientReady || statusData.isReady || false,
          authenticated: statusData.authenticated || statusData.isReady || false,
          groupsCount: statusData.groupsCount || status?.groupsCount || 0,
          privateChatsCount: statusData.privateChatsCount || status?.privateChatsCount || 0,
          messagesCount: statusData.messagesCount || status?.messagesCount || 0,
          qrAvailable: statusData.qrAvailable || (!statusData.isReady && !statusData.authenticated),
          timestamp: statusData.timestamp || new Date().toISOString(),
          monitoredKeywords: statusData.monitoredKeywords || [],
          serviceType: 'waha' as const,
          sessionStatus: statusData.status || 'UNKNOWN'
        };
        
        setStatus(enhancedStatus);
        setActiveService('waha');
        console.log('✅ Using WAHA service (modern)');
        
        // If authenticated and we don't have chats yet, fetch them
        if (enhancedStatus.authenticated && groups.length === 0 && privateChats.length === 0) {
          console.log('[WhatsApp Frontend] Authenticated but no chats loaded, fetching...');
          setTimeout(() => {
            fetchGroups(true);
            fetchPrivateChats(true);
            fetchMessages();
          }, 1000);
        }
      }
    } catch (error: any) {
      console.error('Error fetching WAHA status, trying legacy:', error);
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await api.get('/whatsapp/status');
        if (fallbackResponse.data.success) {
          const statusData = fallbackResponse.data.data;
          
          const enhancedStatus = {
            ...statusData,
            authenticated: statusData.authenticated || statusData.connected || false,
            serviceType: 'baileys' as const
          };
          
          setStatus(enhancedStatus);
          setActiveService('baileys');
          console.log('⚠️ Using Baileys service (fallback)');
          
          // If authenticated and we don't have chats yet, fetch them
          if (enhancedStatus.authenticated && groups.length === 0 && privateChats.length === 0) {
            console.log('[WhatsApp Frontend] Authenticated but no chats loaded, fetching...');
            setTimeout(() => {
              fetchGroups(true);
              fetchPrivateChats(true);
              fetchMessages();
            }, 1000);
          }
        }
      } catch (fallbackError) {
        console.error('Error fetching WhatsApp status:', fallbackError);
        setActiveService(null);
        
        // Set a default status to prevent UI errors
        setStatus({
          connected: false,
          isReady: false,
          isClientReady: false,
          authenticated: false,
          groupsCount: 0,
          privateChatsCount: 0,
          messagesCount: 0,
          qrAvailable: true,
          timestamp: new Date().toISOString(),
          monitoredKeywords: [],
          serviceType: undefined
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async (showLoading = false, options?: { limit?: number; offset?: number }) => {
    try {
      if (showLoading) setLoadingChats(true);
      
      // Build WAHA-compliant query parameters
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());
      
      const queryString = params.toString();
      
      // Try WAHA modern endpoint
      try {
        const wahaEndpoint = `/waha/groups${queryString ? `?${queryString}` : ''}`;
        console.log(`[WhatsApp Frontend] Fetching groups from: ${wahaEndpoint}`);
        const wahaRes = await api.get(wahaEndpoint);
        
        if (wahaRes.data.success) {
          const groupsData = wahaRes.data.data || [];
          console.log(`[WhatsApp Frontend] ✅ Fetched ${groupsData.length} groups via WAHA`);
          
          // Process groups to ensure they have proper structure
          const processedGroups = groupsData
            .map((group: any) => {
              // Normalize the ID to always be a string using helper
              const normalizedId = normalizeChatId(group.id || group._id, 'WAHA group');
              
              // Return null for invalid groups so they can be filtered out
              if (!normalizedId) {
                console.warn(`[WhatsApp Frontend] ⚠️ Skipping WAHA group with invalid ID:`, {
                  groupName: group.name || group.subject || 'Unnamed',
                  originalId: group.id,
                  _id: group._id
                });
                return null;
              }
              
              const processedGroup = {
                id: normalizedId,
              name: group.name || group.subject || 'Unnamed Group',
              lastMessage: group.lastMessage?.body || group.lastMessage,
              timestamp: group.timestamp,
              isGroup: true,
              participantCount: group.participantCount || group.participants?.length || 0,
              description: group.description || group.desc,
              inviteCode: group.inviteCode,
              picture: group.picture,
              role: group.role,
              settings: group.settings
            };
            
            // Log chat ID structure for debugging
            console.log('[WhatsApp Frontend] Processed group ID:', {
              originalId: group.id,
              originalIdType: typeof group.id,
              originalIdKeys: typeof group.id === 'object' ? Object.keys(group.id) : 'N/A',
              processedId: processedGroup.id,
              processedIdType: typeof processedGroup.id,
              groupName: processedGroup.name
            });
            
            return processedGroup;
          })
          .filter(Boolean); // Remove null entries (invalid groups)
          
          console.log(`[WhatsApp Frontend] ✅ Processed ${processedGroups.length} valid groups (filtered out ${groupsData.length - processedGroups.length} invalid)`);
          
          // Show metadata if available
          if (wahaRes.data.metadata) {
            console.log(`[WhatsApp Frontend] Group metadata:`, wahaRes.data.metadata);
          }
          
          // Append new groups if offset is provided (pagination), otherwise replace
          if (options?.offset && options.offset > 0) {
            setGroups(prevGroups => [...prevGroups, ...processedGroups]);
          } else {
            setGroups(processedGroups);
          }
          
          // Update status with group count
          setStatus(prevStatus => prevStatus ? {
            ...prevStatus,
            groupsCount: processedGroups.length
          } : null);
          
          return wahaRes.data;
        }
      } catch (wahaError: any) {
        console.error('[WhatsApp Frontend] WAHA groups endpoint failed:', wahaError);
        
        // If it's an authentication error, show specific message
        if (wahaError.response?.status === 401) {
          throw wahaError;
        }
      }
      
      // Fallback to legacy endpoint
      console.log('[WhatsApp Frontend] Trying legacy groups endpoint');
      const legacyRes = await api.get('/whatsapp/groups');
      if (legacyRes.data.success) {
        const groupsData = legacyRes.data.data || [];
        console.log(`[WhatsApp Frontend] ✅ Fetched ${groupsData.length} groups via legacy`);
        
        // Process legacy groups
        const processedGroups = groupsData
          .map((group: any) => {
            // Normalize the ID to always be a string using helper
            const normalizedId = normalizeChatId(group.id || group._id, 'legacy group');
            
            // Return null for invalid groups so they can be filtered out
            if (!normalizedId) {
              console.warn(`[WhatsApp Frontend] ⚠️ Skipping legacy group with invalid ID:`, {
                groupName: group.name || 'Unnamed',
                originalId: group.id,
                _id: group._id
              });
              return null;
            }
            
            const processedGroup = {
              id: normalizedId,
            name: group.name || 'Unnamed Group',
            lastMessage: group.lastMessage,
            timestamp: group.timestamp,
            isGroup: true,
            participantCount: group.participantCount || 0,
            description: group.description
          };
          
          // Log chat ID structure for debugging
          console.log('[WhatsApp Frontend] Processed legacy group ID:', {
            originalId: group.id,
            originalIdType: typeof group.id,
            originalIdKeys: typeof group.id === 'object' ? Object.keys(group.id) : 'N/A',
            processedId: processedGroup.id,
            processedIdType: typeof processedGroup.id,
            groupName: processedGroup.name
          });
          
          return processedGroup;
        })
        .filter(Boolean); // Remove null entries (invalid groups)
        
        console.log(`[WhatsApp Frontend] ✅ Processed ${processedGroups.length} valid legacy groups (filtered out ${groupsData.length - processedGroups.length} invalid)`);
        
        setGroups(processedGroups);
        setStatus(prevStatus => prevStatus ? {
          ...prevStatus,
          groupsCount: processedGroups.length
        } : null);
        
        return legacyRes.data;
      }
    } catch (error: any) {
      console.error('Error fetching WhatsApp groups:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        toast({
          title: "WhatsApp Authentication Required",
          description: "Please scan the QR code with your WhatsApp mobile app to authenticate.",
          variant: "destructive",
        });
      } else if (error.response?.status === 503) {
        toast({
          title: "WhatsApp Service Starting",
          description: "Please wait a moment for the WhatsApp service to initialize.",
          variant: "default",
        });
      } else {
        toast({
          title: "Chat Loading Issue",
          description: "Unable to load WhatsApp groups. Please try refreshing.",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) setLoadingChats(false);
    }
  };

  const fetchPrivateChats = async (showLoading = false) => {
    try {
      if (showLoading) setLoadingChats(true);
      
      // Try WAHA modern endpoint
      try {
        const wahaRes = await api.get('/waha/private-chats?limit=200');
        console.log(`[WhatsApp Frontend] Fetching private chats from WAHA`);
        
        if (wahaRes.data.success) {
          const chatsData = wahaRes.data.data || [];
          console.log(`[WhatsApp Frontend] ✅ Fetched ${chatsData.length} private chats via WAHA`);
          
          // Process private chats to ensure proper structure
          const processedChats = chatsData
            .map((chat: any) => {
              // Normalize the ID to always be a string using helper
              const normalizedId = normalizeChatId(chat.id || chat._id, 'WAHA private chat');
              
              // Return null for invalid chats so they can be filtered out
              if (!normalizedId) {
                console.warn(`[WhatsApp Frontend] ⚠️ Skipping WAHA private chat with invalid ID:`, {
                  chatName: chat.name || chat.pushName || 'Unknown',
                  originalId: chat.id,
                  _id: chat._id
                });
                return null;
              }
              
              const processedChat = {
                id: normalizedId,
              name: chat.name || chat.pushName || chat.number || 'Unknown Contact',
              lastMessage: chat.lastMessage?.body || chat.lastMessage,
              timestamp: chat.timestamp,
              isGroup: false,
              description: chat.status || chat.about
            };
            
            // Log chat ID structure for debugging
            console.log('[WhatsApp Frontend] Processed private chat ID:', {
              originalId: chat.id,
              originalIdType: typeof chat.id,
              originalIdKeys: typeof chat.id === 'object' ? Object.keys(chat.id) : 'N/A',
              processedId: processedChat.id,
              processedIdType: typeof processedChat.id,
              chatName: processedChat.name
            });
            
            return processedChat;
          })
          .filter(Boolean); // Remove null entries (invalid chats)
          
          console.log(`[WhatsApp Frontend] ✅ Processed ${processedChats.length} valid WAHA private chats (filtered out ${chatsData.length - processedChats.length} invalid)`);
          
          setPrivateChats(processedChats);
          setStatus(prevStatus => prevStatus ? {
            ...prevStatus,
            privateChatsCount: processedChats.length
          } : null);
          
          return;
        }
      } catch (wahaError: any) {
        console.error('[WhatsApp Frontend] WAHA private chats endpoint failed:', wahaError);
        
        if (wahaError.response?.status === 401) {
          throw wahaError;
        }
      }
      
      // Fallback to legacy endpoint
      console.log('[WhatsApp Frontend] Trying legacy private chats endpoint');
      const legacyRes = await api.get('/whatsapp/private-chats');
      if (legacyRes.data.success) {
        const chatsData = legacyRes.data.data || [];
        console.log(`[WhatsApp Frontend] ✅ Fetched ${chatsData.length} private chats via legacy`);
        
        const processedChats = chatsData
          .map((chat: any) => {
            // Normalize the ID to always be a string using helper
            const normalizedId = normalizeChatId(chat.id || chat._id, 'legacy private chat');
            
            // Return null for invalid chats so they can be filtered out
            if (!normalizedId) {
              console.warn(`[WhatsApp Frontend] ⚠️ Skipping legacy private chat with invalid ID:`, {
                chatName: chat.name || 'Unknown',
                originalId: chat.id,
                _id: chat._id
              });
              return null;
            }
            
            const processedChat = {
              id: normalizedId,
            name: chat.name || 'Unknown Contact',
            lastMessage: chat.lastMessage,
            timestamp: chat.timestamp,
            isGroup: false
          };
          
          // Log chat ID structure for debugging
          console.log('[WhatsApp Frontend] Processed legacy private chat ID:', {
            originalId: chat.id,
            originalIdType: typeof chat.id,
            originalIdKeys: typeof chat.id === 'object' ? Object.keys(chat.id) : 'N/A',
            processedId: processedChat.id,
            processedIdType: typeof processedChat.id,
            chatName: processedChat.name
          });
          
          return processedChat;
        })
        .filter(Boolean); // Remove null entries (invalid chats)
        
        console.log(`[WhatsApp Frontend] ✅ Processed ${processedChats.length} valid legacy private chats (filtered out ${chatsData.length - processedChats.length} invalid)`);
        
        setPrivateChats(processedChats);
        setStatus(prevStatus => prevStatus ? {
          ...prevStatus,
          privateChatsCount: processedChats.length
        } : null);
      }
    } catch (error: any) {
      console.error('Error fetching WhatsApp private chats:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        toast({
          title: "WhatsApp Authentication Required",
          description: "Please scan the QR code with your WhatsApp mobile app to authenticate.",
          variant: "destructive",
        });
      } else if (error.response?.status === 503) {
        toast({
          title: "WhatsApp Service Starting",
          description: "Please wait a moment for the WhatsApp service to initialize.",
          variant: "default",
        });
      } else {
        toast({
          title: "Chat Loading Issue",
          description: "Unable to load private chats. Please try refreshing.",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) setLoadingChats(false);
    }
  };

  const fetchMessages = async (chatId?: string, forceRefresh: boolean = false) => {
    try {
      console.log('[WhatsApp Frontend] fetchMessages called:', {
        chatId,
        chatIdType: typeof chatId,
        forceRefresh,
        chatIdValid: chatId && typeof chatId === 'string' && chatId !== '[object Object]' && !chatId.includes('[object')
      });
      
      // Validate chatId if provided - CRITICAL: Stop execution if invalid
      if (chatId && (typeof chatId !== 'string' || chatId === '[object Object]' || chatId.includes('[object'))) {
        console.error('[WhatsApp Frontend] ❌ Invalid chatId detected in fetchMessages:', {
          chatId,
          type: typeof chatId,
          stringified: String(chatId)
        });
        toast({
          title: "Error",
          description: "Invalid chat ID format. Please select a chat again.",
          variant: "destructive",
        });
        return;
      }
      
      // Set loading state for refresh
      if (forceRefresh) {
        setRefreshingMessages(true);
      }
      
      // Check cache first if not forcing refresh
      if (chatId && !forceRefresh && messagesCache[chatId]) {
        console.log(`[WhatsApp Frontend] Using cached messages for ${chatId}`);
        setMessages(messagesCache[chatId]);
        return;
      }
      
      // Try WAHA modern endpoint
      try {
        const wahaEndpoint = chatId
          ? `/waha/messages?chatId=${encodeURIComponent(chatId)}&limit=50`
          : '/waha/messages?limit=50';
        
        console.log(`[WhatsApp Frontend] Fetching from: ${wahaEndpoint}`);
        const wahaRes = await api.get(wahaEndpoint);
        
        if (wahaRes.data.success) {
          const messagesData = wahaRes.data.data || [];
          console.log(`[WhatsApp Frontend] ✅ Fetched ${messagesData.length} messages via WAHA`);
          
          // Process messages to ensure proper structure
          const processedMessages = messagesData.map((msg: any) => ({
            id: msg.id || msg._id || `msg_${Date.now()}_${Math.random()}`,
            body: msg.body || msg.text || msg.message || '',
            from: msg.from || msg.sender || '',
            fromMe: msg.fromMe || false,
            timestamp: msg.timestamp || Date.now(),
            type: msg.type || 'text',
            isGroup: msg.isGroup || false,
            groupName: msg.groupName || msg.chatName,
            contactName: msg.contactName || msg.senderName || msg.from || 'Unknown',
            chatId: msg.chatId || chatId || '',
            time: new Date(msg.timestamp || Date.now()).toLocaleTimeString(),
            isMedia: msg.hasMedia || false
          }));
          
          setMessages(processedMessages);
          
          // Cache messages for this chat
          if (chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [chatId]: processedMessages
            }));
          }
          
          // Update message count in status
          if (!chatId) {
            setStatus(prevStatus => prevStatus ? {
              ...prevStatus,
              messagesCount: processedMessages.length
            } : null);
          }
          
          return;
        }
      } catch (wahaError: any) {
        console.error('[WhatsApp Frontend] WAHA messages endpoint failed:', wahaError);
      }
      
      // Fallback to legacy endpoint
      console.log('[WhatsApp Frontend] Trying legacy messages endpoint');
      const legacyEndpoint = chatId 
        ? `/whatsapp/messages?chatId=${encodeURIComponent(chatId)}&limit=50`
        : '/whatsapp/messages?limit=50';
      
      const legacyRes = await api.get(legacyEndpoint);
      if (legacyRes.data.success) {
        const messagesData = legacyRes.data.data || [];
        console.log(`[WhatsApp Frontend] ✅ Fetched ${messagesData.length} messages via legacy`);
        
        const processedMessages = messagesData.map((msg: any) => ({
          id: msg.id || msg._id || `msg_${Date.now()}_${Math.random()}`,
          body: msg.body || msg.message || '',
          from: msg.from || '',
          fromMe: msg.fromMe || false,
          timestamp: msg.timestamp || Date.now(),
          type: msg.type || 'text',
          isGroup: msg.isGroup || false,
          groupName: msg.groupName,
          contactName: msg.contactName || msg.from || 'Unknown',
          chatId: msg.chatId || chatId || '',
          time: new Date(msg.timestamp || Date.now()).toLocaleTimeString(),
          isMedia: msg.isMedia || false
        }));
        
        setMessages(processedMessages);
        
        // Cache messages for this chat
        if (chatId) {
          setMessagesCache(prev => ({
            ...prev,
            [chatId]: processedMessages
          }));
        }
        
        if (!chatId) {
          setStatus(prevStatus => prevStatus ? {
            ...prevStatus,
            messagesCount: processedMessages.length
          } : null);
        }
      }
    } catch (error: any) {
      console.error('Error fetching WhatsApp messages:', error);
      
      // Don't show error toast for message fetching failures as it's too noisy
      // Just log the error
    } finally {
      if (forceRefresh) {
        setRefreshingMessages(false);
      }
    }
  };

  const fetchMonitoredKeywords = async () => {
    try {
      const response = await api.get('/whatsapp/monitored-keywords');
      if (response.data.success) {
        setMonitoredKeywords(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching monitored keywords:', error);
    }
  };

  const openAuthModal = () => {
    setShowAuth(true);
    setAuthMethod('qr');
    setPhoneAuthStep('phone');
    setIsWaitingForCode(false);
    setPhoneNumber('');
    setVerificationCode('');
    setPairingCode(null);
    setPhoneAuthSupported(true); // Reset phone auth support when opening modal
    
    // Actually generate the QR code when opening the modal
    fetchQRCode();
  };

  const sendPhoneAuth = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try WAHA endpoint first (modern WhatsApp service)
      let response: any;
      let usedService: 'waha' | 'baileys' = 'waha';
      
      try {
        console.log('🚀 Sending phone auth via WAHA /waha/auth/phone...');
        response = await api.post('/waha/auth/phone', {
          phoneNumber: phoneNumber.replace(/\D/g, '') // Remove non-digits
        });
        console.log('✅ Phone auth request successful via WAHA');
      } catch (wahaError: any) {
        console.error('❌ WAHA phone auth failed, trying legacy endpoint:', wahaError);
        
        // If WAHA fails with specific errors, don't try legacy
        if (wahaError.response?.data?.code === 'PHONE_AUTH_NOT_SUPPORTED') {
          throw wahaError; // Re-throw to handle as not supported
        }
        
        // Try legacy endpoint as fallback
        console.log('⚠️ Falling back to legacy endpoint /whatsapp-legacy/auth/phone...');
        response = await api.post('/whatsapp-legacy/auth/phone', {
          phoneNumber: phoneNumber.replace(/\D/g, '')
        });
        usedService = 'baileys';
        console.log('✅ Phone auth request successful via Baileys (legacy)');
      }

      if (response.data.success) {
        // If backend returns a pairingCode, show it to the user immediately
        const returnedCode = response.data?.data?.pairingCode as string | undefined;
        if (returnedCode) {
          setPairingCode(returnedCode);
          setIsWaitingForCode(true);
          setPhoneAuthStep('code');
          toast({
            title: 'Enter This Code in WhatsApp',
            description: `Code: ${returnedCode}`,
          });
        } else {
          // Fallback: ask user to enter the code they see on device
          setPhoneAuthStep('code');
          setIsWaitingForCode(true);
          toast({
            title: 'Verification Code Requested',
            description: `Open WhatsApp and enter the 6‑digit code shown there.`,
          });
        }
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to send verification code",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error sending phone auth:', error);
      const errorData = error.response?.data;
      
      // Check if phone auth is not supported and should fallback to QR
      if (errorData?.code === 'PHONE_AUTH_NOT_SUPPORTED' || errorData?.fallbackMethod === 'qr') {
        setPhoneAuthSupported(false); // Disable phone auth option
        toast({
          title: "Phone Authentication Not Available",
          description: "Phone authentication isn't supported by the WhatsApp service. Switching to QR code method...",
          variant: "destructive",
        });
        
        // Auto-switch to QR code authentication
        setTimeout(() => {
          setAuthMethod('qr');
          fetchQRCode();
        }, 2000);
        
      } else if (errorData?.code === 'SERVICE_UNAVAILABLE') {
        toast({
          title: "Service Temporarily Unavailable",
          description: "WhatsApp service is down. Please try QR code authentication instead.",
          variant: "destructive",
        });
        
        // Auto-switch to QR code authentication
        setTimeout(() => {
          setAuthMethod('qr');
          fetchQRCode();
        }, 2000);
        
      } else {
        toast({
          title: "Error",
          description: errorData?.error || "Failed to send verification code. Please try QR code authentication instead.",
          variant: "destructive",
        });
        
        // Auto-switch to QR code authentication after any other error
        setTimeout(() => {
          setAuthMethod('qr');
          fetchQRCode();
        }, 3000);
      }
    }
  };

  const verifyPhoneAuth = async () => {
    if (!verificationCode.trim() && !pairingCode) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Try WAHA endpoint first, then fallback to legacy
      let response: any;
      let usedService: 'waha' | 'baileys' = 'waha';
      const codeToUse = (verificationCode || pairingCode || '').trim();
      
      try {
        console.log('🚀 Verifying phone code via WAHA /waha/auth/verify...');
        response = await api.post('/waha/auth/verify', {
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          code: codeToUse
        });
        console.log('✅ Phone verification successful via WAHA');
      } catch (wahaError: any) {
        console.error('❌ WAHA phone verification failed, trying legacy endpoint:', wahaError);
        
        // Try legacy endpoint as fallback
        console.log('⚠️ Falling back to legacy endpoint /whatsapp-legacy/auth/verify...');
        response = await api.post('/whatsapp-legacy/auth/verify', {
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          code: codeToUse
        });
        usedService = 'baileys';
        console.log('✅ Phone verification successful via Baileys (legacy)');
      }

      if (response.data.success) {
        setShowAuth(false);
        setIsWaitingForCode(false);
        toast({
          title: "Authentication Successful",
          description: `WhatsApp connected successfully via phone number (using ${usedService === 'waha' ? 'WAHA Modern' : 'Baileys Legacy'})`,
        });
        // Refresh status after successful auth
        setTimeout(fetchStatus, 2000);
        setPairingCode(null);
      } else {
        toast({
          title: "Verification Failed",
          description: response.data.error || "Invalid verification code",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying phone auth:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to verify code",
        variant: "destructive",
      });
    }
  };

  const fetchQRCode = async (force = false) => {
    try {
      setShowQR(true);
      setShowAuth(true);
      setAuthMethod('qr');
      setQrCode(null); // Clear old QR immediately to show loading
      
      // Show immediate loading feedback
      toast({
        title: force ? "Force Generating QR Code" : "Generating QR Code",
        description: "Please wait while we prepare your WhatsApp QR code...",
      });
      
      // Try WAHA endpoint first - skip status check for faster QR generation
      let response: any;
      let usedService: 'waha' | 'baileys' = 'waha';
      
      try {
        // Use correct WAHA QR endpoint: GET /waha/qr (not POST /waha/auth/qr)
        console.log('🚀 Generating QR code via WAHA GET /waha/qr...');
        response = await api.get('/waha/qr', { 
          timeout: 20000, // 20 second timeout for QR generation
          headers: { 'Cache-Control': 'no-cache' } // Prevent caching for fresh QR
        });
        setActiveService('waha');
        console.log('✅ QR code generated using WAHA service');
      } catch (error) {
        console.error('WAHA QR failed, trying legacy:', error);
        // If WAHA fails, show more helpful error message
        if (error.response?.status === 422) {
          toast({
            title: "WAHA Session Issue",
            description: "Session needs to be restarted. Please wait while we fix this...",
            variant: "destructive",
          });
          // Try to restart session and wait a bit
          try {
            const restartResponse = await api.post('/waha/restart');
            if (restartResponse.data.success) {
              toast({
                title: "Session Restarted",
                description: "Session restarted. Generating new QR code...",
              });
              // Wait for session to stabilize, then retry QR generation
              await new Promise(resolve => setTimeout(resolve, 3000));
              return fetchQRCode(force); // Retry QR generation
            }
          } catch (restartError) {
            console.error('Failed to restart WAHA session:', restartError);
          }
        }
        
        // Fallback to legacy endpoint
        try {
          const endpoint = force 
            ? '/whatsapp/qr?force=true'
            : '/whatsapp/qr';
          response = await api.get(endpoint);
          setActiveService('baileys');
          usedService = 'baileys';
          console.log('⚠️ QR code generated using Baileys service (fallback)');
        } catch (fallbackError) {
          console.error('Both WAHA and legacy QR generation failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      const data = response.data;
      
      if (data.success && data.data.qrCode) {
        setQrCode(data.data.qrCode);
        toast({
          title: "QR Code Ready",
          description: `${data.data.message || "QR code available for scanning"} (${usedService === 'waha' ? 'WAHA Modern' : 'Baileys Legacy'})`,
        });
      } else {
        // Check if we can force generate
        if (!force && data.data?.canForceGenerate) {
          toast({
            title: "Connection Issues Detected",
            description: data.data.message + " Click 'Force Generate QR' to try anyway.",
            variant: "destructive",
          });
        } else {
          toast({
            title: force ? "QR Generation Failed" : "QR Code",
            description: data.data?.message || data.message || "WhatsApp is already connected",
            variant: force ? "destructive" : "default",
          });
        }
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast({
        title: "Error",
        description: force ? "Failed to force generate QR code" : "Failed to fetch QR code",
        variant: "destructive",
      });
    }
  };

  const refreshChats = async () => {
    try {
      setLoadingChats(true);
      
      console.log('[WhatsApp Frontend] 🔄 Starting chat refresh...');
      
      // First check if we're authenticated
      const statusCheck = await api.get('/waha/status').catch(() => api.get('/whatsapp/status'));
      if (!statusCheck.data?.data?.isReady && !statusCheck.data?.data?.connected) {
        toast({
          title: "WhatsApp Not Connected",
          description: "Please authenticate with WhatsApp first by scanning the QR code.",
          variant: "destructive",
        });
        setLoadingChats(false);
        return;
      }
      
      let data: any;
      // Try WAHA first, then legacy
      try {
        const waha = await api.post('/waha/refresh-chats');
        data = waha.data;
        console.log('[WhatsApp Frontend] ✅ WAHA refresh response:', data);
      } catch (e) {
        console.log('[WhatsApp Frontend] WAHA refresh failed, trying legacy');
        const legacy = await api.post('/whatsapp/refresh-chats');
        data = legacy.data;
        console.log('[WhatsApp Frontend] ✅ Legacy refresh response:', data);
      }
      
      if (data.success) {
        // Show immediate feedback about the refresh
        toast({
          title: "Refreshing Chats",
          description: data.data ? `Found ${data.data.chatCount || 0} total chats` : "Fetching latest chat data...",
        });
        
        // Clear existing chats to show fresh data
        setGroups([]);
        setPrivateChats([]);
        
        // Fetch updated data with pagination support
        await Promise.all([
          fetchGroups(false, { limit: 100 }), // Load first 100 groups with pagination
          fetchPrivateChats(false)
        ]);
        
        // Update status counts
        await fetchStatus();
        
        toast({
          title: "Success",
          description: `Loaded ${groups.length + privateChats.length} chats successfully`,
        });
      } else {
        let title = "WhatsApp Not Ready";
        let description = data.error || "Failed to refresh chats";
        if (data.details?.suggestion) {
          description += `. ${data.details.suggestion}`;
        }
        toast({
          title,
          description,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error refreshing chats:', error);
      
      let errorMsg = "Failed to connect to WhatsApp service";
      let suggestion = "Please try again in a few moments";
      
      if (error.response?.status === 408 || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = "WhatsApp service is taking longer than expected";
        suggestion = "This often happens when the service is processing large amounts of data. Please wait 30-60 seconds and try again.";
      } else if (error.response?.status === 503) {
        errorMsg = "WhatsApp service is temporarily unavailable";
        suggestion = "The service may be starting up (cold start). Please wait 30-60 seconds and try again.";
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      
      toast({
        title: "Connection Issue",
        description: `${errorMsg}. ${suggestion}`,
        variant: "destructive",
      });
    } finally {
      setLoadingChats(false);
    }
  };

  const generateDailySummary = async () => {
    try {
      if (!selectedChat) {
        toast({
          title: "No Chat Selected",
          description: "Please select a group to generate a daily summary.",
          variant: "destructive",
        });
        return;
      }

      const chatId = extractChatId(selectedChat);
      if (!chatId) {
        toast({
          title: "Invalid Chat",
          description: "Cannot generate summary for this chat. Please try selecting it again.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[WhatsApp Frontend] 📊 Generating daily summary for: ${selectedChat.name}`);

      // Show loading state
      setRefreshingMessages(true);

      toast({
        title: "Generating Summary",
        description: `Creating daily summary for ${selectedChat.name}...`,
      });

      // Import whatsappService for summary functionality
      const { whatsappService } = await import('@/services/whatsappService');

      try {
        const summary = await whatsappService.generateTodaySummary({
          groupId: chatId,
          timezone: whatsappService.getUserTimezone()
        });

        console.log('[WhatsApp Frontend] ✅ Daily summary generated:', summary);

        // Show modal with the generated summary
        setSelectedSummary(summary);
        setShowSummaryModal(true);

        toast({
          title: "Summary Generated",
          description: `Daily summary for ${selectedChat.name} has been created successfully.`,
        });

      } catch (summaryError: any) {
        console.error('[WhatsApp Frontend] ❌ Daily summary generation failed:', summaryError);

        let errorMsg = "Failed to generate daily summary";
        let suggestion = "Please try again later";

        if (summaryError.response?.status === 404) {
          errorMsg = "Summary service not available";
          suggestion = "The summary service may not be configured yet.";
        } else if (summaryError.response?.data?.error) {
          errorMsg = summaryError.response.data.error;
        }

        toast({
          title: "Summary Failed",
          description: `${errorMsg}. ${suggestion}`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('[WhatsApp Frontend] ❌ Error in daily summary generation:', error);

      toast({
        title: "Summary Error",
        description: "An unexpected error occurred while generating the summary.",
        variant: "destructive",
      });
    } finally {
      setRefreshingMessages(false);
    }
  };

  const refreshGroups = async () => {
    try {
      setLoadingChats(true);
      
      console.log('[WhatsApp Frontend] 🔄 Starting groups refresh...');
      
      // Try WAHA-compliant group refresh endpoint
      let refreshData: any;
      try {
        const wahaRefresh = await api.post('/waha/refresh-groups');
        refreshData = wahaRefresh.data;
        console.log('[WhatsApp Frontend] ✅ WAHA groups refresh response:', refreshData);
      } catch (e) {
        console.log('[WhatsApp Frontend] WAHA groups refresh failed, will fetch fresh data');
      }
      
      // Show immediate feedback
      toast({
        title: "Refreshing Groups",
        description: refreshData?.message || "Fetching latest group data...",
      });
      
      // Fetch updated groups with enhanced metadata
      const groupsData = await fetchGroups(false, { limit: 100 });
      
      // Show success notification with enhanced information
      if (groupsData?.metadata) {
        const { metadata } = groupsData;
        toast({
          title: "Groups Refreshed Successfully",
          description: `Loaded ${groupsData.data?.length || 0} groups (${metadata.groupsWithAdminRole} admin roles, ${metadata.totalParticipants} total members)`,
        });
      } else {
        toast({
          title: "Groups Refreshed",
          description: "Group data updated successfully",
        });
      }
      
    } catch (error: any) {
      console.error('Error refreshing groups:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to refresh groups",
        variant: "destructive",
      });
    } finally {
      setLoadingChats(false);
    }
  };

  const restartService = async () => {
    try {
      // Use WAHA service if available, otherwise fallback to legacy
      let response: any;
      try {
        response = await api.post('/waha/restart');
        console.log('✅ Using WAHA restart endpoint');
      } catch (wahaError) {
        console.log('⚠️ WAHA restart failed, trying legacy endpoint');
        response = await api.post('/whatsapp/restart');
      }
      
      const data = response.data;
      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "WhatsApp service restart initiated",
        });
        // Wait a bit longer for WAHA sessions to stabilize
        setTimeout(fetchStatus, 5000);
      } else {
        throw new Error(data.error || 'Restart failed');
      }
    } catch (error: any) {
      console.error('Error restarting service:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.message || "Failed to restart WhatsApp service",
        variant: "destructive",
      });
    }
  };

  const forceRestart = async () => {
    if (!confirm('This will clear all WhatsApp authentication data and restart from scratch. Continue?')) {
      return;
    }
    
    try {
      // Use WAHA service if available, otherwise fallback to legacy
      let response: any;
      try {
        response = await api.post('/waha/force-restart');
        console.log('✅ Using WAHA force restart endpoint');
      } catch (wahaError) {
        console.log('⚠️ WAHA force restart failed, trying legacy endpoint');
        response = await api.post('/whatsapp/force-restart');
      }
      
      const data = response.data;
      
      if (data.success) {
        toast({
          title: "Force Restart Completed",
          description: data.message || "WhatsApp service is restarting with clean state. Please wait and scan QR code when it appears.",
        });
        
        // Wait a bit then refresh status
        setTimeout(() => {
          fetchStatus();
          // Auto-show QR if session is ready
          setTimeout(() => {
            if (status?.qrAvailable || (data.data?.qrAvailable)) {
              openAuthModal();
            }
          }, 2000);
        }, 5000);
      } else {
        throw new Error(data.error || 'Failed to force restart');
      }
    } catch (error: any) {
      console.error('Force restart error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || 'Failed to force restart WhatsApp service',
        variant: "destructive",
      });
    }
  };

  const forceHistorySync = async () => {
    try {
      setFetchingHistory(true);
      
      const response = await api.post('/whatsapp/force-history-sync');
      
      if (response.data.success) {
        toast({
          title: "History Sync Initiated",
          description: "Requesting chat history from WhatsApp. New chats should appear shortly.",
        });
        
        // Refresh data after a delay to see results
        setTimeout(() => {
          fetchGroups();
          fetchPrivateChats();
          fetchMessages();
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error forcing history sync:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to sync chat history",
        variant: "destructive",
      });
    } finally {
      setFetchingHistory(false);
    }
  };

  const fetchChatHistory = async (chatId: string, limit: number = 10) => {
    try {
      setFetchingHistory(true);
      
      // Validate chatId parameter
      if (!chatId || typeof chatId !== 'string') {
        console.error('[WhatsApp Frontend] Invalid chatId for history fetch:', chatId);
        toast({
          title: "Error",
          description: "Invalid chat ID. Please select a chat first.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('[WhatsApp Frontend] fetchChatHistory called:', {
        chatId,
        chatIdType: typeof chatId,
        limit,
        chatIdValid: chatId && typeof chatId === 'string' && chatId !== '[object Object]' && !chatId.includes('[object')
      });
      
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;
      try {
        response = await api.get(`/waha/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`);
      } catch (wahaError) {
        console.log('WAHA endpoint failed, trying legacy:', wahaError);
        response = await api.get(`/whatsapp/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`);
      }
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const historicalMessages = response.data.data;
        
        // Merge with existing messages, avoiding duplicates
        setMessages(prevMessages => {
          const existingIds = new Set(prevMessages.map(m => m.id));
          const newMessages = historicalMessages.filter((msg: WhatsAppMessage) => !existingIds.has(msg.id));
          const updatedMessages = [...prevMessages, ...newMessages];
          
          // Update cache
          if (chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [chatId]: updatedMessages
            }));
          }
          
          return updatedMessages;
        });
        
        toast({
          title: "Chat History Loaded",
          description: `Loaded ${historicalMessages.length} historical messages`,
        });
      } else {
        toast({
          title: "No History Available",
          description: "No additional messages found for this chat",
        });
      }
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to fetch chat history",
        variant: "destructive",
      });
    } finally {
      setFetchingHistory(false);
    }
  };

  const sendMessage = async () => {
    console.log('[WhatsApp Frontend] sendMessage called:', {
      hasMessage: !!newMessage.trim(),
      hasSelectedChat: !!selectedChat,
      isSending: sendingMessage,
      selectedChatId: selectedChat?.id,
      selectedChatIdType: typeof selectedChat?.id
    });
    
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    // Extract and validate chatId using helper function
    const chatId = extractChatId(selectedChat);
    
    console.log('[WhatsApp Frontend] sendMessage chatId extraction:', {
      extractedChatId: chatId,
      extractedChatIdType: typeof chatId,
      isValid: isValidChatId(chatId)
    });
    
    if (!isValidChatId(chatId)) {
      console.error('[WhatsApp Frontend] Invalid selectedChat.id for sending message:', selectedChat.id);
      toast({
        title: "Error",
        description: "Invalid chat selected. Please try selecting the chat again.",
        variant: "destructive",
      });
      setSendingMessage(false);
      return;
    }

    setSendingMessage(true);
    try {
      // Prefer WAHA modern endpoint; fallback to legacy
      let response: any;
      try {
        response = await api.post('/waha/send', {
          session: 'default',
          chatId: chatId,
          text: newMessage,
        });
      } catch (e) {
        response = await api.post('/whatsapp/send', {
          to: chatId,
          message: newMessage,
        });
      }

      const data = response.data;
      if (data.success) {
        setNewMessage('');
        
        // Add the sent message to the local state immediately
        const sentMessage: WhatsAppMessage = {
          id: data.data?.messageId || `sent_${Date.now()}`,
          body: newMessage,
          from: 'me',
          fromMe: true,
          timestamp: Date.now(),
          type: 'text',
          isGroup: selectedChat.isGroup,
          groupName: selectedChat.isGroup ? selectedChat.name : undefined,
          contactName: 'You',
          chatId: chatId,
          time: new Date().toLocaleTimeString(),
          isMedia: false
        };
        
        setMessages(prevMessages => {
          const updatedMessages = [sentMessage, ...prevMessages];
          
          // Update cache
          if (chatId) {
            setMessagesCache(prev => ({
              ...prev,
              [chatId]: updatedMessages
            }));
          }
          
          return updatedMessages;
        });
        
        toast({
          title: "Success",
          description: "Message sent successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send message",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const response = await api.post('/whatsapp/monitored-keywords', {
        keyword: newKeyword,
      });

      const data = response.data;
      if (data.success) {
        setNewKeyword('');
        await fetchMonitoredKeywords();
        toast({
          title: "Success",
          description: `Keyword "${newKeyword}" added to monitoring`,
        });
      }
    } catch (error: any) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add keyword",
        variant: "destructive",
      });
    }
  };

  const removeKeyword = async (keyword: string) => {
    try {
      const response = await api.delete(`/whatsapp/monitored-keywords/${keyword}`);
      const data = response.data;
      
      if (data.success) {
        await fetchMonitoredKeywords();
        toast({
          title: "Success",
          description: `Keyword "${keyword}" removed from monitoring`,
        });
      }
    } catch (error: any) {
      console.error('Error removing keyword:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove keyword",
        variant: "destructive",
      });
    }
  };

  const filteredGroups = groups.filter(group => {
    // More robust filtering that handles different data types
    const hasValidId = group.id != null && String(group.id).trim() !== '';
    const hasValidName = group.name != null && String(group.name).trim() !== '';
    const matchesSearch = !searchTerm || String(group.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return hasValidId && hasValidName && matchesSearch;
  });

  const filteredPrivateChats = privateChats.filter(chat => {
    // More robust filtering that handles different data types
    const hasValidId = chat.id != null && String(chat.id).trim() !== '';
    const hasValidName = chat.name != null && String(chat.name).trim() !== '';
    const matchesSearch = !searchTerm || String(chat.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return hasValidId && hasValidName && matchesSearch;
  });

  // Filter messages for the selected chat
  const displayedMessages = useMemo(() => {
    console.log('[WhatsApp Frontend] displayedMessages useMemo triggered:', {
      hasSelectedChat: !!selectedChat,
      selectedChatId: selectedChat?.id,
      selectedChatIdType: typeof selectedChat?.id,
      messagesCount: messages.length
    });
    
    if (!selectedChat) {
      return messages.slice(0, 50); // Show recent messages if no chat selected
    }
    
    // Extract and validate chatId using helper function
    const chatId = extractChatId(selectedChat);
    
    console.log('[WhatsApp Frontend] displayedMessages chatId extraction:', {
      extractedChatId: chatId,
      extractedChatIdType: typeof chatId,
      isValid: isValidChatId(chatId)
    });
    
    // If we couldn't extract a valid chatId, return empty array
    if (!isValidChatId(chatId)) {
      console.warn('[WhatsApp Frontend] Cannot filter messages - invalid chatId:', chatId);
      return [];
    }
    
    // Filter messages for the selected chat with type safety
    const chatMessages = messages.filter(msg => {
      // Ensure msg.chatId is a string before any operations
      if (!msg.chatId || typeof msg.chatId !== 'string') {
        return false;
      }
      
      // Check various possible chat ID formats with safe string operations
      const matches = msg.chatId === chatId || 
                     msg.chatId === chatId.split('@')[0] ||
                     msg.from === chatId ||
                     (typeof msg.from === 'string' && msg.from === chatId.split('@')[0]);
      
      if (matches) {
        console.log('[WhatsApp Frontend] Message matched for chat:', {
          messageId: msg.id,
          messageChatId: msg.chatId,
          messageFrom: msg.from,
          selectedChatId: chatId,
          matchType: msg.chatId === chatId ? 'exact' :
                    msg.chatId === chatId.split('@')[0] ? 'simplified' :
                    msg.from === chatId ? 'from' :
                    'from-simplified'
        });
      }
      
      return matches;
    });
    
    console.log(`[WhatsApp Frontend] Displaying ${chatMessages.length} messages for chat ${selectedChat.name} (chatId: ${chatId})`);
    
    // Sort messages by timestamp (newest first for display, but we'll reverse in the UI)
    return chatMessages.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, selectedChat?.id]);

  // Move media message to Images section
  const moveMediaToImages = async (messageId: string) => {
    try {
      const response = await api.post(`/waha/media/${messageId}/move-to-images`);
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Media moved to Images section successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to move media to Images section",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error moving media to images:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.message || "Failed to move media to Images section",
        variant: "destructive",
      });
    }
  };

  // Extract image from message for monitoring (Shula-style functionality)
  const extractImageFromMessage = async (messageId: string) => {
    try {
      console.log(`[WhatsApp Frontend] Extracting image from message: ${messageId}`);
      
      const response = await api.post(`/waha/media/${messageId}/extract-image`);
      
      if (response.data.success) {
        toast({
          title: "Image Extracted",
          description: `Image saved successfully: ${response.data.filename || 'Unknown'}`,
        });
        
        // Update monitoring stats if needed
        setStatus(prevStatus => ({
          ...prevStatus,
          imagesCount: (prevStatus?.imagesCount || 0) + 1,
          lastActivity: new Date().toISOString()
        }));
      } else {
        toast({
          title: "Extraction Failed",
          description: response.data.error || "Failed to extract image",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error extracting image:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || error?.message || "Failed to extract image",
        variant: "destructive",
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [displayedMessages]);

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    if (status.connected && status.isReady && status.isClientReady) return 'text-green-400';
    if (status.qrAvailable) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusIcon = () => {
    if (!status) return WifiOff;
    if (status.connected && status.isReady && status.isClientReady) return Wifi;
    if (status.qrAvailable) return QrCode;
    return WifiOff;
  };

  const StatusIcon = getStatusIcon();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 p-6">
        <div className="flex items-center justify-center min-h-full">
          <GlassCard className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-violet-300 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading WhatsApp...</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                {isMobile && selectedChat && !showChatList && (
                  <AnimatedButton
                    onClick={() => {
                      setShowChatList(true);
                      setSelectedChat(null);
                    }}
                    variant="ghost"
                    size="sm"
                    className="p-2 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </AnimatedButton>
                )}
                <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                <h1 className="text-xl sm:text-3xl font-bold text-white">WhatsApp</h1>
              </div>
              
              <div className={`flex items-center gap-2 sm:gap-4 ${isMobile ? 'flex-wrap' : ''}`}>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${getStatusColor()}`} />
                  <span className={`text-xs sm:text-sm ${getStatusColor()}`}>
                    {status?.connected && status?.isReady && status?.isClientReady 
                      ? 'Connected' 
                      : status?.qrAvailable 
                      ? 'QR Available' 
                      : 'Disconnected'
                    }
                  </span>
                </div>

                {/* Service Type Indicator */}
                {activeService && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activeService === 'waha' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {activeService === 'waha' ? '🚀 WAHA' : '⚡ Baileys'}
                    </div>
                    {!isMobile && (
                      <span className="text-xs text-blue-200/50">
                        {activeService === 'waha' ? 'Modern' : 'Legacy'}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-blue-200/70">
                    {isSocketConnected ? 'Real-time' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-3">
              {isMobile ? (
                <AnimatedButton
                  onClick={() => setShowMobileMenu(true)}
                  variant="outline"
                  size="sm"
                  className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10 p-2"
                >
                  <Menu className="w-4 h-4" />
                </AnimatedButton>
              ) : (
                <>
                  <AnimatedButton
                    onClick={openAuthModal}
                    variant="outline"
                    size="sm"
                    className="border-yellow-400/30 text-yellow-200 hover:bg-yellow-500/10"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Connect
                  </AnimatedButton>
                  
                  {/* Show Force QR button when there are connection issues */}
                  {(!status?.connected || !status?.isReady) && (
                    <AnimatedButton
                      onClick={() => {
                        setShowAuth(true);
                        setAuthMethod('qr');
                        fetchQRCode(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="border-orange-400/30 text-orange-200 hover:bg-orange-500/10"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Force QR
                    </AnimatedButton>
                  )}
                  
                  <AnimatedButton
                    onClick={refreshChats}
                    variant="outline"
                    size="sm"
                    className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Chats
                  </AnimatedButton>

                  {selectedChat && selectedChat.isGroup && (
                    <AnimatedButton
                      onClick={generateDailySummary}
                      variant="outline"
                      size="sm"
                      disabled={refreshingMessages}
                      className="border-purple-400/30 text-purple-200 hover:bg-purple-500/10"
                    >
                      {refreshingMessages ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4 mr-2" />
                      )}
                      Daily Summary
                    </AnimatedButton>
                  )}

                  <AnimatedButton
                    onClick={refreshGroups}
                    variant="outline"
                    size="sm"
                    className="border-green-400/30 text-green-200 hover:bg-green-500/10"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Refresh Groups
                  </AnimatedButton>
                  
                  <AnimatedButton
                    onClick={() => setShowMonitoring(true)}
                    variant="outline"
                    size="sm"
                    className="border-amber-400/30 text-amber-200 hover:bg-amber-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Monitoring
                  </AnimatedButton>
                  
                  <AnimatedButton
                    onClick={forceHistorySync}
                    variant="outline"
                    size="sm"
                    disabled={fetchingHistory}
                    className="border-purple-400/30 text-purple-200 hover:bg-purple-500/10"
                  >
                    {fetchingHistory ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <History className="w-4 h-4 mr-2" />
                    )}
                    Sync History
                  </AnimatedButton>
                  
                  <AnimatedButton
                    onClick={restartService}
                    variant="outline"
                    size="sm"
                    className="border-red-400/30 text-red-200 hover:bg-red-500/10"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Restart
                  </AnimatedButton>
                  
                  <AnimatedButton
                    onClick={forceRestart}
                    variant="outline"
                    size="sm"
                    className="border-red-600/30 text-red-300 hover:bg-red-600/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Force Restart
                  </AnimatedButton>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8"
        >
          <GlassCard className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-100/70">Groups</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{status?.groupsCount || 0}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Phone className="w-6 h-6 sm:w-8 sm:h-8 text-violet-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-100/70">Private Chats</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{status?.privateChatsCount || 0}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-100/70">Messages</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{status?.messagesCount || 0}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-100/70">Images</p>
                <p className="text-lg sm:text-2xl font-bold text-white">{status?.imagesCount || 0}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-4'} gap-3 sm:gap-6`}>
          {/* Chat List - Mobile: Full screen overlay, Desktop: Sidebar */}
          <div className={`
            ${isMobile 
              ? `${showChatList ? 'flex' : 'hidden'} fixed inset-0 z-40 bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 flex-col p-3`
              : 'lg:col-span-1'
            }
          `}
          onClick={(e) => {
            // Close chat list when clicking outside the content area on mobile
            if (isMobile && e.target === e.currentTarget) {
              setShowChatList(false);
            }
          }}>
            <GlassCard className={`${isMobile ? 'h-full mt-16' : 'h-[600px]'} p-4 sm:p-6 flex flex-col`}>
              <div className="mb-4">
                {isMobile && (
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Chats</h2>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowMonitoring(true)}
                        variant="outline"
                        size="sm"
                        className="border-amber-400/30 text-amber-200 hover:bg-amber-500/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Monitor
                      </Button>
                      <Button
                        onClick={() => setShowMobileMenu(true)}
                        variant="outline"
                        size="sm"
                        className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
                      >
                        <Menu className="w-4 h-4 mr-1" />
                        Actions
                      </Button>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-blue-300" />
                  <Input
                    placeholder="Search groups and contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                  />
                </div>
                <div className="mt-2 text-xs text-blue-200/60">
                  {filteredGroups.length + filteredPrivateChats.length} chats ({filteredGroups.length} groups, {filteredPrivateChats.length} contacts)
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-blue-400/60 scrollbar-track-white/20 hover:scrollbar-thumb-blue-300/80 scrollbar-track-rounded-full scrollbar-thumb-rounded-full"
                   style={{
                     scrollbarWidth: 'auto',
                     scrollbarColor: '#60a5fa rgba(255,255,255,0.2)'
                   }}>
                {filteredGroups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-200 mb-2">Groups</h3>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-green-400/50 scrollbar-track-white/15 hover:scrollbar-thumb-green-300/70 scrollbar-track-rounded-full scrollbar-thumb-rounded-full"
                         style={{
                           scrollbarWidth: 'auto',
                           scrollbarColor: '#4ade80 rgba(255,255,255,0.15)'
                         }}>
                      {filteredGroups.map((group) => (
                        <motion.div
                          key={group.id}
                          whileHover={{ scale: isMobile ? 1 : 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            console.log('[WhatsApp Frontend] Group selection attempt:', {
                              groupId: group.id,
                              groupIdType: typeof group.id,
                              groupIdKeys: typeof group.id === 'object' ? Object.keys(group.id) : 'N/A',
                              groupName: group.name
                            });
                            
                            if (group.id && typeof group.id === 'string') {
                              console.log(`[WhatsApp Frontend] ✅ Selected group: ${group.name} (${group.id})`);
                              setSelectedChat(group);
                              // Only fetch messages if we don't have any or if it's a different chat
                              if (selectedChat) {
                                const selectedChatId = extractChatId(selectedChat);
                                if (selectedChatId !== group.id) {
                                  fetchMessages(group.id);
                                }
                              } else {
                                fetchMessages(group.id);
                              }
                              // Keep chat list visible on mobile for easy navigation
                            } else {
                              console.error('[WhatsApp Frontend] ❌ Invalid group ID detected (this should not happen after filtering):', {
                                groupId: group.id,
                                groupIdType: typeof group.id,
                                groupName: group.name
                              });
                              toast({
                                title: "Group Error",
                                description: `Cannot select group "${group.name}" - invalid ID format. This group will be hidden on next refresh.`,
                                variant: "destructive",
                              });
                            }
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedChat && extractChatId(selectedChat) === group.id
                              ? 'bg-violet-500/30 border border-violet-400/50 shadow-lg'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 relative">
                              <Users className={`w-5 h-5 ${
                                group.role === 'ADMIN' ? 'text-yellow-400' : 'text-green-400'
                              }`} />
                              {group.role === 'ADMIN' && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" 
                                     title="You are admin" />
                              )}
                              {(group.settings?.messagesAdminOnly || group.settings?.infoAdminOnly) && (
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-400 rounded-full" 
                                     title="Restricted group" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white truncate flex-1" title={group.name}>
                                  {group.name}
                                </p>
                                {group.role === 'ADMIN' && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1 rounded" 
                                        title="Admin">
                                    A
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-blue-200/70">
                                  {group.participantCount > 0 ? `${group.participantCount} members` : 'Loading members...'}
                                </p>
                                {group.description && (
                                  <>
                                    <span className="text-xs text-blue-200/40">•</span>
                                    <p className="text-xs text-blue-200/50 truncate max-w-[80px]" 
                                       title={group.description}>
                                      {group.description}
                                    </p>
                                  </>
                                )}
                                {group.lastMessage && (
                                  <>
                                    <span className="text-xs text-blue-200/40">•</span>
                                    <p className="text-xs text-blue-200/50 truncate max-w-[100px]">
                                      {group.lastMessage}
                                    </p>
                                  </>
                                )}
                              </div>
                              {(group.settings?.messagesAdminOnly || group.settings?.infoAdminOnly) && (
                                <div className="mt-1">
                                  <span className="text-xs bg-red-500/20 text-red-400 px-1 rounded" 
                                        title="Group has restrictions">
                                    {group.settings.messagesAdminOnly ? 'Admin-only messages' : 'Admin-only info'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                {filteredPrivateChats.length > 0 && (
                  <div className={filteredGroups.length > 0 ? "pt-4" : ""}>
                    <h3 className="text-sm font-semibold text-blue-200 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Private Contacts
                    </h3>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-violet-400/50 scrollbar-track-white/15 hover:scrollbar-thumb-violet-300/70 scrollbar-track-rounded-full scrollbar-thumb-rounded-full"
                         style={{
                           scrollbarWidth: 'auto',
                           scrollbarColor: '#8b5cf6 rgba(255,255,255,0.15)'
                         }}>
                      {filteredPrivateChats.map((chat) => (
                        <motion.div
                          key={chat.id}
                          whileHover={{ scale: isMobile ? 1 : 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            console.log('[WhatsApp Frontend] Private chat selection attempt:', {
                              chatId: chat.id,
                              chatIdType: typeof chat.id,
                              chatIdKeys: typeof chat.id === 'object' ? Object.keys(chat.id) : 'N/A',
                              chatName: chat.name
                            });
                            
                            if (chat.id && typeof chat.id === 'string') {
                              console.log(`[WhatsApp Frontend] ✅ Selected private chat: ${chat.name} (${chat.id})`);
                              setSelectedChat(chat);
                              // Only fetch messages if we don't have any or if it's a different chat
                              if (selectedChat) {
                                const selectedChatId = extractChatId(selectedChat);
                                if (selectedChatId !== chat.id) {
                                  fetchMessages(chat.id);
                                }
                              } else {
                                fetchMessages(chat.id);
                              }
                              // Keep chat list visible on mobile for easy navigation
                            } else {
                              console.warn('[WhatsApp Frontend] ❌ Invalid chat ID:', {
                                chatId: chat.id,
                                chatIdType: typeof chat.id,
                                chatName: chat.name
                              });
                            }
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                            selectedChat && extractChatId(selectedChat) === chat.id
                              ? 'bg-violet-500/30 border border-violet-400/50 shadow-lg'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <Phone className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate" title={chat.name}>
                                {chat.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-violet-200/70">
                                  Private contact
                                </p>
                                {chat.lastMessage && (
                                  <>
                                    <span className="text-xs text-blue-200/40">•</span>
                                    <p className="text-xs text-blue-200/50 truncate max-w-[100px]">
                                      {chat.lastMessage}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                {loadingChats && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-blue-300 animate-spin mx-auto mb-3" />
                      <p className="text-blue-200/70 text-sm">Loading chats...</p>
                      {chatsFetchAttempts > 1 && (
                        <p className="text-blue-200/50 text-xs mt-1">
                          Attempt {chatsFetchAttempts} - Please wait
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {!loadingChats && filteredGroups.length === 0 && filteredPrivateChats.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Search className="w-12 h-12 text-blue-300/50 mx-auto mb-3" />
                      <p className="text-blue-200/70 text-sm">
                        {searchTerm ? 'No chats match your search' : 'No chats available'}
                      </p>
                      <p className="text-blue-200/50 text-xs mt-1">
                        {searchTerm ? 'Try a different search term' : 'Connect WhatsApp to see your chats'}
                      </p>
                      {isMobile && !status?.connected && (
                        <div className="mt-4">
                          <Button
                            onClick={() => setShowMobileMenu(true)}
                            variant="outline"
                            size="sm"
                            className="border-yellow-400/30 text-yellow-200 hover:bg-yellow-500/10"
                          >
                            <QrCode className="w-4 h-4 mr-2" />
                            Connect WhatsApp
                          </Button>
                        </div>
                      )}
                      {!isMobile && status?.connected && (
                        <div className="mt-4">
                          <Button
                            onClick={() => {
                              setLoadingChats(true);
                              fetchGroups(true);
                              fetchPrivateChats(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Chats
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Chat Interface - Mobile: Full screen, Desktop: Main content */}
          <div className={`
            ${isMobile 
              ? `${!showChatList ? 'flex' : 'hidden'} fixed inset-0 z-30 bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 flex-col p-3 pt-20`
              : 'lg:col-span-2'
            }
          `}>
            <GlassCard className={`${isMobile ? 'h-full' : 'h-[600px]'} p-4 sm:p-6 flex flex-col`}>
              {selectedChat ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-white/20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      {isMobile && (
                        <Button
                          onClick={() => {
                            setShowChatList(true);
                            // Don't clear selectedChat to preserve state for when user comes back
                          }}
                          variant="ghost"
                          size="sm"
                          className="p-1.5 hover:bg-white/10"
                          aria-label="Back to chat list"
                        >
                          <ArrowLeft className="w-5 h-5 text-white" />
                        </Button>
                      )}
                      {selectedChat.isGroup ? (
                        <Users className="w-6 h-6 text-green-400" />
                      ) : (
                        <Phone className="w-6 h-6 text-violet-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">{selectedChat.name}</h3>
                        <p className="text-sm text-blue-200/70">
                          {selectedChat.isGroup 
                            ? `${selectedChat.participantCount ?? 0} members`
                            : 'Private chat'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <AnimatedButton
                        onClick={() => {
                          // Extract and validate chatId using helper function
                          const chatId = extractChatId(selectedChat);
                          
                          if (isValidChatId(chatId)) {
                            fetchMessages(chatId, true);
                          } else {
                            console.error('[WhatsApp Frontend] Invalid chatId for refresh:', chatId);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={refreshingMessages}
                        className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10 flex-shrink-0"
                        title="Refresh messages from server"
                      >
                        {refreshingMessages ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        {!isMobile && 'Refresh'}
                      </AnimatedButton>
                      
                      <AnimatedButton
                        onClick={() => {
                          console.log('[WhatsApp Frontend] Load History clicked, selectedChat:', selectedChat);
                          
                          if (!selectedChat) {
                            console.error('[WhatsApp Frontend] No chat selected');
                            toast({
                              title: "Error",
                              description: "Please select a chat first",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Since we now normalize all IDs during data processing, selectedChat.id should always be a valid string
                          const chatId = selectedChat.id;
                          
                          console.log('[WhatsApp Frontend] Load History - Chat ID details:', {
                            chatId,
                            chatIdType: typeof chatId,
                            chatName: selectedChat.name,
                            isValidString: typeof chatId === 'string' && chatId.length > 0
                          });
                          
                          if (typeof chatId === 'string' && chatId.length > 0 && chatId !== '[object Object]') {
                            console.log('[WhatsApp Frontend] ✅ Loading history for normalized chatId:', chatId);
                            fetchChatHistory(chatId, 10);
                          } else {
                            console.error('[WhatsApp Frontend] ❌ Invalid chat ID after normalization (this should not happen):', {
                              selectedChat,
                              chatId,
                              chatIdType: typeof chatId
                            });
                            toast({
                              title: "Chat Error", 
                              description: `Cannot load history for "${selectedChat.name}" - invalid chat ID. Try selecting the chat again or refresh the page.`,
                              variant: "destructive",
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={fetchingHistory}
                        className="border-orange-400/30 text-orange-200 hover:bg-orange-500/10 flex-shrink-0"
                      >
                        {fetchingHistory ? (
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        {!isMobile && 'Load History'}
                      </AnimatedButton>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto my-4 space-y-3 scrollbar-thin scrollbar-thumb-violet-400/60 scrollbar-track-white/20 hover:scrollbar-thumb-violet-300/80 scrollbar-track-rounded-full scrollbar-thumb-rounded-full min-h-0"
                       style={{
                         scrollbarWidth: 'auto',
                         scrollbarColor: '#8b5cf6 rgba(255,255,255,0.2)',
                         maxHeight: 'calc(100% - 120px)' // Ensure buttons stay visible
                       }}>
                    {displayedMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 text-blue-300/50 mx-auto mb-3" />
                          <p className="text-blue-200/70">No messages yet</p>
                          <p className="text-blue-200/50 text-xs mt-1">
                            {fetchingHistory ? 'Loading messages...' : 'Start a conversation or load history'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      displayedMessages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                              message.fromMe
                                ? 'bg-violet-500/70 text-white'
                                : 'bg-white/20 text-white'
                            }`}
                          >
                            {!message.fromMe && message.isGroup && (
                              <p className="text-xs text-blue-200 mb-1">{message.contactName}</p>
                            )}
{message.isMedia && message.type === 'image' ? (
                              <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-blue-300" />
                                <span className="text-sm">Image</span>
                                <button
                                  onClick={() => extractImageFromMessage(message.id)}
                                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors"
                                  title="Download image"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                              </div>
                            ) : message.isMedia ? (
                              <p className="text-sm break-words whitespace-pre-wrap text-blue-300">[{message.type || 'Media'}]</p>
                            ) : (
                              <p className="text-sm break-words whitespace-pre-wrap">{message.body || '[No content]'}</p>
                            )}
                            <p className="text-xs opacity-70 mt-1">{message.time}</p>
                          </div>
                        </motion.div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300 text-base"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-green-500 hover:bg-green-600 p-3 sm:px-4"
                      size={isMobile ? "sm" : "default"}
                    >
                      {sendingMessage ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-blue-300/50 mx-auto mb-4" />
                    <p className="text-blue-200/70">Select a chat to start messaging</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Monitoring Panel - Mobile: Modal, Desktop: Sidebar */}
          {!isMobile && (
            <div className="lg:col-span-1">
              <GlassCard className="p-6 h-[600px] flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-4">Monitoring</h3>
                
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add keyword..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                    />
                    <Button
                      onClick={addKeyword}
                      disabled={!newKeyword.trim()}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-amber-400/60 scrollbar-track-white/20 hover:scrollbar-thumb-amber-300/80 scrollbar-track-rounded-full scrollbar-thumb-rounded-full"
                     style={{
                       scrollbarWidth: 'auto',
                       scrollbarColor: '#fbbf24 rgba(255,255,255,0.2)'
                     }}>
                  <h4 className="text-sm font-medium text-blue-200">Monitored Keywords</h4>
                  {monitoredKeywords.map((keyword) => (
                    <motion.div
                      key={keyword}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-2 bg-white/10 rounded-lg"
                    >
                      <span className="text-sm text-white">{keyword}</span>
                      <Button
                        onClick={() => removeKeyword(keyword)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      >
                        <EyeOff className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                  
                  {monitoredKeywords.length === 0 && (
                    <div className="text-center py-8">
                      <Eye className="w-8 h-8 text-blue-300/50 mx-auto mb-2" />
                      <p className="text-sm text-blue-200/70">No keywords monitored</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          )}
        </div>

        {/* Mobile Menu Modal */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowMobileMenu(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-sm w-full"
              >
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">WhatsApp Actions</h3>
                    <Button
                      onClick={() => setShowMobileMenu(false)}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <AnimatedButton
                      onClick={() => {
                        openAuthModal();
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      className="w-full border-yellow-400/30 text-yellow-200 hover:bg-yellow-500/10"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Connect WhatsApp
                    </AnimatedButton>
                    
                    {(!status?.connected || !status?.isReady) && (
                      <AnimatedButton
                        onClick={() => {
                          fetchQRCode(true);
                          setShowMobileMenu(false);
                        }}
                        variant="outline"
                        className="w-full border-orange-400/30 text-orange-200 hover:bg-orange-500/10"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Force Generate QR
                      </AnimatedButton>
                    )}
                    
                    <AnimatedButton
                      onClick={() => {
                        refreshChats();
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      className="w-full border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Chats
                    </AnimatedButton>
                    
                    <AnimatedButton
                      onClick={() => {
                        refreshGroups();
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      className="w-full border-green-400/30 text-green-200 hover:bg-green-500/10"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Refresh Groups
                    </AnimatedButton>
                    
                    <AnimatedButton
                      onClick={() => {
                        setShowMonitoring(true);
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      className="w-full border-amber-400/30 text-amber-200 hover:bg-amber-500/10"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Monitoring
                    </AnimatedButton>
                    
                    <AnimatedButton
                      onClick={() => {
                        forceHistorySync();
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      disabled={fetchingHistory}
                      className="w-full border-purple-400/30 text-purple-200 hover:bg-purple-500/10"
                    >
                      {fetchingHistory ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <History className="w-4 h-4 mr-2" />
                      )}
                      Sync History
                    </AnimatedButton>
                    
                    <AnimatedButton
                      onClick={() => {
                        restartService();
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      className="w-full border-red-400/30 text-red-200 hover:bg-red-500/10"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Restart Service
                    </AnimatedButton>
                    
                    <AnimatedButton
                      onClick={() => {
                        forceRestart();
                        setShowMobileMenu(false);
                      }}
                      variant="outline"
                      className="w-full border-red-600/30 text-red-300 hover:bg-red-600/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Force Restart
                    </AnimatedButton>
                  </div>
                  
                  {/* Mobile Status Info */}
                  <div className="mt-6 p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`w-4 h-4 ${getStatusColor()}`} />
                      <span className={`text-sm ${getStatusColor()}`}>
                        {status?.connected && status?.isReady && status?.isClientReady 
                          ? 'Connected' 
                          : status?.qrAvailable 
                          ? 'QR Available' 
                          : 'Disconnected'
                        }
                      </span>
                    </div>
                    
                    {activeService && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          activeService === 'waha' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {activeService === 'waha' ? '🚀 WAHA' : '⚡ Baileys'}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="text-xs text-blue-200/70">
                        {isSocketConnected ? 'Real-time updates' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Monitoring Modal */}
        <AnimatePresence>
          {showMonitoring && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowMonitoring(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full max-h-[80vh]"
              >
                <GlassCard className="p-6 flex flex-col max-h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">WhatsApp Monitoring</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status?.monitoringActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                        <span className={`text-xs ${status?.monitoringActive ? 'text-green-300' : 'text-gray-400'}`}>
                          {status?.monitoringActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowMonitoring(false)}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Real-time Statistics */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <MessageCircle className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">{status?.messagesCount || 0}</div>
                      <div className="text-xs text-blue-200/70">Messages</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <Camera className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">{status?.imagesCount || 0}</div>
                      <div className="text-xs text-blue-200/70">Images</div>
                    </div>
                  </div>

                  {/* Last Activity */}
                  {status?.lastActivity && (
                    <div className="mb-4 text-center">
                      <p className="text-xs text-blue-200/70">
                        Last activity: {new Date(status.lastActivity).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add keyword..."
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                        className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      />
                      <Button
                        onClick={addKeyword}
                        disabled={!newKeyword.trim()}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                    <h4 className="text-sm font-medium text-blue-200">Monitored Keywords</h4>
                    {monitoredKeywords.map((keyword) => (
                      <motion.div
                        key={keyword}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-between p-3 bg-white/10 rounded-lg"
                      >
                        <span className="text-sm text-white">{keyword}</span>
                        <Button
                          onClick={() => removeKeyword(keyword)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                    
                    {monitoredKeywords.length === 0 && (
                      <div className="text-center py-8">
                        <Eye className="w-12 h-12 text-blue-300/50 mx-auto mb-3" />
                        <p className="text-sm text-blue-200/70">No keywords monitored</p>
                        <p className="text-xs text-blue-200/50 mt-1">Add keywords to monitor group messages</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp Authentication Modal */}
        <AnimatePresence>
          {showAuth && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowAuth(false);
                setShowQR(false);
                setPhoneAuthStep('phone');
                setIsWaitingForCode(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full mx-3 sm:mx-0"
              >
                <GlassCard className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Connect WhatsApp</h3>
                    <Button
                      onClick={() => {
                        setShowAuth(false);
                        setShowQR(false);
                        setPhoneAuthStep('phone');
                        setIsWaitingForCode(false);
                      }}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Authentication Method Selection */}
                  <div className="mb-6">
                    <div className="flex bg-white/10 rounded-lg p-1 gap-1">
                      <button
                        onClick={() => {
                          setAuthMethod('qr');
                          if (!qrCode) fetchQRCode(false);
                        }}
                        className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                          authMethod === 'qr'
                            ? 'bg-violet-500/70 text-white shadow-lg'
                            : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <QrCode className="w-4 h-4" />
                          <span>QR Code</span>
                        </div>
                      </button>
                      <button
                        onClick={() => phoneAuthSupported && setAuthMethod('phone')}
                        disabled={!phoneAuthSupported}
                        className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all ${
                          !phoneAuthSupported
                            ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                            : authMethod === 'phone'
                            ? 'bg-green-500/70 text-white shadow-lg'
                            : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                        }`}
                        title={!phoneAuthSupported ? 'Phone authentication is not supported' : ''}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>Phone{!phoneAuthSupported ? ' (Not Available)' : ''}</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* QR Code Method */}
                  {authMethod === 'qr' && (
                    <div className="text-center">
                      {qrCode ? (
                        <div className="mb-4">
                          <img 
                            src={qrCode} 
                            alt="WhatsApp QR Code" 
                            className="mx-auto rounded-lg bg-white p-2 max-w-full h-auto"
                          />
                          <p className="text-xs sm:text-sm text-blue-200/70 mt-3">
                            Scan this QR code with your WhatsApp mobile app
                          </p>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <RefreshCw className="w-8 h-8 text-blue-300 animate-spin mx-auto mb-2" />
                          <p className="text-blue-200/70 text-sm">Loading QR code...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Phone Number Method */}
                  {authMethod === 'phone' && (
                    <div className="space-y-4">
                      {phoneAuthStep === 'phone' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                              Phone Number
                            </label>
                            <Input
                              type="tel"
                              placeholder="+1234567890"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                            />
                            <p className="text-xs text-blue-200/60 mt-1">
                              Enter your WhatsApp phone number with country code
                            </p>
                          </div>
                          <Button 
                            onClick={sendPhoneAuth}
                            disabled={!phoneNumber.trim()}
                            className="w-full bg-green-500 hover:bg-green-600"
                          >
                            Send Verification Code
                          </Button>
                        </>
                      ) : (
                        <>
                          {pairingCode && (
                            <div className="p-3 bg-white/10 rounded-md text-white flex items-center justify-between">
                              <div>
                                <div className="text-xs text-blue-200">Enter this code in WhatsApp</div>
                                <div className="text-2xl font-mono tracking-widest">{pairingCode}</div>
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => navigator.clipboard.writeText(pairingCode)}
                                className="ml-3"
                              >
                                Copy
                              </Button>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                              6‑Digit Code
                            </label>
                            <Input
                              type="text"
                              placeholder="Enter 6-digit code"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                              className="bg:white/10 border-white/20 text-white placeholder:text-blue-300"
                              maxLength={6}
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setPhoneAuthStep('phone');
                                setVerificationCode('');
                                setPairingCode(null);
                              }}
                              className="flex-1"
                            >
                              Back
                            </Button>
                            <Button 
                              onClick={verifyPhoneAuth}
                              disabled={!verificationCode.trim() && !pairingCode}
                              className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                              Verify
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* Summary Modal */}
    <AnimatePresence>
      {showSummaryModal && selectedSummary && (
        <SummaryModal
          summary={selectedSummary!}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </AnimatePresence>
    </>
  );
};

export default WhatsAppPage;