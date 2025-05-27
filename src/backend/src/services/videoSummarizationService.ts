import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// Environment check
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in .env');
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface YouTubeTranscriptResponse {
  text: string;
  start: number;
  duration: number;
}

/**
 * Fetch YouTube video transcript using youtube-transcript-api
 * This is a simplified approach - in production you might want to use a more robust solution
 */
async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    // For now, we'll use a simple approach to get transcript
    // You might want to implement a more robust solution using youtube-dl or similar
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
    
    // This is a placeholder - in reality, you'd need to extract the transcript
    // from the YouTube page or use a dedicated service
    // For now, we'll return a message indicating we need the transcript
    throw new Error('Transcript extraction not implemented - would need youtube-transcript-api or similar service');
    
  } catch (error) {
    console.error('[VideoSummarizationService] Error fetching transcript:', error);
    throw new Error('Failed to fetch video transcript');
  }
}

/**
 * Generate a summary using Gemini AI from video transcript
 */
export async function summarizeVideoTranscript(transcript: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Please provide a comprehensive summary of the following video transcript. 
Focus on the main points, key insights, and actionable information.
Structure the summary with:
1. Main Topic/Theme
2. Key Points (3-5 bullet points)
3. Important Details or Examples
4. Conclusion/Takeaways

Keep the summary concise but informative, around 200-300 words.

Transcript:
"""
${transcript}
"""
    `.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();

    if (!summary || summary.trim().length === 0) {
      throw new Error('Empty summary generated');
    }

    return summary.trim();
  } catch (error) {
    console.error('[VideoSummarizationService] Error generating summary:', error);
    throw new Error('Failed to generate video summary');
  }
}

/**
 * Main function to summarize a YouTube video by its ID
 * This is a placeholder implementation - you'll need to implement transcript fetching
 */
export async function summarizeYouTubeVideo(videoId: string): Promise<string> {
  try {
    // For now, we'll return a placeholder summary since transcript extraction is complex
    // In a real implementation, you'd:
    // 1. Extract transcript from YouTube
    // 2. Pass it to summarizeVideoTranscript
    
    const placeholderSummary = await generatePlaceholderSummary(videoId);
    return placeholderSummary;
    
  } catch (error) {
    console.error('[VideoSummarizationService] Error summarizing video:', error);
    throw error;
  }
}

/**
 * Generate a placeholder summary using video metadata
 * This is a temporary solution until proper transcript extraction is implemented
 */
async function generatePlaceholderSummary(videoId: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Get video metadata from YouTube oEmbed
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oEmbedUrl);
    const { title, author_name } = response.data;

    const prompt = `
Based on this YouTube video information, generate a helpful summary placeholder:
- Title: ${title}
- Channel: ${author_name}
- Video ID: ${videoId}

Create a brief summary that acknowledges this is based on metadata only and suggests what the video might contain based on the title. Keep it professional and helpful.
    `.trim();

    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;
    const summary = aiResponse.text();

    return summary.trim() || `Summary for "${title}" by ${author_name}. This is a placeholder summary generated from video metadata. For a detailed summary, transcript analysis would be needed.`;
    
  } catch (error) {
    console.error('[VideoSummarizationService] Error generating placeholder summary:', error);
    return `Summary generation failed for video ${videoId}. Please try again later.`;
  }
} 