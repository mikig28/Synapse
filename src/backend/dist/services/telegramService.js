"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDocumentSearch = exports.sendAgentReportToTelegram = exports.initializeTelegramBot = void 0;
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
const locationExtractionService_1 = require("./locationExtractionService"); // <-- IMPORT Location Extraction Service
const Task_1 = __importDefault(require("../models/Task")); // <-- IMPORT Task model
const Note_1 = __importDefault(require("../models/Note")); // <-- IMPORT Note model
const Idea_1 = __importDefault(require("../models/Idea")); // <-- IMPORT Idea model
const Document_1 = __importDefault(require("../models/Document")); // <-- IMPORT Document model
const chunkingService_1 = require("./chunkingService"); // <-- IMPORT Chunking Service
const vectorDatabaseService_1 = require("./vectorDatabaseService"); // <-- IMPORT Vector Database Service
const selfReflectiveRAGService_1 = require("./selfReflectiveRAGService"); // <-- IMPORT RAG Service
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
        // Handle document processing for Synapse users
        if (synapseUser && msg.document) {
            try {
                const fileLink = await bot.getFileLink(msg.document.file_id);
                const fileResponse = await (0, axios_1.default)({ url: fileLink, responseType: 'stream' });
                const fileName = msg.document.file_name || `${msg.document.file_id}.${msg.document.mime_type?.split('/')[1] || 'txt'}`;
                const localFilePath = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_documents', fileName);
                // Ensure directory exists
                const docDir = path_1.default.dirname(localFilePath);
                if (!fs_1.default.existsSync(docDir)) {
                    fs_1.default.mkdirSync(docDir, { recursive: true });
                }
                // Save file locally
                const writer = fs_1.default.createWriteStream(localFilePath);
                fileResponse.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                console.log(`[TelegramBot]: Document saved: ${localFilePath}`);
                // Create document record
                const document = new Document_1.default({
                    userId: synapseUser._id,
                    title: msg.document.file_name || 'Telegram Document',
                    content: '', // Will be populated after processing
                    documentType: getDocumentTypeFromMime(msg.document.mime_type || 'text/plain'),
                    metadata: {
                        originalFilename: msg.document.file_name,
                        fileSize: msg.document.file_size,
                        mimeType: msg.document.mime_type,
                        category: 'telegram',
                        tags: ['telegram', 'upload'],
                        processingStatus: 'pending',
                    },
                    multiModalContent: {
                        text: '',
                        images: [],
                        videos: [],
                        code: [],
                    },
                    embeddings: {
                        text: [],
                        semantic: [],
                    },
                    chunks: [],
                    graphNodes: [],
                    relationships: [],
                    versions: [],
                    currentVersion: '1.0.0',
                    sharedWith: [],
                    searchKeywords: [],
                    autoTags: [],
                    sourceType: 'telegram',
                    sourceId: voiceMemoTelegramItem?._id,
                });
                const savedDocument = await document.save();
                // Process document asynchronously
                processDocumentFromTelegram(savedDocument, localFilePath);
                // Send confirmation message
                const replyMessage = `📄 *Document Received!*\n\n` +
                    `📁 Name: ${msg.document.file_name}\n` +
                    `📊 Size: ${formatFileSize(msg.document.file_size || 0)}\n` +
                    `🔄 Status: Processing...\n\n` +
                    `✅ Document has been added to your knowledge base and will be searchable soon.`;
                await bot.sendMessage(chatId, replyMessage, {
                    reply_to_message_id: telegramMessageId,
                    parse_mode: 'Markdown'
                });
                // Emit real-time update
                if (server_1.io) {
                    server_1.io.emit('document_uploaded', {
                        userId: synapseUser._id.toString(),
                        documentId: savedDocument._id.toString(),
                        filename: msg.document.file_name,
                        source: 'telegram',
                    });
                }
            }
            catch (error) {
                console.error(`[TelegramBot]: Error processing document:`, error);
                await bot.sendMessage(chatId, '❌ Sorry, I encountered an error processing your document. Please try again later.', {
                    reply_to_message_id: telegramMessageId
                });
            }
        }
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
                            // First, try to extract location information from the transcribed text
                            console.log(`[TelegramBot]: ==================== VOICE LOCATION ANALYSIS ====================`);
                            console.log(`[TelegramBot]: Analyzing transcribed text for location: "${transcribedText}"`);
                            console.log(`[TelegramBot]: Text length: ${transcribedText.length}`);
                            console.log(`[TelegramBot]: Contains Hebrew characters: ${/[\u0590-\u05FF]/.test(transcribedText)}`);
                            console.log(`[TelegramBot]: User ID: ${synapseUser._id}`);
                            console.log(`[TelegramBot]: Chat ID: ${chatId}`);
                            const locationExtraction = await locationExtractionService_1.locationExtractionService.extractLocationFromText(transcribedText);
                            console.log(`[TelegramBot]: ==================== LOCATION EXTRACTION RESULT ====================`);
                            console.log(`[TelegramBot]: Full location extraction result:`, JSON.stringify(locationExtraction, null, 2));
                            console.log(`[TelegramBot]: Success: ${locationExtraction.success}`);
                            console.log(`[TelegramBot]: Confidence: ${locationExtraction.confidence}`);
                            console.log(`[TelegramBot]: Extracted text: "${locationExtraction.extractedText}"`);
                            console.log(`[TelegramBot]: Has location data: ${!!locationExtraction.location}`);
                            console.log(`[TelegramBot]: Error: ${locationExtraction.error || 'None'}`);
                            if (locationExtraction.location) {
                                console.log(`[TelegramBot]: Location details:`, JSON.stringify(locationExtraction.location, null, 2));
                            }
                            console.log(`[TelegramBot]: =================================================================`);
                            if (locationExtraction.success && locationExtraction.location) {
                                // Handle voice message with location
                                console.log(`[TelegramBot]: Location detected in voice message: ${locationExtraction.extractedText}`);
                                const locationData = locationExtraction.location;
                                const userId = synapseUser._id;
                                const source = 'telegram_voice_location';
                                const originalTelegramMessageId = voiceMemoTelegramItem._id;
                                // Create a note with the location
                                const locationNote = await Note_1.default.create({
                                    userId,
                                    title: `Location: ${locationData.name || locationData.address}`,
                                    content: `Added via voice: "${transcribedText}"`,
                                    location: locationData,
                                    source,
                                    rawTranscription: transcribedText,
                                    ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                                });
                                // Send bilingual confirmation message
                                const locationName = locationData.name || locationData.address || 'Unknown location';
                                const confidence = locationExtraction.confidence;
                                let replyMessage = '';
                                if (transcribedText.match(/[\u0590-\u05FF]/)) {
                                    // Hebrew text detected
                                    replyMessage = `📍 *מיקום נוסף למפה!*\n\n🏷️ שם: ${locationName}\n📍 כתובת: ${locationData.address || 'לא זמין'}\n🎤 הודעה: "${transcribedText}"\n🎯 דיוק: ${confidence}\n\n✅ המיקום נשמר בהצלחה ויופיע במפה שלך.`;
                                }
                                else {
                                    // English text
                                    replyMessage = `📍 *Location Added to Map!*\n\n🏷️ Name: ${locationName}\n📍 Address: ${locationData.address || 'Not available'}\n🎤 Voice: "${transcribedText}"\n🎯 Confidence: ${confidence}\n\n✅ Location saved successfully and will appear on your map.`;
                                }
                                await bot.sendMessage(chatId, replyMessage, {
                                    reply_to_message_id: telegramMessageId,
                                    parse_mode: 'Markdown'
                                });
                                // Emit real-time update
                                if (server_1.io) {
                                    server_1.io.emit('new_location_item', {
                                        userId: userId.toString(),
                                        location: locationData,
                                        noteId: locationNote._id
                                    });
                                    server_1.io.emit('new_note_item', { userId: userId.toString() });
                                }
                                console.log(`[TelegramBot]: Location note created successfully with ID: ${locationNote._id}`);
                            }
                            else {
                                // No location detected - try normal transcription analysis
                                console.log(`[TelegramBot]: No location detected, processing as regular voice message. Reason: ${locationExtraction.error || 'No location intent found'}`);
                                // Add a debug message for the user if location extraction failed with medium/high confidence text
                                if (locationExtraction.extractedText && locationExtraction.confidence !== 'low') {
                                    const debugMsg = transcribedText.match(/[\u0590-\u05FF]/)
                                        ? `🤔 זיהיתי אולי בקשה למיקום אבל לא הצלחתי למצוא "${locationExtraction.extractedText}". נסה שוב עם שם מדויק יותר.`
                                        : `🤔 I detected a possible location request but couldn't find "${locationExtraction.extractedText}". Try again with a more specific name.`;
                                    await bot.sendMessage(chatId, debugMsg, {
                                        reply_to_message_id: telegramMessageId
                                    });
                                }
                                // Handle regular voice message (no location detected)
                                const { tasks, notes, ideas, raw } = await (0, analysisService_1.analyzeTranscription)(transcribedText);
                                const userId = synapseUser._id;
                                const source = 'telegram_voice_memo';
                                const originalTelegramMessageId = voiceMemoTelegramItem._id;
                                let replyMessage = 'ההודעה נותחה:';
                                if (tasks && tasks.length > 0) {
                                    for (const taskTitle of tasks) {
                                        await Task_1.default.create({
                                            userId,
                                            title: taskTitle,
                                            source,
                                            status: 'pending',
                                            rawTranscription: transcribedText,
                                            ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                                        });
                                    }
                                    replyMessage += `\\n- נוספו ${tasks.length} משימות.`;
                                    if (server_1.io)
                                        server_1.io.emit('new_task_item', { userId: userId.toString() });
                                }
                                if (notes && notes.length > 0) {
                                    for (const noteContent of notes) {
                                        await Note_1.default.create({
                                            userId,
                                            content: noteContent,
                                            source,
                                            rawTranscription: transcribedText,
                                            ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                                        });
                                    }
                                    replyMessage += `\\n- נוספו ${notes.length} הערות.`;
                                    if (server_1.io)
                                        server_1.io.emit('new_note_item', { userId: userId.toString() });
                                }
                                if (ideas && ideas.length > 0) {
                                    for (const ideaContent of ideas) {
                                        await Idea_1.default.create({
                                            userId,
                                            content: ideaContent,
                                            source,
                                            rawTranscription: transcribedText,
                                            ...(originalTelegramMessageId && { telegramMessageId: originalTelegramMessageId }),
                                        });
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
// Function to send agent reports to Telegram
const sendAgentReportToTelegram = async (userId, reportTitle, reportContent) => {
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            console.error(`[sendAgentReportToTelegram]: User not found: ${userId}`);
            return;
        }
        if (!user.sendAgentReportsToTelegram) {
            console.log(`[sendAgentReportToTelegram]: User ${userId} has disabled Telegram reports`);
            return;
        }
        if (!user.monitoredTelegramChats || user.monitoredTelegramChats.length === 0) {
            console.log(`[sendAgentReportToTelegram]: User ${userId} has no monitored Telegram chats`);
            return;
        }
        const message = `🤖 **Agent Report: ${reportTitle}**\n\n${reportContent}`;
        // Send to all monitored chats
        for (const chatId of user.monitoredTelegramChats) {
            try {
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                console.log(`[sendAgentReportToTelegram]: Report sent to chat ${chatId} for user ${userId}`);
            }
            catch (error) {
                console.error(`[sendAgentReportToTelegram]: Failed to send to chat ${chatId}:`, error);
            }
        }
    }
    catch (error) {
        console.error('[sendAgentReportToTelegram]: Error sending agent report:', error);
    }
};
exports.sendAgentReportToTelegram = sendAgentReportToTelegram;
// Helper function to determine document type from MIME type
function getDocumentTypeFromMime(mimeType) {
    const typeMap = {
        'application/pdf': 'pdf',
        'text/plain': 'text',
        'text/markdown': 'markdown',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'pdf',
        'application/msword': 'pdf',
        'text/html': 'webpage',
        'application/json': 'code',
        'text/javascript': 'code',
        'text/typescript': 'code',
        'text/css': 'code',
        'application/javascript': 'code',
    };
    return typeMap[mimeType] || 'text';
}
// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
// Async document processing function for Telegram uploads
async function processDocumentFromTelegram(document, filePath) {
    try {
        console.log(`[TelegramBot]: Processing document ${document._id} from Telegram`);
        // Update status
        document.metadata.processingStatus = 'processing';
        await document.save();
        // Extract content from file
        const content = await extractContentFromFile(filePath, document.documentType);
        document.content = content;
        document.multiModalContent.text = content;
        // Generate chunks
        const chunks = await chunkingService_1.chunkingService.chunkDocument(content, {
            strategy: 'hybrid',
            maxChunkSize: 1000,
            chunkOverlap: 100,
            minChunkSize: 100,
            preserveStructure: true,
            documentType: document.documentType,
        });
        // Generate embeddings for chunks
        for (const chunk of chunks) {
            chunk.embedding = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(chunk.content);
        }
        document.chunks = chunks;
        // Generate document embeddings
        document.embeddings.text = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(content);
        document.embeddings.semantic = await vectorDatabaseService_1.vectorDatabaseService.generateEmbedding(`${document.title} ${content}`);
        // Store in vector database
        await vectorDatabaseService_1.vectorDatabaseService.storeDocumentChunks(document.userId.toString(), document._id.toString(), chunks, {
            title: document.title,
            documentType: document.documentType,
            tags: document.metadata.tags,
        });
        // Update status
        document.metadata.processingStatus = 'completed';
        document.metadata.lastProcessedAt = new Date();
        await document.save();
        console.log(`[TelegramBot]: Successfully processed document ${document._id}`);
        // Emit completion event
        if (server_1.io) {
            server_1.io.emit('document_processed', {
                documentId: document._id.toString(),
                userId: document.userId.toString(),
                status: 'completed',
                source: 'telegram',
            });
        }
    }
    catch (error) {
        console.error(`[TelegramBot]: Error processing document ${document._id}:`, error);
        // Update status
        document.metadata.processingStatus = 'failed';
        document.metadata.processingErrors = [error.message];
        await document.save();
        // Emit error event
        if (server_1.io) {
            server_1.io.emit('document_processing_error', {
                documentId: document._id.toString(),
                userId: document.userId.toString(),
                error: error.message,
                source: 'telegram',
            });
        }
    }
    finally {
        // Cleanup temporary file
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
}
// Helper function to extract content from file
async function extractContentFromFile(filePath, documentType) {
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf8');
        // Basic content extraction - in production, use specialized libraries
        switch (documentType) {
            case 'pdf':
                // Use pdf-parse or similar
                return content;
            case 'text':
            case 'markdown':
            case 'code':
                return content;
            default:
                return content;
        }
    }
    catch (error) {
        console.error(`[TelegramBot]: Error extracting content from ${filePath}:`, error);
        return '';
    }
}
// Function to handle document search via Telegram
const handleDocumentSearch = async (userId, query, chatId) => {
    try {
        console.log(`[TelegramBot]: Handling document search for user ${userId}: "${query}"`);
        // Use the RAG service to search documents
        const searchResult = await selfReflectiveRAGService_1.selfReflectiveRAGService.processQuery({
            query,
            userId,
            searchStrategy: 'hybrid',
            maxIterations: 2,
            confidenceThreshold: 0.6,
        });
        // Format response message
        let replyMessage = `🔍 *Search Results for: "${query}"*\n\n`;
        if (searchResult.answer) {
            replyMessage += `📝 *Answer:*\n${searchResult.answer}\n\n`;
        }
        if (searchResult.sources && searchResult.sources.length > 0) {
            replyMessage += `📚 *Sources (${searchResult.sources.length}):*\n`;
            searchResult.sources.slice(0, 3).forEach((source, index) => {
                replyMessage += `${index + 1}. ${source.metadata?.title || 'Unknown'}\n`;
            });
            if (searchResult.sources.length > 3) {
                replyMessage += `... and ${searchResult.sources.length - 3} more sources\n`;
            }
            replyMessage += '\n';
        }
        // Add confidence and quality scores
        replyMessage += `🎯 *Confidence:* ${Math.round(searchResult.confidence * 100)}%\n`;
        replyMessage += `⭐ *Quality:* ${Math.round(searchResult.qualityScore * 100)}%\n`;
        // Add suggestions if available
        if (searchResult.suggestions && searchResult.suggestions.length > 0) {
            replyMessage += `\n💡 *Suggestions:*\n${searchResult.suggestions.join('\n')}`;
        }
        await bot.sendMessage(chatId, replyMessage, { parse_mode: 'Markdown' });
    }
    catch (error) {
        console.error(`[TelegramBot]: Error in document search:`, error);
        await bot.sendMessage(chatId, '❌ Sorry, I encountered an error searching your documents. Please try again later.');
    }
};
exports.handleDocumentSearch = handleDocumentSearch;
// Export the bot instance if you need to access it directly in other modules (e.g., to send messages programmatically)
// export default bot; 
