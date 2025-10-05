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
    <div className="telegram-feed-container w-full max-w-full min-w-0 overflow-x-hidden box-border">
      <div className="mb-2 flex items-center justify-between gap-2 overflow-x-hidden max-w-full">
        <p className="text-xs sm:text-sm text-muted-foreground truncate min-w-0">
          Socket: {
            isConnected ? <span className="text-green-500">Connected</span> : <span className="text-red-500">Disconnected</span>
          }
        </p>
      </div>
      {telegramItems.length === 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground break-words overflow-hidden max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>No Telegram messages yet. Send a message to your bot!</p>
      )}
      <ul className="space-y-3 max-h-72 sm:max-h-80 md:max-h-96 overflow-y-auto overflow-x-hidden pr-2 w-full max-w-full min-w-0 box-border">
        {telegramItems.map((item: TelegramItemType) => (
          <motion.li 
            key={item._id} 
            className="p-2 sm:p-3 border rounded-md bg-background shadow-sm relative group w-full max-w-full min-w-0 overflow-hidden box-border"
          >
            <button 
              onClick={() => handleDelete(item._id, item.title || item.content || item.text || item.messageType)} 
              className="absolute top-1 right-1 p-1.5 text-muted-foreground hover:text-destructive opacity-75 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity rounded-full hover:bg-muted/50 touch-manipulation z-10"
              title="Delete item"
            >
              <X size={14} className="sm:w-4 sm:h-4" />
            </button>
            <div className="flex flex-col gap-1 mb-2 w-full max-w-full min-w-0 pr-8 overflow-hidden">
              <span className="font-medium text-xs sm:text-sm text-primary truncate min-w-0">
                {item.fromUsername || 'Unknown User'} {item.chatTitle && `(${item.chatTitle})`}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap truncate min-w-0">
                {new Date(item.receivedAt).toLocaleString()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground mb-1 line-clamp-3 w-full max-w-full min-w-0 overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {getMainContent(item)}
            </p>
            
            {/* Display raw transcription if source is voice memo and transcription exists */}
            {item.source === 'telegram_voice_memo' && item.rawTranscription && (
              <div className="mt-2 pt-2 border-t border-border min-w-0 max-w-full overflow-hidden">
                <div className="flex items-center text-xs text-muted-foreground mb-1 overflow-hidden max-w-full">
                  <MessageSquareText size={12} className="mr-1.5 flex-shrink-0" />
                  <span className="truncate min-w-0">Original Transcription:</span>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md w-full max-w-full min-w-0 overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {item.rawTranscription}
                </p>
              </div>
            )}

            {item.messageType === 'photo' && item.mediaGridFsId && (
              <div className="mt-2 rounded-lg overflow-hidden w-full max-w-full min-w-0 box-border">
                <a href={`/media/${item.mediaGridFsId}`} target="_blank" rel="noopener noreferrer" className="block w-full max-w-full overflow-hidden">
                  <SecureImage 
                    imageId={item.mediaGridFsId}
                    alt="Telegram attachment" 
                    className="w-full h-auto object-contain max-w-full block" 
                    style={{ maxHeight: '450px' }}
                  />
                </a>
              </div>
            )}
            {item.urls && item.urls.length > 0 && (
              <div className="mt-2 w-full max-w-full min-w-0 space-y-1 overflow-hidden">
                {item.urls.map((url, index) => (
                  <a 
                    key={index} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] sm:text-xs text-indigo-500 hover:underline min-h-[28px] flex items-center touch-manipulation w-full max-w-full overflow-hidden"
                    style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  >
                    {url}
                  </a>
                ))}
              </div>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

export default TelegramFeed;
