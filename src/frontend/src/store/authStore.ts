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
      onRehydrateStorage: () => {
        // This function is called AFTER zustand merges persistedState with initialState
        // and updates the store. 'hydratedStoreState' is the state *in the store* at that moment.
        return (hydratedStoreState, error) => {
          if (error) {
            console.error('[AuthStore] An error occurred during hydration:', error);
            // Consider calling _resetAuthIfInconsistent on error if appropriate for your app
            // For example, by getting the set function: const { _resetAuthIfInconsistent } = useAuthStore.getState(); _resetAuthIfInconsistent();
            // However, be cautious with calling getState() here too early.
            // A safer approach might be to set a flag that the main app can check after hydration.
          } else {
            if (hydratedStoreState) { // Ensure hydratedStoreState is not undefined
              console.log('[AuthStore] Hydration merging complete. Current store state:', hydratedStoreState);
              if (hydratedStoreState.isAuthenticated && !hydratedStoreState.token) {
                // If authenticated but no token, call the internal action to correct.
                // To call an action, we need the `set` function or the store instance itself.
                // Directly calling hydratedStoreState._resetAuthIfInconsistent() won't work as it's just state data.
                // We need to trigger the action on the actual store.
                // The best way to do this post-hydration is often outside this specific callback,
                // perhaps in a useEffect in your main App component that runs once after hydration.
                // For an immediate fix within what `onRehydrateStorage` allows, we might need to call `set` directly if possible,
                // or rely on the `get()` method provided to the main store creation function.

                // Let's try to use the store's `set` method via `useAuthStore.setState`
                // This is still potentially problematic if called too early, but let's try a direct set.
                useAuthStore.setState({
                  isAuthenticated: false,
                  user: null,
                  token: null,
                });
                console.warn('[AuthStore] State was inconsistent after hydration (authenticated but no token). Auth state has been reset directly.');
              }
            } else {
              console.warn('[AuthStore] Hydration complete, but hydratedStoreState was undefined.');
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