import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios'; // <-- Import axios
import path from 'path'; // <-- Import path
import fs from 'fs'; // <-- Import fs
import TelegramItem, { ITelegramItem } from '../models/TelegramItem'; // Import the Mongoose model and ITelegramItem
import User, { IUser } from '../models/User'; // Import the User model and IUser
import { io } from '../server'; // Import the io instance from server.ts
import { processTelegramItemForBookmarks } from '../api/controllers/captureController'; // <--- IMPORT HERE
import { processAndCreateVideoItem } from '../api/controllers/videosController'; // Import video processing function
import { transcribeAudio } from './transcriptionService'; // <-- IMPORT Transcription Service
import { analyzeTranscription } from './analysisService'; // <-- IMPORT Analysis Service
import Task from '../models/Task'; // <-- IMPORT Task model
import Note from '../models/Note'; // <-- IMPORT Note model
import Idea from '../models/Idea'; // <-- IMPORT Idea model
import mongoose from 'mongoose';

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

const isYouTubeUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    return (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'm.youtube.com'
    );
  } catch (e) {
    return false;
  }
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
  let mediaLocalUrl: string | undefined = undefined;
  const extractedUrls = extractUrls(textContent, messageEntities);

  // --- Define synapseUser and savedItem in a higher scope ---
  let synapseUser: (mongoose.Document<unknown, {}, IUser> & IUser & { _id: mongoose.Types.ObjectId; }) | null = null;
  let savedItem: (ITelegramItem & mongoose.Document) | null = null;
  // --- End definition ---

  // Try to find the Synapse user early, applies to all message types
  synapseUser = await User.findOne({ monitoredTelegramChats: chatId });

  if (!synapseUser) {
    console.log(`[TelegramBot]: No Synapse user is monitoring chat ID: ${chatId}. Message not processed further for Synapse features.`);
    // Optionally, you might still want the bot to respond or transcribe even if not linked to a Synapse user
    // For now, we largely stop processing if no user is linked, except for basic bot interactions.
  }

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
  if (msg.voice && synapseUser) { // Process voice only if a synapseUser is found
    messageType = 'voice';
    mediaFileId = msg.voice.file_id;
    // --- BEGIN: Download and save voice memo ---
    if (mediaFileId) {
      let localFilePath: string | undefined = undefined; // Define here to be accessible in finally
      try {
        const fileLink = await bot.getFileLink(mediaFileId);
        const fileResponse = await axios({ url: fileLink, responseType: 'stream' });
        
        const fileName = `${mediaFileId}.oga`; // CORRECTED: Was mediaId, should be mediaFileId
        localFilePath = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice', fileName);
        
        const writer = fs.createWriteStream(localFilePath);
        fileResponse.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', (err) => reject(err));
        });

        mediaLocalUrl = `/public/uploads/telegram_voice/${fileName}`; // Path for potential future access
        console.log(`[TelegramBot]: Voice memo downloaded and saved to ${localFilePath}`);
        console.log(`[TelegramBot]: Voice memo accessible (if server configured) at ${mediaLocalUrl}`);

        // --- BEGIN: Find Synapse User and Save Initial Telegram Item (BEFORE transcription) ---
        // This is important so `savedItem` is available for linking
        const newItemDataForVoice = {
          synapseUserId: synapseUser._id,
          telegramMessageId,
          chatId,
          chatTitle,
          fromUserId,
          fromUsername,
          text: textContent, // Voice messages might not have text here
          urls: extractedUrls, // Unlikely for pure voice, but possible if it's a reply
          messageType,
          mediaFileId,
          mediaLocalUrl,
          receivedAt,
        };
        savedItem = await new TelegramItem(newItemDataForVoice).save();
        if (savedItem) {
          console.log(`[TelegramBot]: Saved voice item to DB (ID: ${savedItem._id}) for user ${synapseUser.email}.`);
        }
        // --- END: Find Synapse User and Save Initial Telegram Item ---

        // --- BEGIN: Transcribe Audio --- 
        try {
          const transcribedText = await transcribeAudio(localFilePath);
          console.log(`[TelegramBot]: Transcription result: ${transcribedText}`);
          
          // --- BEGIN: Analyze Transcription & Create Items ---
          if (synapseUser && transcribedText && savedItem) { // Ensure savedItem is also available
            const { tasks, notes, ideas, raw } = await analyzeTranscription(transcribedText);
            const userId = synapseUser._id;
            const source = 'telegram_voice_memo';
            const originalTelegramMessageId = savedItem ? savedItem._id as mongoose.Types.ObjectId : undefined;

            let replyMessage = 'ההודעה נותחה:';

            if (tasks && tasks.length > 0) {
              for (const taskTitle of tasks) {
                await Task.create({
                  userId,
                  title: taskTitle,
                  source,
                  status: 'pending',
                  rawTranscription: transcribedText,
                  ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                });
              }
              replyMessage += `\n- נוספו ${tasks.length} משימות.`;
              if (io) io.emit('new_task_item', { userId: userId.toString() });
            }

            if (notes && notes.length > 0) {
              for (const noteContent of notes) {
                await Note.create({
                  userId,
                  content: noteContent,
                  source,
                  rawTranscription: transcribedText,
                  ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                });
              }
              replyMessage += `\n- נוספו ${notes.length} הערות.`;
              if (io) io.emit('new_note_item', { userId: userId.toString() });
            }

            if (ideas && ideas.length > 0) {
              for (const ideaContent of ideas) {
                await Idea.create({
                  userId,
                  content: ideaContent,
                  source,
                  rawTranscription: transcribedText,
                  ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                });
              }
              replyMessage += `\n- נוספו ${ideas.length} רעיונות.`;
              if (io) io.emit('new_idea_item', { userId: userId.toString() });
            }
            
            if (replyMessage === 'ההודעה נותחה:') {
                replyMessage = 'נותח תמלול אך לא זוהו משימות, הערות או רעיונות ספציפיים.';
            }
            bot.sendMessage(chatId, replyMessage, { reply_to_message_id: telegramMessageId });

          } else if (transcribedText) { // If transcription happened but no user/savedItem
            bot.sendMessage(chatId, `תמלול (לא נשמר למשתמש): ${transcribedText}`, { reply_to_message_id: telegramMessageId });
          }
          // --- END: Analyze Transcription & Create Items ---

        } catch (transcriptionError: any) {
          console.error(`[TelegramBot]: Error during transcription for ${localFilePath}:`, transcriptionError.message);
          bot.sendMessage(chatId, 'Sorry, I could not transcribe that voice memo at this time.', { reply_to_message_id: telegramMessageId });
        }
        // --- END: Transcribe Audio --- 

      } catch (downloadError) {
        console.error(`[TelegramBot]: Error downloading voice memo ${mediaFileId}:`, downloadError);
        // Continue without mediaLocalUrl if download fails
      } finally {
        // --- BEGIN: Cleanup local voice file ---
        if (localFilePath && fs.existsSync(localFilePath)) { // Check if file exists and path is defined
          try {
            fs.unlinkSync(localFilePath);
            console.log(`[TelegramBot]: Successfully deleted temporary voice file: ${localFilePath}`);
          } catch (cleanupError) {
            console.error(`[TelegramBot]: Error deleting temporary voice file ${localFilePath}:`, cleanupError);
          }
        }
        // --- END: Cleanup local voice file ---
      }
    }
    // --- END: Download and save voice memo ---
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

  console.log(`[TelegramBot]: Finished processing message ${telegramMessageId} from chat ${chatId}`);

  try {
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

    let processedAsVideo = false;
    if (synapseUser?._id && savedItem.urls && savedItem.urls.length > 0) {
      const telegramItemIdString = savedItem._id instanceof mongoose.Types.ObjectId 
                                     ? savedItem._id.toString() 
                                     : (typeof savedItem._id === 'string' ? savedItem._id : undefined);

      for (const url of savedItem.urls) {
        if (isYouTubeUrl(url)) {
          console.log(`[TelegramBot]: YouTube URL detected: ${url}. Processing as video...`);
          await processAndCreateVideoItem(synapseUser._id.toString(), url, telegramItemIdString);
          processedAsVideo = true;
          break; // Process only the first YouTube URL as a video for this message
        }
      }
    }

    // Process for bookmarks if it has URLs and was not processed as a video
    if (!processedAsVideo && synapseUser?._id && savedItem.urls && savedItem.urls.length > 0) {
      processTelegramItemForBookmarks(savedItem);
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
  // Ensure download directories exist
  const mediaDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media');
  const voiceDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice');

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
    console.log(`[TelegramBot]: Created media download directory: ${mediaDir}`);
  }
  if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
    console.log(`[TelegramBot]: Created voice download directory: ${voiceDir}`);
  }

  // This function is mainly to ensure this module is loaded and the bot starts listening.
  // The bot instance is already created and listeners attached above.
  console.log('[TelegramBot]: Telegram Bot service initialized.');
  // You could return the bot instance if needed elsewhere, but for now, it operates globally in this module.
};

// Export the bot instance if you need to access it directly in other modules (e.g., to send messages programmatically)
// export default bot; 