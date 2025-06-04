import { Request, Response } from 'express';
import TelegramItem, { ITelegramItem } from '../../models/TelegramItem'; // Ensure TelegramItemDocument is not imported here
import fs from 'fs'; // <-- Import fs for file deletion
import path from 'path'; // <-- Import path for constructing file paths
import { processAndCreateBookmark } from './bookmarksController'; // Import the new function
import { ObjectId } from 'mongodb';
import { AuthenticatedRequest } from '../../types/express';
// Assuming you have a way to get authenticated user ID from request, e.g., from a JWT middleware
// For now, we'll assume req.user.id exists after authentication middleware.

// New function to process a saved Telegram item for bookmarks
export const processTelegramItemForBookmarks = async (telegramItem: ITelegramItem) => {
  if (!telegramItem.synapseUserId) {
    console.error('[BOOKMARK_CREATION_ERROR] synapseUserId is missing for TelegramItem ID:', telegramItem._id, 'Skipping bookmark creation.');
    return; // Cannot create bookmark without a user
  }

  if (!telegramItem.urls || telegramItem.urls.length === 0) {
    return; // No URLs to process
  }

  const socialMediaPatterns = {
    X: /https?:\/\/(twitter\.com|x\.com)/i,
    LinkedIn: /https?:\/\/(?:www\.)?linkedin\.com/i,
    Reddit: /https?:\/\/(?:www\.)?reddit\.com/i,
  };

  for (const url of telegramItem.urls) {
    let platform: 'X' | 'LinkedIn' | 'Reddit' | 'Other' | null = null;

    if (socialMediaPatterns.X.test(url)) {
      platform = 'X';
    } else if (socialMediaPatterns.LinkedIn.test(url)) {
      platform = 'LinkedIn';
    } else if (socialMediaPatterns.Reddit.test(url)) {
      platform = 'Reddit';
    }

    if (platform) {
      try {
        console.log(`Found ${platform} link: ${url}. Creating bookmark...`);
        // Ensure _id is treated as ObjectId before converting to string
        const telegramMessageIdString = (telegramItem._id as ObjectId).toString();
        
        await processAndCreateBookmark(
          telegramItem.synapseUserId.toString(), // Now checked for existence
          url,
          platform,
          telegramMessageIdString
        );
      } catch (error) {
        console.error(`Failed to create bookmark for ${url}:`, error);
        // Decide on error handling: maybe log and continue, or mark item for retry
      }
    }
  }
};

export const getTelegramItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const items = await TelegramItem.find({ synapseUserId: req.user.id })
      .sort({ receivedAt: -1 }) // Sort by most recent first
      .limit(50); // Add pagination later

    res.json(items);
  } catch (error: any) {
    console.error('[GET_TELEGRAM_ITEMS_ERROR]', error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteTelegramItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { itemId } = req.params;

    const item = await TelegramItem.findOne({ _id: itemId, synapseUserId: req.user.id });

    if (!item) {
      return res.status(404).json({ message: 'Telegram item not found or not authorized to delete' });
    }

    // If the item has a local media file, delete it from the server
    if (item.mediaLocalUrl) {
      // Construct the absolute path to the file on the server
      // mediaLocalUrl is stored as /public/uploads/telegram_media/filename.jpg
      // We need to get to src/backend/public/uploads/telegram_media/filename.jpg
      const relativePath = item.mediaLocalUrl.startsWith('/public/') 
        ? item.mediaLocalUrl.substring('/public'.length) 
        : item.mediaLocalUrl;
      const filePath = path.join(__dirname, '..', '..', 'public', relativePath);
      
      fs.unlink(filePath, (err) => {
        if (err) {
          // Log the error, but don't necessarily block DB deletion if file deletion fails
          // It could be that the file was already manually deleted or path is incorrect
          console.error(`[DELETE_TELEGRAM_ITEM_FILE_ERROR] Failed to delete local file ${filePath}:`, err);
        }
      });
    }

    await TelegramItem.findByIdAndDelete(itemId);
    // Or: await item.deleteOne(); if you prefer using the instance method

    res.status(200).json({ message: 'Telegram item deleted successfully' });

  } catch (error: any) {
    console.error('[DELETE_TELEGRAM_ITEM_ERROR]', error);
    if (error.name === 'CastError') { // Handle invalid ObjectId format
      return res.status(400).json({ message: 'Invalid item ID format' });
    }
    res.status(500).json({ message: error.message || 'Failed to delete telegram item' });
  }
}; 