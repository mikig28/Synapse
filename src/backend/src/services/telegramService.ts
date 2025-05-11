import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios'; // <-- Import axios
import path from 'path'; // <-- Import path
import fs from 'fs'; // <-- Import fs
import TelegramItem from '../models/TelegramItem'; // Import the Mongoose model
import User from '../models/User'; // Import the User model
import { io } from '../server'; // Import the io instance from server.ts
import { processTelegramItemForBookmarks } from '../api/controllers/captureController'; // <--- IMPORT HERE

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not defined in .env file');
  // process.exit(1); // Consider if you want to exit or just log and disable bot functionality
  throw new Error('TELEGRAM_BOT_TOKEN is not defined. Bot cannot start.');
}

// Create a bot that uses 'polling' to fetch new updates
// Alternatively, you can use webhooks for a production environment
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log('[TelegramBot]: Bot instance created. Polling for messages...');

// Helper to extract URLs from text and entities
const extractUrls = (text?: string, entities?: TelegramBot.MessageEntity[]): string[] => {
  const urls: string[] = [];
  if (entities) {
    for (const entity of entities) {
      if (entity.type === 'url' && text) {
        urls.push(text.substring(entity.offset, entity.offset + entity.length));
      } else if (entity.type === 'text_link' && entity.url) {
        urls.push(entity.url);
      }
    }
  }
  // Basic regex for URLs in text if no entities (can be improved)
  if (text && urls.length === 0) {
    const regex = /\bhttps?:\/\/\S+/gi;
    const found = text.match(regex);
    if (found) {
      urls.push(...found);
    }
  }
  return Array.from(new Set(urls)); // Remove duplicates
};

// Basic message listener
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const telegramMessageId = msg.message_id;
  const fromUserId = msg.from?.id;
  const fromUsername = msg.from?.username || msg.from?.first_name || 'UnknownUser';
  const chatTitle = msg.chat.title;
  const receivedAt = new Date(msg.date * 1000);
  const textContent = msg.text || msg.caption;
  const messageEntities = msg.entities || msg.caption_entities;

  let messageType = 'other';
  let mediaFileId: string | undefined = undefined;
  let mediaLocalUrl: string | undefined = undefined; // <-- Add this to store local URL
  const extractedUrls = extractUrls(textContent, messageEntities);

  if (msg.text) messageType = 'text';
  if (msg.photo) {
    messageType = 'photo';
    mediaFileId = msg.photo[msg.photo.length - 1].file_id; // Get largest photo
    
    // --- BEGIN: Download and save photo ---
    if (mediaFileId) {
      try {
        const fileLink = await bot.getFileLink(mediaFileId);
        const fileResponse = await axios({ url: fileLink, responseType: 'stream' });
        
        // Determine file extension (Telegram usually uses .jpg for photos)
        // For more robustness, you might inspect mime types from response headers or use a library
        const fileName = `${mediaFileId}.jpg`; 
        const localFilePath = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media', fileName);
        
        const writer = fs.createWriteStream(localFilePath);
        fileResponse.data.pipe(writer);

        await new Promise<void>((resolve, reject) => { // Explicitly type the Promise
          writer.on('finish', () => resolve()); // Call resolve without arguments
          writer.on('error', (err) => reject(err)); // Pass the error object to reject
        });

        mediaLocalUrl = `/public/uploads/telegram_media/${fileName}`; // Path for frontend access
        console.log(`[TelegramBot]: Photo downloaded and saved to ${localFilePath}`);
        console.log(`[TelegramBot]: Photo accessible at ${mediaLocalUrl}`);

      } catch (downloadError) {
        console.error(`[TelegramBot]: Error downloading photo ${mediaFileId}:`, downloadError);
        // Continue without mediaLocalUrl if download fails
      }
    }
    // --- END: Download and save photo ---
  }
  if (msg.document) {
    messageType = 'document';
    mediaFileId = msg.document.file_id;
  }
  if (msg.voice) {
    messageType = 'voice';
    mediaFileId = msg.voice.file_id;
  }
  if (msg.video) { // Added video detection
    messageType = 'video';
    mediaFileId = msg.video.file_id;
  }
  if (extractedUrls.length > 0 && messageType === 'text') {
    // If it's primarily text but contains URLs, we might still call it 'text'
    // or introduce a 'link' type if the URL is the main content.
    // For now, URLs are stored in a separate field.
  }

  console.log(`[TelegramBot]: Received ${messageType} in chat ${chatId} (${chatTitle || 'DM'}) from ${fromUsername} (${fromUserId})`);

  try {
    // Find the Synapse user who is monitoring this chat
    const synapseUser = await User.findOne({ monitoredTelegramChats: chatId });

    if (!synapseUser) {
      console.log(`[TelegramBot]: No Synapse user is monitoring chat ID: ${chatId}. Message not saved.`);
      return; // Don't save if no user is monitoring this chat
    }

    const newItemData = {
      synapseUserId: synapseUser._id,
      telegramMessageId,
      chatId,
      chatTitle,
      fromUserId,
      fromUsername,
      text: textContent,
      urls: extractedUrls,
      messageType,
      mediaFileId,
      mediaLocalUrl, // <-- Add mediaLocalUrl here
      receivedAt,
    };
    
    const savedItem = await new TelegramItem(newItemData).save();
    console.log(`[TelegramBot]: Saved ${messageType} from chat ${chatId} to DB for user ${synapseUser.email}.`);

    // Process for bookmarks if it has URLs
    if (savedItem.urls && savedItem.urls.length > 0) {
      processTelegramItemForBookmarks(savedItem); // <--- CALL HERE
    }

    // Emit event to connected clients (specifically to the user if we implement rooms/namespaces later)
    // For now, emitting to all connected clients for simplicity
    if (io) { // Check if io is available (it should be if server started correctly)
      io.emit('new_telegram_item', savedItem.toObject()); // Send the saved item data
      console.log(`[Socket.IO]: Emitted 'new_telegram_item' for chat ${chatId}`);
    } else {
      console.warn('[Socket.IO]: io instance not available in telegramService. Cannot emit event.');
    }

  } catch (error) {
    console.error('[TelegramBot]: Error processing message or saving to DB:', error);
  }

  // Example: Echo message back for testing (remove for production)
  // if (messageText) {
  //   bot.sendMessage(chatId, `You said: ${messageText}`);
  // }
});

// Listener for polling errors
bot.on('polling_error', (error) => {
  console.error('[TelegramBot]: Polling error:', error.message);
  // You might want to add more sophisticated error handling or restart logic here
});

// Listener for webhook errors (if you switch to webhooks)
bot.on('webhook_error', (error) => {
  console.error('[TelegramBot]: Webhook error:', error.message);
});

// Optional: Listen for other events like 'photo', 'document', 'voice', etc.
// bot.on('photo', (msg) => { /* handle photo */ });

export const initializeTelegramBot = () => {
  // This function is mainly to ensure this module is loaded and the bot starts listening.
  // The bot instance is already created and listeners attached above.
  console.log('[TelegramBot]: Telegram Bot service initialized.');
  // You could return the bot instance if needed elsewhere, but for now, it operates globally in this module.
};

// Export the bot instance if you need to access it directly in other modules (e.g., to send messages programmatically)
// export default bot; 