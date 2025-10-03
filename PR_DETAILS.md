# Pull Request: Fix News Hub 404 Error Handling

## Branch Information
- **Branch**: `fix/news-hub-404-handling`
- **Base**: `main`
- **Repository**: mikig28/Synapse

## Create PR Link
https://github.com/mikig28/Synapse/pull/new/fix/news-hub-404-handling

---

## PR Title
fix: Handle 404 errors gracefully in News Hub

---

## PR Description

### Problem
The News Hub page was displaying an error banner with "Request failed with status code 404" when users first visit the page. This occurred because:
- New users don't have user interests configured yet in the database
- The page was treating 404 responses as critical errors instead of expected states
- Error toasts were being shown for all API failures, including expected 404s

### Solution
Enhanced error handling in the News Hub page to distinguish between "data doesn't exist yet" (404) and actual errors (500, network failures, etc.).

### Changes Made
- **Enhanced `fetchUserInterests()`**: Now detects 404 errors and shows the onboarding screen instead of an error toast
- **Enhanced `fetchData()`**: Ignores 404 errors since having no articles yet is an expected state
- **Improved error messages**: Only display error toasts for actual errors (non-404 responses)
- **Better UX**: First-time visitors see a welcoming onboarding screen without confusing error messages

### Code Changes
**File**: `src/frontend/src/pages/NewsHubPage.tsx`

#### 1. fetchUserInterests() - Enhanced Error Handling
```typescript
catch (error: any) {
  console.error('Failed to fetch user interests:', error);
  
  // If 404, it means user interests don't exist yet - show onboarding
  if (error?.response?.status === 404 || error?.message?.includes('404')) {
    setShowOnboarding(true);
  } else {
    // For other errors, show a toast notification
    toast({
      title: 'Error',
      description: 'Failed to load News Hub. Please check your connection and try again.',
      variant: 'destructive'
    });
  }
  
  setInterestsLoaded(true);
}
```

#### 2. fetchData() - Graceful 404 Handling
```typescript
catch (error: any) {
  console.error('Failed to fetch news feed:', error);
  
  // Don't show error toast if it's just a 404 (no articles yet)
  if (error?.response?.status !== 404) {
    toast({
      title: 'Error',
      description: 'Failed to fetch news feed. Please try again.',
      variant: 'destructive'
    });
  }
}
```

### Testing
✅ Frontend builds successfully  
✅ Error handling logic verified  
✅ Onboarding screen displays correctly for new users  
✅ No TypeScript compilation errors  

### Impact
- ✨ Eliminates confusing error messages for new users
- 🎯 Provides a smooth onboarding experience
- 🛡️ Maintains error notifications for actual issues
- 📱 Improves mobile user experience

### Before & After
**Before**: Error banner appears above onboarding screen, confusing new users  
**After**: Onboarding screen appears cleanly without error messages for 404 cases

---

## Commit
```
19671091 Refactor error handling for news feed and user interests
```

---

## How to Review
1. Check the error handling logic in `fetchUserInterests()` and `fetchData()`
2. Verify that 404 errors are properly detected using `error?.response?.status === 404`
3. Confirm that onboarding screen is shown for new users without error toasts
4. Test the frontend build completes successfully

---

## Related Issues
Fixes the issue where "Request failed with status code 404" error banner appears on News Hub initial page load for new users.
