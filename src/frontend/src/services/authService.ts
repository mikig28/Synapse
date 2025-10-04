import useAuthStore from "@/store/authStore";
import { BACKEND_ROOT_URL } from "./axiosConfig";

// Centralised API base
const API_BASE_URL = `${BACKEND_ROOT_URL}/api/v1`;
const API_AUTH_URL = `${API_BASE_URL}/auth`;

// Helper to get the token from the store if needed for authenticated requests later
// const getToken = () => useAuthStore.getState().token;

interface ApiError {
  message: string;
  // You might have other fields in your backend error responses
}

interface UserData {
  _id: string;
  fullName?: string;
  email: string;
  // other user fields returned by backend
}

interface AuthResponse {
  token?: string;
  // Include other user fields directly if your backend sends them flat
  // For now, let's assume it sends user details nested or we reconstruct it
  _id?: string;
  fullName?: string;
  email?: string;
  // Email verification fields
  success?: boolean;
  message?: string;
  requiresVerification?: boolean;
}

export const registerService = async (userData: any): Promise<AuthResponse> => {
  console.log('[authService] Registering user:', userData.email);

  const response = await fetch(`${API_AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  console.log('[authService] Registration response:', data);

  if (!response.ok) {
    // If server returns error, data might contain { message: string }
    throw new Error(data.message || 'Failed to register');
  }
  return data as AuthResponse;
};

export const loginService = async (credentials: any): Promise<AuthResponse> => {
  const response = await fetch(`${API_AUTH_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    // Create error with response data for better error handling
    const error: any = new Error(data.message || 'Failed to login');
    error.response = {
      status: response.status,
      data: data
    };
    throw error;
  }
  return data as AuthResponse;
};

// Google OAuth login service - exchanges Google token for app JWT
export const googleLoginService = async (googleUserInfo: {
  email: string;
  name: string;
  sub: string;
  picture?: string;
}, googleAccessToken: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_AUTH_URL}/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      googleUserInfo,
      googleAccessToken
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to authenticate with Google');
  }
  return data as AuthResponse;
};

// You can add other auth services here like logout, fetchUserProfile etc. 