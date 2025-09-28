import { Request, Response } from 'express';
import TelegramItem, { ITelegramItem } from '../../models/TelegramItem'; // Ensure TelegramItemDocument is not imported here
import fs from 'fs'; // <-- Import fs for file deletion
import path from 'path'; // <-- Import path for constructing file paths
import { ObjectId } from 'mongodb';
import { AuthenticatedRequest } from '../../types/express';
import { getBucket } from '../../config/gridfs';
import { processUrlsForBookmarks } from '../../utils/bookmarkUtils';
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

  console.log('[processTelegramItemForBookmarks] Starting URL processing for TelegramItem ID:', telegramItem._id);

  await processUrlsForBookmarks({
    userId: telegramItem.synapseUserId.toString(),
    urls: telegramItem.urls,
    source: 'telegram',
    sourceMessageId: (telegramItem._id as ObjectId).toString(),
    logContext: {
      telegramMessageId: telegramItem.telegramMessageId,
      chatId: telegramItem.chatId,
    },
  });
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

    // If the item has a media file in GridFS, delete it
    if (item.mediaGridFsId) {
      try {
        const bucket = getBucket();
        await bucket.delete(new ObjectId(item.mediaGridFsId));
        console.log(`[DELETE_TELEGRAM_ITEM_FILE] Deleted GridFS file: ${item.mediaGridFsId}`);
      } catch (gridfsError: any) {
          // Log the error, but don't block DB deletion if GridFS deletion fails.
          // It could be that the file ID is invalid or file doesn't exist.
          console.error(`[DELETE_TELEGRAM_ITEM_FILE_ERROR] Failed to delete GridFS file ${item.mediaGridFsId}:`, gridfsError);
          if (gridfsError.message.includes('not found')) {
            // This isn't a server error if the file is just not there, so don't throw.
          } else {
            // For other errors (e.g., DB connection), still log but proceed.
          }
      }
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
