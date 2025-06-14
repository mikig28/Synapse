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
  checkAuthState: () => boolean; // New method to validate auth state
  // You can add more actions like setLoading, setError, etc.
  _resetAuthIfInconsistent: () => void; // Internal action
}

// Debug helper for auth state
const logAuthState = (state: Pick<AuthState, 'isAuthenticated' | 'user' | 'token'>, context: string) => {
  console.log(`[AuthStore] ${context} - Auth State:`, {
    isAuthenticated: state.isAuthenticated,
    hasUser: !!state.user,
    hasToken: !!state.token,
    tokenLength: state.token ? state.token.length : 0
  });
};

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
        const newState = {
          isAuthenticated: true, // Assuming API guarantees token if login is "successful"
          user: userData.user,
          token: userData.token,
        };
        set(newState);
        logAuthState(newState, 'After login');
      },
      register: (userData) => {
        console.log('[AuthStore] Register action called. Payload:', userData);
        if (!userData.token) {
          console.warn('[AuthStore] Register attempt: userData.token is falsy. UserData:', userData);
        }
        const newState = {
          isAuthenticated: true, // Assuming API guarantees token
          user: userData.user,
          token: userData.token,
        };
        set(newState);
        logAuthState(newState, 'After register');
      },
      logout: () => {
        console.log('[AuthStore] Logout action called.');
        const newState = {
          isAuthenticated: false,
          user: null,
          token: null,
        };
        set(newState);
        logAuthState(newState, 'After logout');
      },
      checkAuthState: () => {
        const state = get();
        const isValid = state.isAuthenticated && !!state.token && !!state.user;
        logAuthState(state, `Auth check (valid: ${isValid})`);
        
        // If inconsistent, fix it
        if (state.isAuthenticated && (!state.token || !state.user)) {
          console.warn('[AuthStore] Inconsistent auth state detected during check. Resetting.');
          get()._resetAuthIfInconsistent();
          return false;
        }
        
        return isValid;
      },
      _resetAuthIfInconsistent: () => {
        const state = get();
        console.warn('[AuthStore] Checking auth state consistency...');
        logAuthState(state, 'Before consistency check');
        
        if (state.isAuthenticated && (!state.token || !state.user)) {
          console.warn('[AuthStore] State was inconsistent (authenticated but missing token or user). Resetting auth state.');
          const newState = {
            isAuthenticated: false,
            user: null,
            token: null,
          };
          set(newState);
          logAuthState(newState, 'After reset');
        }
      }
    }),
    {
      name: 'auth-storage', // Name of the item in storage (must be unique)
      storage: createJSONStorage(() => localStorage), // Or sessionStorage
      onRehydrateStorage: () => {
        console.log('[AuthStore] Starting rehydration process...');
        // This function is called AFTER zustand merges persistedState with initialState
        // and updates the store. 'hydratedStoreState' is the state *in the store* at that moment.
        return (hydratedStoreState, error) => {
          if (error) {
            console.error('[AuthStore] An error occurred during hydration:', error);
          } else {
            if (hydratedStoreState) { // Ensure hydratedStoreState is not undefined
              console.log('[AuthStore] Hydration merging complete.');
              logAuthState(hydratedStoreState, 'After hydration');
              
              if (hydratedStoreState.isAuthenticated && (!hydratedStoreState.token || !hydratedStoreState.user)) {
                // If authenticated but no token or user, reset the auth state
                console.warn('[AuthStore] State was inconsistent after hydration (authenticated but missing token or user).');
                
                // Reset auth state directly
                useAuthStore.setState({
                  isAuthenticated: false,
                  user: null,
                  token: null,
                });
                console.warn('[AuthStore] Auth state has been reset directly after hydration.');
                
                // Log the new state
                const resetState = useAuthStore.getState();
                logAuthState(resetState, 'After hydration reset');
              }
            } else {
              console.warn('[AuthStore] Hydration complete, but hydratedStoreState was undefined.');
            }
          }
          
          // Validate the state after hydration is complete
          setTimeout(() => {
            const currentState = useAuthStore.getState();
            currentState.checkAuthState();
          }, 0);
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

// Immediately check auth state consistency on module load
setTimeout(() => {
  console.log('[AuthStore] Initial auth state check on module load');
  const currentState = useAuthStore.getState();
  currentState.checkAuthState();
}, 0);

export default useAuthStore; 