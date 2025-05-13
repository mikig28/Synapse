import { Request, Response } from 'express';
import BookmarkItem, { IBookmarkItem } from '../../models/BookmarkItem'; // Import Mongoose model and interface
import { ObjectId } from 'mongodb'; // Still needed for casting string IDs to ObjectId for synapseUserId
import mongoose from 'mongoose'; // Import mongoose for delete operation
// Consider adding a metadata fetching library here later
// import * as metaFetcher from 'html-metadata-parser'; // Example

// Define AuthenticatedRequest if it's not globally available or imported from a shared types file
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        // Include other user properties if available
    };
}

export const getBookmarks = async (req: AuthenticatedRequest, res: Response) => {
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
    const userId = new ObjectId(userIdString);

    // Check for existing bookmark first
    const existingBookmark = await BookmarkItem.findOne({ userId, originalUrl });
    if (existingBookmark) {
      console.warn(`[BookmarkController] Bookmark already exists for URL: ${originalUrl} and user: ${userIdString}. Skipping creation.`);
      return existingBookmark._id; // Return existing ID
    }

    const newBookmarkData: Partial<IBookmarkItem> = {
      userId: userId as any,
      originalUrl,
      sourcePlatform,
      ...(telegramMessageIdString && mongoose.Types.ObjectId.isValid(telegramMessageIdString) && { telegramMessageId: new mongoose.Types.ObjectId(telegramMessageIdString) as any }),
      title: '', // Standard fields remain empty initially
      summary: '',
      tags: [],
      status: 'pending_summary', // Default status
      // Initialize fetched fields as undefined
      fetchedTitle: undefined,
      fetchedDescription: undefined,
      fetchedImageUrl: undefined,
    };

    // --- Metadata Fetching Logic --- 
    if (sourcePlatform === 'LinkedIn') {
        console.log(`[BookmarkController] Attempting to fetch metadata for LinkedIn URL: ${originalUrl}`);
        // ** Placeholder for actual metadata fetching **
        // try {
        //   const metadata = await fetchMetadata(originalUrl); // Replace with actual fetching call
        //   newBookmarkData.fetchedTitle = metadata.title;
        //   newBookmarkData.fetchedDescription = metadata.description;
        //   newBookmarkData.fetchedImageUrl = metadata.image;
        //   newBookmarkData.status = 'metadata_fetched';
        // } catch (metaError) {
        //   console.error(`[BookmarkController] Failed to fetch metadata for ${originalUrl}:`, metaError);
        //   newBookmarkData.status = 'error'; // Mark as error if fetch fails
        // }
        
        // ** Temporary Placeholder Implementation **
        newBookmarkData.fetchedTitle = `LinkedIn Post: ${originalUrl.substring(0, 50)}...`; // Placeholder title
        newBookmarkData.fetchedDescription = "Placeholder description - Metadata fetching needs implementation."; // Placeholder desc
        // newBookmarkData.fetchedImageUrl = 'path/to/default/linkedin/image.png'; // Optional: Placeholder image
        newBookmarkData.status = 'metadata_fetched'; // Set status to indicate attempt (even if placeholder)
        console.log(`[BookmarkController] Using placeholder metadata for LinkedIn URL: ${originalUrl}`);

    } else if (sourcePlatform === 'Other') {
         // Optional: Add metadata fetching for 'Other' links here too if desired
         console.log(`[BookmarkController] Skipping metadata fetch for 'Other' URL: ${originalUrl}`);
    } // X platform likely relies on tweet embedding, not generic metadata

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

// Function to delete a bookmark
export const deleteBookmark = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookmarkId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(bookmarkId)) {
      return res.status(400).json({ message: 'Invalid bookmark ID' });
    }

    const bookmark = await BookmarkItem.findOne({ _id: bookmarkId, userId: new mongoose.Types.ObjectId(userId) });

    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found or user not authorized to delete' });
    }

    await BookmarkItem.deleteOne({ _id: bookmarkId }); // Using deleteOne

    res.status(200).json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    // Check if the error is a known type, otherwise use a generic message
    if (error instanceof Error) {
        return res.status(500).json({ message: 'Server error while deleting bookmark', error: error.message });
    }
    res.status(500).json({ message: 'Server error while deleting bookmark' });
  }
}; 