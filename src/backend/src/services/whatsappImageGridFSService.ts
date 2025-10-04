/**
 * WhatsApp Image GridFS Service
 * Automatically downloads and saves WhatsApp images to MongoDB GridFS for permanent storage
 */

import axios from 'axios';
import { Readable } from 'stream';
import { getBucket } from '../config/gridfs';
import WhatsAppMessage, { IWhatsAppMessage } from '../models/WhatsAppMessage';
import { ObjectId } from 'mongodb';

export interface GridFSImageMetadata {
  messageId: string;
  chatId: string;
  from: string;
  timestamp: Date;
  mimeType: string;
  originalUrl?: string;
  caption?: string;
  isGroup?: boolean;
  groupName?: string;
}

export interface ImageSaveResult {
  success: boolean;
  gridfsId?: ObjectId;
  filename?: string;
  error?: string;
}

class WhatsAppImageGridFSService {
  private static instance: WhatsAppImageGridFSService;
  private readonly maxFileSizeMB = 50;
  private readonly downloadTimeoutMs = 30000;

  private constructor() {}

  public static getInstance(): WhatsAppImageGridFSService {
    if (!WhatsAppImageGridFSService.instance) {
      WhatsAppImageGridFSService.instance = new WhatsAppImageGridFSService();
    }
    return WhatsAppImageGridFSService.instance;
  }

