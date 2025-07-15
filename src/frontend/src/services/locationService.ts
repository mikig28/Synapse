import { BACKEND_ROOT_URL } from './axiosConfig';

export interface LocationData {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
  name?: string;
  placeId?: string;
}

export interface GeotagRequest {
  location: LocationData;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius?: number; // meters, default 1000
}

export interface PlaceSearchResult {
  success: boolean;
  places?: {
    placeId: string;
    name: string;
    address: string;
    location: {
      lat: number;
      lng: number;
    };
    types?: string[];
    rating?: number;
    photoUrl?: string;
  }[];
  error?: string;
}

class LocationService {
  private apiBaseUrl = `${BACKEND_ROOT_URL}/api/v1`;

  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    token: string
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Geotag a note
  async geotagNote(noteId: string, location: LocationData, token: string): Promise<any> {
    return this.makeRequest(
      `${this.apiBaseUrl}/notes/${noteId}/geotag`,
      {
        method: 'POST',
        body: JSON.stringify({ location }),
      },
      token
    );
  }

  // Geotag a task
  async geotagTask(taskId: string, location: LocationData, token: string): Promise<any> {
    return this.makeRequest(
      `${this.apiBaseUrl}/tasks/${taskId}/geotag`,
      {
        method: 'POST',
        body: JSON.stringify({ location }),
      },
      token
    );
  }

  // Get nearby notes
  async getNearbyNotes(query: NearbyQuery, token: string): Promise<any[]> {
    const params = new URLSearchParams({
      lat: query.lat.toString(),
      lng: query.lng.toString(),
      ...(query.radius && { radius: query.radius.toString() }),
    });

    return this.makeRequest(
      `${this.apiBaseUrl}/notes/nearby?${params}`,
      { method: 'GET' },
      token
    );
  }

  // Get nearby tasks
  async getNearbyTasks(query: NearbyQuery, token: string): Promise<any[]> {
    const params = new URLSearchParams({
      lat: query.lat.toString(),
      lng: query.lng.toString(),
      ...(query.radius && { radius: query.radius.toString() }),
    });

    return this.makeRequest(
      `${this.apiBaseUrl}/tasks/nearby?${params}`,
      { method: 'GET' },
      token
    );
  }

  // Search for places using Google Places API
  async searchPlaces(query: string, token: string): Promise<PlaceSearchResult> {
    try {
      return this.makeRequest<PlaceSearchResult>(
        `${this.apiBaseUrl}/places/search?q=${encodeURIComponent(query)}`,
        { method: 'GET' },
        token
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a note with location from voice command
  async createNoteWithLocation(
    title: string, 
    content: string, 
    location: LocationData, 
    token: string
  ): Promise<any> {
    return this.makeRequest(
      `${this.apiBaseUrl}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          location,
          source: 'telegram_voice_location'
        }),
      },
      token
    );
  }

  // Create a task with location from voice command
  async createTaskWithLocation(
    title: string, 
    description: string, 
    location: LocationData, 
    token: string
  ): Promise<any> {
    return this.makeRequest(
      `${this.apiBaseUrl}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          location,
          status: 'pending',
          source: 'telegram_voice_location'
        }),
      },
      token
    );
  }
}

export const locationService = new LocationService();