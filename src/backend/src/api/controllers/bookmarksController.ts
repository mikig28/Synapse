import { Request, Response } from 'express';
import BookmarkItem, { IBookmarkItem } from '../../models/BookmarkItem'; // Import Mongoose model and interface
import { ObjectId } from 'mongodb'; // Still needed for casting string IDs to ObjectId for synapseUserId

export const getBookmarks = async (req: Request, res: Response) => {
  try {
    // @ts-ignore // TODO: Fix this once auth is in place and req.user is properly typed
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const bookmarks = await BookmarkItem.find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean(); // Use .lean() for faster queries if you don't need Mongoose documents
    res.status(200).json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Failed to fetch bookmarks', error: (error as Error).message });
  }
};

export const processAndCreateBookmark = async (
  userIdString: string,
  originalUrl: string,
  sourcePlatform: 'X' | 'LinkedIn' | 'Other',
  telegramMessageIdString?: string
) => {
  try {
    const newBookmarkData: Partial<IBookmarkItem> = {
      userId: new ObjectId(userIdString) as any, // Cast to any to satisfy mongoose.Types.ObjectId expected by model
      originalUrl,
      sourcePlatform,
      ...(telegramMessageIdString && { telegramMessageId: new ObjectId(telegramMessageIdString) as any }),
      title: '', // Will be auto-filled by AI later
      summary: '', // Will be auto-filled by AI later
      tags: [], // Will be auto-filled by AI later
      status: 'pending_summary',
    };

    // Use Mongoose model to create a new document
    const createdBookmark = await BookmarkItem.create(newBookmarkData);
    console.log('Bookmark created with ID:', createdBookmark._id);
    return createdBookmark._id;

  } catch (error: any) {
    // Check for duplicate key error (code 11000)
    if (error.code === 11000) {
      console.warn(`Bookmark already exists for URL: ${originalUrl} and user: ${userIdString}. Skipping creation.`);
      // Optionally, you could fetch and return the existing bookmark ID
      const existingBookmark = await BookmarkItem.findOne({ originalUrl, userId: new ObjectId(userIdString) });
      return existingBookmark?._id;
    } else {
      console.error('Error processing and creating bookmark:', error);
      throw error; // Re-throw to be handled by the caller
    }
  }
}; 