import { Request, Response } from 'express';
import { locationExtractionService } from '../../services/locationExtractionService';
import axios from 'axios';

export const searchPlaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!query) {
      res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
      return;
    }

    if (!googleMapsApiKey) {
      res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured'
      });
      return;
    }

    // Use Google Places Text Search API
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/textsearch/json',
      {
        params: {
          query: query,
          key: googleMapsApiKey,
          fields: 'formatted_address,name,geometry,place_id,types,rating,photos'
        }
      }
    );

    const results = (response.data as any).results;
    
    if (results && results.length > 0) {
      const places = results.slice(0, 5).map((place: any) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        types: place.types,
        rating: place.rating,
        photoUrl: place.photos && place.photos[0] 
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googleMapsApiKey}`
          : undefined
      }));

      res.json({
        success: true,
        places
      });
    } else {
      res.json({
        success: false,
        error: 'No places found for the query',
        places: []
      });
    }

  } catch (error) {
    console.error('[PlacesController]: Error searching places:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const extractLocationFromText = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({
        success: false,
        error: 'Text is required'
      });
      return;
    }

    console.log('[PlacesController]: Extracting location from text:', text);
    const result = await locationExtractionService.extractLocationFromText(text);
    console.log('[PlacesController]: Location extraction result:', result);
    
    res.json(result);

  } catch (error) {
    console.error('[PlacesController]: Error extracting location:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const testLocationExtraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const testCases = [
      'תוסיף את קפה איטליה למפה',
      'הוסף את סטארבקס למפה',
      'חפש את מקדונלדס',
      'add coffee italia to maps',
      'find starbucks near me',
      'just a regular message'
    ];

    const results = [];
    
    for (const testText of testCases) {
      console.log(`[PlacesController]: Testing: "${testText}"`);
      const result = await locationExtractionService.extractLocationFromText(testText);
      results.push({
        input: testText,
        result
      });
    }

    res.json({
      success: true,
      testResults: results,
      environment: {
        hasClaudeKey: !!process.env.ANTHROPIC_API_KEY,
        hasGoogleMapsKey: !!(process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
        claudeKeyLength: process.env.ANTHROPIC_API_KEY?.length || 0,
        mapsKeyLength: (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY)?.length || 0
      }
    });

  } catch (error) {
    console.error('[PlacesController]: Error in test:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};