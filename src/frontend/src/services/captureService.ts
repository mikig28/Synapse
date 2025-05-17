import useAuthStore from "@/store/authStore";

// Use Vite environment variable for the API base URL, fallback for local dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

interface TelegramItem {
  _id: string;
  synapseUserId: string;
  telegramMessageId: number;
  chatId: number;
  chatTitle?: string;
  fromUsername?: string;
  text?: string;
  urls?: string[];
  messageType: 'text' | 'photo' | 'document' | 'voice' | 'video' | 'other';
  mediaFileId?: string;
  mediaLocalUrl?: string;
  receivedAt: string; // Date as string from JSON
  createdAt: string;
  updatedAt: string;
}

export const getCapturedTelegramItems = async (): Promise<TelegramItem[]> => {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/capture/telegram`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch captured items');
  }
  return data as TelegramItem[];
};

export const deleteCapturedTelegramItem = async (itemId: string): Promise<{ message: string }> => {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Not authenticated for deletion');
  }

  const response = await fetch(`${API_BASE_URL}/capture/telegram/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // Check if the response has content before trying to parse as JSON
  const contentType = response.headers.get("content-type");
  let data = { message: `Item ${itemId} processed.` }; // Default message for 204 or empty body

  if (contentType && contentType.indexOf("application/json") !== -1) {
    data = await response.json();
  } else if (response.status === 200 && response.bodyUsed === false) {
    // If status is 200 but no JSON body, use a default success message
    // This can happen if server sends 200 with an empty body for delete success
  } else if (!response.ok) {
    // For other errors, try to parse if JSON, otherwise use status text
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to delete item ${itemId}. Status: ${response.status}`);
    } catch (e) {
      throw new Error(`Failed to delete item ${itemId}. Status: ${response.status} ${response.statusText}`);
    }
  }

  if (!response.ok) { // Double check, though specific errors are thrown above
    throw new Error(data.message || `Failed to delete item ${itemId}. Status: ${response.status}`);
  }
  
  return data;
};

// We can add other capture-related services here later 