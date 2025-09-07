import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface MediaFileInfo {
  url: string;
  mimetype: string;
  filename?: string;
  error?: string;
}

export interface DownloadedMedia {
  success: boolean;
  localPath?: string;
  fileSize?: number;
  error?: string;
  metadata?: {
    mimetype: string;
    filename: string;
    originalUrl: string;
  };
}

export interface WhatsAppMediaConfig {
  imagesDir?: string;
  documentsDir?: string;
  voiceDir?: string;
  videosDir?: string;
  maxFileSize?: number; // in bytes, default 50MB
  timeout?: number; // in milliseconds, default 30000
}

export class WhatsAppMediaService extends EventEmitter {
  private config: WhatsAppMediaConfig;
  private baseStorageDir: string;

  constructor(config: WhatsAppMediaConfig = {}) {
    super();

    // Default configuration
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      timeout: 30000, // 30 seconds default
      ...config
    };

    // Set up storage directories
    this.baseStorageDir = process.env.WHATSAPP_MEDIA_DIR || path.join(process.cwd(), 'storage', 'whatsapp-media');

    // Set default directories if not provided
    this.config.imagesDir = this.config.imagesDir || path.join(this.baseStorageDir, 'images');
    this.config.documentsDir = this.config.documentsDir || path.join(this.baseStorageDir, 'documents');
    this.config.voiceDir = this.config.voiceDir || path.join(this.baseStorageDir, 'voice');
    this.config.videosDir = this.config.videosDir || path.join(this.baseStorageDir, 'videos');

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure all storage directories exist
   */
  private ensureDirectories(): void {
    const directories = [
      this.config.imagesDir!,
      this.config.documentsDir!,
      this.config.voiceDir!,
      this.config.videosDir!
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[WhatsAppMediaService] Created directory: ${dir}`);
      }
    });
  }

  /**
   * Download media file from WAHA URL
   */
  async downloadMedia(mediaInfo: MediaFileInfo, messageId: string, chatId: string): Promise<DownloadedMedia> {
    try {
      console.log(`[WhatsAppMediaService] Downloading media for message ${messageId}:`, {
        url: mediaInfo.url,
        mimetype: mediaInfo.mimetype,
        filename: mediaInfo.filename
      });

      // Check if URL is provided
      if (!mediaInfo.url) {
        return {
          success: false,
          error: 'No media URL provided'
        };
      }

      // Determine storage directory based on media type
      const storageDir = this.getStorageDirectory(mediaInfo.mimetype);
      if (!storageDir) {
        return {
          success: false,
          error: `Unsupported media type: ${mediaInfo.mimetype}`
        };
      }

      // Generate filename
      const filename = this.generateFilename(mediaInfo, messageId, chatId);
      const localPath = path.join(storageDir, filename);

      // Download the file
      const response = await axios.get(mediaInfo.url, {
        responseType: 'stream',
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'WhatsApp-Media-Downloader/1.0'
        }
      });

      // Check file size
      const contentLength = parseInt(response.headers['content-length'] || '0');
      if (contentLength > this.config.maxFileSize!) {
        return {
          success: false,
          error: `File too large: ${contentLength} bytes (max: ${this.config.maxFileSize} bytes)`
        };
      }

      // Save file to disk
      const writer = fs.createWriteStream(localPath);
      (response.data as any).pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => {
          // Get file stats
          const stats = fs.statSync(localPath);
          const fileSize = stats.size;

          console.log(`[WhatsAppMediaService] Successfully downloaded media:`, {
            messageId,
            localPath,
            fileSize,
            mimetype: mediaInfo.mimetype
          });

          // Emit success event
          this.emit('mediaDownloaded', {
            messageId,
            chatId,
            localPath,
            fileSize,
            mimetype: mediaInfo.mimetype,
            filename: mediaInfo.filename
          });

          resolve({
            success: true,
            localPath,
            fileSize,
            metadata: {
              mimetype: mediaInfo.mimetype,
              filename: mediaInfo.filename || filename,
              originalUrl: mediaInfo.url
            }
          });
        });

        writer.on('error', (error) => {
          console.error(`[WhatsAppMediaService] Error writing file ${localPath}:`, error);
          resolve({
            success: false,
            error: `Failed to save file: ${error.message}`
          });
        });
      });

    } catch (error: any) {
      console.error(`[WhatsAppMediaService] Error downloading media for message ${messageId}:`, error);

      // Emit error event
      this.emit('mediaDownloadError', {
        messageId,
        chatId,
        error: error.message,
        url: mediaInfo.url
      });

      return {
        success: false,
        error: error.message || 'Unknown download error'
      };
    }
  }

  /**
   * Get storage directory based on MIME type
   */
  private getStorageDirectory(mimetype: string): string | null {
    if (!mimetype) return this.config.documentsDir!;

    const type = mimetype.toLowerCase();

    if (type.startsWith('image/')) {
      return this.config.imagesDir!;
    } else if (type.startsWith('audio/') || type.includes('voice') || type.includes('ogg')) {
      return this.config.voiceDir!;
    } else if (type.startsWith('video/')) {
      return this.config.videosDir!;
    } else {
      // Documents, PDFs, etc.
      return this.config.documentsDir!;
    }
  }

  /**
   * Generate a unique filename for the media file
   */
  private generateFilename(mediaInfo: MediaFileInfo, messageId: string, chatId: string): string {
    const timestamp = Date.now();
    const sanitizedChatId = chatId.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedMessageId = messageId.replace(/[^a-zA-Z0-9]/g, '_');

    let extension = '';

    // Determine file extension based on MIME type
    if (mediaInfo.mimetype) {
      const type = mediaInfo.mimetype.toLowerCase();

      if (type.includes('jpeg') || type.includes('jpg')) extension = 'jpg';
      else if (type.includes('png')) extension = 'png';
      else if (type.includes('gif')) extension = 'gif';
      else if (type.includes('webp')) extension = 'webp';
      else if (type.includes('pdf')) extension = 'pdf';
      else if (type.includes('mp4')) extension = 'mp4';
      else if (type.includes('mp3') || type.includes('audio')) extension = 'mp3';
      else if (type.includes('ogg') || type.includes('opus')) extension = 'ogg';
      else if (type.includes('wav')) extension = 'wav';
      else extension = 'bin'; // fallback
    }

    // Use original filename if available, otherwise generate one
    if (mediaInfo.filename) {
      const sanitizedFilename = mediaInfo.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      return `${timestamp}_${sanitizedMessageId}_${sanitizedFilename}`;
    } else {
      return `${timestamp}_${sanitizedMessageId}_${sanitizedChatId}.${extension}`;
    }
  }

  /**
   * Get media file information by message ID
   */
  getMediaFile(messageId: string): { path: string; exists: boolean; metadata?: any } | null {
    try {
      // Search in all storage directories
      const directories = [
        this.config.imagesDir!,
        this.config.documentsDir!,
        this.config.voiceDir!,
        this.config.videosDir!
      ];

      for (const dir of directories) {
        const files = fs.readdirSync(dir);
        const mediaFile = files.find(file => file.includes(messageId));

        if (mediaFile) {
          const filePath = path.join(dir, mediaFile);
          const stats = fs.statSync(filePath);

          return {
            path: filePath,
            exists: true,
            metadata: {
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime
            }
          };
        }
      }

      return { path: '', exists: false };
    } catch (error) {
      console.error(`[WhatsAppMediaService] Error getting media file for ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Clean up old media files (basic implementation)
   */
  async cleanupOldFiles(maxAgeDays: number = 30): Promise<{ deleted: number; errors: number }> {
    try {
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let deleted = 0;
      let errors = 0;

      const directories = [
        this.config.imagesDir!,
        this.config.documentsDir!,
        this.config.voiceDir!,
        this.config.videosDir!
      ];

      for (const dir of directories) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
          try {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtime.getTime() > maxAgeMs) {
              fs.unlinkSync(filePath);
              deleted++;
            }
          } catch (error) {
            console.error(`[WhatsAppMediaService] Error cleaning up file ${file}:`, error);
            errors++;
          }
        }
      }

      console.log(`[WhatsAppMediaService] Cleanup completed: ${deleted} files deleted, ${errors} errors`);
      return { deleted, errors };
    } catch (error) {
      console.error('[WhatsAppMediaService] Error during cleanup:', error);
      return { deleted: 0, errors: 1 };
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalFiles: number;
    totalSize: number;
    directories: { [key: string]: { files: number; size: number } };
  } {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      directories: {} as { [key: string]: { files: number; size: number } }
    };

    const directories = [
      { name: 'images', path: this.config.imagesDir! },
      { name: 'documents', path: this.config.documentsDir! },
      { name: 'voice', path: this.config.voiceDir! },
      { name: 'videos', path: this.config.videosDir! }
    ];

    directories.forEach(({ name, path: dirPath }) => {
      try {
        const files = fs.readdirSync(dirPath);
        let dirSize = 0;

        files.forEach(file => {
          try {
            const filePath = path.join(dirPath, file);
            const fileStats = fs.statSync(filePath);
            dirSize += fileStats.size;
          } catch (error) {
            // Skip files that can't be read
          }
        });

        stats.directories[name] = { files: files.length, size: dirSize };
        stats.totalFiles += files.length;
        stats.totalSize += dirSize;
      } catch (error) {
        stats.directories[name] = { files: 0, size: 0 };
      }
    });

    return stats;
  }
}

// Export singleton instance
export const whatsappMediaService = new WhatsAppMediaService();
export default whatsappMediaService;
