# Diagnose Login Email Issue

## Quick Checks

### 1. Check Browser Console
When you try to login with an unverified account:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in
4. Look for these logs:

```
[LoginPage] Resending verification email to: your-email@example.com
[AxiosInterceptor] Response error from: /api/v1/auth/resend-verification Status: ???
```

**What to look for:**
- Status 429 = Rate limited (wait 15 minutes)
- Status 500 = SMTP not configured
- Status 400 = User already verified or email missing
- No request at all = Frontend not calling the endpoint

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Try logging in
3. Look for `resend-verification` request

**Check:**
- Is the request being made?
- What's the response status?
- What's the response body?
- What's the request URL? (Should be: `https://synapse-backend-7lq6.onrender.com/api/v1/auth/resend-verification`)

### 3. Check Render Backend Logs
1. Go to: https://dashboard.render.com
2. Find your backend service: `synapse-backend-7lq6`
3. Click "Logs"
4. Try logging in
5. Search logs for:
   - `[resendVerificationEmail]`
   - `SMTP`
   - `verification email`

**What to look for:**
- `✅ Verification email sent successfully` = Email was sent
- `❌ FAILED to send verification email` = SMTP issue
- `Too many verification email requests` = Rate limited
- No logs at all = Request not reaching backend

## Common Issues & Solutions

### Issue 1: Rate Limiting (429 Error)
**Symptoms:** "Too many verification email requests"
**Solution:** Wait 15 minutes, then try again

**Temporary fix:**
```bash
# Remove rate limiter temporarily for testing
# Edit src/backend/src/api/routes/authRoutes.ts
# Change line 42 from:
router.post('/resend-verification', resendLimiter, resendVerificationEmail);
# To:
router.post('/resend-verification', resendVerificationEmail);
```

### Issue 2: SMTP Not Configured (500 Error)
**Symptoms:** "Email service is currently unavailable"
**Solution:** Check these env vars on Render backend:
- SMTP_HOST
- SMTP_PORT  
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM_EMAIL
- FRONTEND_URL

### Issue 3: Auto-resend Fails Silently
**Symptoms:** No error shown, no email received
**Possible causes:**
- Rate limiting (check logs)
- CORS blocking request (check Network tab)
- Email going to spam folder
- Gmail blocking the email

**Solution:** Add manual resend button:
```typescript
// In LoginPage.tsx, add visible button for manual resend
{needsVerification && (
  <button onClick={() => handleResendVerification()}>
    Resend Verification Email
  </button>
)}
```

### Issue 4: Frontend Not Calling Endpoint
**Symptoms:** No request in Network tab
**Possible cause:** Logic error in login flow
**Check:** Does `needsVerification` state get set to true?

## Test Commands

### Test 1: Manual resend via curl (bypass rate limit)
```bash
curl -X POST https://synapse-backend-7lq6.onrender.com/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

### Test 2: Check SMTP config
```bash
curl https://synapse-backend-7lq6.onrender.com/api/v1/auth/health
```

### Test 3: Check frontend config (run in browser console)
```javascript
console.log('VITE_BACKEND_ROOT_URL:', import.meta.env.VITE_BACKEND_ROOT_URL);
console.log('BACKEND_ROOT_URL:', window.location.origin);
```

## Next Steps

1. **Open browser console and try logging in** - Check for errors
2. **Check Network tab** - See if request is being made
3. **Check Render logs** - See what backend is doing
4. **Report findings** - Share error messages/status codes

## Quick Fix: Add Manual Resend Button

If automatic resend isn't working, add a manual button for users:

```typescript
// In src/frontend/src/pages/LoginPage.tsx
// After line 54, in the needsVerification block:

{needsVerification && (
  <div className="verification-notice">
    <p>Please verify your email before logging in.</p>
    {resending ? (
      <p>Sending verification email...</p>
    ) : resendSuccess ? (
      <p className="success">✅ Verification email sent! Check your inbox.</p>
    ) : (
      <button 
        onClick={handleResendVerification}
        className="btn-resend"
      >
        Resend Verification Email
      </button>
    )}
  </div>
)}
```
