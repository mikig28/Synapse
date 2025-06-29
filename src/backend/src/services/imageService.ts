import axios from 'axios';
import Replicate from 'replicate';
import ImageCache from '../models/ImageCache';

const replicate = new Replicate({ 
  auth: process.env.REPLICATE_API_TOKEN 
});

interface ImageResult {
  url: string;
  attribution?: string;
  source: 'unsplash' | 'replicate';
}

/**
 * Try to fetch an image from Unsplash API
 */
async function tryUnsplash(prompt: string): Promise<ImageResult | null> {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.log('Unsplash API key not configured, skipping...');
    return null;
  }

  try {
    const { data } = await axios.get(
      'https://api.unsplash.com/photos/random',
      { 
        params: { 
          query: prompt, 
          orientation: 'landscape',
          content_filter: 'high' // Filter out potentially inappropriate content
        },
        headers: { 
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        },
        timeout: 5000 // 5 second timeout
      }
    );

    if (data?.urls?.regular) {
      const attribution = `Photo by ${data.user.name} on Unsplash`;
      return {
        url: data.urls.regular,
        attribution,
        source: 'unsplash'
      };
    }
    return null;
  } catch (error) {
    console.log('Unsplash fetch failed:', error.message);
    return null;
  }
}

/**
 * Generate image using FLUX-dev on Replicate
 */
async function generateFlux(prompt: string): Promise<ImageResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('Replicate API token not configured');
  }

  try {
    // Enhance prompt for better results
    const enhancedPrompt = `${prompt}, professional illustration, clean design, high quality, detailed`;
    
    const [url] = await replicate.run('black-forest-labs/flux-dev', {
      input: {
        prompt: enhancedPrompt,
        aspect_ratio: '16:9',
        guidance: 3,
        num_inference_steps: 34,
        go_fast: true,
        output_format: 'webp',
        output_quality: 85,
        disable_safety_checker: false
      }
    }) as string[];

    return {
      url,
      source: 'replicate'
    };
  } catch (error) {
    console.error('FLUX generation failed:', error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
}

/**
 * Extract key topics from text for better image search
 */
function extractImagePrompt(text: string): string {
  // Clean up text and extract meaningful keywords
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take first 50 characters to avoid overly long prompts
  return cleaned.substring(0, 50).trim();
}

/**
 * Main function to get illustration for any topic
 * Uses cache-first approach, then Unsplash, then FLUX generation
 */
export async function getIllustration(topic: string): Promise<ImageResult> {
  const prompt = extractImagePrompt(topic);
  
  if (!prompt) {
    throw new Error('Invalid topic provided for image generation');
  }

  try {
    // 1. Check cache first
    const cached = await ImageCache.findOne({ prompt });
    if (cached) {
      console.log(`Using cached image for: ${prompt}`);
      return {
        url: cached.url,
        attribution: cached.attribution,
        source: cached.source
      };
    }

    // 2. Try Unsplash first (free and fast)
    console.log(`Searching Unsplash for: ${prompt}`);
    const unsplashResult = await tryUnsplash(prompt);
    
    let finalResult: ImageResult;
    
    if (unsplashResult) {
      finalResult = unsplashResult;
      console.log(`Found Unsplash image for: ${prompt}`);
    } else {
      // 3. Fallback to FLUX generation
      console.log(`Generating FLUX image for: ${prompt}`);
      finalResult = await generateFlux(prompt);
      console.log(`Generated FLUX image for: ${prompt}`);
    }

    // 4. Save to cache
    try {
      await ImageCache.create({
        prompt,
        url: finalResult.url,
        source: finalResult.source,
        attribution: finalResult.attribution
      });
    } catch (cacheError) {
      // Don't fail if cache save fails
      console.warn('Failed to cache image:', cacheError.message);
    }

    return finalResult;
  } catch (error) {
    console.error(`Failed to get illustration for "${topic}":`, error);
    throw error;
  }
}

/**
 * Get multiple images for a list of topics
 */
export async function getMultipleIllustrations(topics: string[]): Promise<ImageResult[]> {
  const results = await Promise.allSettled(
    topics.map(topic => getIllustration(topic))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<ImageResult> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value);
}

/**
 * Clear old cache entries (useful for maintenance)
 */
export async function clearImageCache(olderThanDays: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await ImageCache.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount || 0;
} 