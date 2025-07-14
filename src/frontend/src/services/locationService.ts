import { BACKEND_ROOT_URL } from './axiosConfig';

export interface LocationData {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

export interface GeotagRequest {
  location: LocationData;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radius?: number; // meters, default 1000
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
}

export const locationService = new LocationService();