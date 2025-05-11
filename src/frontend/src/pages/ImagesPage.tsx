import React from 'react';
import { useTelegram } from '@/contexts/TelegramContext'; // Adjust path if necessary
import { TelegramItemType } from '@/types/telegram'; // Adjust path if necessary
import { X } from 'lucide-react'; // <-- Import X icon

const SOCKET_SERVER_URL = 'http://localhost:3001'; // Consider moving to a config or env variable

const ImagesPage: React.FC = () => {
  const { telegramItems, isConnected, deleteTelegramItem } = useTelegram();

  const imageItems = telegramItems.filter(
    (item) => item.messageType === 'photo' && item.mediaLocalUrl
  );

  const handleDelete = async (itemId: string, itemInfo: string) => {
    if (window.confirm(`Are you sure you want to delete this image (${itemInfo})?`)) {
      try {
        await deleteTelegramItem(itemId);
      } catch (error) {
        console.error("Error deleting image:", error);
        alert(`Failed to delete image: ${(error as Error).message}`);
      }
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold mb-6">Captured Images</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Socket Status: {
          isConnected ? <span className="text-green-500 font-medium">Connected</span> : <span className="text-red-500 font-medium">Disconnected</span>
        }
      </p>
      {imageItems.length === 0 ? (
        <p className="text-gray-500">
          No images captured yet via Telegram, or still connecting. Send a photo to your bot!
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imageItems.map((item: TelegramItemType) => (
            <div key={item._id} className="border rounded-lg overflow-hidden shadow-md bg-card group relative">
              <button 
                onClick={() => handleDelete(item._id, item.mediaLocalUrl || item._id)} 
                className="absolute top-1 right-1 z-10 p-1 bg-black bg-opacity-30 text-white rounded-full hover:bg-red-500 hover:bg-opacity-70 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                title="Delete image"
              >
                <X size={16} />
              </button>
              <a href={`${SOCKET_SERVER_URL}${item.mediaLocalUrl}`} target="_blank" rel="noopener noreferrer">
                <img 
                  src={`${SOCKET_SERVER_URL}${item.mediaLocalUrl}`}
                  alt={`Telegram Photo from ${item.fromUsername || 'Unknown'} in ${item.chatTitle || 'DM'}`}
                  className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                />
              </a>
              <div className="p-3 text-xs text-muted-foreground">
                <p>From: {item.fromUsername || 'Unknown User'}</p>
                <p>Chat: {item.chatTitle || 'DM'}</p>
                <p>Received: {new Date(item.receivedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImagesPage; 