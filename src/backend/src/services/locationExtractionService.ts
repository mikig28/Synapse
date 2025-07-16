import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface LocationData {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
  name?: string;
  placeId?: string;
}

export interface LocationExtractionResult {
  success: boolean;
  location?: LocationData;
  confidence: 'high' | 'medium' | 'low';
  extractedText?: string;
  error?: string;
}

class LocationExtractionService {
  private googleMapsApiKey: string;
  private claudeApiKey: string;

  constructor() {
    this.googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    this.claudeApiKey = process.env.ANTHROPIC_API_KEY || '';
    
    if (!this.googleMapsApiKey) {
      console.warn('[LocationExtraction]: Google Maps API key not found');
    }
    if (!this.claudeApiKey) {
      console.warn('[LocationExtraction]: Claude API key not found');
    }
  }

  /**
   * Extract location information from transcribed voice message
   */
  async extractLocationFromText(transcribedText: string): Promise<LocationExtractionResult> {
    try {
      console.log(`[LocationExtraction]: Analyzing text: "${transcribedText}"`);

      // Step 1: Use Claude AI to extract location entities and intent
      const aiAnalysis = await this.analyzeLocationIntent(transcribedText);
      
      if (!aiAnalysis.hasLocationIntent) {
        return {
          success: false,
          confidence: 'low',
          error: 'No location intent detected in message'
        };
      }

      // Step 2: Search for the location using Google Places API
      if (aiAnalysis.locationQuery) {
        const searchResult = await this.searchPlace(aiAnalysis.locationQuery);
        
        if (searchResult.success && searchResult.location) {
          return {
            success: true,
            location: searchResult.location,
            confidence: aiAnalysis.confidence,
            extractedText: aiAnalysis.locationQuery
          };
        }
      }

      // Step 3: Fallback - try direct geocoding if no places found
      if (aiAnalysis.locationQuery) {
        const geocodeResult = await this.geocodeAddress(aiAnalysis.locationQuery);
        
        if (geocodeResult.success && geocodeResult.location) {
          return {
            success: true,
            location: geocodeResult.location,
            confidence: 'medium',
            extractedText: aiAnalysis.locationQuery
          };
        }
      }

      return {
        success: false,
        confidence: 'low',
        extractedText: aiAnalysis.locationQuery,
        error: 'Could not find the specified location'
      };

    } catch (error) {
      console.error('[LocationExtraction]: Error extracting location:', error);
      return {
        success: false,
        confidence: 'low',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Use Claude AI to analyze location intent and extract location queries
   */
  private async analyzeLocationIntent(text: string): Promise<{
    hasLocationIntent: boolean;
    locationQuery?: string;
    confidence: 'high' | 'medium' | 'low';
    action?: 'add' | 'search' | 'navigate';
  }> {
    if (!this.claudeApiKey) {
      // Fallback to simple regex patterns
      return this.simpleLocationExtraction(text);
    }

    try {
      const prompt = `
Analyze the following voice message transcription and determine if it contains location-related intent.
The text may be in Hebrew, English, or mixed languages. Extract any location names, addresses, or place names mentioned.

Text: "${text}"

Please respond with a JSON object containing:
- hasLocationIntent: boolean (true if user wants to add/search/navigate to a location)
- locationQuery: string (the location name/address to search for, if any)
- confidence: "high" | "medium" | "low" (confidence in the location extraction)
- action: "add" | "search" | "navigate" (what the user wants to do with the location)

Examples in English:
- "add coffee italia to maps" → {"hasLocationIntent": true, "locationQuery": "coffee italia", "confidence": "high", "action": "add"}
- "find starbucks near me" → {"hasLocationIntent": true, "locationQuery": "starbucks", "confidence": "high", "action": "search"}  
- "navigate to 123 main street" → {"hasLocationIntent": true, "locationQuery": "123 main street", "confidence": "high", "action": "navigate"}

Examples in Hebrew:
- "תוסיף את קפה איטליה למפה" → {"hasLocationIntent": true, "locationQuery": "קפה איטליה", "confidence": "high", "action": "add"}
- "חפש את סטארבקס" → {"hasLocationIntent": true, "locationQuery": "סטארבקס", "confidence": "high", "action": "search"}
- "נווט לרחוב הרצל 123" → {"hasLocationIntent": true, "locationQuery": "רחוב הרצל 123", "confidence": "high", "action": "navigate"}
- "איפה המסעדה הזאת" → {"hasLocationIntent": false, "confidence": "low"}

Hebrew keywords to recognize:
- תוסיף/הוסף (add), למפה (to map), מפה (map)
- חפש/מצא (find/search), איפה (where)
- נווט (navigate), לך ל (go to)
- מסעדה (restaurant), קפה/בית קפה (cafe), חנות (store)
- רחוב (street), שדרות (avenue), כיכר (square)

Focus on restaurant names, business names, addresses, landmarks, and place names in both Hebrew and English.
`;

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.claudeApiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      const aiResponse = (response.data as any).content[0].text;
      const parsed = JSON.parse(aiResponse);
      
      console.log('[LocationExtraction]: AI Analysis:', parsed);
      return parsed;

    } catch (error) {
      console.error('[LocationExtraction]: Claude AI analysis failed:', error);
      // Fallback to simple extraction
      return this.simpleLocationExtraction(text);
    }
  }

  /**
   * Simple regex-based location extraction fallback
   */
  private simpleLocationExtraction(text: string): {
    hasLocationIntent: boolean;
    locationQuery?: string;
    confidence: 'high' | 'medium' | 'low';
    action?: 'add' | 'search' | 'navigate';
  } {
    const lowerText = text.toLowerCase();
    
    // Location intent keywords (English + Hebrew)
    const locationKeywords = [
      // English keywords
      'add', 'map', 'maps', 'location', 'place', 'restaurant', 'cafe', 'coffee',
      'address', 'street', 'avenue', 'road', 'boulevard', 'find', 'search',
      'navigate', 'go to', 'show me', 'where is',
      // Hebrew keywords
      'תוסיף', 'הוסף', 'למפה', 'מפה', 'מיקום', 'מקום', 'מסעדה', 'קפה', 'בית קפה',
      'כתובת', 'רחוב', 'שדרות', 'דרך', 'כביש', 'חפש', 'מצא', 'נווט', 'לך ל', 'איפה'
    ];

    // Check for location intent
    const hasLocationIntent = locationKeywords.some(keyword => 
      lowerText.includes(keyword) || text.includes(keyword)
    );
    
    if (!hasLocationIntent) {
      return { hasLocationIntent: false, confidence: 'low' };
    }

    // Extract potential location queries using patterns (English + Hebrew)
    const patterns = [
      // English patterns
      /add\s+(?:the\s+)?([^to]+?)\s+to\s+maps?/i,
      /find\s+(?:the\s+)?([^.!?]+)/i,
      /(?:navigate|go)\s+to\s+(?:the\s+)?([^.!?]+)/i,
      /"([^"]+)"/,
      /([\w\s]+ (?:restaurant|cafe|coffee|bar|hotel|store|shop))/i,
      /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd))/i,
      
      // Hebrew patterns
      /(?:תוסיף|הוסף)\s+(?:את\s+)?([^ל]+?)\s+למפה/,
      /(?:חפש|מצא)\s+(?:את\s+)?([^.!?]+)/,
      /נווט\s+ל(?:\s+)?([^.!?]+)/,
      /לך\s+ל(?:\s+)?([^.!?]+)/,
      /([\u0590-\u05FF\w\s]+ (?:מסעדה|קפה|בית קפה|חנות|בר|מלון))/,
      /רחוב\s+([\u0590-\u05FF\w\s]+\s+\d+)/,
      /שדרות\s+([\u0590-\u05FF\w\s]+\s+\d+)/,
      
      // Mixed patterns (Hebrew + English names)
      /(?:תוסיף|הוסף)\s+(?:את\s+)?([a-zA-Z\s]+)\s+למפה/,
      /(?:חפש|מצא)\s+(?:את\s+)?([a-zA-Z\s]+)/
    ];