  /**
   * Automatically download and save WhatsApp image to GridFS
   * Called when a new image message is received
   */
  async autoSaveImageToGridFS(message: IWhatsAppMessage): Promise<ImageSaveResult> {
    try {
      // Validate that this is an image message
      if (!this.isImageMessage(message)) {
        return {
          success: false,
          error: 'Not an image message'
        };
      }

      // Check if media URL exists
      if (!message.mediaUrl) {
        console.warn(`[WhatsApp GridFS] No media URL for message ${message.messageId}`);
        return {
          success: false,
          error: 'No media URL available'
        };
      }

      // Check if already saved to GridFS
      if (message.localPath?.startsWith('gridfs://')) {
        console.log(`[WhatsApp GridFS] Image already saved to GridFS: ${message.messageId}`);
        return {
          success: true,
          error: 'Already saved to GridFS'
        };
      }

      console.log(`[WhatsApp GridFS] Auto-saving image for message ${message.messageId}`);

      // Download the image from WAHA URL
      const imageBuffer = await this.downloadImageFromUrl(message.mediaUrl);
      if (!imageBuffer) {
        return {
          success: false,
          error: 'Failed to download image from URL'
        };
      }

      // Save to GridFS
      const result = await this.saveBufferToGridFS(imageBuffer, message);
      
      if (result.success && result.gridfsId) {
        // Update the message record with GridFS reference
        await this.updateMessageWithGridFSReference(message, result.gridfsId, result.filename!);
        
        console.log(`[WhatsApp GridFS] ✅ Successfully saved image to GridFS: ${result.filename}`);
      }

      return result;
    } catch (error: any) {
      console.error(`[WhatsApp GridFS] Error auto-saving image:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Download image from URL and return as buffer
   */
  private async downloadImageFromUrl(url: string): Promise<Buffer | null> {
    try {
      // Validate URL
      if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        console.error(`[WhatsApp GridFS] Invalid URL: ${url}`);
        return null;
      }

      console.log(`[WhatsApp GridFS] Downloading image from: ${url}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.downloadTimeoutMs,
        maxContentLength: this.maxFileSizeMB * 1024 * 1024,
        headers: {
          'User-Agent': 'WhatsApp-GridFS-Downloader/1.0'
        }
      });

      const buffer = Buffer.from(response.data);
      console.log(`[WhatsApp GridFS] Downloaded ${buffer.length} bytes`);
      
      return buffer;
    } catch (error: any) {
      console.error(`[WhatsApp GridFS] Error downloading image:`, error.message);
      return null;
    }
  }

  /**
   * Save image buffer to GridFS
   */
  private async saveBufferToGridFS(buffer: Buffer, message: IWhatsAppMessage): Promise<ImageSaveResult> {
    return new Promise((resolve) => {
      try {
        const bucket = getBucket();
        
        // Generate filename
        const timestamp = Date.now();
        const extension = this.getExtensionFromMimeType(message.mimeType || 'image/jpeg');
        const filename = `whatsapp_${message.messageId}_${timestamp}.${extension}`;

        // Prepare metadata
        const metadata: GridFSImageMetadata = {
          messageId: message.messageId,
          chatId: message.to,
          from: message.from,
          timestamp: message.timestamp,
          mimeType: message.mimeType || 'image/jpeg',
          originalUrl: message.mediaUrl,
          caption: message.caption,
          isGroup: message.metadata?.isGroup,
          groupName: message.metadata?.groupName
        };

        // Create readable stream from buffer
        const readableStream = Readable.from(buffer);

        // Create GridFS upload stream
        const uploadStream = bucket.openUploadStream(filename, {
          contentType: message.mimeType || 'image/jpeg',
          metadata: metadata as any
        });

        // Handle upload completion
        uploadStream.on('finish', () => {
          console.log(`[WhatsApp GridFS] Upload completed: ${filename} (ID: ${uploadStream.id})`);
          resolve({
            success: true,
            gridfsId: uploadStream.id as ObjectId,
            filename: filename
          });
        });

        // Handle upload errors
        uploadStream.on('error', (error) => {
          console.error(`[WhatsApp GridFS] Upload error:`, error);
          resolve({
            success: false,
            error: error.message
          });
        });

        // Pipe buffer to GridFS
        readableStream.pipe(uploadStream);

      } catch (error: any) {
        console.error(`[WhatsApp GridFS] Error in saveBufferToGridFS:`, error);
        resolve({
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
   * Update WhatsAppMessage record with GridFS reference
   */
  private async updateMessageWithGridFSReference(
    message: IWhatsAppMessage, 
    gridfsId: ObjectId, 
    filename: string
  ): Promise<void> {
    try {
      // Update message with GridFS reference
      message.localPath = `gridfs://${gridfsId}`;
      message.filename = filename;
      message.downloadStatus = 'completed';
      
      await message.save();
      
      console.log(`[WhatsApp GridFS] Updated message ${message.messageId} with GridFS reference`);
    } catch (error) {
      console.error(`[WhatsApp GridFS] Error updating message:`, error);
    }
  }

  /**
   * Get image stream from GridFS
   */
  async getImageStream(gridfsId: string | ObjectId): Promise<{ stream: any; metadata: any } | null> {
    try {
      const bucket = getBucket();
      const objectId = typeof gridfsId === 'string' ? new ObjectId(gridfsId) : gridfsId;
      
      // Get file metadata
      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        console.warn(`[WhatsApp GridFS] File not found: ${gridfsId}`);
        return null;
      }

      const file = files[0];
      const downloadStream = bucket.openDownloadStream(objectId);

      return {
        stream: downloadStream,
        metadata: file
      };
    } catch (error) {
      console.error(`[WhatsApp GridFS] Error getting image stream:`, error);
      return null;
    }
  }

  /**
   * Get image buffer from GridFS
   */
  async getImageBuffer(gridfsId: string | ObjectId): Promise<Buffer | null> {
    try {
      const result = await this.getImageStream(gridfsId);
      if (!result) return null;

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        
        result.stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        result.stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        result.stream.on('error', (error: Error) => {
          console.error(`[WhatsApp GridFS] Stream error:`, error);
          reject(error);
        });
      });
    } catch (error) {
      console.error(`[WhatsApp GridFS] Error getting image buffer:`, error);
      return null;
    }
  }

  /**
   * Delete image from GridFS
   */
  async deleteImage(gridfsId: string | ObjectId): Promise<boolean> {
    try {
      const bucket = getBucket();
      const objectId = typeof gridfsId === 'string' ? new ObjectId(gridfsId) : gridfsId;
      
      await bucket.delete(objectId);
      console.log(`[WhatsApp GridFS] Deleted file: ${gridfsId}`);
      return true;
    } catch (error) {
      console.error(`[WhatsApp GridFS] Error deleting image:`, error);
      return false;
    }
  }

  /**
   * Check if message is an image message
   */
  private isImageMessage(message: IWhatsAppMessage): boolean {
    return (
      message.type === 'image' ||
      message.type === 'imageMessage' ||
      (message.mimeType?.startsWith('image/') ?? false)
    );
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const type = mimeType.toLowerCase();
    
    if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
    if (type.includes('png')) return 'png';
    if (type.includes('gif')) return 'gif';
    if (type.includes('webp')) return 'webp';
    if (type.includes('bmp')) return 'bmp';
    
    return 'jpg'; // default
  }

  /**
   * Extract GridFS ID from localPath
   */
  extractGridFSId(localPath: string): ObjectId | null {
    try {
      if (!localPath.startsWith('gridfs://')) {
        return null;
      }
      
      const idString = localPath.replace('gridfs://', '');
      return new ObjectId(idString);
    } catch (error) {
      console.error(`[WhatsApp GridFS] Error extracting GridFS ID:`, error);
      return null;
    }
  }

  /**
   * Check if message has GridFS storage
   */
  hasGridFSStorage(message: IWhatsAppMessage): boolean {
    return message.localPath?.startsWith('gridfs://') ?? false;
  }
}

export default WhatsAppImageGridFSService;
export const whatsappImageGridFSService = WhatsAppImageGridFSService.getInstance();
