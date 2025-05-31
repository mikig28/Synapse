"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTelegramBot = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios")); // <-- Import axios
const path_1 = __importDefault(require("path")); // <-- Import path
const fs_1 = __importDefault(require("fs")); // <-- Import fs
const TelegramItem_1 = __importDefault(require("../models/TelegramItem")); // Import the Mongoose model
const User_1 = __importDefault(require("../models/User")); // Import the User model
const server_1 = require("../server"); // Import the io instance from server.ts
const captureController_1 = require("../api/controllers/captureController"); // <--- IMPORT HERE
const videosController_1 = require("../api/controllers/videosController"); // Import video processing function
const transcriptionService_1 = require("./transcriptionService"); // <-- IMPORT Transcription Service
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not defined in .env file');
    // process.exit(1); // Consider if you want to exit or just log and disable bot functionality
    throw new Error('TELEGRAM_BOT_TOKEN is not defined. Bot cannot start.');
}
// Create a bot that uses 'polling' to fetch new updates
// Alternatively, you can use webhooks for a production environment
const bot = new node_telegram_bot_api_1.default(TELEGRAM_BOT_TOKEN, { polling: true });
console.log('[TelegramBot]: Bot instance created. Polling for messages...');
// Helper to extract URLs from text and entities
const extractUrls = (text, entities) => {
    const urls = [];
    if (entities) {
        for (const entity of entities) {
            if (entity.type === 'url' && text) {
                urls.push(text.substring(entity.offset, entity.offset + entity.length));
            }
            else if (entity.type === 'text_link' && entity.url) {
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
const isYouTubeUrl = (url) => {
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        return (hostname === 'youtube.com' ||
            hostname === 'www.youtube.com' ||
            hostname === 'youtu.be' ||
            hostname === 'm.youtube.com');
    }
    catch (e) {
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
    let mediaFileId = undefined;
    let mediaLocalUrl = undefined; // <-- Add this to store local URL
    const extractedUrls = extractUrls(textContent, messageEntities);
    if (msg.text)
        messageType = 'text';
    if (msg.photo) {
        messageType = 'photo';
        mediaFileId = msg.photo[msg.photo.length - 1].file_id; // Get largest photo
        // --- BEGIN: Download and save photo ---
        if (mediaFileId) {
            try {
                const fileLink = await bot.getFileLink(mediaFileId);
                const fileResponse = await (0, axios_1.default)({ url: fileLink, responseType: 'stream' });
                // Determine file extension (Telegram usually uses .jpg for photos)
                // For more robustness, you might inspect mime types from response headers or use a library
                const fileName = `${mediaFileId}.jpg`;
                const localFilePath = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media', fileName);
                const writer = fs_1.default.createWriteStream(localFilePath);
                fileResponse.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', () => resolve()); // Call resolve without arguments
                    writer.on('error', (err) => reject(err)); // Pass the error object to reject
                });
                mediaLocalUrl = `/public/uploads/telegram_media/${fileName}`; // Path for frontend access
                console.log(`[TelegramBot]: Photo downloaded and saved to ${localFilePath}`);
                console.log(`[TelegramBot]: Photo accessible at ${mediaLocalUrl}`);
            }
            catch (downloadError) {
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
        // --- BEGIN: Download and save voice memo ---
        if (mediaFileId) {
            let localFilePath = undefined; // Define here to be accessible in finally
            try {
                const fileLink = await bot.getFileLink(mediaFileId);
                const fileResponse = await (0, axios_1.default)({ url: fileLink, responseType: 'stream' });
                const fileName = `${mediaFileId}.oga`; // Telegram voice is usually Opus in Ogg
                localFilePath = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice', fileName);
                const writer = fs_1.default.createWriteStream(localFilePath);
                fileResponse.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', () => resolve());
                    writer.on('error', (err) => reject(err));
                });
                mediaLocalUrl = `/public/uploads/telegram_voice/${fileName}`; // Path for potential future access
                console.log(`[TelegramBot]: Voice memo downloaded and saved to ${localFilePath}`);
                console.log(`[TelegramBot]: Voice memo accessible (if server configured) at ${mediaLocalUrl}`);
                // --- BEGIN: Transcribe Audio --- 
                try {
                    const transcribedText = await (0, transcriptionService_1.transcribeAudio)(localFilePath);
                    console.log(`[TelegramBot]: Transcription result: ${transcribedText}`);
                    bot.sendMessage(chatId, `Transcription: ${transcribedText}`, { reply_to_message_id: telegramMessageId });
                }
                catch (transcriptionError) {
                    console.error(`[TelegramBot]: Error during transcription for ${localFilePath}:`, transcriptionError.message);
                    bot.sendMessage(chatId, 'Sorry, I could not transcribe that voice memo at this time.', { reply_to_message_id: telegramMessageId });
                }
                // --- END: Transcribe Audio --- 
            }
            catch (downloadError) {
                console.error(`[TelegramBot]: Error downloading voice memo ${mediaFileId}:`, downloadError);
                // Continue without mediaLocalUrl if download fails
            }
            finally {
                // --- BEGIN: Cleanup local voice file ---
                if (localFilePath && fs_1.default.existsSync(localFilePath)) { // Check if file exists and path is defined
                    try {
                        fs_1.default.unlinkSync(localFilePath);
                        console.log(`[TelegramBot]: Successfully deleted temporary voice file: ${localFilePath}`);
                    }
                    catch (cleanupError) {
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
    console.log(`[TelegramBot]: Received ${messageType} in chat ${chatId} (${chatTitle || 'DM'}) from ${fromUsername} (${fromUserId})`);
    try {
        // Find the Synapse user who is monitoring this chat
        const synapseUser = await User_1.default.findOne({ monitoredTelegramChats: chatId });
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
        const savedItem = await new TelegramItem_1.default(newItemData).save();
        console.log(`[TelegramBot]: Saved ${messageType} from chat ${chatId} to DB for user ${synapseUser.email}.`);
        let processedAsVideo = false;
        if (synapseUser?._id && savedItem.urls && savedItem.urls.length > 0) {
            const telegramItemIdString = savedItem._id instanceof mongoose_1.default.Types.ObjectId
                ? savedItem._id.toString()
                : (typeof savedItem._id === 'string' ? savedItem._id : undefined);
            for (const url of savedItem.urls) {
                if (isYouTubeUrl(url)) {
                    console.log(`[TelegramBot]: YouTube URL detected: ${url}. Processing as video...`);
                    await (0, videosController_1.processAndCreateVideoItem)(synapseUser._id.toString(), url, telegramItemIdString);
                    processedAsVideo = true;
                    break; // Process only the first YouTube URL as a video for this message
                }
            }
        }
        // Process for bookmarks if it has URLs and was not processed as a video
        if (!processedAsVideo && synapseUser?._id && savedItem.urls && savedItem.urls.length > 0) {
            (0, captureController_1.processTelegramItemForBookmarks)(savedItem);
        }
        // Emit event to connected clients (specifically to the user if we implement rooms/namespaces later)
        // For now, emitting to all connected clients for simplicity
        if (server_1.io) { // Check if io is available (it should be if server started correctly)
            server_1.io.emit('new_telegram_item', savedItem.toObject()); // Send the saved item data
            console.log(`[Socket.IO]: Emitted 'new_telegram_item' for chat ${chatId}`);
        }
        else {
            console.warn('[Socket.IO]: io instance not available in telegramService. Cannot emit event.');
        }
    }
    catch (error) {
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
const initializeTelegramBot = () => {
    // Ensure download directories exist
    const mediaDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media');
    const voiceDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice');
    if (!fs_1.default.existsSync(mediaDir)) {
        fs_1.default.mkdirSync(mediaDir, { recursive: true });
        console.log(`[TelegramBot]: Created media download directory: ${mediaDir}`);
    }
    if (!fs_1.default.existsSync(voiceDir)) {
        fs_1.default.mkdirSync(voiceDir, { recursive: true });
        console.log(`[TelegramBot]: Created voice download directory: ${voiceDir}`);
    }
    // This function is mainly to ensure this module is loaded and the bot starts listening.
    // The bot instance is already created and listeners attached above.
    console.log('[TelegramBot]: Telegram Bot service initialized.');
    // You could return the bot instance if needed elsewhere, but for now, it operates globally in this module.
};
exports.initializeTelegramBot = initializeTelegramBot;
// Export the bot instance if you need to access it directly in other modules (e.g., to send messages programmatically)
// export default bot; 
