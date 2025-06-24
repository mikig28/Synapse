/**
 * Google Authentication Service
 * Manages Google OAuth tokens with persistence across page refreshes
 */

interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number | null;
  refreshToken: string | null;
  isConnected: boolean;
}

class GoogleAuthService {
  private readonly STORAGE_KEY = 'google_auth_state';
  private readonly TOKEN_BUFFER_TIME = 5 * 60 * 1000; // 5 minutes buffer before expiration

  /**
   * Save Google auth state to localStorage
   */
  saveAuthState(tokenResponse: {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  }): void {
    const expiresAt = tokenResponse.expires_in 
      ? Date.now() + (tokenResponse.expires_in * 1000)
      : Date.now() + (3600 * 1000); // Default 1 hour

    const authState: GoogleAuthState = {
      accessToken: tokenResponse.access_token,
      expiresAt,
      refreshToken: tokenResponse.refresh_token || null,
      isConnected: true,
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authState));
    console.log('[GoogleAuth] Auth state saved to localStorage');
  }

  /**
   * Get current auth state from localStorage
   */
  getAuthState(): GoogleAuthState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const authState: GoogleAuthState = JSON.parse(stored);
      
      // Check if token is expired
      if (this.isTokenExpired(authState)) {
        console.log('[GoogleAuth] Token expired, clearing auth state');
        this.clearAuthState();
        return null;
      }

      return authState;
    } catch (error) {
      console.error('[GoogleAuth] Error parsing auth state:', error);
      this.clearAuthState();
      return null;
    }
  }

  /**
   * Get current access token if valid
   */
  getAccessToken(): string | null {
    const authState = this.getAuthState();
    return authState?.accessToken || null;
  }

  /**
   * Check if user is currently connected to Google Calendar
   */
  isConnected(): boolean {
    const authState = this.getAuthState();
    return authState?.isConnected || false;
  }

  /**
   * Check if current token is expired or about to expire
   */
  isTokenExpired(authState?: GoogleAuthState): boolean {
    const state = authState || this.getAuthState();
    if (!state?.expiresAt) {
      return true;
    }

    // Consider token expired if it expires within the buffer time
    return Date.now() > (state.expiresAt - this.TOKEN_BUFFER_TIME);
  }

  /**
   * Clear auth state (logout)
   */
  clearAuthState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[GoogleAuth] Auth state cleared');
  }

  /**
   * Check if token needs refresh soon
   */
  needsRefresh(): boolean {
    const authState = this.getAuthState();
    if (!authState?.expiresAt) {
      return false;
    }

    // Needs refresh if expires within 15 minutes
    const refreshBuffer = 15 * 60 * 1000;
    return Date.now() > (authState.expiresAt - refreshBuffer);
  }

  /**
   * Get time until token expiration (in minutes)
   */
  getTimeUntilExpiration(): number | null {
    const authState = this.getAuthState();
    if (!authState?.expiresAt) {
      return null;
    }

    const timeLeft = authState.expiresAt - Date.now();
    return Math.max(0, Math.floor(timeLeft / (60 * 1000)));
  }

  /**
   * Get human-readable connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    status: string;
    timeLeft?: number;
  } {
    const authState = this.getAuthState();
    
    if (!authState) {
      return {
        connected: false,
        status: 'Not connected',
      };
    }

    if (this.isTokenExpired(authState)) {
      return {
        connected: false,
        status: 'Token expired',
      };
    }

    const timeLeft = this.getTimeUntilExpiration();
    return {
      connected: true,
      status: 'Connected',
      timeLeft,
    };
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;