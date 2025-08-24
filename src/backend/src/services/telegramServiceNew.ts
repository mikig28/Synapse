import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import TelegramItem, { ITelegramItem } from '../models/TelegramItem';
import User, { IUser } from '../models/User';
import { io } from '../server';
import { processTelegramItemForBookmarks } from '../api/controllers/captureController';
import { processAndCreateVideoItem } from '../api/controllers/videosController';
import { transcribeAudio } from './transcriptionService';
import { analyzeTranscription } from './analysisService';
import { locationExtractionService } from './locationExtractionService';
import Task from '../models/Task';
import Note from '../models/Note';
import Idea from '../models/Idea';
import Document from '../models/Document';
import { chunkingService } from './chunkingService';
import { vectorDatabaseService } from './vectorDatabaseService';
import { selfReflectiveRAGService } from './selfReflectiveRAGService';
import mongoose from 'mongoose';
import { getBucket } from '../config/gridfs';
import PDFParser from 'pdf-parse';
import { telegramBotManager } from './telegramBotManager';

dotenv.config();

// Central message handler that processes messages from any user's bot
const handleTelegramMessage = async (userId: string, msg: TelegramBot.Message, bot: TelegramBot) => {
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
  let mediaGridFsId: string | undefined = undefined;
  const extractedUrls = extractUrls(textContent, messageEntities);

  console.log(`[TelegramService] Processing message ${telegramMessageId} from chat ${chatId} for user ${userId}`);

  // Get user information
  let synapseUser: (mongoose.Document<unknown, {}, IUser> & IUser & { _id: mongoose.Types.ObjectId; }) | null = null;
  let voiceMemoTelegramItem: (ITelegramItem & mongoose.Document) | null = null;

  try {
    synapseUser = await User.findById(userId);
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

  } catch (error) {
    console.error(`[TelegramService] Error getting user ${userId}:`, error);
    return;
  }

  // Handle different message types
  if (msg.text) messageType = 'text';
  
  if (msg.photo) {
    messageType = 'photo';
    mediaFileId = msg.photo[msg.photo.length - 1].file_id;
    
    if (mediaFileId) {
      try {
        const fileLink = await bot.getFileLink(mediaFileId);
        const fileResponse = await axios<Readable>({ url: fileLink, responseType: 'stream' });
        
        const fileName = `${mediaFileId}.jpg`;
        const bucket = getBucket();
        const uploadStream = bucket.openUploadStream(fileName, {
          contentType: 'image/jpeg'
        });

        await new Promise<void>((resolve, reject) => {
          (fileResponse.data as any).pipe(uploadStream)
            .on('finish', () => {
              mediaGridFsId = uploadStream.id.toString();
              console.log(`[TelegramService] Photo ${fileName} saved to GridFS with ID: ${mediaGridFsId}`);
              resolve();
            })
            .on('error', (err: Error) => {
              console.error(`[TelegramService] Error saving photo to GridFS for file ID ${mediaFileId}:`, err);
              reject(err);
            });
        });

      } catch (downloadError) {
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
        const fileResponse = await axios({ url: fileLink, responseType: 'stream' });
        
        const fileName = msg.document.file_name || `${msg.document.file_id}.${msg.document.mime_type?.split('/')[1] || 'txt'}`;
        const localFilePath = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_documents', fileName);
        
        // Ensure directory exists
        const docDir = path.dirname(localFilePath);
        if (!fs.existsSync(docDir)) {
          fs.mkdirSync(docDir, { recursive: true });
        }
        
        // Save file locally
        const writer = fs.createWriteStream(localFilePath);
        (fileResponse.data as any).pipe(writer);
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        console.log(`[TelegramService] Document saved: ${localFilePath}`);
        
        // Create document record
        const document = new Document({
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
          sourceId: (voiceMemoTelegramItem as any)?._id as mongoose.Types.ObjectId,
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
        if (io) {
          io.emit('document_uploaded', {
            userId: synapseUser._id.toString(),
            documentId: savedDocument._id?.toString(),
            filename: msg.document.file_name,
            source: 'telegram',
          });
        }
        
      } catch (error) {
        console.error(`[TelegramService] Error processing document:`, error);
        
        // More specific error message based on the error type
        let errorMessage = '❌ Sorry, I encountered an error processing your document. Please try again later.';
        if (error instanceof Error) {
          if (error.message.includes('pdf') || error.message.includes('PDF')) {
            errorMessage = '❌ Error processing PDF file. Please ensure the PDF is not corrupted or password-protected.';
          } else if (error.message.includes('ENOENT') || error.message.includes('file')) {
            errorMessage = '❌ Error downloading the file. Please try uploading again.';
          } else if (error.message.includes('timeout')) {
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
      let localFilePath: string | undefined = undefined;
      try {
        const fileLink = await bot.getFileLink(mediaFileId);
        const fileResponse = await axios<Readable>({ url: fileLink, responseType: 'stream' });
        const fileName = `${mediaFileId}.oga`;
        localFilePath = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice', fileName);
        if (fileResponse.data) {
          const writer = fs.createWriteStream(localFilePath);
          (fileResponse.data as any).pipe(writer);
          await new Promise<void>((resolve, reject) => {
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
          voiceMemoTelegramItem = await new TelegramItem(newItemDataForVoice).save();
          if (voiceMemoTelegramItem) {
            console.log(`[TelegramService] Saved voice item to DB (ID: ${voiceMemoTelegramItem._id})`);
          }

          // Transcribe Audio
          try {
            const transcribedText = await transcribeAudio(localFilePath);
            console.log(`[TelegramService] Transcription result: ${transcribedText}`);
            
            if (synapseUser && transcribedText && voiceMemoTelegramItem) {
              // Location analysis
              console.log(`[TelegramService] ==================== VOICE LOCATION ANALYSIS ====================`);
              console.log(`[TelegramService] Analyzing transcribed text for location: "${transcribedText}"`);
              
              const locationExtraction = await locationExtractionService.extractLocationFromText(transcribedText);
              
              console.log(`[TelegramService] ==================== LOCATION EXTRACTION RESULT ====================`);
              console.log(`[TelegramService] Full location extraction result:`, JSON.stringify(locationExtraction, null, 2));
              
              if (locationExtraction.success && locationExtraction.location) {
                // Handle voice message with location
                console.log(`[TelegramService] Location detected in voice message: ${locationExtraction.extractedText}`);
                
                const locationData = locationExtraction.location;
                const userId = synapseUser._id;
                const source = 'telegram_voice_location';
                const originalTelegramMessageId = voiceMemoTelegramItem._id as mongoose.Types.ObjectId;
                
                // Create a note with the location
                const locationNote = await Note.create({
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
                } else {
                  // English text
                  replyMessage = `📍 *Location Added to Map!*\n\n🏷️ Name: ${locationName}\n📍 Address: ${locationData.address || 'Not available'}\n🎤 Voice: "${transcribedText}"\n🎯 Confidence: ${confidence}\n\n✅ Location saved successfully and will appear on your map.`;
                }
                
                await bot.sendMessage(chatId, replyMessage, { 
                  reply_to_message_id: telegramMessageId,
                  parse_mode: 'Markdown'
                });

                // Emit real-time update
                if (io) {
                  io.emit('new_location_item', { 
                    userId: userId.toString(),
                    location: locationData,
                    noteId: locationNote._id
                  });
                  io.emit('new_note_item', { userId: userId.toString() });
                }
                
                console.log(`[TelegramService] Location note created successfully with ID: ${locationNote._id}`);
                
              } else {
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
                const { tasks, notes, ideas, raw } = await analyzeTranscription(transcribedText);
                const userId = synapseUser._id;
                const source = 'telegram_voice_memo';
                const originalTelegramMessageId = voiceMemoTelegramItem._id as mongoose.Types.ObjectId;
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
                  replyMessage += `\\n- נוספו ${tasks.length} משימות.`;
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
                  replyMessage += `\\n- נוספו ${notes.length} הערות.`;
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
                  replyMessage += `\\n- נוספו ${ideas.length} רעיונות.`;
                  if (io) io.emit('new_idea_item', { userId: userId.toString() });
                }
                
                if (replyMessage === 'ההודעה נותחה:') { 
                  replyMessage = 'נותח תמלול אך לא זוהו משימות, הערות או רעיונות ספציפיים.'; 
                }
                
                bot.sendMessage(chatId, replyMessage, { reply_to_message_id: telegramMessageId });
              }
            } else if (transcribedText) {
              bot.sendMessage(chatId, `תמלול (לא נשמר למשתמש): ${transcribedText}`, { reply_to_message_id: telegramMessageId });
            }
          } catch (transcriptionError: any) {
            console.error(`[TelegramService] Error during transcription for ${localFilePath}:`, transcriptionError.message);
            bot.sendMessage(chatId, 'Sorry, I could not transcribe that voice memo.', { reply_to_message_id: telegramMessageId });
          }
        } else {
          console.error("[TelegramService] No data stream for voice download.");
        }
      } catch (downloadError: any) {
        console.error(`[TelegramService] Error downloading/processing voice memo ${mediaFileId}:`, downloadError.message);
      } finally {
        if (localFilePath && fs.existsSync(localFilePath)) {
          try {
            fs.unlinkSync(localFilePath);
            console.log(`[TelegramService] Cleaned up temporary voice file: ${localFilePath}`);
          } catch (cleanupError) {
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
    
    const savedItem = await new TelegramItem(newItemData).save();
    console.log(`[TelegramService] Saved ${messageType} from chat ${chatId} to DB for user ${synapseUser.email}.`);
    
    let processedAsVideo = false;
    if (synapseUser?._id && savedItem.urls && savedItem.urls.length > 0 && savedItem._id) { 
      const telegramItemIdString = (savedItem._id as mongoose.Types.ObjectId).toString();
      for (const url of savedItem.urls) {
        if (isYouTubeUrl(url)) {
          console.log(`[TelegramService] YouTube URL detected: ${url}. Processing as video...`);
          await processAndCreateVideoItem(synapseUser._id.toString(), url, telegramItemIdString);
          processedAsVideo = true;
        }
      }
    }

    if (!processedAsVideo && synapseUser?._id && savedItem.urls && savedItem.urls.length > 0) {
      processTelegramItemForBookmarks(savedItem);
    }
    
    if (io) {
      io.emit('new_telegram_item', savedItem.toObject());
      console.log(`[Socket.IO]: Emitted 'new_telegram_item' for chat ${chatId}`);
    } else {
      console.log('[Socket.IO]: io server not available. Skipping emit.');
    }

  } catch (error: any) {
    console.error('[TelegramService]: Error processing message or saving to DB:', error);
  }
};

// Command handlers
const setupCommandHandlers = (userId: string, bot: TelegramBot) => {
  // Search command
  bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match?.[1];
    
    if (!query) {
      await bot.sendMessage(chatId, '❌ Please provide a search query. Example: /search your question');
      return;
    }
    
    const synapseUser = await User.findById(userId);
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
    const synapseUser = await User.findById(userId);
    
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

const getDocumentTypeFromMime = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Async document processing function for Telegram uploads
async function processDocumentFromTelegram(document: any, filePath: string) {
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
    const chunks = await chunkingService.chunkDocument(content, {
      strategy: 'hybrid',
      maxChunkSize: 1000,
      chunkOverlap: 100,
      minChunkSize: 100,
      preserveStructure: true,
      documentType: document.documentType,
    });
    
    // Generate embeddings for chunks
    for (const chunk of chunks) {
      chunk.embedding = await vectorDatabaseService.generateEmbedding(chunk.content);
    }
    
    document.chunks = chunks;
    
    // Generate document embeddings
    document.embeddings.text = await vectorDatabaseService.generateEmbedding(content);
    document.embeddings.semantic = await vectorDatabaseService.generateEmbedding(
      `${document.title} ${content}`
    );
    
    // Store in vector database
    await vectorDatabaseService.storeDocumentChunks(
      document.userId.toString(),
      document._id.toString(),
      chunks,
      {
        title: document.title,
        documentType: document.documentType,
        tags: document.metadata.tags,
      }
    );
    
    // Update status
    document.metadata.processingStatus = 'completed';
    document.metadata.lastProcessedAt = new Date();
    await document.save();
    
    console.log(`[TelegramService] Successfully processed document ${document._id}`);
    
    // Emit completion event
    if (io) {
      io.emit('document_processed', {
        documentId: document._id.toString(),
        userId: document.userId.toString(),
        status: 'completed',
        source: 'telegram',
      });
    }
    
  } catch (error) {
    console.error(`[TelegramService] Error processing document ${document._id}:`, error);
    
    // Update status
    document.metadata.processingStatus = 'failed';
    document.metadata.processingErrors = [(error as Error).message];
    await document.save();
    
    // Emit error event
    if (io) {
      io.emit('document_processing_error', {
        documentId: document._id.toString(),
        userId: document.userId.toString(),
        error: (error as Error).message,
        source: 'telegram',
      });
    }
  } finally {
    // Cleanup temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// Helper function to extract content from file
async function extractContentFromFile(filePath: string, documentType: string): Promise<string> {
  try {
    console.log(`[TelegramService] Extracting content from ${filePath}, type: ${documentType}`);
    
    switch (documentType) {
      case 'pdf':
        // Use pdf-parse for PDF files
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await PDFParser(pdfBuffer);
        console.log(`[TelegramService] Extracted ${pdfData.text.length} characters from PDF`);
        return pdfData.text;
      
      case 'text':
      case 'markdown':
      case 'code':
      case 'json':
      case 'xml':
      case 'html':
        // Read as UTF-8 text for text-based files
        const textContent = fs.readFileSync(filePath, 'utf8');
        console.log(`[TelegramService] Extracted ${textContent.length} characters from text file`);
        return textContent;
      
      default:
        // Try to read as text, fallback to empty string
        try {
          const defaultContent = fs.readFileSync(filePath, 'utf8');
          console.log(`[TelegramService] Extracted ${defaultContent.length} characters from unknown file type`);
          return defaultContent;
        } catch {
          console.warn(`[TelegramService] Could not read file as text, returning empty content`);
          return '';
        }
    }
  } catch (error) {
    console.error(`[TelegramService] Error extracting content from ${filePath}:`, error);
    return '';
  }
}

// Function to handle document search via Telegram
const handleDocumentSearch = async (userId: string, query: string, chatId: number, bot: TelegramBot): Promise<void> => {
  try {
    console.log(`[TelegramService] Handling document search for user ${userId}: "${query}"`);
    
    // Use the RAG service to search documents
    const searchResult = await selfReflectiveRAGService.processQuery({
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
    
  } catch (error) {
    console.error(`[TelegramService] Error in document search:`, error);
    await bot.sendMessage(chatId, '❌ Sorry, I encountered an error searching your documents. Please try again later.');
  }
};

// Initialize the new telegram service
export const initializeTelegramService = async () => {
  try {
    console.log('[TelegramService] Initializing multi-user Telegram service...');

    // Ensure download directories exist
    const mediaDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_media');
    const voiceDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_voice');
    const docDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'telegram_documents');

    [mediaDir, voiceDir, docDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[TelegramService] Created directory: ${dir}`);
      }
    });

    // Initialize existing user bots
    await telegramBotManager.initializeExistingBots();

    // Setup event handlers for bot manager
    telegramBotManager.on('message', async ({ userId, message, bot }) => {
      await handleTelegramMessage(userId, message, bot);
    });

    telegramBotManager.on('botActivated', ({ userId, username }) => {
      console.log(`[TelegramService] ✅ Bot ${username} activated for user ${userId}`);
      
      // Setup command handlers for the new bot
      const bot = telegramBotManager.getBotForUser(userId);
      if (bot) {
        setupCommandHandlers(userId, bot);
      }
    });

    telegramBotManager.on('botDeactivated', ({ userId, username }) => {
      console.log(`[TelegramService] ❌ Bot ${username} deactivated for user ${userId}`);
    });

    telegramBotManager.on('botError', ({ userId, error }) => {
      console.error(`[TelegramService] Bot error for user ${userId}: ${error}`);
    });

    console.log('[TelegramService] ✅ Multi-user Telegram service initialized successfully');
    
    // Log stats
    const stats = telegramBotManager.getStats();
    console.log(`[TelegramService] Active bots: ${stats.activeBots}, Total: ${stats.totalBots}`);
    
  } catch (error) {
    console.error('[TelegramService] Error initializing Telegram service:', error);
    throw error;
  }
};

// Function to send agent reports to Telegram (updated for multi-user)
export const sendAgentReportToTelegram = async (userId: string, reportTitle: string, reportContent: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
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
    const bot = telegramBotManager.getBotForUser(userId);
    if (!bot) {
      console.error(`[sendAgentReportToTelegram] No active bot found for user ${userId}`);
      return;
    }

    // Send to all monitored chats
    for (const chatId of user.monitoredTelegramChats) {
      try {
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log(`[sendAgentReportToTelegram] Report sent to chat ${chatId} for user ${userId}`);
      } catch (error) {
        console.error(`[sendAgentReportToTelegram] Failed to send to chat ${chatId}:`, error);
      }
    }
  } catch (error) {
    console.error('[sendAgentReportToTelegram] Error sending agent report:', error);
  }
};

// Export the bot manager for use in other services
export { telegramBotManager };