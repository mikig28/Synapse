# Fix: Persistent Login Prompt on News Hub Page

## 🐛 Problem
Users were experiencing persistent "Please log in again. Your session may have expired" errors on the News Hub page, even immediately after successfully logging in.

## 🔍 Root Cause
The `newsHubService` was incorrectly attempting to retrieve the authentication token using `localStorage.getItem('token')`, which returned `null` because:
- Auth tokens are stored in Zustand persist storage under the key `'auth-storage'` as a JSON object
- The service created its own axios instance instead of using the centralized configuration
- Token retrieval bypassed the proper Zustand store getter

## ✅ Solution
- Replaced custom axios instance with the centralized `axiosInstance` from `axiosConfig.ts`
- This leverages existing token injection logic: `useAuthStore.getState().token`
- Updated all API endpoints to include `/news-hub` prefix
- Automatic 401 handling and token expiration now work correctly

## 📝 Changes
**Files Modified:** 1 file
- `src/frontend/src/services/newsHubService.ts`

**Documentation Added:**
- `SESSION_PERSISTENCE_FIX.md` - Technical details
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `QUICK_SUMMARY.md` - Quick reference

## 🎯 Benefits
- ✅ Users stay logged in for 30 days (token expiry period)
- ✅ News Hub page loads without session expired errors
- ✅ Consistent authentication handling across all services
- ✅ Proper automatic logout on token expiration
- ✅ No more repeated login prompts

## 🧪 Testing
- [x] Frontend build successful (`npm run build`)
- [x] No TypeScript errors
- [x] No other services have similar token retrieval issues
- [x] Auth flow verified: Login → Store → Persist → Request → Inject

## 📊 Impact
- **Risk Level:** Low (frontend-only change, improves existing functionality)
- **Breaking Changes:** None
- **User Impact:** Positive (fixes annoying UX issue)
- **Backend Changes:** None (no backend modifications required)

## 🚀 Deployment Notes
1. Frontend-only change - Render will rebuild frontend automatically
2. Users may need to log in once after deployment (to set proper auth state)
3. After first login post-fix, sessions will persist correctly for 30 days
4. No database migrations needed

## ✨ Expected Behavior After Fix
1. User logs in successfully
2. Session persists for 30 days
3. News Hub page loads immediately without login prompt
4. All API requests include proper authentication token
5. User stays logged in across browser sessions

## 📸 Before & After

**Before:**
- Login → Navigate to News Hub → "Please log in again" error → Repeat

**After:**
- Login → Navigate to News Hub → Page loads successfully → Session persists

## 🔗 Related Issues
Fixes persistent login prompt issue reported by user

## 👀 Reviewers
@mikig28 

## 📚 Additional Context
- JWT tokens expire in 30 days (configured in backend)
- Render.com configuration verified and correct
- All environment variables properly set (JWT_SECRET, MONGODB_URI, etc.)
- Token flow: Login → Zustand Store → localStorage persist → Axios interceptor → API headers
