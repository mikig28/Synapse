# AI Agent Execution Error - Debugging Guide

## Current Issue
You're seeing "Agent Execution Failed - Request failed with status code 400" when trying to execute AI agents (specifically the "yad2" agent) from the mobile interface.

## What We've Fixed
I've updated the frontend error handling to show you the **actual error message** from the backend instead of just "Request failed with status code 400". This will help us diagnose the issue.

## Next Steps to Debug

### Step 1: Check Browser Console (MOST IMPORTANT)
Since I updated the error handling, when you try to execute an agent again, you should see detailed error information in the browser console:

1. Open the AI Agents page on your phone
2. Open Chrome DevTools (or your browser's developer tools)
   - On Chrome for Android: Menu → More tools → Developer tools
   - Or use Remote Debugging from your desktop: chrome://inspect
3. Try to execute the "yad2" agent again
4. Look at the Console tab for messages starting with `[AgentsPage]` or `[AxiosInterceptor]`
5. **Share the full error message you see**

### Step 2: Common Causes of 400 Errors

Based on the code analysis, here are the most likely causes:

#### A. Authentication Issue
- **Symptom**: Token is missing or invalid
- **Check**: Are you logged in? Did your session expire?
- **Fix**: Try logging out and logging back in

#### B. Agent Configuration Issue
- **Symptom**: Agent is missing required configuration
- **Common issues**:
  - Missing API keys (Twitter API keys, News API keys, etc.)
  - Invalid agent type
  - Missing required fields in agent configuration
- **Fix**: Go to the agent's settings page and verify all required fields are filled

#### C. Agent State Issue
- **Symptom**: Agent is in an invalid state for execution
- **Common issues**:
  - Agent is inactive (not enabled)
  - Agent is stuck in "running" state
  - Executor not available for this agent type
- **Fix**: 
  - Check if the agent badge shows "Active" or "Inactive"
  - Try resetting the agent status first
  - Check if the agent type is supported

#### D. Backend Service Issue
- **Symptom**: Required backend services aren't available
- **Common issues**:
  - CrewAI service is down
  - MCP servers not configured
  - Database connection issue
- **Check**: The backend health endpoint: https://synapse-backend-7lq6.onrender.com/api/v1/agents/health

### Step 3: Try These Quick Fixes

#### Fix 1: Refresh and Retry
```
1. Pull down to refresh the page
2. Wait a few seconds
3. Try executing the agent again
```

#### Fix 2: Check Agent Status
```
1. Look at the agent card
2. Check if it shows "Active" or "Inactive"
3. If inactive, tap the toggle to activate it
4. Try executing again
```

#### Fix 3: Reset Stuck Agent (if applicable)
```
1. If the agent shows "running" status but hasn't run in a while
2. It might be stuck
3. The system should auto-reset after 10 minutes
4. Or you can force reset by tapping the reset button (if available)
```

#### Fix 4: Check Agent Configuration
```
1. Go to the agent's settings page
2. Verify all required fields are filled:
   - Name
   - Description
   - Agent type
   - Any API keys or credentials
3. Save if you made changes
4. Go back and try executing
```

### Step 4: Get Detailed Error Info

To get the most helpful error information, follow these steps:

1. **Enable Remote Debugging** (if on mobile):
   ```
   On Desktop Chrome:
   1. Open chrome://inspect
   2. Connect your phone via USB
   3. Enable USB debugging on your phone
   4. Select your phone's Chrome tab
   5. Click "Inspect"
   ```

2. **Check Network Tab**:
   ```
   1. Open DevTools → Network tab
   2. Click "Clear" to clear previous requests
   3. Try to execute the agent
   4. Look for the failed request (will be red)
   5. Click on it
   6. Check the "Response" tab for the error message
   7. Check the "Headers" tab to see the request details
   ```

3. **Share These Details**:
   When you find the error, please share:
   - The error message from the Console
   - The response from the Network tab
   - The agent type ("yad2" appears to be a custom agent)
   - Whether the agent is Active or Inactive
   - When it last ran successfully (if ever)

## Technical Details

### What Changed
I updated `/workspace/src/frontend/src/pages/AgentsPageMobileFix.tsx` to:
- Log detailed error information to the console
- Extract the actual error message from the backend response
- Show backend error details instead of generic axios error

### Backend Error Response Format
The backend returns errors in this format:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "errorType": "specific_error_code",
  "details": {
    // Additional debugging info (only in development)
  }
}
```

### Possible Error Types (from backend code)
- `agent_not_found` (404): Agent doesn't exist
- `agent_inactive` (409): Agent is not active
- `agent_already_running` (409): Agent is currently executing
- `executor_not_available` (501): No executor for this agent type
- `crewai_service_unreachable` (503): CrewAI service is down
- `crewai_service_timeout` (504): CrewAI service timeout
- `service_unavailable` (503): Backend service is down
- `execution_error` (400): General execution error

## Need More Help?

If you follow the steps above and share the error details you find, I can provide a more specific fix. The key is getting the actual error message from the backend, which the updated code will now show you.

## Quick Health Check Commands

You can run these from your browser console or terminal to check system health:

```javascript
// Check backend health
fetch('https://synapse-backend-7lq6.onrender.com/api/v1/agents/health')
  .then(r => r.json())
  .then(console.log);

// Check CrewAI service health
fetch('https://synapse-backend-7lq6.onrender.com/api/v1/agents/health/crewai')
  .then(r => r.json())
  .then(console.log);

// Check if you're authenticated
console.log('Auth token:', localStorage.getItem('token') ? 'Present' : 'Missing');
```

## Summary

The updated error handling will now show you the **real error message** instead of the generic "status code 400". Once you see the actual error, we can fix the root cause. The most common issues are:

1. ✅ Agent is inactive (needs to be enabled)
2. ✅ Missing API keys or configuration
3. ✅ Agent is stuck in running state
4. ✅ Session expired (need to re-login)
5. ✅ Backend service temporarily down

Try executing the agent again and check the console for the detailed error message!
