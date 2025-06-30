import React from 'react';
import { useTelegram } from '../../contexts/TelegramContext'; // Adjust path as needed
import { TelegramItemType } from '../../types/telegram'; // Adjust path as needed
import { X, MessageSquareText } from 'lucide-react'; // Import X and an icon for transcription
import { STATIC_ASSETS_BASE_URL } from '../../services/axiosConfig'; // Import the new base URL
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { SecureImage } from '@/components/common/SecureImage';

// Use Vite environment variable for the API base URL, fallback for local dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const TelegramFeed: React.FC = () => {
  const { telegramItems, isConnected, deleteTelegramItem } = useTelegram();

  const handleDelete = async (itemId: string, itemText?: string) => {
    const itemName = itemText ? `"${itemText.substring(0, 20)}..."` : `item ${itemId}`;
    if (window.confirm(`Are you sure you want to delete ${itemName}?`)) {
      try {
        await deleteTelegramItem(itemId);
        // Optionally, show a success toast here
      } catch (error) {
        console.error("Error deleting item from feed:", error);
        // Optionally, show an error toast here
        alert(`Failed to delete item: ${(error as Error).message}`);
      }
    }
  };

  // Helper function to determine what to display as main content
  const getMainContent = (item: TelegramItemType) => {
    if (item.source === 'telegram_voice_memo') {
      // For voice memos, the 'title' (for tasks) or 'content' (for notes/ideas) is the AI-extracted summary
      return item.title || item.content || item.text || <span className="italic">(Processed Voice Memo)</span>;
    }
    // For other types, item.text is usually the main content
    return item.text || <span className="italic">({item.messageType || 'No text'})</span>;
  };

  return (
    <div className="telegram-feed-container mobile-card p-3 sm:p-4 border rounded-lg shadow-md bg-card w-full max-w-full overflow-hidden">
      <h2 className="text-xl font-semibold mb-3 text-card-foreground">Telegram Feed</h2>
      <p className="mb-2 text-sm text-muted-foreground">
        Socket Status: {
          isConnected ? <span className="text-green-500">Connected</span> : <span className="text-red-500">Disconnected</span>
        }
      </p>
      {telegramItems.length === 0 && (
        <p className="text-muted-foreground">No Telegram messages yet. Send a message to your bot!</p>
      )}
      <ul className="space-y-3 max-h-72 sm:max-h-80 md:max-h-96 overflow-y-auto pr-2 mobile-scroll w-full"> {/* Added pr-2 for scrollbar spacing */}
        {telegramItems.map((item: TelegramItemType) => (
          <motion.li key={item._id} className="mobile-card p-3 sm:p-3 border rounded-md bg-background shadow-sm relative group w-full max-w-full overflow-hidden">
            <button 
              onClick={() => handleDelete(item._id, item.title || item.content || item.text || item.messageType)} 
              className="absolute top-1 right-1 p-1.5 text-muted-foreground hover:text-destructive opacity-75 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity rounded-full hover:bg-muted/50 tap-target touch-manipulation"
              title="Delete item"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-1 w-full max-w-full min-w-0">
              <span className="font-medium text-sm text-primary truncate max-w-full min-w-0">
                {item.fromUsername || 'Unknown User'} ({item.chatTitle || 'DM'})
              </span>
              <span className="text-xs text-muted-foreground mt-1 sm:mt-0 text-left sm:text-right flex-shrink-0">
                {new Date(item.receivedAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-foreground mb-1 line-clamp-3 break-words overflow-wrap-anywhere w-full max-w-full mobile-text-wrap">
              {getMainContent(item)}
            </p>
            
            {/* Display raw transcription if source is voice memo and transcription exists */}
            {item.source === 'telegram_voice_memo' && item.rawTranscription && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center text-xs text-muted-foreground mb-1">
                  <MessageSquareText size={14} className="mr-1.5" />
                  <span>Original Transcription:</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md break-words overflow-wrap-anywhere w-full max-w-full mobile-text-wrap">
                  {item.rawTranscription}
                </p>
              </div>
            )}

            {item.messageType === 'photo' && item.mediaGridFsId && (
              <div className="mt-2 rounded-lg overflow-hidden max-w-full h-auto">
                <a href={`/api/v1/media/${item.mediaGridFsId}`} target="_blank" rel="noopener noreferrer" className="block">
                  <SecureImage 
                    imageId={item.mediaGridFsId}
                    alt="Telegram attachment" 
                    className="w-full h-auto object-cover max-w-full" 
                  />
                </a>
              </div>
            )}
            {item.urls && item.urls.length > 0 && (
              <div className="mt-1 w-full max-w-full min-w-0">
                {item.urls.map((url, index) => (
                  <a 
                    key={index} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-indigo-500 hover:underline mr-2 min-h-[32px] flex items-center touch-manipulation break-all max-w-full mobile-text-wrap"
                  >
                    {url}
                  </a>
                ))}
              </div>
            )}
             {/* Debug: Display source and messageType for clarity */}
            {/* <div className="text-xs text-gray-400 mt-2">
              Source: {item.source || 'N/A'} | Type: {item.messageType || 'N/A'} | ID: {item._id}
            </div> */}
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

export default TelegramFeed; 