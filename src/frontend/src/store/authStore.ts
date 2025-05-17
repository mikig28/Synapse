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
  _resetAuthIfInconsistent: () => void; // Internal action
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: (userData) => {
        console.log('[AuthStore] Login action called. Payload:', userData); // Log payload to login
        if (!userData.token) {
          console.warn('[AuthStore] Login attempt: userData.token is falsy. UserData:', userData);
        }
        set({
          isAuthenticated: true, // Assuming API guarantees token if login is "successful"
          user: userData.user,
          token: userData.token,
        });
      },
      register: (userData) => {
        console.log('[AuthStore] Register action called. Payload:', userData);
        if (!userData.token) {
          console.warn('[AuthStore] Register attempt: userData.token is falsy. UserData:', userData);
        }
        set({
        isAuthenticated: true, // Assuming API guarantees token
        user: userData.user,
        token: userData.token,
      })},
      logout: () => {
        console.log('[AuthStore] Logout action called.');
        set({
        isAuthenticated: false,
        user: null,
        token: null,
      })},
      _resetAuthIfInconsistent: () => {
        console.warn('[AuthStore] State was inconsistent after hydration (authenticated but no token). Resetting auth state.');
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        });
      }
    }),
    {
      name: 'auth-storage', // Name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // Or sessionStorage
      onRehydrateStorage: (persistedState) => {
        console.log('[AuthStore] Hydration started. Data from localStorage (partialized):', persistedState);
        // This function is called AFTER zustand merges persistedState with initialState
        // and updates the store. 'hydratedStoreState' is the state *in the store* at that moment.
        return (hydratedStoreState, error) => {
          if (error) {
            console.error('[AuthStore] An error occurred during hydration:', error);
            // You might want to reset auth state on critical hydration error as well
            // useAuthStore.getState()._resetAuthIfInconsistent();
          } else {
            console.log('[AuthStore] Hydration merging complete. Current store state:', hydratedStoreState);
            // Get the absolute latest state directly from the store instance for safety.
            const currentStoreState = useAuthStore.getState();
            if (currentStoreState.isAuthenticated && !currentStoreState.token) {
              // If authenticated but no token, call the internal action to correct.
              currentStoreState._resetAuthIfInconsistent();
            }
          }
        };
      },
      partialize: (state) => ({ // Only persist these parts of the state
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);

export default useAuthStore; 