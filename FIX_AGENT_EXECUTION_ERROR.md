# Quick Fix for Agent Execution Error

## What I Fixed

I've improved the error handling in your AI Agents page to:

1. **Show the actual error message** from the backend instead of generic "status code 400"
2. **Log detailed error information** to the browser console for debugging
3. **Provide user-friendly error messages** based on common error types
4. **Add comprehensive debugging output** to help identify the root cause

## How to Deploy the Fix

### Option 1: Auto-Deploy (if you have CI/CD set up)

If your repository auto-deploys to Render.com on push:

```bash
cd /workspace
git add src/frontend/src/pages/AgentsPageMobileFix.tsx
git commit -m "fix: improve agent execution error handling and logging"
git push origin main
```

Then wait for Render.com to rebuild and deploy (~5-10 minutes).

### Option 2: Manual Build and Deploy

If you need to manually build and deploy:

```bash
# 1. Install dependencies (if not already installed)
cd /workspace/src/frontend
npm install

# 2. Build the frontend
npm run build

# 3. Deploy to your hosting service
# (Follow your usual deployment process)
```

### Option 3: Check Without Deploying (Recommended First Step)

Before deploying, let's check what the actual error is using Chrome DevTools:

## Immediate Debugging Steps (No Deploy Needed)

### Step 1: Open Remote DevTools on Your Phone

**On Desktop Chrome:**
1. Connect your phone to your computer via USB
2. Enable "USB Debugging" on your Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
3. Open Chrome on desktop
4. Navigate to: `chrome://inspect`
5. Your phone should appear - click "Inspect" next to the Synapse tab

**Alternative (if USB debugging doesn't work):**
1. Use Eruda mobile console:
   - On your phone, open the browser console by adding this to your browser's address bar:
   ```javascript
   javascript:(function(){var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/eruda';document.body.appendChild(script);script.onload=function(){eruda.init();}})();
   ```
   - Or visit: https://synapse-frontend.onrender.com and manually inject Eruda

### Step 2: Execute the Agent and Check Console

1. With DevTools open, go to the Console tab
2. Clear the console (click the 🚫 icon)
3. Try to execute the "yad2" agent
4. Look for error messages starting with `[AgentsPage]` or `[AxiosInterceptor]`

### Step 3: Check the Network Tab

1. Go to the Network tab in DevTools
2. Clear the network log
3. Try to execute the agent
4. Look for the failed request (it will be red)
5. Click on it and check:
   - **Headers tab**: Request URL, Request Headers (especially Authorization)
   - **Payload tab**: What data was sent
   - **Response tab**: The error message from the backend

## Common Errors and Solutions

Based on the backend code, here are the most likely issues:

### Error 1: Agent is Inactive (Most Likely)
**Error Message**: "Please activate the agent before executing it."
**Solution**: 
1. On the agent card, check if the badge says "Inactive"
2. Toggle the agent to "Active"
3. Try executing again

### Error 2: Agent Already Running
**Error Message**: "This agent is already running."
**Solution**:
1. Wait for the current execution to finish
2. OR reset the agent status if it's stuck
3. Try executing again

### Error 3: Missing API Keys or Configuration
**Error Message**: Various messages about missing configuration
**Solution**:
1. Go to the agent settings page
2. Fill in all required fields (API keys, credentials, etc.)
3. Save and try executing again

### Error 4: Executor Not Available
**Error Message**: "The executor for this agent type is not available."
**Solution**:
1. Check if the backend service is running
2. Check if the CrewAI service is healthy: https://synapse-backend-7lq6.onrender.com/api/v1/agents/health/crewai
3. Contact your backend administrator

### Error 5: Authentication Expired
**Error Message**: "Your session has expired. Please log in again."
**Solution**:
1. Log out
2. Log back in
3. Try executing again

## What to Share If You Still Have Issues

If the error persists after trying the above solutions, please share:

1. **The console error logs** (screenshot or copy-paste)
2. **The network request details**:
   - Request URL
   - Request payload
   - Response body
   - Status code
3. **Agent details**:
   - Agent name: yad2
   - Agent type: ?
   - Is it Active or Inactive?
   - When was it last run successfully?

## Testing the Health of Your System

Run these checks to ensure everything is working:

### Check 1: Backend Health
```bash
curl https://synapse-backend-7lq6.onrender.com/api/v1/agents/health
```
Expected: `{"success":true,"status":"healthy",...}`

### Check 2: CrewAI Service Health
```bash
curl https://synapse-backend-7lq6.onrender.com/api/v1/agents/health/crewai
```
Expected: Should return service health status

### Check 3: Authentication
In your browser console:
```javascript
console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
```
Expected: "Token: Present"

### Check 4: Agent List
In your browser console:
```javascript
fetch('https://synapse-backend-7lq6.onrender.com/api/v1/agents', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('Your agents:', data);
  const yad2 = data.data.find(a => a.name === 'yad2');
  console.log('yad2 agent:', yad2);
});
```

## Summary

The improved error handling is now in the code. To see the fix:

1. **WITHOUT DEPLOYING**: Use Chrome DevTools (chrome://inspect) to check the actual error
2. **AFTER DEPLOYING**: The error messages will be much more helpful

The most likely issue based on the error pattern is that the "yad2" agent is **inactive** or has **missing configuration**. Check the agent's status badge and settings page first before deploying the fix.

Once you deploy the fix or check the console, you'll see the exact error message that tells you what's wrong!
