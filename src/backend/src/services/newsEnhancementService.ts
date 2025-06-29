import NewsItem, { INewsItem } from '../models/NewsItem';
import { getIllustration, getMultipleIllustrations } from './imageService';

interface EnhancementOptions {
  batchSize?: number;
  skipExisting?: boolean;
  maxRetries?: number;
}

/**
 * Enhance a single news item with a relevant image
 */
export async function enhanceNewsItemWithImage(
  newsItem: INewsItem,
  options: { skipExisting?: boolean } = {}
): Promise<INewsItem | null> {
  try {
    // Skip if image already exists and skipExisting is true
    if (options.skipExisting && newsItem.generatedImage?.url) {
      console.log(`Skipping news item ${newsItem._id} - image already exists`);
      return newsItem;
    }

    // Generate prompt from title and description
    const prompt = generateImagePrompt(newsItem);
    if (!prompt) {
      console.log(`No suitable prompt for news item ${newsItem._id}`);
      return null;
    }

    // Get image
    const imageResult = await getIllustration(prompt);
    
    // Update news item
    newsItem.generatedImage = {
      url: imageResult.url,
      source: imageResult.source,
      attribution: imageResult.attribution
    };

    await newsItem.save();
    console.log(`Enhanced news item ${newsItem._id} with ${imageResult.source} image`);
    
    return newsItem;
  } catch (error) {
    console.error(`Failed to enhance news item ${newsItem._id}:`, error.message);
    return null;
  }
}

/**
 * Enhance multiple news items with images in batches
 */
export async function enhanceNewsItemsBatch(
  newsItems: INewsItem[],
  options: EnhancementOptions = {}
): Promise<{ enhanced: number; failed: number; skipped: number }> {
  const {
    batchSize = 5,
    skipExisting = true,
    maxRetries = 2
  } = options;

  let enhanced = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches to avoid overwhelming the APIs
  for (let i = 0; i < newsItems.length; i += batchSize) {
    const batch = newsItems.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(newsItems.length / batchSize)}`);

    // Process batch with retries
    const batchPromises = batch.map(async (newsItem) => {
      let attempts = 0;
      
      while (attempts < maxRetries) {
        try {
          const result = await enhanceNewsItemWithImage(newsItem, { skipExisting });
          if (result) {
            if (result.generatedImage?.url) {
              enhanced++;
            } else {
              skipped++;
            }
          } else {
            failed++;
          }
          break; // Success, exit retry loop
        } catch (error) {
          attempts++;
          if (attempts >= maxRetries) {
            console.error(`Failed to enhance news item ${newsItem._id} after ${maxRetries} attempts`);
            failed++;
          } else {
            console.log(`Retrying news item ${newsItem._id} (attempt ${attempts + 1})`);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
    });

    await Promise.all(batchPromises);
    
    // Small delay between batches to be nice to APIs
    if (i + batchSize < newsItems.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { enhanced, failed, skipped };
}

/**
 * Enhance recent news items (useful for scheduled tasks)
 */
export async function enhanceRecentNewsItems(
  userId: string,
  hoursBack: number = 24,
  options: EnhancementOptions = {}
): Promise<{ enhanced: number; failed: number; skipped: number }> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

  const newsItems = await NewsItem.find({
    userId,
    createdAt: { $gte: cutoffDate },
    ...(options.skipExisting ? { 'generatedImage.url': { $exists: false } } : {})
  }).sort({ createdAt: -1 });

  console.log(`Found ${newsItems.length} news items to enhance from the last ${hoursBack} hours`);

  if (newsItems.length === 0) {
    return { enhanced: 0, failed: 0, skipped: 0 };
  }

  return await enhanceNewsItemsBatch(newsItems, options);
}

/**
 * Generate an appropriate image prompt from news item content
 */
function generateImagePrompt(newsItem: INewsItem): string | null {
  // Start with title as primary source
  let prompt = newsItem.title;

  // Add category context if available
  if (newsItem.category) {
    prompt = `${newsItem.category} ${prompt}`;
  }

  // Add key words from description if available and title is short
  if (newsItem.description && prompt.length < 30) {
    const descriptionWords = newsItem.description
      .split(' ')
      .slice(0, 5) // Take first 5 words
      .join(' ');
    prompt = `${prompt} ${descriptionWords}`;
  }

  // Clean and limit the prompt
  const cleaned = prompt
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60); // Limit to 60 characters

  return cleaned.length > 5 ? cleaned : null;
}

/**
 * Get statistics about image enhancement status
 */
export async function getImageEnhancementStats(userId: string) {
  const [total, withImages, withUnsplash, withReplicate] = await Promise.all([
    NewsItem.countDocuments({ userId }),
    NewsItem.countDocuments({ userId, 'generatedImage.url': { $exists: true } }),
    NewsItem.countDocuments({ userId, 'generatedImage.source': 'unsplash' }),
    NewsItem.countDocuments({ userId, 'generatedImage.source': 'replicate' })
  ]);

  return {
    total,
    withImages,
    withoutImages: total - withImages,
    unsplashImages: withUnsplash,
    replicateImages: withReplicate,
    enhancementPercentage: total > 0 ? Math.round((withImages / total) * 100) : 0
  };
} 