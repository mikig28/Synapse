import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import axiosInstance from '@/services/axiosConfig';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';

interface TelegramChannelMessage {
  messageId: number;
  text?: string;
  mediaType?: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker';
  mediaUrl?: string;
  author?: string;
  date: string;
  views?: number;
  forwards?: number;
  urls?: string[];
  hashtags?: string[];
}

interface TelegramChannel {
  _id: string;
  channelId: string;
  channelTitle: string;
  channelUsername?: string;
  channelDescription?: string;
  channelType: 'channel' | 'group' | 'supergroup';
  isActive: boolean;
  totalMessages: number;
  messages: TelegramChannelMessage[];
  keywords: string[];
  fetchInterval: number;
  lastFetchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TelegramChannelsContextType {
  channels: TelegramChannel[];
  isConnected: boolean;
  fetchChannels: () => Promise<void>;
  addChannel: (data: { channelIdentifier: string; keywords: string[] }) => Promise<void>;
  removeChannel: (channelId: string) => Promise<void>;
  toggleChannelStatus: (channelId: string, isActive: boolean) => Promise<void>;
  forceChannelFetch: (channelId: string) => Promise<void>;
  searchChannelMessages: (query: string, channelId?: string) => Promise<any[]>;
  isLoading: boolean;
}

const TelegramChannelsContext = createContext<TelegramChannelsContextType | undefined>(undefined);

// Use Vite environment variable for deployed URL, fallback to localhost for local dev
const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_IO_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export const TelegramChannelsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const { toast } = useToast();

  // Initialize socket connection and fetch channels
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setChannels([]);
      setIsLoading(false);
      return;
    }

    // Create socket connection
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { token },
      autoConnect: false,
    });
    setSocket(newSocket);

    // Connect socket
    newSocket.connect();

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('[TelegramChannels Socket] Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[TelegramChannels Socket] Disconnected from server');
      setIsConnected(false);
    });

    // Listen for new channel added
    newSocket.on('new_telegram_channel', (data: { userId: string; channel: TelegramChannel }) => {
      console.log('[TelegramChannels Socket] New channel added:', data.channel.channelTitle);
      setChannels(prev => [data.channel, ...prev]);
      toast({
        title: "Channel Added",
        description: `${data.channel.channelTitle} is now being monitored`,
      });
    });

    // Listen for channel removed
    newSocket.on('telegram_channel_removed', (data: { userId: string; channelId: string }) => {
      console.log('[TelegramChannels Socket] Channel removed:', data.channelId);
      setChannels(prev => prev.filter(channel => channel._id !== data.channelId));
      toast({
        title: "Channel Removed",
        description: "Channel has been removed from monitoring",
      });
    });

    // Listen for new messages in channels
    newSocket.on('new_telegram_channel_messages', (data: {
      userId: string;
      channelId: string;
      messages: TelegramChannelMessage[];
    }) => {
      console.log(`[TelegramChannels Socket] New messages for channel ${data.channelId}:`, data.messages.length);
      
      setChannels(prev => prev.map(channel => {
        if (channel._id === data.channelId) {
          // Add new messages and update totals
          const updatedMessages = [...data.messages, ...channel.messages];
          return {
            ...channel,
            messages: updatedMessages,
            totalMessages: channel.totalMessages + data.messages.length,
            lastFetchedAt: new Date().toISOString()
          };
        }
        return channel;
      }));

      // Show toast for new messages
      const channel = channels.find(c => c._id === data.channelId);
      if (channel && data.messages.length > 0) {
        toast({
          title: "New Messages",
          description: `${data.messages.length} new messages from ${channel.channelTitle}`,
        });
      }
    });

    // Cleanup function
    return () => {
      console.log('[TelegramChannels Socket] Cleaning up socket connection');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('new_telegram_channel');
      newSocket.off('telegram_channel_removed');
      newSocket.off('new_telegram_channel_messages');
      if (newSocket.connected) {
        newSocket.close();
      }
      setSocket(null);
    };
  }, [isAuthenticated, token, toast]);

  // Fetch initial channels when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchChannels();
    }
  }, [isAuthenticated]);

  const fetchChannels = async () => {
    if (!isAuthenticated || !token) {
      setChannels([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/telegram-channels');
      if (response.data.success) {
        setChannels(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching channels:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch channels",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addChannel = async (channelData: { channelIdentifier: string; keywords: string[] }) => {
    try {
      const response = await axiosInstance.post('/telegram-channels', channelData);
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Channel added successfully",
        });
        // Note: Real-time update will be handled by socket event
        return;
      }
    } catch (error: any) {
      console.error('Error adding channel:', error);
      throw error; // Re-throw to let the component handle it
    }
  };

  const removeChannel = async (channelId: string) => {
    try {
      const response = await axiosInstance.delete(`/telegram-channels/${channelId}`);
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Channel removed successfully",
        });
        // Note: Real-time update will be handled by socket event
      }
    } catch (error: any) {
      console.error('Error removing channel:', error);
      throw error; // Re-throw to let the component handle it
    }
  };

  const toggleChannelStatus = async (channelId: string, isActive: boolean) => {
    try {
      const response = await axiosInstance.patch(`/telegram-channels/${channelId}/toggle`, {
        isActive
      });
      
      if (response.data.success) {
        // Update local state immediately
        setChannels(prev => prev.map(channel => 
          channel._id === channelId ? { ...channel, isActive } : channel
        ));
        
        toast({
          title: "Success",
          description: `Channel ${isActive ? 'activated' : 'deactivated'}`,
        });
      }
    } catch (error: any) {
      console.error('Error toggling channel:', error);
      throw error; // Re-throw to let the component handle it
    }
  };

  const forceChannelFetch = async (channelId: string) => {
    try {
      const response = await axiosInstance.post(`/telegram-channels/${channelId}/fetch`);
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Channel fetch triggered",
        });
        // Optionally refresh channels after a delay
        setTimeout(() => fetchChannels(), 2000);
      }
    } catch (error: any) {
      console.error('Error forcing fetch:', error);
      throw error; // Re-throw to let the component handle it
    }
  };

  const searchChannelMessages = async (query: string, channelId?: string): Promise<any[]> => {
    try {
      const response = await axiosInstance.get('/telegram-channels/search', {
        params: { query, channelId }
      });
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error: any) {
      console.error('Error searching messages:', error);
      toast({
        title: "Search Error",
        description: error.response?.data?.message || "Search failed",
        variant: "destructive"
      });
      return [];
    }
  };

  return (
    <TelegramChannelsContext.Provider
      value={{
        channels,
        isConnected,
        fetchChannels,
        addChannel,
        removeChannel,
        toggleChannelStatus,
        forceChannelFetch,
        searchChannelMessages,
        isLoading,
      }}
    >
      {children}
    </TelegramChannelsContext.Provider>
  );
};

export const useTelegramChannels = (): TelegramChannelsContextType => {
  const context = useContext(TelegramChannelsContext);
  if (context === undefined) {
    throw new Error('useTelegramChannels must be used within a TelegramChannelsProvider');
  }
  return context;
};
