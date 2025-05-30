import mongoose, { Types, Schema } from 'mongoose';
import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
console.log('[BookmarkController] Cheerio type (star import):', typeof cheerio, 'Cheerio value (star import):', cheerio); // DIAGNOSTIC LOG
import OpenAI from 'openai';
import { AuthenticatedRequest } from '../../types/express';
import BookmarkItem, { IBookmarkItem } from '../../models/BookmarkItem'; // Correct path to BookmarkItem model

// Helper function to fetch LinkedIn Metadata
const fetchLinkedInMetadata = async (url: string): Promise<{ title?: string; description?: string; image?: string }> => {
  try {
    console.log(`[fetchLinkedInMetadata] Attempting to fetch: ${url}`);
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
      console.error("[fetchLinkedInMetadata] Fetched URL content is not a string.");
      throw new Error("Fetched content is not a string");
    }

    const $ = cheerio.load(htmlResponseData);

    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    const image = $('meta[property="og:image"]').attr('content');

    console.log(`[fetchLinkedInMetadata] Extracted: Title='${title}', Desc='${description ? description.substring(0,50) + "..." : "N/A"}', Image='${image}'`);

    return { 
      title: title?.trim(), 
      description: description?.trim(), 
      image: image?.trim() 
    };

  } catch (error: any) {
    console.error(`[fetchLinkedInMetadata] Error fetching or parsing LinkedIn URL ${url}:`, error.message || error);
    throw error; 
  }
};

export const getBookmarks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const bookmarks = await BookmarkItem.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBookmarks = await BookmarkItem.countDocuments({ userId: new Types.ObjectId(userId) });

    res.status(200).json({
      data: bookmarks,
      currentPage: page,
      totalPages: Math.ceil(totalBookmarks / limit),
      totalBookmarks
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Server error while fetching bookmarks' });
  }
};

