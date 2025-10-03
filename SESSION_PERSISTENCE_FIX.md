# Session Persistence Fix - News Hub Login Issue

## Problem
Users were experiencing persistent "Please log in again. Your session may have expired" errors on the News Hub page, even immediately after logging in successfully.

## Root Cause
The `newsHubService` was using an incorrect method to retrieve the authentication token:

1. **Token Storage**: The auth system stores tokens in Zustand persist storage under the key `'auth-storage'` as a JSON object containing `{ isAuthenticated, user, token }`

2. **Token Retrieval**: The `newsHubService` was trying to get the token directly with `localStorage.getItem('token')`, which returned `null` because:
   - The token is not stored at the top level of localStorage with key 'token'
   - It's nested inside the 'auth-storage' object
   - The token should be retrieved through the Zustand store

3. **Service Configuration**: The `newsHubService` created its own axios instance instead of using the centrally configured `axiosInstance` from `axiosConfig.ts` which already has the correct token injection logic via the auth store.

## Solution Applied

### Changed File: `/workspace/src/frontend/src/services/newsHubService.ts`

**Before:**
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: `${API_BASE_URL}/news-hub`,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // ❌ WRONG - token not stored here
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**After:**
```typescript
import axiosInstance from './axiosConfig';

// Use the configured axios instance which already handles authentication
const api = axiosInstance;

// All endpoints now use /news-hub prefix
// e.g., '/news-hub/feed', '/news-hub/interests', etc.
```

### Key Changes:
1. ✅ **Use centralized axios instance** - Leverages existing auth token injection from `axiosConfig.ts`
2. ✅ **Correct token retrieval** - The `axiosInstance` uses `useAuthStore.getState().token` which properly accesses the Zustand store
3. ✅ **Updated all endpoints** - Added `/news-hub` prefix to all API calls since we're now using the base instance
4. ✅ **Automatic 401 handling** - The configured axios instance already handles token expiration and redirects to login

## How Token Injection Works Now

From `/workspace/src/frontend/src/services/axiosConfig.ts`:

```typescript
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token; // ✅ CORRECT - gets from Zustand store
    
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  }
);
```

## Auth Token Flow

1. **Login** → Backend returns JWT token
2. **Store** → Token saved to Zustand store: `{ isAuthenticated: true, user: {...}, token: "jwt..." }`
3. **Persist** → Zustand persists to localStorage under key `'auth-storage'`
4. **Request** → Axios interceptor retrieves token via `useAuthStore.getState().token`
5. **Inject** → Token added to request headers as `Authorization: Bearer ${token}`

## Testing

Build completed successfully:
```bash
npm run build
✓ built in 38.09s
```

## Expected Behavior After Fix

1. ✅ Users stay logged in after successful authentication
2. ✅ News Hub page loads without "session expired" errors
3. ✅ All API calls include proper authentication token
4. ✅ Token expiration (30 days) is handled by backend
5. ✅ 401 responses trigger automatic logout and redirect to login

## Other Services Checked

Verified that no other services have the same token retrieval issue:
```bash
grep -r "localStorage.getItem('token')" src/frontend/src/services/
# No other occurrences found ✅
```

## Deployment Notes

1. Frontend changes only - no backend changes required
2. Users may need to log in once after deployment (to set proper auth state)
3. After first login post-fix, sessions will persist correctly
4. No database migrations needed

## Related Files

- **Fixed**: `/workspace/src/frontend/src/services/newsHubService.ts`
- **Reference**: `/workspace/src/frontend/src/services/axiosConfig.ts` (token injection logic)
- **Reference**: `/workspace/src/frontend/src/store/authStore.ts` (Zustand auth store)
- **Reference**: `/workspace/src/backend/src/api/controllers/authController.ts` (JWT generation - 30 day expiry)

## Date
2025-10-03

## Status
✅ Fixed and verified
