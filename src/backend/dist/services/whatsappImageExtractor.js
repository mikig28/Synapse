"use strict";
/**
 * WhatsApp Image Extractor Service
 * Downloads images on-demand when user requests them (click action)
 * Works with WAHA Core by using Puppeteer to extract images from WhatsApp Web
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const sharp_1 = __importDefault(require("sharp"));
class WhatsAppImageExtractor {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isInitialized = false;
        // Default storage directory - configurable via env
        this.storageDir = process.env.WHATSAPP_IMAGES_DIR || path_1.default.join(process.cwd(), 'storage', 'whatsapp-images');
    }
    /**
     * Initialize Puppeteer browser and connect to WhatsApp Web
     */
    async initialize() {
        try {
            console.log('[Image Extractor] Initializing Puppeteer...');
            // Ensure storage directory exists
            await promises_1.default.mkdir(this.storageDir, { recursive: true });
            // Launch Puppeteer with container-optimized settings
            this.browser = await puppeteer_1.default.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            });
            this.page = await this.browser.newPage();
            // Set viewport and user agent
            await this.page.setViewport({ width: 1366, height: 768 });
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            // Navigate to WhatsApp Web
            console.log('[Image Extractor] Navigating to WhatsApp Web...');
            await this.page.goto('https://web.whatsapp.com', {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            // Wait for initial load
            await new Promise(resolve => setTimeout(resolve, 5000));
            this.isInitialized = true;
            console.log('[Image Extractor] ✅ Initialized successfully');
        }
        catch (error) {
            console.error('[Image Extractor] ❌ Initialization failed:', error);
            await this.cleanup();
            throw error;
        }
    }
    /**
     * Check if WhatsApp Web is logged in
     */
    async isLoggedIn() {
        if (!this.page)
            return false;
        try {
            // Check if we can see the chat list (indicates logged in)
            const chatListExists = await this.page.$('[data-testid="chat-list"]') !== null;
            return chatListExists;
        }
        catch (error) {
            console.error('[Image Extractor] Error checking login status:', error);
            return false;
        }
    }
    /**
     * Extract image from a specific message on-demand
     */
    async extractImage(messageId, chatId) {
        if (!this.isInitialized || !this.page) {
            throw new Error('Image extractor not initialized. Call initialize() first.');
        }
        try {
            console.log(`[Image Extractor] Extracting image for message ${messageId} in chat ${chatId}`);
            // Check if logged in
            const loggedIn = await this.isLoggedIn();
            if (!loggedIn) {
                return {
                    success: false,
                    error: 'WhatsApp Web not logged in. Please scan QR code first.'
                };
            }
            // Navigate to the specific chat
            await this.navigateToChat(chatId);
            // Find the message with the image
            const imageElement = await this.findImageInMessage(messageId);
            if (!imageElement) {
                return {
                    success: false,
                    error: 'Image not found in the specified message'
                };
            }
            // Extract the image data
            const imageData = await this.extractImageData(imageElement);
            if (!imageData) {
                return {
                    success: false,
                    error: 'Failed to extract image data'
                };
            }
            // Save the image locally
            const savedImage = await this.saveImageLocally(imageData, messageId, chatId);
            return {
                success: true,
                metadata: savedImage.metadata,
                localPath: savedImage.localPath
            };
        }
        catch (error) {
            console.error(`[Image Extractor] ❌ Failed to extract image:`, error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }
    /**
     * Navigate to a specific chat
     */
    async navigateToChat(chatId) {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            // Search for the chat
            const searchBox = await this.page.$('[data-testid="chat-list-search"]');
            if (searchBox) {
                await searchBox.click();
                await searchBox.type(chatId);
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Click on the first search result
                const firstResult = await this.page.$('[data-testid="chat-list"] > div:first-child');
                if (firstResult) {
                    await firstResult.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        catch (error) {
            console.error('[Image Extractor] Error navigating to chat:', error);
            throw error;
        }
    }
    /**
     * Find image element in a specific message
     */
    async findImageInMessage(messageId) {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            // Look for images in messages
            // WhatsApp uses various selectors for images
            const imageSelectors = [
                'img[src*="blob:"]',
                '[data-testid="msg-container"] img',
                '.message-in img, .message-out img',
                '[role="img"]'
            ];
            for (const selector of imageSelectors) {
                const images = await this.page.$$(selector);
                for (const img of images) {
                    // Check if this image belongs to our message
                    const src = await img.evaluate(el => el.getAttribute('src'));
                    if (src && src.startsWith('blob:')) {
                        // Found a blob image - this is what we want
                        return img;
                    }
                }
            }
            return null;
        }
        catch (error) {
            console.error('[Image Extractor] Error finding image in message:', error);
            return null;
        }
    }
    /**
     * Extract image data from the image element
     */
    async extractImageData(imageElement) {
        if (!this.page)
            throw new Error('Page not initialized');
        try {
            // Get the blob URL
            const blobUrl = await imageElement.evaluate((img) => img.src);
            if (!blobUrl || !blobUrl.startsWith('blob:')) {
                console.error('[Image Extractor] Invalid blob URL:', blobUrl);
                return null;
            }
            console.log('[Image Extractor] Extracting data from blob URL:', blobUrl);
            // Use page.evaluate to fetch the blob and convert to base64
            const base64Data = await this.page.evaluate(async (url) => {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result;
                            resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }
                catch (error) {
                    console.error('Error in page.evaluate:', error);
                    return null;
                }
            }, blobUrl);
            if (!base64Data) {
                console.error('[Image Extractor] Failed to convert blob to base64');
                return null;
            }
            return Buffer.from(base64Data, 'base64');
        }
        catch (error) {
            console.error('[Image Extractor] Error extracting image data:', error);
            return null;
        }
    }
    /**
     * Save image locally with metadata
     */
    async saveImageLocally(imageBuffer, messageId, chatId) {
        try {
            // Generate unique filename
            const hash = (0, crypto_1.createHash)('md5').update(imageBuffer).digest('hex');
            const filename = `${messageId}_${hash}.jpg`;
            const localPath = path_1.default.join(this.storageDir, filename);
            // Process image with Sharp to get metadata and optimize
            const image = (0, sharp_1.default)(imageBuffer);
            const metadata = await image.metadata();
            // Convert to JPEG for consistency and compression
            const processedBuffer = await image
                .jpeg({ quality: 90 })
                .toBuffer();
            // Save to disk
            await promises_1.default.writeFile(localPath, processedBuffer);
            const imageMetadata = {
                messageId,
                chatId,
                filename,
                size: processedBuffer.length,
                mimeType: 'image/jpeg',
                dimensions: metadata.width && metadata.height ? {
                    width: metadata.width,
                    height: metadata.height
                } : undefined,
                extractedAt: new Date()
            };
            console.log(`[Image Extractor] ✅ Image saved: ${filename} (${processedBuffer.length} bytes)`);
            return {
                metadata: imageMetadata,
                localPath
            };
        }
        catch (error) {
            console.error('[Image Extractor] Error saving image:', error);
            throw error;
        }
    }
    /**
     * Get stored image metadata
     */
    async getImageMetadata(messageId) {
        try {
            // Look for files with the messageId prefix
            const files = await promises_1.default.readdir(this.storageDir);
            const imageFile = files.find(file => file.startsWith(`${messageId}_`));
            if (!imageFile)
                return null;
            const filePath = path_1.default.join(this.storageDir, imageFile);
            const stats = await promises_1.default.stat(filePath);
            // Try to get dimensions using Sharp
            let dimensions;
            try {
                const image = (0, sharp_1.default)(filePath);
                const metadata = await image.metadata();
                if (metadata.width && metadata.height) {
                    dimensions = {
                        width: metadata.width,
                        height: metadata.height
                    };
                }
            }
            catch (error) {
                console.warn('[Image Extractor] Could not get image dimensions:', error);
            }
            return {
                messageId,
                chatId: '', // We don't store chatId in filename, would need database for this
                filename: imageFile,
                size: stats.size,
                mimeType: 'image/jpeg',
                dimensions,
                extractedAt: stats.birthtime
            };
        }
        catch (error) {
            console.error('[Image Extractor] Error getting image metadata:', error);
            return null;
        }
    }
    /**
     * Check if image is already extracted
     */
    async isImageExtracted(messageId) {
        const metadata = await this.getImageMetadata(messageId);
        return metadata !== null;
    }
    /**
     * Get local image path
     */
    async getImagePath(messageId) {
        try {
            const files = await promises_1.default.readdir(this.storageDir);
            const imageFile = files.find(file => file.startsWith(`${messageId}_`));
            if (!imageFile)
                return null;
            return path_1.default.join(this.storageDir, imageFile);
        }
        catch (error) {
            console.error('[Image Extractor] Error getting image path:', error);
            return null;
        }
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            this.isInitialized = false;
            console.log('[Image Extractor] 🧹 Cleanup completed');
        }
        catch (error) {
            console.error('[Image Extractor] Error during cleanup:', error);
        }
    }
    /**
     * Get storage directory
     */
    getStorageDir() {
        return this.storageDir;
    }
}
exports.default = WhatsAppImageExtractor;