export const processAndCreateBookmark = async (
  userIdString: string,
  originalUrl: string,
  sourcePlatform: 'X' | 'LinkedIn' | 'Other',
  telegramMessageIdString?: string
) => {
  try {
    const userId = new Types.ObjectId(userIdString);

    // Check for existing bookmark first
    const existingBookmark = await BookmarkItem.findOne({ userId, originalUrl });
    if (existingBookmark) {
      console.warn(`[BookmarkController] Bookmark already exists for URL: ${originalUrl} and user: ${userIdString}. Skipping creation.`);
      // Check if the existing bookmark needs metadata, e.g. if it was created when fetching failed
      if (existingBookmark.sourcePlatform === 'LinkedIn' && existingBookmark.status === 'error' && (!existingBookmark.fetchedTitle || existingBookmark.fetchedTitle.startsWith('LinkedIn Post:'))) {
          console.log(`[BookmarkController] Existing LinkedIn bookmark (ID: ${existingBookmark._id}) has error status or placeholder title. Attempting to re-fetch metadata.`);
          try {
            const metadata = await fetchLinkedInMetadata(originalUrl);
            existingBookmark.fetchedTitle = metadata.title;
            existingBookmark.fetchedDescription = metadata.description;
            existingBookmark.fetchedImageUrl = metadata.image;
            existingBookmark.status = 'metadata_fetched'; // Update status
            await existingBookmark.save();
            console.log(`[BookmarkController] Successfully re-fetched and updated metadata for existing LinkedIn bookmark: ${existingBookmark._id}`);
          } catch (metaError: any) {
            console.error(`[BookmarkController] Failed to re-fetch metadata for existing LinkedIn bookmark ${existingBookmark._id}:`, metaError.message || metaError);
            // Status remains 'error', title/desc might still be placeholders
          }
      }
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
        try {
          const metadata = await fetchLinkedInMetadata(originalUrl);
          newBookmarkData.fetchedTitle = metadata.title;
          newBookmarkData.fetchedDescription = metadata.description;
          newBookmarkData.fetchedImageUrl = metadata.image;
          newBookmarkData.status = 'metadata_fetched';
          console.log(`[BookmarkController] Successfully fetched metadata for LinkedIn URL: ${originalUrl}`);
        } catch (metaError: any) {
          console.error(`[BookmarkController] Failed to fetch metadata for ${originalUrl}:`, metaError.message || metaError);
          newBookmarkData.status = 'error'; // Mark as error if fetch fails
          // Fallback to placeholder if metadata fetch fails but we still want to save the bookmark
          newBookmarkData.fetchedTitle = `LinkedIn Post: ${originalUrl.substring(0, 50)}...`;
          newBookmarkData.fetchedDescription = "Could not fetch details. Link saved.";
        }
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
      const existingBookmark = await BookmarkItem.findOne({ originalUrl, userId: new Types.ObjectId(userIdString) });
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

    const bookmark = await BookmarkItem.findOne({ _id: bookmarkId, userId: new Types.ObjectId(userId) });

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
    const isTwitterUrl = /^https?:\/\/(twitter\.com|x\.com)/.test(url);

    if (isTwitterUrl) {
      try {
        const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
        console.log("Log: Attempting to fetch Twitter content via oEmbed:", oEmbedUrl);
        const oEmbedResponse = await axios.get(oEmbedUrl, {
          timeout: 7000, // Shorter timeout for oEmbed
        });

        // Assert oEmbedResponse.data as any to access potential .html property
        const oEmbedData: any = oEmbedResponse.data;

        if (oEmbedData && oEmbedData.html) {
          const $ = cheerio.load(oEmbedData.html);
          const tweetText = $('blockquote p').text();
          if (tweetText && tweetText.trim()) {
            console.log("Log: Successfully extracted tweet text via oEmbed.");
            return tweetText.trim();
          } else {
            console.warn("Log: oEmbed response HTML did not contain expected tweet text structure.");
          }
        } else {
          console.warn("Log: oEmbed response did not contain .html data.");
        }
      } catch (oEmbedError: any) {
        console.warn("Log: Failed to fetch or parse Twitter oEmbed, falling back to generic fetch. Error:", oEmbedError.message || oEmbedError);
        // Fall through to generic fetching if oEmbed fails
      }
    }

    // Generic fetching logic (original code)
    console.log("Log: Attempting generic fetch for URL:", url);
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
        console.error("Log: Fetched URL content is not a string (generic fetch).");
        return null;
    }
    const html: string = htmlResponseData;

    const $ = cheerio.load(html);
    let textContent = '';
    // Try more specific selectors first
    $('article, main, [role="main"], .post-content, .article-body, .story-content, .entry-content, .td-post-content, .post_content, .postBody, .blog-content').each((i: number, elem: cheerio.Element) => {
      textContent += $(elem).text() + '\n\n';
    });

    // If no content from specific selectors, try to get from common content containers
    if (!textContent.trim()) {
        $('.content, .container, #content, #main-content, #main, .main-content, .page-content').each((i: number, elem: cheerio.Element) => {
            textContent += $(elem).text() + '\n\n';
        });
    }
    
    // Fallback to body if still no significant content
    if (!textContent.trim() || textContent.trim().length < 100) { // Added length check for meaningful fallback
      console.log("Log: No specific content found or content too short, falling back to body text (generic fetch).");
      textContent = $('body').text();
    }
    
    // Basic cleaning: remove excessive newlines and leading/trailing whitespace
    return textContent.replace(/\s*\n\s*/g, '\n').trim();

  } catch (error: any) {
    console.error(`Log: Error fetching or parsing URL (${url}). Error:`, error.message || error);
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

    const bookmark = await BookmarkItem.findOne({ _id: bookmarkId, userId: new Types.ObjectId(userId) });

    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found or user not authorized' });
    }

    if (bookmark.status === 'summarized' && bookmark.summary) {
        return res.status(200).json({ message: 'Bookmark already summarized', bookmark });
    }

    let contentToSummarize: string | undefined | null = bookmark.rawPageContent;

    // Enrich title for X/Twitter if not already fetched
    if ((bookmark.sourcePlatform === 'X') && (!bookmark.fetchedTitle || bookmark.fetchedTitle.trim() === '')) {
      try {
        const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(bookmark.originalUrl)}`;
        const oEmbedResponse = await axios.get(oEmbedUrl, { timeout: 5000 });
        const oEmbedData: any = oEmbedResponse.data;
        if (oEmbedData && oEmbedData.author_name) {
          bookmark.fetchedTitle = `Tweet by ${oEmbedData.author_name}`;
          console.log(`Log: Enriched fetchedTitle for ${bookmark._id} to: ${bookmark.fetchedTitle}`);
        }
      } catch (titleError: any) {
        console.warn(`Log: Failed to enrich title for X/Twitter ${bookmark._id} via oEmbed: ${titleError.message}`);
      }
    }

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
            const bookmarkToUpdate = await BookmarkItem.findOne({ _id: bookmarkIdFromError, userId: new Types.ObjectId(req.user.id) });
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

export const summarizeLatestBookmarksController = async (req: AuthenticatedRequest, res: Response) => {
  const NUM_LATEST_TO_SUMMARIZE = 5;
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`Log: User ${userId} requested digest of latest ${NUM_LATEST_TO_SUMMARIZE} bookmarks.`);

    // Fetch latest N bookmarks that have a URL, regardless of current summary status
    const latestBookmarks = await BookmarkItem.find({
      userId: new Types.ObjectId(userId),
      originalUrl: { $exists: true, $ne: '' }, 
    })
    .sort({ createdAt: -1 })
    .limit(NUM_LATEST_TO_SUMMARIZE);

    if (!latestBookmarks || latestBookmarks.length === 0) {
      console.log("Log: No bookmarks found to create a digest.");
      return res.status(200).json({ 
        message: 'No bookmarks found to create a digest.', 
        summarizedBookmarks: [], 
        errors: [], 
        comprehensiveSummary: "No bookmarks were available to generate a digest." 
      });
    }

    console.log(`Log: Found ${latestBookmarks.length} bookmarks for digest generation.`);

    const processedBookmarksForResponse: IBookmarkItem[] = [];
    const errors: Array<{ bookmarkId: string, error: string }> = [];
    const individualSummariesForDigest: string[] = [];
    const digestSourceInfo: Array<{ _id: string, title?: string, originalUrl: string }> = []; // New array for source info

    for (const bookmark of latestBookmarks) {
      let currentSummary = bookmark.summary;
      let needsSummarizing = !currentSummary || currentSummary.trim() === '' || bookmark.status !== 'summarized';

      if (bookmark.status === 'error') { 
          needsSummarizing = true;
      }

      // Enrich title for X/Twitter if not already fetched, before deciding on summarization
      if ((bookmark.sourcePlatform === 'X') && (!bookmark.fetchedTitle || bookmark.fetchedTitle.trim() === '')) {
        try {
          const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(bookmark.originalUrl)}`;
          const oEmbedResponse = await axios.get(oEmbedUrl, { timeout: 5000 });
          const oEmbedData: any = oEmbedResponse.data;
          if (oEmbedData && oEmbedData.author_name) {
            bookmark.fetchedTitle = `Tweet by ${oEmbedData.author_name}`;
            // This change will be saved if the bookmark is saved later in this loop
            console.log(`Log: Enriched fetchedTitle for ${bookmark._id} (in batch) to: ${bookmark.fetchedTitle}`);
          }
        } catch (titleError: any) {
          console.warn(`Log: Failed to enrich title for X/Twitter ${bookmark._id} (in batch) via oEmbed: ${titleError.message}`);
        }
      }

      if (needsSummarizing) {
        console.log(`Log: Summarizing bookmark ID: ${bookmark._id} for digest. URL: ${bookmark.originalUrl}`);
        try {
          let contentToSummarize: string | undefined | null = bookmark.rawPageContent;
          if (!contentToSummarize && bookmark.originalUrl) {
            const fetchedContent = await fetchAndParseURL(bookmark.originalUrl);
            if (fetchedContent) {
              bookmark.rawPageContent = fetchedContent;
              contentToSummarize = fetchedContent;
            } else {
              throw new Error('Failed to fetch content for summarization.');
            }
          }

          if (!contentToSummarize) {
            throw new Error('No content available to summarize.');
          }
          
          const newSummary = await generateSummaryWithGPT(contentToSummarize as string);
          
          if (newSummary.startsWith("OPENAI_API_KEY not configured") || newSummary.startsWith("Failed to extract summary") || newSummary.startsWith("OpenAI API error") || newSummary.startsWith("Content was empty")) {
            throw new Error(`Summary generation failed: ${newSummary.substring(0,100)}`);
          }
          
          bookmark.summary = newSummary;
          bookmark.status = 'summarized';
          currentSummary = newSummary;
          await bookmark.save();
          console.log(`Log: Successfully generated new summary for ${bookmark._id} for digest.`);
        } catch (error: any) {
          console.error(`Log: Error processing bookmark ${bookmark._id} for digest: ${error.message || error}`);
          errors.push({ bookmarkId: String(bookmark._id), error: `Failed to get/generate summary: ${error.message || 'Unknown error'}` });
          // Don't save status as 'error' here if we want to use any old summary it might have had
          // If it had no summary before, currentSummary remains undefined/empty
        }
      }

      if (currentSummary && currentSummary.trim() !== '' && !currentSummary.startsWith("OPENAI_API_KEY not configured") && !currentSummary.startsWith("Failed to extract summary") && !currentSummary.startsWith("OpenAI API error") && !currentSummary.startsWith("Content was empty")) {
        individualSummariesForDigest.push(currentSummary);
        // Add to source info only if its summary was good enough for the digest
        digestSourceInfo.push({ 
          _id: String(bookmark._id), 
          title: bookmark.fetchedTitle || bookmark.title || 'Untitled Bookmark', 
          originalUrl: bookmark.originalUrl 
        });
      }
      processedBookmarksForResponse.push(bookmark.toObject() as IBookmarkItem); 
    }

    let comprehensiveSummaryText = "";
    if (individualSummariesForDigest.length > 0) {
      const allIndividualSummariesText = individualSummariesForDigest.join("\n\n---\n\n");
      console.log("Log: Generating comprehensive summary from collected individual summaries.");
      const digestPrompt = `Based on the following individual summaries of recently saved items, please create a concise overall digest or a list of key highlights. Aim for a brief, easy-to-scan overview of the main topics covered:\n\n---\n${allIndividualSummariesText}\n---\nOverall Digest:`;
      comprehensiveSummaryText = await generateSummaryWithGPT(digestPrompt);
      if (comprehensiveSummaryText.startsWith("OPENAI_API_KEY not configured") || comprehensiveSummaryText.startsWith("Failed to extract summary") || comprehensiveSummaryText.startsWith("OpenAI API error") || comprehensiveSummaryText.startsWith("Content was empty")) {
          console.warn("Log: Comprehensive summary generation resulted in an error/empty state: ", comprehensiveSummaryText);
      }
    } else {
      console.log("Log: No valid individual summaries available to create a comprehensive digest.");
      if (latestBookmarks.length > 0 && errors.length === latestBookmarks.length) {
        comprehensiveSummaryText = "Could not generate a digest as all recent items failed to provide summaries.";
      } else if (latestBookmarks.length > 0) {
        comprehensiveSummaryText = "Not enough content from recent bookmarks to create a digest.";
      } else {
        comprehensiveSummaryText = "No bookmarks found to process for a digest."; // Should be caught earlier
      }
    }

    console.log(`Log: Digest generation complete. Items processed: ${latestBookmarks.length}, Errors in processing: ${errors.length}`);
    res.status(200).json({
      message: `Digest generation attempted for ${latestBookmarks.length} items. ${errors.length > 0 ? errors.length + ' had issues.' : 'All processed.'}`,
      summarizedBookmarks: processedBookmarksForResponse, 
      errors,
      comprehensiveSummary: comprehensiveSummaryText,
      digestSourceInfo // Add new field to response
    });

  } catch (error: any) {
    console.error("Log: Critical error in summarizeLatestBookmarksController (digest generation):", error.message || error);
    res.status(500).json({ 
        message: 'Server error during digest generation', 
        error: error.message || 'Unknown error', 
        summarizedBookmarks: [], 
        errors: [], 
        comprehensiveSummary: "Failed to generate digest due to a server error.",
        digestSourceInfo: [] // Also add here for consistent response shape on error
    });
  }
}; 