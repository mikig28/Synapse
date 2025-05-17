import axios, { InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import useAuthStore from '../store/authStore'; // Adjust path if your store is elsewhere

// Define the root URL for your backend.
// For local development, it's typically 'http://localhost:3001'.
// For production, set VITE_BACKEND_ROOT_URL to your backend's base URL (e.g., https://your-backend.onrender.com)
export const BACKEND_ROOT_URL =
  import.meta.env.VITE_BACKEND_ROOT_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

// Define the common path for your API endpoints.
const API_PATH = '/api/v1'; // This can be made configurable via another env var if needed

const axiosInstance = axios.create({
  baseURL: `${BACKEND_ROOT_URL}${API_PATH}`, // e.g., http://localhost:3001/api/v1 or https://your-backend.onrender.com/api/v1
});

// Export the root URL for constructing paths to static assets (like images)
// This ensures static assets are fetched from the correct base, without the /api/v1 path.
export const STATIC_ASSETS_BASE_URL = BACKEND_ROOT_URL;

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = useAuthStore.getState().token;
    console.log('[AxiosInterceptor] Token from store:', token ? 'Present' : 'Absent'); // Log token presence
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
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
    return response;
  },
  (error: AxiosError) => {
    console.error('[AxiosInterceptor] Response error from:', error.config?.url, 'Status:', error.response?.status, 'Data:', error.response?.data);
    if (error.response && error.response.status === 401) {
      // If unauthorized, logout the user
      // Check if it's not a login/register attempt to avoid logout loop
      if (error.config && !error.config.url?.includes('/auth/login') && !error.config.url?.includes('/auth/register')) {
        useAuthStore.getState().logout();
        // Optionally redirect to login page
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 