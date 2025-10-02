import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { getBucket } from '../config/gridfs';
import { ObjectId } from 'mongodb';

export interface ImageAnalysisResult {
  isAnalyzed: boolean;
  analyzedAt: Date;
  description: string;
  mainCategory: string;
  categories: string[];
  tags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  error?: string;
}

export class ImageAnalysisService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  // Predefined categories for consistency
  private static readonly CATEGORIES = [
    'Food & Dining',
    'People & Portraits',
    'Nature & Landscape',
    'Screenshot & UI',
    'Document & Text',
    'Product & Shopping',
    'Pets & Animals',
    'Travel & Places',
    'Art & Design',
    'Sports & Fitness',
    'Events & Celebrations',
    'Technology & Gadgets',
    'Fashion & Style',
    'Memes & Humor',
    'Business & Work',
    'Other'
  ];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini 1.5 Flash - fastest and cheapest with vision capabilities
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  }

  /**
   * Analyze an image from GridFS by ID
   */
  async analyzeImageFromGridFS(gridFsId: string): Promise<ImageAnalysisResult> {
    try {
      console.log(`[ImageAnalysisService] Starting analysis for GridFS ID: ${gridFsId}`);
      
      // Download image from GridFS
      const bucket = getBucket();
      const fileId = new ObjectId(gridFsId);
      
      // Get file metadata
      const files = await bucket.find({ _id: fileId }).toArray();
      if (!files || files.length === 0) {
        throw new Error(`Image not found in GridFS: ${gridFsId}`);
      }
      
      const file = files[0];
      const contentType = file.contentType || 'image/jpeg';
      
      // Download image data
      const chunks: Buffer[] = [];
      const downloadStream = bucket.openDownloadStream(fileId);
      
      await new Promise<void>((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        downloadStream.on('end', () => resolve());
        downloadStream.on('error', reject);
      });
      
      const imageBuffer = Buffer.concat(chunks);
      const base64Image = imageBuffer.toString('base64');
      
      console.log(`[ImageAnalysisService] Downloaded image (${imageBuffer.length} bytes), sending to Gemini...`);
      
      // Analyze with Gemini Vision
      const result = await this.analyzeWithGemini(base64Image, contentType);
      
      console.log(`[ImageAnalysisService] ✅ Analysis complete for ${gridFsId}`);
      return result;
      
    } catch (error: any) {
      console.error(`[ImageAnalysisService] ❌ Error analyzing image ${gridFsId}:`, error);
      return {
        isAnalyzed: false,
        analyzedAt: new Date(),
        description: '',
        mainCategory: 'Other',
        categories: [],
        tags: [],
        sentiment: 'neutral',
        confidence: 0,
        error: error.message || 'Failed to analyze image'
      };
    }
  }

  /**
   * Analyze an image from a URL
   */
  async analyzeImageFromUrl(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      console.log(`[ImageAnalysisService] Downloading image from URL: ${imageUrl}`);
      
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      const imageBuffer = Buffer.from(response.data);
      const base64Image = imageBuffer.toString('base64');
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      console.log(`[ImageAnalysisService] Downloaded image (${imageBuffer.length} bytes), sending to Gemini...`);
      
      // Analyze with Gemini Vision
      const result = await this.analyzeWithGemini(base64Image, contentType);
      
      console.log(`[ImageAnalysisService] ✅ Analysis complete`);
      return result;
      
    } catch (error: any) {
      console.error(`[ImageAnalysisService] ❌ Error analyzing image from URL:`, error);
      return {
        isAnalyzed: false,
        analyzedAt: new Date(),
        description: '',
        mainCategory: 'Other',
        categories: [],
        tags: [],
        sentiment: 'neutral',
        confidence: 0,
        error: error.message || 'Failed to analyze image'
      };
    }
  }

  /**
   * Core analysis using Gemini Vision API
   */
  private async analyzeWithGemini(base64Image: string, contentType: string): Promise<ImageAnalysisResult> {
    try {
      const prompt = `Analyze this image and provide a detailed JSON response with the following structure:
{
  "description": "A detailed description of what you see in the image (2-3 sentences)",
  "mainCategory": "The single most appropriate category from this list: ${ImageAnalysisService.CATEGORIES.join(', ')}",
  "categories": ["Array of all relevant categories from the above list"],
  "tags": ["Array of 5-10 specific objects, items, or concepts visible in the image"],
  "sentiment": "Overall sentiment: positive, neutral, or negative",
  "confidence": 0.95 (A number between 0-1 indicating your confidence in this analysis)
}

Important guidelines:
- Be specific and descriptive
- Choose the mainCategory that best fits the image
- Include multiple categories if applicable
- Tags should be concrete and searchable
- Consider the context and purpose of the image
- If it's a screenshot, identify what app/website it's from
- If it's a document, identify the document type

Respond ONLY with the JSON object, no additional text.`;

      // Prepare image part for Gemini
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: contentType
        }
      };

      // Generate content with Gemini
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const responseText = response.text().trim();
      let analysisData;
      
      try {
        // Try to extract JSON if it's wrapped in markdown code blocks
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                          responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                          [null, responseText];
        analysisData = JSON.parse(jsonMatch[1] || responseText);
      } catch (parseError) {
        console.error('[ImageAnalysisService] Failed to parse Gemini response:', responseText);
        throw new Error('Invalid JSON response from Gemini');
      }

      // Validate and return result
      return {
        isAnalyzed: true,
        analyzedAt: new Date(),
        description: analysisData.description || 'No description available',
        mainCategory: this.validateCategory(analysisData.mainCategory),
        categories: Array.isArray(analysisData.categories) 
          ? analysisData.categories.filter((c: string) => ImageAnalysisService.CATEGORIES.includes(c))
          : [this.validateCategory(analysisData.mainCategory)],
        tags: Array.isArray(analysisData.tags) ? analysisData.tags.slice(0, 15) : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(analysisData.sentiment) 
          ? analysisData.sentiment 
          : 'neutral',
        confidence: typeof analysisData.confidence === 'number' 
          ? Math.max(0, Math.min(1, analysisData.confidence)) 
          : 0.8,
      };

    } catch (error: any) {
      console.error('[ImageAnalysisService] Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Validate category is in our predefined list
   */
  private validateCategory(category: string): string {
    if (ImageAnalysisService.CATEGORIES.includes(category)) {
      return category;
    }
    
    // Try to find a close match
    const lowerCategory = category.toLowerCase();
    const match = ImageAnalysisService.CATEGORIES.find(c => 
      c.toLowerCase().includes(lowerCategory) || lowerCategory.includes(c.toLowerCase())
    );
    
    return match || 'Other';
  }

  /**
   * Get all available categories
   */
  static getCategories(): string[] {
    return [...this.CATEGORIES];
  }
}

export default new ImageAnalysisService();

