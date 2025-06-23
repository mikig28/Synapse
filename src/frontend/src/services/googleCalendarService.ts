import axiosInstance from './axiosConfig';

export interface SyncResult {
  success: boolean;
  eventsImported: number;
  eventsExported: number;
  errors: string[];
}

export interface SyncStatus {
  totalEvents: number;
  syncedEvents: number;
  pendingEvents: number;
  errorEvents: number;
  localOnlyEvents: number;
  lastSyncAt?: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

class GoogleCalendarService {
  private baseUrl = '/api/calendar-events';

  /**
   * Perform bidirectional sync with Google Calendar
   */
  async syncWithGoogle(accessToken: string, timeRange?: TimeRange): Promise<SyncResult> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/sync`, {
        accessToken,
        timeRange,
      });

      return response.data.result;
    } catch (error: any) {
      console.error('Error syncing with Google Calendar:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to sync with Google Calendar'
      );
    }
  }

  /**
   * Get sync status for user's events
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/sync/status`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting sync status:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to get sync status'
      );
    }
  }

  /**
   * Import events from Google Calendar
   */
  async importFromGoogle(
    accessToken: string,
    timeMin?: string,
    timeMax?: string
  ): Promise<{ imported: number; errors: string[] }> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/sync/import`, {
        accessToken,
        timeMin,
        timeMax,
      });

      return {
        imported: response.data.imported,
        errors: response.data.errors,
      };
    } catch (error: any) {
      console.error('Error importing from Google Calendar:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to import from Google Calendar'
      );
    }
  }

  /**
   * Export events to Google Calendar
   */
  async exportToGoogle(accessToken: string): Promise<{ exported: number; errors: string[] }> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/sync/export`, {
        accessToken,
      });

      return {
        exported: response.data.exported,
        errors: response.data.errors,
      };
    } catch (error: any) {
      console.error('Error exporting to Google Calendar:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to export to Google Calendar'
      );
    }
  }

  /**
   * Get Google Calendar authorization URL (for future OAuth flow improvements)
   */
  getAuthUrl(): string {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events');
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `response_type=token&` +
      `access_type=offline`;
  }

  /**
   * Check if user has necessary Google Calendar permissions
   */
  async checkCalendarPermissions(accessToken: string): Promise<boolean> {
    try {
      // Make a simple test request to check if we have calendar access
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking calendar permissions:', error);
      return false;
    }
  }

  /**
   * Request additional calendar permissions from Google
   */
  async requestCalendarPermissions(): Promise<string> {
    return new Promise((resolve, reject) => {
      const authUrl = this.getAuthUrl();
      const authWindow = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!authWindow) {
        reject(new Error('Failed to open authentication window'));
        return;
      }

      // Listen for window close or token in URL
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          reject(new Error('Authentication cancelled'));
        }

        try {
          const url = authWindow.location.href;
          if (url.includes('access_token=')) {
            const urlParams = new URLSearchParams(url.split('#')[1]);
            const accessToken = urlParams.get('access_token');
            
            if (accessToken) {
              authWindow.close();
              clearInterval(checkClosed);
              resolve(accessToken);
            }
          }
        } catch (error) {
          // Cross-origin restrictions prevent reading the URL until redirect
        }
      }, 1000);
    });
  }
}

export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;