"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramBotManager = exports.sendAgentReportToTelegram = exports.initializeTelegramService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const TelegramItem_1 = __importDefault(require("../models/TelegramItem"));
const User_1 = __importDefault(require("../models/User"));
const server_1 = require("../server");
const captureController_1 = require("../api/controllers/captureController");
const videosController_1 = require("../api/controllers/videosController");
const transcriptionService_1 = require("./transcriptionService");
const analysisService_1 = require("./analysisService");
const locationExtractionService_1 = require("./locationExtractionService");
const Task_1 = __importDefault(require("../models/Task"));
const Note_1 = __importDefault(require("../models/Note"));
const Idea_1 = __importDefault(require("../models/Idea"));
const Document_1 = __importDefault(require("../models/Document"));
const chunkingService_1 = require("./chunkingService");
const vectorDatabaseService_1 = require("./vectorDatabaseService");
const selfReflectiveRAGService_1 = require("./selfReflectiveRAGService");
const mongoose_1 = __importDefault(require("mongoose"));
const gridfs_1 = require("../config/gridfs");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const telegramBotManager_1 = require("./telegramBotManager");
Object.defineProperty(exports, "telegramBotManager", { enumerable: true, get: function () { return telegramBotManager_1.telegramBotManager; } });
const TelegramChannel_1 = __importDefault(require("../models/TelegramChannel"));
dotenv_1.default.config();
// Central message handler that processes messages from any user's bot
const handleTelegramMessage = async (userId, msg, bot) => {
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
    let mediaGridFsId = undefined;
    const extractedUrls = extractUrls(textContent, messageEntities);
    console.log(`[TelegramService] Processing message ${telegramMessageId} from chat ${chatId} for user ${userId}`);
    // Get user information
    let synapseUser = null;
    let voiceMemoTelegramItem = null;
    try {
        synapseUser = await User_1.default.findById(userId);
        if (!synapseUser) {
            console.log(`[TelegramService] User ${userId} not found in database`);
            return;
        }
        // Check if this chat ID is monitored by this user
        if (!synapseUser.monitoredTelegramChats?.includes(chatId)) {
            console.log(`[TelegramService] Chat ID ${chatId} not monitored by user ${userId}`);
            return;
        }
        console.log(`[TelegramService] ✅ Processing message for user: ${synapseUser.email}, chat: ${chatId}`);
    }
    catch (error) {
        console.error(`[TelegramService] Error getting user ${userId}:`, error);
        return;
    }
    // Handle different message types
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
                    contentType: 'image/jpeg'
                });
                await new Promise((resolve, reject) => {
                    fileResponse.data.pipe(uploadStream)
                        .on('finish', () => {
                        mediaGridFsId = uploadStream.id.toString();
                        console.log(`[TelegramService] Photo ${fileName} saved to GridFS with ID: ${mediaGridFsId}`);
                        resolve();
                    })
                        .on('error', (err) => {
                        console.error(`[TelegramService] Error saving photo to GridFS for file ID ${mediaFileId}:`, err);
                        reject(err);
                    });
                });
            }
            catch (downloadError) {
                console.error(`[TelegramService] Error downloading photo ${mediaFileId}:`, downloadError);
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
                console.log(`[TelegramService] Document saved: ${localFilePath}`);
                // Create document record
                const document = new Document_1.default({
                    userId: synapseUser._id,
                    title: msg.document.file_name || 'Telegram Document',
                    content: '',
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
                        documentId: savedDocument._id?.toString(),
                        filename: msg.document.file_name,
                        source: 'telegram',
                    });
                }
            }
            catch (error) {
                console.error(`[TelegramService] Error processing document:`, error);
                // More specific error message based on the error type
                let errorMessage = '❌ Sorry, I encountered an error processing your document. Please try again later.';
                if (error instanceof Error) {
                    if (error.message.includes('pdf') || error.message.includes('PDF')) {
                        errorMessage = '❌ Error processing PDF file. Please ensure the PDF is not corrupted or password-protected.';
                    }
                    else if (error.message.includes('ENOENT') || error.message.includes('file')) {
                        errorMessage = '❌ Error downloading the file. Please try uploading again.';
                    }
                    else if (error.message.includes('timeout')) {
                        errorMessage = '❌ File processing timed out. Please try with a smaller file.';
                    }
                }
                await bot.sendMessage(chatId, errorMessage, {
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
                    console.log(`[TelegramService] Voice memo downloaded: ${localFilePath}`);
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
                        mediaGridFsId: undefined,
                        receivedAt,
                    };
                    voiceMemoTelegramItem = await new TelegramItem_1.default(newItemDataForVoice).save();
                    if (voiceMemoTelegramItem) {
                        console.log(`[TelegramService] Saved voice item to DB (ID: ${voiceMemoTelegramItem._id})`);
                    }
                    // Transcribe Audio
                    try {
                        const transcribedText = await (0, transcriptionService_1.transcribeAudio)(localFilePath);
                        console.log(`[TelegramService] Transcription result: ${transcribedText}`);
                        if (synapseUser && transcribedText && voiceMemoTelegramItem) {
                            // Location analysis
                            console.log(`[TelegramService] ==================== VOICE LOCATION ANALYSIS ====================`);
                            console.log(`[TelegramService] Analyzing transcribed text for location: "${transcribedText}"`);
                            const locationExtraction = await locationExtractionService_1.locationExtractionService.extractLocationFromText(transcribedText);
                            console.log(`[TelegramService] ==================== LOCATION EXTRACTION RESULT ====================`);
                            console.log(`[TelegramService] Full location extraction result:`, JSON.stringify(locationExtraction, null, 2));
                            if (locationExtraction.success && locationExtraction.location) {
                                // Handle voice message with location
                                console.log(`[TelegramService] Location detected in voice message: ${locationExtraction.extractedText}`);
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
                                console.log(`[TelegramService] Location note created successfully with ID: ${locationNote._id}`);
                            }
                            else {
                                // No location detected - try normal transcription analysis
                                console.log(`[TelegramService] No location detected, processing as regular voice message. Reason: ${locationExtraction.error || 'No location intent found'}`);
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
                        console.error(`[TelegramService] Error during transcription for ${localFilePath}:`, transcriptionError.message);
                        bot.sendMessage(chatId, 'Sorry, I could not transcribe that voice memo.', { reply_to_message_id: telegramMessageId });
                    }
                }
                else {
                    console.error("[TelegramService] No data stream for voice download.");
                }
            }
            catch (downloadError) {
                console.error(`[TelegramService] Error downloading/processing voice memo ${mediaFileId}:`, downloadError.message);
            }
            finally {
                if (localFilePath && fs_1.default.existsSync(localFilePath)) {
                    try {
                        fs_1.default.unlinkSync(localFilePath);
                        console.log(`[TelegramService] Cleaned up temporary voice file: ${localFilePath}`);
                    }
                    catch (cleanupError) {
                        console.error(`[TelegramService] Error cleaning up voice file ${localFilePath}:`, cleanupError);
                    }
                }
            }
        }
    }
    if (msg.video) {
        messageType = 'video';
        mediaFileId = msg.video.file_id;
    }
    console.log(`[TelegramService] Finished processing message ${telegramMessageId} from chat ${chatId}`);
    // Check if this message is from a monitored channel and save to channel records
    await handleChannelMessage(userId, msg, synapseUser);
    try {
        if (!synapseUser) {
            console.log(`[TelegramService] No Synapse user found for message processing`);
            return;
        }
        // Do not save a generic TelegramItem if it was ALREADY saved as a voice memo item
        if (messageType === 'voice' && voiceMemoTelegramItem) {
            console.log("[TelegramService] Voice memo already processed and saved. Skipping generic TelegramItem save.");
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
            mediaGridFsId,
            receivedAt,
        };
        const savedItem = await new TelegramItem_1.default(newItemData).save();
        console.log(`[TelegramService] Saved ${messageType} from chat ${chatId} to DB for user ${synapseUser.email}.`);
        let processedAsVideo = false;
        if (synapseUser?._id && savedItem.urls && savedItem.urls.length > 0 && savedItem._id) {
            const telegramItemIdString = savedItem._id.toString();
            for (const url of savedItem.urls) {
                if (isYouTubeUrl(url)) {
                    console.log(`[TelegramService] YouTube URL detected: ${url}. Processing as video...`);
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
        console.error('[TelegramService]: Error processing message or saving to DB:', error);
    }
};
// Command handlers
const setupCommandHandlers = (userId, bot) => {
    // Search command
    bot.onText(/\/search (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const query = match?.[1];
        if (!query) {
            await bot.sendMessage(chatId, '❌ Please provide a search query. Example: /search your question');
            return;
        }
        const synapseUser = await User_1.default.findById(userId);
        if (!synapseUser || !synapseUser.monitoredTelegramChats?.includes(chatId)) {
            await bot.sendMessage(chatId, '❌ This chat is not linked to a Synapse account. Please configure monitoring first.');
            return;
        }
        await bot.sendMessage(chatId, '🔍 Searching your documents...');
        await handleDocumentSearch(userId, query, chatId, bot);
    });
    // Docs command
    bot.onText(/\/docs/, async (msg) => {
        const chatId = msg.chat.id;
        const synapseUser = await User_1.default.findById(userId);
        if (!synapseUser || !synapseUser.monitoredTelegramChats?.includes(chatId)) {
            await bot.sendMessage(chatId, '❌ This chat is not linked to a Synapse account. Please configure monitoring first.');
            return;
        }
        const helpMessage = `📚 *Document Commands:*\n\n` +
            `• /search <query> - Search your documents with AI\n` +
            `• Upload any file - I'll process it automatically\n` +
            `• /docs - Show this help\n\n` +
            `*Examples:*\n` +
            `• /search what is the main topic of my research?\n` +
            `• /search find information about project deadlines`;
        await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });
};
// Helper functions
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
    // Basic regex for URLs in text if no entities
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
const getDocumentTypeFromMime = (mimeType) => {
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
};
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
// Async document processing function for Telegram uploads
async function processDocumentFromTelegram(document, filePath) {
    try {
        console.log(`[TelegramService] Processing document ${document._id} from Telegram`);
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
        console.log(`[TelegramService] Successfully processed document ${document._id}`);
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
        console.error(`[TelegramService] Error processing document ${document._id}:`, error);
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
        console.log(`[TelegramService] Extracting content from ${filePath}, type: ${documentType}`);
        switch (documentType) {
            case 'pdf':
                // Use pdf-parse for PDF files
                const pdfBuffer = fs_1.default.readFileSync(filePath);
                const pdfData = await (0, pdf_parse_1.default)(pdfBuffer);
                console.log(`[TelegramService] Extracted ${pdfData.text.length} characters from PDF`);
                return pdfData.text;
            case 'text':
            case 'markdown':
            case 'code':
            case 'json':
            case 'xml':
            case 'html':
                // Read as UTF-8 text for text-based files
                const textContent = fs_1.default.readFileSync(filePath, 'utf8');
                console.log(`[TelegramService] Extracted ${textContent.length} characters from text file`);
                return textContent;
            default:
                // Try to read as text, fallback to empty string
                try {
                    const defaultContent = fs_1.default.readFileSync(filePath, 'utf8');
                    console.log(`[TelegramService] Extracted ${defaultContent.length} characters from unknown file type`);
                    return defaultContent;
                }
                catch {
                    console.warn(`[TelegramService] Could not read file as text, returning empty content`);
                    return '';
                }
        }
    }
    catch (error) {
        console.error(`[TelegramService] Error extracting content from ${filePath}:`, error);
        return '';
    }
}
// Function to handle channel messages
const handleChannelMessage = async (userId, msg, synapseUser) => {
    try {
        const chatId = msg.chat.id;
        const messageId = msg.message_id;
        // Check if this chat is a monitored channel for this user
        const monitoredChannel = await TelegramChannel_1.default.findOne({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            $or: [
                { channelId: chatId.toString() },
                { channelId: '@' + msg.chat.username }
            ],
            isActive: true
        });
        if (!monitoredChannel) {
            return; // Not a monitored channel
        }
        console.log(`[TelegramService] 📢 Processing channel message from ${monitoredChannel.channelTitle}`);
        // Convert message to channel message format
        const channelMessage = {
            messageId: messageId,
            text: msg.text || msg.caption,
            date: new Date(msg.date * 1000),
            author: msg.from?.username || msg.from?.first_name || monitoredChannel.channelTitle,
            views: msg.views || 0,
            forwards: msg.forward_from_chat ? 1 : 0,
            urls: extractUrls(msg.text || msg.caption, msg.entities || msg.caption_entities),
            hashtags: extractHashtags(msg.text || msg.caption || '')
        };
        // Handle media
        if (msg.photo) {
            channelMessage.mediaType = 'photo';
            channelMessage.mediaFileId = msg.photo[msg.photo.length - 1].file_id;
        }
        else if (msg.video) {
            channelMessage.mediaType = 'video';
            channelMessage.mediaFileId = msg.video.file_id;
        }
        else if (msg.document) {
            channelMessage.mediaType = 'document';
            channelMessage.mediaFileId = msg.document.file_id;
        }
        else if (msg.audio) {
            channelMessage.mediaType = 'audio';
            channelMessage.mediaFileId = msg.audio.file_id;
        }
        else if (msg.voice) {
            channelMessage.mediaType = 'voice';
            channelMessage.mediaFileId = msg.voice.file_id;
        }
        // Filter by keywords if specified
        const hasKeywords = monitoredChannel.keywords && monitoredChannel.keywords.length > 0;
        if (hasKeywords && channelMessage.text) {
            const messageText = channelMessage.text.toLowerCase();
            const matchesKeyword = monitoredChannel.keywords.some(keyword => messageText.includes(keyword.toLowerCase()));
            if (!matchesKeyword) {
                console.log(`[TelegramService] 🔍 Message filtered out - no keyword match`);
                return;
            }
        }
        // Check if message already exists
        const existingMessage = monitoredChannel.messages.find(m => m.messageId === messageId);
        if (existingMessage) {
            console.log(`[TelegramService] 📝 Message ${messageId} already exists in channel ${monitoredChannel.channelTitle}`);
            return;
        }
        // Add message to channel
        monitoredChannel.messages.push(channelMessage);
        monitoredChannel.totalMessages += 1;
        monitoredChannel.lastFetchedAt = new Date();
        monitoredChannel.lastFetchedMessageId = messageId;
        // Clear any errors
        if (monitoredChannel.lastError) {
            monitoredChannel.lastError = undefined;
        }
        await monitoredChannel.save();
        console.log(`[TelegramService] ✅ Added new message to channel ${monitoredChannel.channelTitle} (Total: ${monitoredChannel.totalMessages})`);
        // Emit real-time update
        if (server_1.io) {
            server_1.io.emit('new_telegram_channel_messages', {
                userId: userId,
                channelId: monitoredChannel._id.toString(),
                messages: [channelMessage]
            });
        }
    }
    catch (error) {
        console.error(`[TelegramService] Error handling channel message:`, error);
    }
};
// Function to extract hashtags from text
const extractHashtags = (text) => {
    if (!text)
        return [];
    const hashtagRegex = /#[^\s#]+/g;
    return text.match(hashtagRegex) || [];
};
// Function to handle document search via Telegram
const handleDocumentSearch = async (userId, query, chatId, bot) => {
    try {
        console.log(`[TelegramService] Handling document search for user ${userId}: "${query}"`);
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
        console.error(`[TelegramService] Error in document search:`, error);
        await bot.sendMessage(chatId, '❌ Sorry, I encountered an error searching your documents. Please try again later.');
    }
};
// Initialize the new telegram service
const initializeTelegramService = async () => {
    try {
        console.log('[TelegramService] Initializing multi-user Telegram service...');
        // Ensure download directories exist
        const mediaDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media');
        const voiceDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice');
        const docDir = path_1.default.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_documents');
        [mediaDir, voiceDir, docDir].forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
                console.log(`[TelegramService] Created directory: ${dir}`);
            }
        });
        // Initialize existing user bots
        await telegramBotManager_1.telegramBotManager.initializeExistingBots();
        // Setup event handlers for bot manager
        telegramBotManager_1.telegramBotManager.on('message', async ({ userId, message, bot }) => {
            await handleTelegramMessage(userId, message, bot);
        });
        telegramBotManager_1.telegramBotManager.on('botActivated', ({ userId, username }) => {
            console.log(`[TelegramService] ✅ Bot ${username} activated for user ${userId}`);
            // Setup command handlers for the new bot
            const bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
            if (bot) {
                setupCommandHandlers(userId, bot);
            }
        });
        telegramBotManager_1.telegramBotManager.on('botDeactivated', ({ userId, username }) => {
            console.log(`[TelegramService] ❌ Bot ${username} deactivated for user ${userId}`);
        });
        telegramBotManager_1.telegramBotManager.on('botError', ({ userId, error }) => {
            console.error(`[TelegramService] Bot error for user ${userId}: ${error}`);
        });
        console.log('[TelegramService] ✅ Multi-user Telegram service initialized successfully');
        // Log stats
        const stats = telegramBotManager_1.telegramBotManager.getStats();
        console.log(`[TelegramService] Active bots: ${stats.activeBots}, Total: ${stats.totalBots}`);
    }
    catch (error) {
        console.error('[TelegramService] Error initializing Telegram service:', error);
        throw error;
    }
};
exports.initializeTelegramService = initializeTelegramService;
// Function to send agent reports to Telegram (updated for multi-user)
const sendAgentReportToTelegram = async (userId, reportTitle, reportContent) => {
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            console.error(`[sendAgentReportToTelegram] User not found: ${userId}`);
            return;
        }
        if (!user.sendAgentReportsToTelegram) {
            console.log(`[sendAgentReportToTelegram] User ${userId} has disabled Telegram reports`);
            return;
        }
        if (!user.monitoredTelegramChats || user.monitoredTelegramChats.length === 0) {
            console.log(`[sendAgentReportToTelegram] User ${userId} has no monitored Telegram chats`);
            return;
        }
        const message = `🤖 **Agent Report: ${reportTitle}**\n\n${reportContent}`;
        // Get user's bot
        const bot = telegramBotManager_1.telegramBotManager.getBotForUser(userId);
        if (!bot) {
            console.error(`[sendAgentReportToTelegram] No active bot found for user ${userId}`);
            return;
        }
        // Send to all monitored chats
        for (const chatId of user.monitoredTelegramChats) {
            try {
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                console.log(`[sendAgentReportToTelegram] Report sent to chat ${chatId} for user ${userId}`);
            }
            catch (error) {
                console.error(`[sendAgentReportToTelegram] Failed to send to chat ${chatId}:`, error);
            }
        }
    }
    catch (error) {
        console.error('[sendAgentReportToTelegram] Error sending agent report:', error);
    }
};
exports.sendAgentReportToTelegram = sendAgentReportToTelegram;
