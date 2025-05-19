import { Request, Response } from 'express';
import BookmarkItem, { IBookmarkItem } from '../../models/BookmarkItem'; // Import Mongoose model and interface
import { ObjectId } from 'mongodb'; // Still needed for casting string IDs to ObjectId for synapseUserId
import mongoose from 'mongoose'; // Import mongoose for delete operation
// Consider adding a metadata fetching library here later
// import * as metaFetcher from 'html-metadata-parser'; // Example
import axios from 'axios'; // For fetching URL content - TODO: uncomment and install if not present
import cheerio from 'cheerio'; // For parsing HTML - TODO: uncomment and install if not present
import OpenAI from 'openai';

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

// --- Summarization Logic (Placeholder) ---
// TODO: Replace with actual GPT API call

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure OPENAI_API_KEY is set in your .env file
});

const generateSummaryWithGPT = async (content: string): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Log: OPENAI_API_KEY not set.");
    return "OPENAI_API_KEY not configured. Summarization disabled."; 
  }

  if (!content || content.trim().length === 0) {
    console.warn("Log: Content is empty for summarization.");
    return "Content was empty, no summary generated.";
  }

  const MAX_CONTENT_LENGTH = 12000;
  let truncatedContent = content;
  if (content.length > MAX_CONTENT_LENGTH) {
    console.warn("Log: Content truncated for summarization.");
    truncatedContent = content.substring(0, MAX_CONTENT_LENGTH) + "... [content truncated]";
  }

  try {
    console.log("Log: Requesting summary from OpenAI.");
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes web content. Provide the summary as a few concise bullet points or a short paragraph highlighting the key takeaways.'
        },
        {
          role: 'user',
          content: `Please summarize the following content into concise points and highlights:\\n\\n---\\n${truncatedContent}\\n---\\nSummary:\` // Corrected backtick, ensure it's the last char of this line.`
        }
      ],
      temperature: 0.5, 
      max_tokens: 250, 
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (summary) {
      console.log("Log: Summary generated successfully.");
      return summary;
    } else {
      console.error("Log: Failed to extract summary from OpenAI response.");
      return 'Failed to extract summary from OpenAI response.'; 
    }

  } catch (error: any) {
    console.error("Log: Error calling OpenAI API.");
    return `OpenAI API error occurred.`;
  }
};

// TODO: Implement robust HTML fetching and text extraction
const fetchAndParseURL = async (url: string): Promise<string | null> => {
  try {
    const { data: htmlResponseData } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000, 
      responseType: 'text',
    });

    if (typeof htmlResponseData !== 'string') {
        console.error("Log: Fetched URL content is not a string.");
        return null;
    }
    const html: string = htmlResponseData;

    const $ = cheerio.load(html);
    let textContent = '';
    $('article, main, [role=\"main\"], .content, .post-body, .entry-content').each((i: number, elem: cheerio.Element) => {
      textContent += $(elem).text() + '\n\n';
    });

    if (!textContent.trim()) {
      textContent = $('body').text();
    }
    
    return textContent.replace(/^\s{3,}/g, '\n\n').replace(/^\s{2,}/g, ' ').trim();

  } catch (error: any) {
    console.error("Log: Error fetching or parsing URL.");
    return null;
  }
};

export const summarizeBookmarkController = async (req: AuthenticatedRequest, res: Response) => {
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
      return res.status(404).json({ message: 'Bookmark not found or user not authorized' });
    }

    if (bookmark.status === 'summarized' && bookmark.summary) {
        return res.status(200).json({ message: 'Bookmark already summarized', bookmark });
    }

    let contentToSummarize: string | undefined | null = bookmark.rawPageContent;

    if (!contentToSummarize && bookmark.originalUrl) {
      console.log("Log: Fetching content from originalUrl for summarization.");
      bookmark.status = 'pending_summary';
      
      const fetchedContent = await fetchAndParseURL(bookmark.originalUrl);
      if (fetchedContent) {
        bookmark.rawPageContent = fetchedContent;
        contentToSummarize = fetchedContent;
      } else {
        bookmark.status = 'error';
        bookmark.summary = 'Failed to fetch content from URL for summarization.';
        await bookmark.save();
        return res.status(500).json({ message: 'Failed to fetch content for summarization', bookmark });
      }
    }

    if (!contentToSummarize) {
      bookmark.status = 'error';
      bookmark.summary = 'No content available to summarize.';
      await bookmark.save();
      return res.status(400).json({ message: 'No content available to summarize for this bookmark', bookmark });
    }
    const actualContent = contentToSummarize as string;

    bookmark.status = 'pending_summary';
    await bookmark.save();

    try {
      const summary = await generateSummaryWithGPT(actualContent);
      bookmark.summary = summary;
      bookmark.status = 'summarized';
    } catch (error) {
      console.error("Log: Inner error during summary generation call.");
      bookmark.summary = 'Failed to generate summary due to an internal call error.';
      bookmark.status = 'error';
    }

    await bookmark.save();
    res.status(200).json({ message: 'Bookmark summarized successfully', bookmark });

  } catch (error) {
    console.error("Log: Error in summarizeBookmarkController.");
    const bookmarkIdFromError = req.params.id;
    if (mongoose.Types.ObjectId.isValid(bookmarkIdFromError) && req.user?.id) {
        try {
            const bookmarkToUpdate = await BookmarkItem.findOne({ _id: bookmarkIdFromError, userId: new mongoose.Types.ObjectId(req.user.id) });
            if (bookmarkToUpdate) {
                bookmarkToUpdate.status = 'error';
                bookmarkToUpdate.summary = 'An unexpected error occurred during summarization.';
                await bookmarkToUpdate.save();
            }
        } catch (updateError: any) {
            console.error("Log: Failed to update bookmark status to error. Inner error: " + ((updateError instanceof Error) ? updateError.message : String(updateError)));
        }
    }
    res.status(500).json({ message: 'Server error while summarizing bookmark', error: (error instanceof Error) ? error.message : 'Unknown error' });
  }
}; 