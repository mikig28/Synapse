import axios, { AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import useAuthStore from '../store/authStore'; // Adjust path if your store is elsewhere

// Use import.meta.env for Vite environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfig): AxiosRequestConfig => {
    const token = useAuthStore.getState().token;
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Optional: Response interceptor for global error handling (e.g., 401 for logout)
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
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