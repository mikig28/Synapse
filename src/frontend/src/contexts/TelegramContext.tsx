import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { TelegramItemType } from '../types/telegram';
import { getCapturedTelegramItems, deleteCapturedTelegramItem } from '../services/captureService';
import useAuthStore from '@/store/authStore';

// Use Vite environment variable for deployed URL, fallback to localhost for local dev
console.log("[TelegramContext] VITE_SOCKET_IO_URL from import.meta.env:", import.meta.env.VITE_SOCKET_IO_URL);
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_IO_URL || 'http://localhost:3001';
console.log("[TelegramContext] Effective SOCKET_SERVER_URL:", SOCKET_SERVER_URL);

interface TelegramContextType {
  telegramItems: TelegramItemType[];
  isConnected: boolean;
  fetchInitialItems: () => Promise<void>;
  deleteTelegramItem: (itemId: string) => Promise<void>;
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined);

export const TelegramProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [telegramItems, setTelegramItems] = useState<TelegramItemType[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  const fetchInitialItems = async () => {
    if (!isAuthenticated || !token) {
      setTelegramItems([]);
      return;
    }
    try {
      const initialItems = await getCapturedTelegramItems();
      setTelegramItems(initialItems.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()));
    } catch (error) {
      console.error('[TelegramContext] Error fetching initial Telegram items:', error);
      setTelegramItems([]);
    }
  };

  const deleteTelegramItem = async (itemId: string) => {
    if (!isAuthenticated || !token) {
      console.error('[TelegramContext] Not authenticated, cannot delete item.');
      throw new Error('Not authenticated');
    }
    try {
      await deleteCapturedTelegramItem(itemId);
      setTelegramItems((prevItems) => prevItems.filter(item => item._id !== itemId));
      console.log(`[TelegramContext] Item ${itemId} deleted successfully.`);
      // Optionally, show a success toast/notification to the user here
    } catch (error) {
      console.error(`[TelegramContext] Error deleting item ${itemId}:`, error);
      // Optionally, show an error toast/notification to the user here
      throw error; // Re-throw to allow components to handle it if needed
    }
  };

  useEffect(() => {
    fetchInitialItems();

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: { token },
      autoConnect: false,
    });
    setSocket(newSocket);
    
    if (isAuthenticated && token) {
      newSocket.connect();
    }

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('new_telegram_item', (item: TelegramItemType) => {
      console.log('[Socket.IO] Received new_telegram_item:', item);
      setTelegramItems((prevItems) => {
        if (prevItems.find(i => i._id === item._id)) {
          return prevItems;
        }
        const updatedItems = [item, ...prevItems];
        return updatedItems.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      });
    });

    return () => {
      console.log('[Socket.IO] Cleaning up socket connection');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('new_telegram_item');
      if (newSocket.connected) {
        newSocket.close();
      }
      setSocket(null);
    };
  }, [isAuthenticated, token]);

  return (
    <TelegramContext.Provider value={{ telegramItems, isConnected, fetchInitialItems, deleteTelegramItem }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = (): TelegramContextType => {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}; 