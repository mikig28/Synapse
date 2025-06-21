import React, { useState, useEffect, useRef } from 'react';
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
  WifiOff
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';
import useAuthStore from '@/store/authStore';

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
}

interface WhatsAppStatus {
  connected: boolean;
  isReady: boolean;
  isClientReady: boolean;
  groupsCount: number;
  privateChatsCount: number;
  messagesCount: number;
  qrAvailable: boolean;
  timestamp: string;
  monitoredKeywords: string[];
}

const WhatsAppPage: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [groups, setGroups] = useState<WhatsAppChat[]>([]);
  const [privateChats, setPrivateChats] = useState<WhatsAppChat[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [monitoredKeywords, setMonitoredKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isAuthenticated, token } = useAuthStore();

  // Socket.io setup
  const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_IO_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

  useEffect(() => {
    fetchStatus();
    fetchGroups();
    fetchPrivateChats();
    fetchMessages();
    fetchMonitoredKeywords();
    
    const statusInterval = setInterval(fetchStatus, 5000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

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

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { token },
      autoConnect: false,
    });

    setSocket(newSocket);
    newSocket.connect();

    // Connection events
    newSocket.on('connect', () => {
      console.log('[WhatsApp Socket.IO] Connected to server');
      setIsSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[WhatsApp Socket.IO] Disconnected from server');
      setIsSocketConnected(false);
    });

    // WhatsApp-specific events
    newSocket.on('whatsapp:message', (messageData: WhatsAppMessage) => {
      console.log('[WhatsApp Socket.IO] Received new message:', messageData);
      
      // Add new message to the list
      setMessages(prevMessages => {
        const exists = prevMessages.find(m => m.id === messageData.id);
        if (exists) return prevMessages;
        return [messageData, ...prevMessages].slice(0, 100);
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
      setStatus(prevStatus => ({ ...prevStatus, ...statusData }));
    });

    newSocket.on('whatsapp:chats_updated', (chatsData: any) => {
      console.log('[WhatsApp Socket.IO] Chats updated:', chatsData);
      if (chatsData.groups) {
        setGroups(chatsData.groups);
      }
      if (chatsData.privateChats) {
        setPrivateChats(chatsData.privateChats);
      }
      
      // Show notification for new groups/chats
      if (chatsData.newGroup) {
        toast({
          title: "New Group Discovered",
          description: `Found new WhatsApp group: ${chatsData.newGroup.name}`,
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
      if (newSocket.connected) {
        newSocket.close();
      }
      setSocket(null);
      setIsSocketConnected(false);
    };
  }, [isAuthenticated, token, monitoredKeywords]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/groups');
      const data = await response.json();
      if (data.success) {
        setGroups(data.data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp groups:', error);
    }
  };

  const fetchPrivateChats = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/private-chats');
      const data = await response.json();
      if (data.success) {
        setPrivateChats(data.data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp private chats:', error);
    }
  };

  const fetchMessages = async (chatId?: string) => {
    try {
      const url = chatId 
        ? `/api/v1/whatsapp/messages?groupId=${chatId}`
        : '/api/v1/whatsapp/messages';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
    }
  };

  const fetchMonitoredKeywords = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/monitored-keywords');
      const data = await response.json();
      if (data.success) {
        setMonitoredKeywords(data.data);
      }
    } catch (error) {
      console.error('Error fetching monitored keywords:', error);
    }
  };

  const fetchQRCode = async () => {
    try {
      setShowQR(true);
      const response = await fetch('/api/v1/whatsapp/qr');
      const data = await response.json();
      if (data.success && data.data.qrCode) {
        setQrCode(data.data.qrCode);
      } else {
        toast({
          title: "QR Code",
          description: data.data.message || "WhatsApp is already connected",
        });
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast({
        title: "Error",
        description: "Failed to fetch QR code",
        variant: "destructive",
      });
    }
  };

  const refreshChats = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/refresh-chats', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        await fetchGroups();
        await fetchPrivateChats();
        toast({
          title: "Success",
          description: "Chats refreshed successfully",
        });
      }
    } catch (error) {
      console.error('Error refreshing chats:', error);
      toast({
        title: "Error",
        description: "Failed to refresh chats",
        variant: "destructive",
      });
    }
  };

  const restartService = async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/restart', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "WhatsApp service restart initiated",
        });
        setTimeout(fetchStatus, 3000);
      }
    } catch (error) {
      console.error('Error restarting service:', error);
      toast({
        title: "Error",
        description: "Failed to restart WhatsApp service",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedChat.id,
          message: newMessage,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        await fetchMessages(selectedChat.id);
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
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      const response = await fetch('/api/v1/whatsapp/monitored-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: newKeyword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewKeyword('');
        await fetchMonitoredKeywords();
        toast({
          title: "Success",
          description: `Keyword "${newKeyword}" added to monitoring`,
        });
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast({
        title: "Error",
        description: "Failed to add keyword",
        variant: "destructive",
      });
    }
  };

  const removeKeyword = async (keyword: string) => {
    try {
      const response = await fetch(`/api/v1/whatsapp/monitored-keywords/${keyword}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchMonitoredKeywords();
        toast({
          title: "Success",
          description: `Keyword "${keyword}" removed from monitoring`,
        });
      }
    } catch (error) {
      console.error('Error removing keyword:', error);
      toast({
        title: "Error",
        description: "Failed to remove keyword",
        variant: "destructive",
      });
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPrivateChats = privateChats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-8 h-8 text-green-400" />
                <h1 className="text-3xl font-bold text-white">WhatsApp</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${getStatusColor()}`} />
                  <span className={`text-sm ${getStatusColor()}`}>
                    {status?.connected && status?.isReady && status?.isClientReady 
                      ? 'Connected' 
                      : status?.qrAvailable 
                      ? 'QR Available' 
                      : 'Disconnected'
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-blue-200/70">
                    {isSocketConnected ? 'Real-time' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Temporarily always show QR button for testing */}
              <AnimatedButton
                onClick={fetchQRCode}
                variant="outline"
                size="sm"
                className="border-yellow-400/30 text-yellow-200 hover:bg-yellow-500/10"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show QR
              </AnimatedButton>
              
              <AnimatedButton
                onClick={refreshChats}
                variant="outline"
                size="sm"
                className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
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
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-blue-100/70">Groups</p>
                <p className="text-2xl font-bold text-white">{status?.groupsCount || 0}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <Phone className="w-8 h-8 text-violet-400" />
              <div>
                <p className="text-sm text-blue-100/70">Private Chats</p>
                <p className="text-2xl font-bold text-white">{status?.privateChatsCount || 0}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm text-blue-100/70">Messages</p>
                <p className="text-2xl font-bold text-white">{status?.messagesCount || 0}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-sm text-blue-100/70">Monitored</p>
                <p className="text-2xl font-bold text-white">{monitoredKeywords.length}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <GlassCard className="p-6 h-[600px] flex flex-col">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-blue-300" />
                  <Input
                    placeholder="Search chats..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredGroups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-200 mb-2">Groups</h3>
                    {filteredGroups.map((group) => (
                      <motion.div
                        key={group.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedChat(group);
                          fetchMessages(group.id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat?.id === group.id
                            ? 'bg-violet-500/30 border border-violet-400/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {group.name}
                            </p>
                            <p className="text-xs text-blue-200/70">
                              {group.participantCount} members
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {filteredPrivateChats.length > 0 && (
                  <div className="pt-4">
                    <h3 className="text-sm font-semibold text-blue-200 mb-2">Private Chats</h3>
                    {filteredPrivateChats.map((chat) => (
                      <motion.div
                        key={chat.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedChat(chat);
                          fetchMessages(chat.id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id
                            ? 'bg-violet-500/30 border border-violet-400/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-violet-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {chat.name}
                            </p>
                            <p className="text-xs text-blue-200/70">Private chat</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-2">
            <GlassCard className="p-6 h-[600px] flex flex-col">
              {selectedChat ? (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                    {selectedChat.isGroup ? (
                      <Users className="w-6 h-6 text-green-400" />
                    ) : (
                      <Phone className="w-6 h-6 text-violet-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-white">{selectedChat.name}</h3>
                      <p className="text-sm text-blue-200/70">
                        {selectedChat.isGroup 
                          ? `${selectedChat.participantCount} members`
                          : 'Private chat'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto my-4 space-y-3">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.fromMe
                              ? 'bg-violet-500/70 text-white'
                              : 'bg-white/20 text-white'
                          }`}
                        >
                          {!message.fromMe && message.isGroup && (
                            <p className="text-xs text-blue-200 mb-1">{message.contactName}</p>
                          )}
                          <p className="text-sm">{message.body || '[Media]'}</p>
                          <p className="text-xs opacity-70 mt-1">{message.time}</p>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="flex gap-3">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-green-500 hover:bg-green-600"
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
              
              <div className="flex-1 overflow-y-auto space-y-2">
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
        </div>

        <AnimatePresence>
          {showQR && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowQR(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full"
              >
                <GlassCard className="p-8 text-center">
                  <QrCode className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-4">WhatsApp QR Code</h3>
                  
                  {qrCode ? (
                    <div className="mb-4">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="mx-auto rounded-lg bg-white p-2"
                      />
                      <p className="text-sm text-blue-200/70 mt-2">
                        Scan this QR code with your WhatsApp mobile app
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <RefreshCw className="w-8 h-8 text-blue-300 animate-spin mx-auto mb-2" />
                      <p className="text-blue-200/70">Loading QR code...</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => setShowQR(false)}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Close
                  </Button>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WhatsAppPage;