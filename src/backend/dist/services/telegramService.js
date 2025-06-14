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
const TelegramItem_1 = __importDefault(require("../models/TelegramItem")); // Import the Mongoose model and ITelegramItem
const User_1 = __importDefault(require("../models/User")); // Import the User model and IUser
const server_1 = require("../server"); // Import the io instance from server.ts
const captureController_1 = require("../api/controllers/captureController"); // <--- IMPORT HERE
const videosController_1 = require("../api/controllers/videosController"); // Import video processing function
const transcriptionService_1 = require("./transcriptionService"); // <-- IMPORT Transcription Service
const analysisService_1 = require("./analysisService"); // <-- IMPORT Analysis Service
const Task_1 = __importDefault(require("../models/Task")); // <-- IMPORT Task model
const Note_1 = __importDefault(require("../models/Note")); // <-- IMPORT Note model
const Idea_1 = __importDefault(require("../models/Idea")); // <-- IMPORT Idea model
const gridfs_1 = require("../config/gridfs"); // <-- IMPORT GridFS bucket
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
    let mediaGridFsId = undefined; // Changed from mediaLocalUrl
    const extractedUrls = extractUrls(textContent, messageEntities);
    // --- Define synapseUser and savedItem in a higher scope ---
    let synapseUser = null;
    let voiceMemoTelegramItem = null;
    // --- End definition ---
    // Try to find the Synapse user early, applies to all message types
    synapseUser = await User_1.default.findOne({ monitoredTelegramChats: chatId });
    if (!synapseUser) {
        console.log(`[TelegramBot]: No Synapse user is monitoring chat ID: ${chatId}. Message not processed further for Synapse features.`);
        // Optionally, you might still want the bot to respond or transcribe even if not linked to a Synapse user
        // For now, we largely stop processing if no user is linked, except for basic bot interactions.
    }
    if (msg.text)
        messageType = 'text';
    if (msg.photo) {
        messageType = 'photo';
        mediaFileId = msg.photo[msg.photo.length - 1].file_id;
        if (mediaFileId) {
            try {
                const fileLink = await bot.getFileLink(mediaFileId);
                const fileResponse = await (0, axios_1.default)({ url: fileLink, responseType: 'stream' });
                const fileName = `${mediaFileId}.jpg`;
                const bucket = (0, gridfs_1.getBucket)();
                const uploadStream = bucket.openUploadStream(fileName, {
                    contentType: 'image/jpeg' // Set content type
                });
                await new Promise((resolve, reject) => {
                    fileResponse.data.pipe(uploadStream)
                        .on('finish', () => {
                        mediaGridFsId = uploadStream.id.toString();
                        console.log(`[TelegramBot]: Photo ${fileName} saved to GridFS with ID: ${mediaGridFsId}`);
                        resolve();
                    })
                        .on('error', (err) => {
                        console.error(`[TelegramBot]: Error saving photo to GridFS for file ID ${mediaFileId}:`, err);
                        reject(err);
                    });
                });
            }
            catch (downloadError) {
                console.error(`[TelegramBot]: Error downloading photo ${mediaFileId}:`, downloadError);
            }
        }
    }
    if (msg.document) {
        messageType = 'document';
        mediaFileId = msg.document.file_id;
    }
    if (msg.voice && synapseUser) {
        messageType = 'voice';
        mediaFileId = msg.voice.file_id;
        if (mediaFileId) {
            let localFilePath = undefined;
            try {
                const fileLink = await bot.getFileLink(mediaFileId);
                const fileResponse = await (0, axios_1.default)({ url: fileLink, responseType: 'stream' });
                const fileName = `${mediaFileId}.oga`;
                localFilePath = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice', fileName);
                if (fileResponse.data) {
                    const writer = fs_1.default.createWriteStream(localFilePath);
                    fileResponse.data.pipe(writer);
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    console.log(`[TelegramBot]: Voice memo downloaded: ${localFilePath}`);
                    const newItemDataForVoice = {
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
                        mediaGridFsId: undefined, // Voice memos are not stored in GridFS, only photos for now
                        receivedAt,
                    };
                    voiceMemoTelegramItem = await new TelegramItem_1.default(newItemDataForVoice).save();
                    if (voiceMemoTelegramItem) {
                        console.log(`[TelegramBot]: Saved voice item to DB (ID: ${voiceMemoTelegramItem._id})`);
                    }
                    // Transcribe Audio
                    try {
                        const transcribedText = await (0, transcriptionService_1.transcribeAudio)(localFilePath);
                        console.log(`[TelegramBot]: Transcription result: ${transcribedText}`);
                        if (synapseUser && transcribedText && voiceMemoTelegramItem) {
                            const { tasks, notes, ideas, raw } = await (0, analysisService_1.analyzeTranscription)(transcribedText);
                            const userId = synapseUser._id;
                            const source = 'telegram_voice_memo';
                            const originalTelegramMessageId = voiceMemoTelegramItem._id;
                            let replyMessage = 'ההודעה נותחה:';
                            if (tasks && tasks.length > 0) {
                                for (const taskTitle of tasks) {
                                    await Task_1.default.create({ userId, title: taskTitle, source, status: 'pending', rawTranscription: transcribedText, ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }), });
                                }
                                replyMessage += `\\n- נוספו ${tasks.length} משימות.`;
                                if (server_1.io)
                                    server_1.io.emit('new_task_item', { userId: userId.toString() });
                            }
                            if (notes && notes.length > 0) {
                                for (const noteContent of notes) {
                                    await Note_1.default.create({ userId, content: noteContent, source, rawTranscription: transcribedText, ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }), });
                                }
                                replyMessage += `\\n- נוספו ${notes.length} הערות.`;
                                if (server_1.io)
                                    server_1.io.emit('new_note_item', { userId: userId.toString() });
                            }
                            if (ideas && ideas.length > 0) {
                                for (const ideaContent of ideas) {
                                    await Idea_1.default.create({ userId, content: ideaContent, source, rawTranscription: transcribedText, ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }), });
                                }
                                replyMessage += `\\n- נוספו ${ideas.length} רעיונות.`;
                                if (server_1.io)
                                    server_1.io.emit('new_idea_item', { userId: userId.toString() });
                            }
                            if (replyMessage === 'ההודעה נותחה:') {
                                replyMessage = 'נותח תמלול אך לא זוהו משימות, הערות או רעיונות ספציפיים.';
                            }
                            bot.sendMessage(chatId, replyMessage, { reply_to_message_id: telegramMessageId });
                        }
                        else if (transcribedText) {
                            bot.sendMessage(chatId, `תמלול (לא נשמר למשתמש): ${transcribedText}`, { reply_to_message_id: telegramMessageId });
                        }
                    }
                    catch (transcriptionError) {
                        console.error(`[TelegramBot]: Error during transcription for ${localFilePath}:`, transcriptionError.message);
                        bot.sendMessage(chatId, 'Sorry, I could not transcribe that voice memo.', { reply_to_message_id: telegramMessageId });
                    }
                }
                else {
                    console.error("[TelegramBot]: No data stream for voice download.");
                }
            }
            catch (downloadError) {
                console.error(`[TelegramBot]: Error downloading/processing voice memo ${mediaFileId}:`, downloadError.message);
            }
            finally {
                if (localFilePath && fs_1.default.existsSync(localFilePath)) {
                    try {
                        fs_1.default.unlinkSync(localFilePath);
                        console.log(`[TelegramBot]: Cleaned up temporary voice file: ${localFilePath}`);
                    }
                    catch (cleanupError) {
                        console.error(`[TelegramBot]: Error cleaning up voice file ${localFilePath}:`, cleanupError);
                    }
                }
            }
        }
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
            return;
        }
        // Do not save a generic TelegramItem if it was ALREADY saved as a voice memo item
        if (messageType === 'voice' && voiceMemoTelegramItem) {
            console.log("[TelegramBot]: Voice memo already processed and saved. Skipping generic TelegramItem save.");
            return;
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
            mediaGridFsId, // Use the new GridFS ID
            receivedAt,
        };
        const savedItem = await new TelegramItem_1.default(newItemData).save();
        console.log(`[TelegramBot]: Saved ${messageType} from chat ${chatId} to DB for user ${synapseUser.email}.`);
        let processedAsVideo = false;
        if (synapseUser?._id && savedItem.urls && savedItem.urls.length > 0 && savedItem._id) {
            const telegramItemIdString = savedItem._id.toString();
            for (const url of savedItem.urls) {
                if (isYouTubeUrl(url)) {
                    console.log(`[TelegramBot]: YouTube URL detected: ${url}. Processing as video...`);
                    await (0, videosController_1.processAndCreateVideoItem)(synapseUser._id.toString(), url, telegramItemIdString);
                    processedAsVideo = true;
                }
            }
        }
        if (!processedAsVideo && synapseUser?._id && savedItem.urls && savedItem.urls.length > 0) {
            (0, captureController_1.processTelegramItemForBookmarks)(savedItem);
        }
        if (server_1.io) {
            server_1.io.emit('new_telegram_item', savedItem.toObject());
            console.log(`[Socket.IO]: Emitted 'new_telegram_item' for chat ${chatId}`);
        }
        else {
            console.log('[Socket.IO]: io server not available. Skipping emit.');
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
    const mediaDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media'); // REVERTED to original
    const voiceDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice'); // REVERTED to original
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
