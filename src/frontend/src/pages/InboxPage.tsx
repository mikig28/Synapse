import React, { useEffect, useState } from 'react';
import { getCapturedTelegramItems } from '@/services/captureService';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For error display
import { Terminal } from 'lucide-react'; // For alert icon
import TelegramFeed from '@/components/Dashboard/TelegramFeed'; // <-- Import TelegramFeed
import useAuthStore from '@/store/authStore'; // Corrected import path

// Define the shape of a Telegram item for the frontend
interface TelegramItemFE {
  _id: string;
  telegramMessageId: number;
  chatId: number;
  chatTitle?: string;
  fromUsername?: string;
  text?: string;
  urls?: string[];
  messageType: string;
  mediaFileId?: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

const InboxPage: React.FC = () => {
  const [items, setItems] = useState<TelegramItemFE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storeToken = useAuthStore((state) => state.token); // Get token for logging
  const storeIsAuthenticated = useAuthStore((state) => state.isAuthenticated); // Get auth state for logging

  useEffect(() => {
    const fetchItems = async () => {
      console.log('[InboxPage] Attempting to fetch items. IsAuthenticated:', storeIsAuthenticated, 'Token Present:', !!storeToken);
      if (storeToken) {
        console.log('[InboxPage] Token value (first 20 chars):', storeToken.substring(0,20) + '...');
      }

      try {
        setLoading(true);
        const fetchedItems = await getCapturedTelegramItems();
        setItems(fetchedItems);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching inbox items:", err);
        setError(err.message || "Failed to load inbox items.");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Note: Loading and error states below only apply to the initially fetched items.
  // TelegramFeed has its own internal connection status display.

  return (
    <div className="p-4 space-y-6"> {/* Increased spacing a bit */}
      <h1 className="text-2xl font-semibold mb-4">Inbox</h1>
      
      {/* Display the real-time TelegramFeed component */}
      <div className="mb-6">
        <TelegramFeed />
      </div>

      <hr className="my-6" /> {/* Separator */}

      <h2 className="text-xl font-semibold mb-3">Captured Items History</h2>
      {loading && <div className="p-4">Loading inbox history...</div>}
      {error && (
        <Alert variant="destructive" className="m-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading History</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!loading && !error && items.length === 0 && (
        <p>No historical items captured yet, or none associated with your monitored chats.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item._id} className="bg-card p-4 rounded-lg shadow border">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-muted-foreground">
                  From: {item.fromUsername || 'Unknown'} in {item.chatTitle || `Chat ${item.chatId}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.receivedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground mb-1">
                {item.text || '[No text content]'}
              </p>
              {item.urls && item.urls.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground">Links:</p>
                  <ul className="list-disc list-inside ml-4">
                    {item.urls.map((url, index) => (
                      <li key={index} className="text-xs">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Type: {item.messageType} {item.mediaFileId && `(FileID: ${item.mediaFileId.substring(0,10)}...)`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InboxPage; 