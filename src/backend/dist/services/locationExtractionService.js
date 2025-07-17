"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationExtractionService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class LocationExtractionService {
    constructor() {
        this.googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
        this.openaiApiKey = process.env.OPENAI_API_KEY || '';
        console.log('[LocationExtraction]: Initializing service...');
        console.log('[LocationExtraction]: Available environment variables:', {
            VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY ? `Present (${process.env.VITE_GOOGLE_MAPS_API_KEY.length} chars)` : 'Missing',
            GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ? `Present (${process.env.GOOGLE_MAPS_API_KEY.length} chars)` : 'Missing',
            OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `Present (${process.env.OPENAI_API_KEY.length} chars)` : 'Missing',
            NODE_ENV: process.env.NODE_ENV || 'undefined'
        });
        console.log('[LocationExtraction]: Final keys - Google Maps:', this.googleMapsApiKey ? `Present (${this.googleMapsApiKey.length} chars)` : 'Missing');
        console.log('[LocationExtraction]: Final keys - OpenAI:', this.openaiApiKey ? `Present (${this.openaiApiKey.length} chars)` : 'Missing');
        if (!this.googleMapsApiKey) {
            console.warn('[LocationExtraction]: Google Maps API key not found');
        }
        if (!this.openaiApiKey) {
            console.warn('[LocationExtraction]: OpenAI API key not found - will use regex fallback');
        }
    }
    /**
     * Extract location information from transcribed voice message
     */
    async extractLocationFromText(transcribedText) {
        try {
            console.log(`[LocationExtraction]: Analyzing text: "${transcribedText}"`);
            console.log(`[LocationExtraction]: Text contains Hebrew:`, /[\u0590-\u05FF]/.test(transcribedText));
            // Step 1: Use Claude AI to extract location entities and intent
            const aiAnalysis = await this.analyzeLocationIntent(transcribedText);
            console.log(`[LocationExtraction]: AI Analysis result:`, aiAnalysis);
            if (!aiAnalysis.hasLocationIntent) {
                console.log(`[LocationExtraction]: No location intent detected by AI, confidence: ${aiAnalysis.confidence}`);
                return {
                    success: false,
                    confidence: aiAnalysis.confidence,
                    extractedText: aiAnalysis.locationQuery,
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
        }
        catch (error) {
            console.error('[LocationExtraction]: Error extracting location:', error);
            return {
                success: false,
                confidence: 'low',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Use OpenAI GPT-4o-mini to analyze location intent and extract location queries
     */
    async analyzeLocationIntent(text) {
        if (!this.openaiApiKey) {
            // Fallback to simple regex patterns
            return this.simpleLocationExtraction(text);
        }
        try {
            console.log('[LocationExtraction]: Making OpenAI API request...');
            const systemPrompt = `You are a location extraction AI. Analyze voice message transcriptions (Hebrew/English) and determine if they contain location-related intent. 

Respond ONLY with valid JSON containing:
- hasLocationIntent: boolean (true if user wants to add/search/navigate to a location)
- locationQuery: string (the location name/address to search for, if any)
- confidence: "high" | "medium" | "low" 
- action: "add" | "search" | "navigate"

Hebrew keywords: תוסיף/הוסף (add), למפה (to map), חפש/מצא (find), נווט (navigate), מסעדה (restaurant), קפה (cafe), רחוב (street)

Examples:
- "תוסיף את קפה איטליה למפה" → {"hasLocationIntent": true, "locationQuery": "קפה איטליה", "confidence": "high", "action": "add"}
- "add coffee italia to maps" → {"hasLocationIntent": true, "locationQuery": "coffee italia", "confidence": "high", "action": "add"}
- "איפה המסעדה הזאת" → {"hasLocationIntent": false, "confidence": "low"}`;
            console.log('[LocationExtraction]: OpenAI API request details:', {
                url: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4o-mini',
                hasApiKey: !!this.openaiApiKey,
                apiKeyLength: this.openaiApiKey.length,
                textToAnalyze: text
            });
            const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze this text: "${text}"` }
                ],
                max_tokens: 200,
                temperature: 0.1,
                response_format: { type: 'json_object' }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.openaiApiKey}`
                }
            });
            console.log('[LocationExtraction]: OpenAI API response status:', response.status);
            console.log('[LocationExtraction]: OpenAI API response data:', response.data);
            const aiResponse = response.data.choices[0].message.content;
            console.log('[LocationExtraction]: Raw AI response text:', aiResponse);
            const parsed = JSON.parse(aiResponse);
            console.log('[LocationExtraction]: Parsed AI Analysis:', parsed);
            return parsed;
        }
        catch (error) {
            console.error('[LocationExtraction]: OpenAI API analysis failed:', error);
            if (error && typeof error === 'object' && 'isAxiosError' in error) {
                const axiosError = error;
                console.error('[LocationExtraction]: OpenAI API error details:', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    data: axiosError.response?.data,
                    headers: axiosError.response?.headers,
                    message: axiosError.message
                });
            }
            // Fallback to simple extraction
            console.log('[LocationExtraction]: Falling back to regex patterns...');
            return this.simpleLocationExtraction(text);
        }
    }
    /**
     * Simple regex-based location extraction fallback
     */
    simpleLocationExtraction(text) {
        console.log(`[LocationExtraction]: Using regex fallback for: "${text}"`);
        const lowerText = text.toLowerCase();
        // Location intent keywords (English + Hebrew)
        const locationKeywords = [
            // English keywords
            'add', 'map', 'maps', 'location', 'place', 'restaurant', 'cafe', 'coffee',
            'address', 'street', 'avenue', 'road', 'boulevard', 'find', 'search',
            'navigate', 'go to', 'show me', 'where is',
            // Hebrew keywords
            'תוסיף', 'הוסף', 'תוסיפי', 'הוסיפי', 'למפה', 'מפה', 'מיקום', 'מקום', 'מסעדה', 'קפה', 'בית קפה',
            'כתובת', 'רחוב', 'שדרות', 'דרך', 'כביש', 'חפש', 'מצא', 'תחפש', 'תמצא', 'נווט', 'לך ל', 'איפה'
        ];
        // Check for location intent
        const hasLocationIntent = locationKeywords.some(keyword => lowerText.includes(keyword) || text.includes(keyword));
        console.log(`[LocationExtraction]: Found location keywords:`, locationKeywords.filter(k => lowerText.includes(k) || text.includes(k)));
        if (!hasLocationIntent) {
            console.log(`[LocationExtraction]: No location keywords found`);
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
            // Hebrew patterns - improved and more comprehensive
            /(?:תוסיף|הוסף|תוסיפי|הוסיפי)\s+(?:את\s+)?([^ל]+?)\s+(?:למפה|לmaps?)/,
            /(?:חפש|מצא|תחפש|תמצא)\s+(?:את\s+)?([^.!?]+)/,
            /(?:נווט|לך|תלך|נסע|תנווט)\s+(?:ל|אל)\s*([^.!?]+)/,
            /([\u0590-\u05FF\w\s\-']+ (?:מסעדה|קפה|בית קפה|חנות|בר|מלון|פיצריה|המבורגר))/,
            /(?:רחוב|שדרות|דרך|כביש)\s+([\u0590-\u05FF\w\s\-']+(?:\s+\d+)?)/,
            // Mixed patterns (Hebrew + English names) - common in Israel
            /(?:תוסיף|הוסף|תוסיפי|הוסיפי)\s+(?:את\s+)?([a-zA-Z\u0590-\u05FF\s\-']+)\s+(?:למפה|לmaps?)/,
            /(?:חפש|מצא|תחפש|תמצא)\s+(?:את\s+)?([a-zA-Z\u0590-\u05FF\s\-']+)/,
            // Simple place name extraction when keywords are present
            /(?:תוסיף|הוסף|למפה|מפה|חפש|מצא|נווט)\s*(?:את\s+)?([a-zA-Z\u0590-\u05FF\s\-']{3,})/,
            // Fallback: detect quoted text or prominent words
            /"([^"]+)"/,
            /'([^']+)'/,
            /([a-zA-Z\u0590-\u05FF\s\-']{3,}(?:\s+(?:מסעדה|קפה|restaurant|cafe|coffee))?)/
        ];
        let locationQuery;
        let confidence = 'low';
        console.log(`[LocationExtraction]: Testing ${patterns.length} patterns...`);
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = text.match(pattern);
            if (match && match[1]) {
                locationQuery = match[1].trim();
                confidence = 'medium';
                console.log(`[LocationExtraction]: Pattern ${i} matched! Extracted: "${locationQuery}"`);
                break;
            }
        }
        if (!locationQuery) {
            console.log(`[LocationExtraction]: No patterns matched, trying context extraction`);
        }
        // If no specific pattern matched, try to extract based on context
        if (!locationQuery && hasLocationIntent) {
            // Remove common words and extract the main content
            const words = text.split(/\s+/);
            const commonWords = [
                'add', 'to', 'maps', 'map', 'the', 'find', 'search', 'for', 'navigate', 'go',
                'תוסיף', 'הוסף', 'את', 'למפה', 'מפה', 'חפש', 'מצא', 'נווט', 'לך', 'ל', 'איפה'
            ];
            const filteredWords = words.filter(word => !commonWords.includes(word.toLowerCase()) && !commonWords.includes(word));
            if (filteredWords.length > 0) {
                locationQuery = filteredWords.join(' ');
                confidence = 'low';
            }
        }
        // Determine action based on keywords
        let action = 'add';
        if (lowerText.includes('find') || lowerText.includes('search') ||
            text.includes('חפש') || text.includes('מצא')) {
            action = 'search';
        }
        else if (lowerText.includes('navigate') || lowerText.includes('go to') ||
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
    async searchPlace(query) {
        if (!this.googleMapsApiKey) {
            console.error('[LocationExtraction]: Google Maps API key missing for search');
            return {
                success: false,
                confidence: 'low',
                error: 'Google Maps API key not configured'
            };
        }
        try {
            console.log(`[LocationExtraction]: Searching for place: "${query}"`);
            console.log(`[LocationExtraction]: Using Google Maps API key: ${this.googleMapsApiKey.substring(0, 10)}...`);
            // Use Google Places Text Search API
            const response = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
                params: {
                    query: query,
                    key: this.googleMapsApiKey,
                    fields: 'formatted_address,name,geometry,place_id'
                }
            });
            console.log(`[LocationExtraction]: Google Places API response status: ${response.status}`);
            console.log(`[LocationExtraction]: Google Places API response:`, response.data);
            const results = response.data.results;
            if (results && results.length > 0) {
                const place = results[0];
                const location = {
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
        }
        catch (error) {
            console.error('[LocationExtraction]: Places API error:', error);
            if (error && typeof error === 'object' && 'isAxiosError' in error) {
                const axiosError = error;
                console.error('[LocationExtraction]: Google Places API error details:', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    data: axiosError.response?.data,
                    message: axiosError.message,
                    query: query
                });
            }
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
    async geocodeAddress(address) {
        if (!this.googleMapsApiKey) {
            return {
                success: false,
                confidence: 'low',
                error: 'Google Maps API key not configured'
            };
        }
        try {
            console.log(`[LocationExtraction]: Geocoding address: "${address}"`);
            const response = await axios_1.default.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: address,
                    key: this.googleMapsApiKey
                }
            });
            const results = response.data.results;
            if (results && results.length > 0) {
                const result = results[0];
                const location = {
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
        }
        catch (error) {
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
exports.locationExtractionService = new LocationExtractionService();