    let locationQuery: string | undefined;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        locationQuery = match[1].trim();
        confidence = 'medium';
        break;
      }
    }

    // If no specific pattern matched, try to extract based on context
    if (!locationQuery && hasLocationIntent) {
      // Remove common words and extract the main content
      const words = text.split(/\s+/);
      const commonWords = [
        'add', 'to', 'maps', 'map', 'the', 'find', 'search', 'for', 'navigate', 'go',
        'תוסיף', 'הוסף', 'את', 'למפה', 'מפה', 'חפש', 'מצא', 'נווט', 'לך', 'ל', 'איפה'
      ];
      
      const filteredWords = words.filter(word => 
        !commonWords.includes(word.toLowerCase()) && !commonWords.includes(word)
      );
      
      if (filteredWords.length > 0) {
        locationQuery = filteredWords.join(' ');
        confidence = 'low';
      }
    }

    // Determine action based on keywords
    let action: 'add' | 'search' | 'navigate' = 'add';
    if (lowerText.includes('find') || lowerText.includes('search') || 
        text.includes('חפש') || text.includes('מצא')) {
      action = 'search';
    } else if (lowerText.includes('navigate') || lowerText.includes('go to') || 
               text.includes('נווט') || text.includes('לך ל')) {
      action = 'navigate';
    }

    return {
      hasLocationIntent: !!locationQuery,
      locationQuery,
      confidence,
      action
    };
  }

  /**
   * Search for a place using Google Places API
   */
  async searchPlace(query: string): Promise<LocationExtractionResult> {
    if (!this.googleMapsApiKey) {
      return {
        success: false,
        confidence: 'low',
        error: 'Google Maps API key not configured'
      };
    }

    try {
      console.log(`[LocationExtraction]: Searching for place: "${query}"`);

      // Use Google Places Text Search API
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: {
            query: query,
            key: this.googleMapsApiKey,
            fields: 'formatted_address,name,geometry,place_id'
          }
        }
      );

      const results = (response.data as any).results;
      
      if (results && results.length > 0) {
        const place = results[0];
        const location: LocationData = {
          type: 'Point',
          coordinates: [
            place.geometry.location.lng,
            place.geometry.location.lat
          ],
          address: place.formatted_address,
          name: place.name,
          placeId: place.place_id
        };

        return {
          success: true,
          location,
          confidence: 'high',
          extractedText: query
        };
      }

      return {
        success: false,
        confidence: 'low',
        extractedText: query,
        error: 'No places found for the query'
      };

    } catch (error) {
      console.error('[LocationExtraction]: Places API error:', error);
      return {
        success: false,
        confidence: 'low',
        extractedText: query,
        error: error instanceof Error ? error.message : 'Places API error'
      };
    }
  }

  /**
   * Geocode an address using Google Geocoding API
   */
  async geocodeAddress(address: string): Promise<LocationExtractionResult> {
    if (!this.googleMapsApiKey) {
      return {
        success: false,
        confidence: 'low',
        error: 'Google Maps API key not configured'
      };
    }

    try {
      console.log(`[LocationExtraction]: Geocoding address: "${address}"`);

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: address,
            key: this.googleMapsApiKey
          }
        }
      );

      const results = (response.data as any).results;
      
      if (results && results.length > 0) {
        const result = results[0];
        const location: LocationData = {
          type: 'Point',
          coordinates: [
            result.geometry.location.lng,
            result.geometry.location.lat
          ],
          address: result.formatted_address
        };

        return {
          success: true,
          location,
          confidence: 'medium',
          extractedText: address
        };
      }

      return {
        success: false,
        confidence: 'low',
        extractedText: address,
        error: 'Could not geocode the address'
      };

    } catch (error) {
      console.error('[LocationExtraction]: Geocoding error:', error);
      return {
        success: false,
        confidence: 'low',
        extractedText: address,
        error: error instanceof Error ? error.message : 'Geocoding API error'
      };
    }
  }
}

export const locationExtractionService = new LocationExtractionService();