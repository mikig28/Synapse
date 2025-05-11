import axios from 'axios';
import useAuthStore from '../store/authStore'; // Adjust path if your store is elsewhere

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001' // Your backend dev server
  : '/api/v1'; // Your production API prefix, assuming frontend is served by backend or proxied

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Response interceptor for global error handling (e.g., 401 for logout)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, logout the user
      // Check if it's not a login/register attempt to avoid logout loop
      if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
        useAuthStore.getState().logout();
        // Optionally redirect to login page
        // window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 