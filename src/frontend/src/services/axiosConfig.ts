import axios from 'axios';
import type { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import useAuthStore from '../store/authStore'; // Adjust path if your store is elsewhere

// Define the root URL for your backend.
// For local development, it's typically 'http://localhost:3001'.
// For production, set VITE_BACKEND_ROOT_URL to your backend's base URL (e.g., https://your-backend.onrender.com)
export const BACKEND_ROOT_URL =
  import.meta.env.VITE_BACKEND_ROOT_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

// Define the common path for your API endpoints.
const API_PATH = '/api/v1'; // This can be made configurable via another env var if needed

// Validate backend URL configuration
const isValidBackendUrl = BACKEND_ROOT_URL && BACKEND_ROOT_URL !== window?.location?.origin;
if (!isValidBackendUrl && import.meta.env.PROD) {
  console.error('❌ [AxiosConfig] VITE_BACKEND_ROOT_URL not properly configured for production!');
  console.error('   Current value:', BACKEND_ROOT_URL);
  console.error('   Expected: A different URL than the frontend origin');
  console.error('   Please set VITE_BACKEND_ROOT_URL in your environment variables');
}

// Add more detailed logging for debugging
console.log('[AxiosConfig] Environment:', import.meta.env.MODE);
console.log('[AxiosConfig] VITE_BACKEND_ROOT_URL from env:', import.meta.env.VITE_BACKEND_ROOT_URL);
console.log('[AxiosConfig] BACKEND_ROOT_URL resolved to:', BACKEND_ROOT_URL);
console.log('[AxiosConfig] Full API Base URL:', `${BACKEND_ROOT_URL}${API_PATH}`);
console.log('[AxiosConfig] Is valid backend URL:', isValidBackendUrl);

const axiosInstance = axios.create({
  baseURL: `${BACKEND_ROOT_URL}${API_PATH}`, // e.g., http://localhost:3001/api/v1 or https://your-backend.onrender.com/api/v1
});

// Export the root URL for constructing paths to static assets (like images)
// This ensures static assets are fetched from the correct base, without the /api/v1 path.
export const STATIC_ASSETS_BASE_URL = BACKEND_ROOT_URL;

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfig): AxiosRequestConfig => {
    const token = useAuthStore.getState().token;
    console.log('[AxiosInterceptor] Token from store:', token ? 'Present' : 'Absent'); // Log token presence
    console.log('[AxiosInterceptor] Full request config:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      params: config.params,
      data: config.data ? 'Has data' : 'No data'
    });
    
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('[AxiosInterceptor] Authorization header SET'); // Confirm header set
    } else {
      console.log('[AxiosInterceptor] No token found in store, Authorization header NOT SET');
    }
    console.log('[AxiosInterceptor] Making request to:', config.url); // Log target URL
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
    console.log('[AxiosInterceptor] Response from:', response.config.url, 'Status:', response.status);
    console.log('[AxiosInterceptor] Response data:', response.data ? JSON.stringify(response.data).slice(0, 200) + '...' : 'No data');
    return response;
  },
  (error: AxiosError) => {
    console.error('[AxiosInterceptor] Response error from:', error.config?.url, 'Status:', error.response?.status);
    console.error('[AxiosInterceptor] Error details:', {
      message: error.message,
      responseData: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No data', // Full response data for debugging
      requestData: error.config?.data ? JSON.stringify(error.config.data, null, 2) : 'No request data',
      isAxiosError: error.isAxiosError,
      statusCode: error.response?.status,
      headers: error.response?.headers,
      method: error.config?.method?.toUpperCase(),
      fullUrl: error.config?.url
    });
    
    if (error.response && error.response.status === 401) {
      // If unauthorized, indicate the session is invalid but avoid immediately
      // logging the user out. This prevents abrupt page transitions when the
      // backend rejects a request (e.g. stale token) and allows the caller to
      // handle the error gracefully.
      if (
        error.config &&
        !error.config.url?.includes('/auth/login') &&
        !error.config.url?.includes('/auth/register')
      ) {
        console.warn(
          '[AxiosInterceptor] 401 response detected. Token may be invalid.'
        );
        // Consumers can choose how to react (e.g. show a toast and redirect).
        // The previous behaviour forcibly logged the user out which caused the
        // bookmarks page to disappear while loading.
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 