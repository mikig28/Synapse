import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import useAuthStore from '../store/authStore'; // Adjust path if your store is elsewhere

// Define the root URL for your backend.
// For local development, it's typically 'http://localhost:3001'.
// For production, set VITE_BACKEND_ROOT_URL to your backend's base URL (e.g., https://your-backend.onrender.com)
export const BACKEND_ROOT_URL = import.meta.env.VITE_BACKEND_ROOT_URL || 'http://localhost:3001';

// Define the common path for your API endpoints.
const API_PATH = '/api/v1'; // Standard API path for production backend

// Normalize the backend root to avoid double-appending /api or /api/v1
const API_BASE_ROOT = BACKEND_ROOT_URL
  .replace(/\/+$/, '')            // remove trailing slashes
  .replace(/\/api(?:\/v1)?$/, ''); // strip trailing /api or /api/v1 if present
const FULL_API_BASE_URL = `${API_BASE_ROOT}${API_PATH}`;

// Validate backend URL configuration
const isValidBackendUrl = !!BACKEND_ROOT_URL && BACKEND_ROOT_URL.startsWith('http');
if (!isValidBackendUrl) {
  console.error('❌ [AxiosConfig] VITE_BACKEND_ROOT_URL not properly configured!');
  console.error('   Current value:', BACKEND_ROOT_URL);
  console.error('   Expected: A valid HTTP/HTTPS URL');
  console.error('   Please set VITE_BACKEND_ROOT_URL in your environment variables');
}

// Additional production validation
if (import.meta.env.PROD && (!import.meta.env.VITE_BACKEND_ROOT_URL || import.meta.env.VITE_BACKEND_ROOT_URL.includes('localhost'))) {
  console.error('❌ [AxiosConfig] Production build detected but VITE_BACKEND_ROOT_URL not set properly!');
  console.error('   Current value:', import.meta.env.VITE_BACKEND_ROOT_URL);
  console.error('   Expected: Production backend URL (e.g., https://your-backend.onrender.com)');
}

// Add more detailed logging for debugging
console.log('[AxiosConfig] Environment:', import.meta.env.MODE);
console.log('[AxiosConfig] VITE_BACKEND_ROOT_URL from env:', import.meta.env.VITE_BACKEND_ROOT_URL);
console.log('[AxiosConfig] BACKEND_ROOT_URL resolved to:', BACKEND_ROOT_URL);
console.log('[AxiosConfig] API_BASE_ROOT normalized to:', API_BASE_ROOT);
console.log('[AxiosConfig] Full API Base URL:', FULL_API_BASE_URL);
console.log('[AxiosConfig] Is valid backend URL:', isValidBackendUrl);

// Suppress Chrome extension errors that might interfere with our app
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    // Filter out known Chrome extension errors that don't affect our app
    if (
      message.includes('Could not establish connection. Receiving end does not exist') ||
      message.includes('Host validation failed') ||
      message.includes('Host is not supported') ||
      message.includes('Host is not valid or supported') ||
      message.includes('Host is not in insights whitelist')
    ) {
      // Silently ignore these extension-related errors
      return;
    }
    originalError.apply(console, args);
  };
}

const axiosInstance = axios.create({
  baseURL: FULL_API_BASE_URL, // e.g., http://localhost:3001/api/v1 or https://your-backend.onrender.com/api/v1
  timeout: 60000, // 60 second timeout (increased from 30s)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Export the root URL for constructing paths to static assets (like images)
// This ensures static assets are fetched from the correct base, without the /api/v1 path.
export const STATIC_ASSETS_BASE_URL = API_BASE_ROOT;

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    
    // Only log in development for debugging, but less verbose
    if (import.meta.env.DEV) {
      console.log('[AxiosInterceptor] Request to:', config.url);
    }
    
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
      if (import.meta.env.DEV) {
        console.log('[AxiosInterceptor] Authorization header SET');
      }
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('[AxiosInterceptor] Request error:', error);
    return Promise.reject(error);
  }
);

// Optional: Response interceptor for global error handling (e.g., 401 for logout)
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Only log successful responses in development if needed
    if (import.meta.env.DEV && response.config.url?.includes('debug')) {
      console.log('[AxiosInterceptor] Response from:', response.config.url, 'Status:', response.status);
    }
    return response;
  },
  (error: AxiosError) => {
    // Only log detailed errors in production or for non-network errors
    const isNetworkError = !error.response && error.request;
    const isDevelopment = import.meta.env.DEV;
    
    if (!isDevelopment || !isNetworkError) {
      console.error('[AxiosInterceptor] Response error from:', error.config?.url, 'Status:', error.response?.status);
      console.error('[AxiosInterceptor] Error details:', {
        message: error.message,
        responseData: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No data',
        requestData: error.config?.data ? JSON.stringify(error.config.data, null, 2) : 'No request data',
        isAxiosError: error.isAxiosError,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        method: error.config?.method?.toUpperCase(),
        fullUrl: error.config?.url,
        networkError: !error.response && error.request ? 'Network request failed - backend may be down' : null,
        timeoutError: error.code === 'ECONNABORTED' ? 'Request timed out' : null
      });

      // Enhanced error messages for common issues (only in production or non-network errors)
      if (!error.response && error.request) {
        console.error('🚨 [AxiosInterceptor] NETWORK ERROR: Unable to reach backend server');
        console.error('   This could mean:');
        console.error('   1. Backend server is down or unreachable');
        console.error('   2. CORS issues (check browser network tab)');
        console.error('   3. Wrong backend URL configured');
        console.error('   4. Network connectivity issues');
      } else if (error.response?.status === 503) {
        console.error('🚨 [AxiosInterceptor] SERVICE UNAVAILABLE: Backend server is temporarily unavailable');
      } else if (error.response?.status === 404) {
        console.error('🚨 [AxiosInterceptor] NOT FOUND: API endpoint does not exist');
      }
    }
    
    if (error.response && error.response.status === 401) {
      // If unauthorized, check if it's a token expiration issue
      if (
        error.config &&
        !error.config.url?.includes('/auth/login') &&
        !error.config.url?.includes('/auth/register')
      ) {
        console.warn('[AxiosInterceptor] 401 response detected. Token expired or invalid.');
        
        // Clear expired token and redirect to login
        const authStore = useAuthStore.getState();
        if (authStore.isAuthenticated) {
          console.log('[AxiosInterceptor] Logging out user due to expired token');
          authStore.logout();
          
          // Optional: Show user-friendly message
          if (typeof window !== 'undefined') {
            alert('Your session has expired. Please log in again.');
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 