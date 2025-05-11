import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName?: string;
  // Add other user properties as needed
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (userData: { user: User; token: string }) => void; // Simulate successful login
  register: (userData: { user: User; token: string }) => void; // Simulate successful registration
  logout: () => void;
  // You can add more actions like setLoading, setError, etc.
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: (userData) => set({
        isAuthenticated: true,
        user: userData.user,
        token: userData.token,
      }),
      register: (userData) => set({
        isAuthenticated: true,
        user: userData.user,
        token: userData.token,
      }),
      logout: () => set({
        isAuthenticated: false,
        user: null,
        token: null,
      }),
    }),
    {
      name: 'auth-storage', // Name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // Or sessionStorage
    }
  )
);

export default useAuthStore; 