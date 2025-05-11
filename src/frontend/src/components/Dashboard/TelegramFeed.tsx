import React from 'react';
import { useTelegram } from '../../contexts/TelegramContext'; // Adjust path as needed
import { TelegramItemType } from '../../types/telegram'; // Adjust path as needed
import { X } from 'lucide-react'; // <-- Import X icon

const SOCKET_SERVER_URL = 'http://localhost:3001'; // Defined in TelegramContext, we can reuse it or define it here too

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

  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-3">Telegram Feed</h2>
      <p className="mb-2 text-sm">
        Socket Status: {
          isConnected ? <span className="text-green-500">Connected</span> : <span className="text-red-500">Disconnected</span>
        }
      </p>
      {telegramItems.length === 0 && (
        <p className="text-gray-500">No Telegram messages yet. Send a message to your bot!</p>
      )}
      <ul className="space-y-3 max-h-96 overflow-y-auto">
        {telegramItems.map((item: TelegramItemType) => (
          <li key={item._id} className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 relative group">
            <button 
              onClick={() => handleDelete(item._id, item.text || item.messageType)} 
              className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              title="Delete item"
            >
              <X size={16} />
            </button>
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-sm text-blue-600 dark:text-blue-400">
                {item.fromUsername || 'Unknown User'} ({item.chatTitle || 'DM'})
              </span>
              <span className="text-xs text-gray-400">
                {new Date(item.receivedAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {item.text || <span className="italic">({item.messageType})</span>}
            </p>
            {/* Display image if it's a photo and has a local URL */}
            {item.messageType === 'photo' && item.mediaLocalUrl && (
              <div className="mt-2">
                <img 
                  src={`${SOCKET_SERVER_URL}${item.mediaLocalUrl}`} 
                  alt="Telegram Photo" 
                  className="max-w-xs max-h-64 rounded-md border object-cover"
                />
              </div>
            )}
            {item.urls && item.urls.length > 0 && (
              <div className="mt-1">
                {item.urls.map((url, index) => (
                  <a 
                    key={index} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-indigo-500 hover:underline mr-2"
                  >
                    {url}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TelegramFeed; 