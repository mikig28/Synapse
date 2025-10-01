# How to Fix Your AI Agent Execution Error

## TL;DR (Quick Fix)

**Most likely problem**: Your "yad2" agent is **inactive**.

**Quick solution**:
1. Look at the agent card on your phone
2. Check if the badge says "Inactive" (not "Active")
3. If it's inactive, tap the agent to open settings or find a toggle button
4. Switch it to "Active"
5. Try executing again

---

## What I Did to Help

I improved the error messages so instead of seeing:
> ❌ "Request failed with status code 400"

You'll now see helpful messages like:
> ✅ "Please activate the agent before executing it."
> ✅ "This agent is already running. Please wait for it to finish."
> ✅ "Your session has expired. Please log in again."

## Before Deploying: Debug First (Recommended)

You can find out what's wrong RIGHT NOW without deploying anything!

### Use Your Phone's Browser Console

#### Method 1: Chrome Remote Debugging (Best)
1. **On your phone**:
   - Connect to computer via USB
   - Enable USB debugging:
     - Settings → About Phone → Tap "Build Number" 7 times
     - Settings → Developer Options → Enable "USB Debugging"

2. **On your computer**:
   - Open Chrome
   - Go to: `chrome://inspect`
   - You should see your phone - click "Inspect" next to the Synapse tab
   - This opens DevTools for your phone's browser

3. **Try executing the agent**:
   - Go to the Console tab in DevTools
   - Try to execute the "yad2" agent on your phone
   - Look for messages starting with `[AgentsPage]`
   - The error will tell you exactly what's wrong!

#### Method 2: Mobile Console (If USB doesn't work)
1. On your phone's browser, paste this in the address bar:
   ```
   javascript:void((function(){var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/eruda';document.body.appendChild(script);script.onload=function(){eruda.init()};})())
   ```
2. This adds a mobile console to your page
3. Try executing the agent
4. Check the Console tab for error messages

---

## Common Problems and Solutions

### Problem 1: Agent is Inactive ⭐ (Most Common)
**You'll see**: Badge says "Inactive" instead of "Active"

**Solution**:
```
1. Find the agent card for "yad2"
2. Look for a toggle button or switch
3. Turn it ON to make it "Active"
4. Try executing again
```

### Problem 2: Agent is Already Running
**You'll see**: Agent shows "running" status but isn't doing anything

**Solution**:
```
1. Wait 10 minutes for auto-reset
OR
2. Look for a "Reset Status" button
3. Click it
4. Try executing again
```

### Problem 3: Missing Configuration
**You'll see**: Error about missing API keys or settings

**Solution**:
```
1. Go to Agent Settings (gear icon or settings button)
2. Fill in all required fields:
   - API keys
   - Credentials
   - Configuration options
3. Save changes
4. Try executing again
```

### Problem 4: Session Expired
**You'll see**: "Your session has expired" or 401 error

**Solution**:
```
1. Log out
2. Log back in
3. Try executing again
```

### Problem 5: Service is Down
**You'll see**: "AI service is temporarily unavailable"

**Solution**:
```
1. Check backend health: 
   https://synapse-backend-7lq6.onrender.com/api/v1/agents/health
2. Wait a few minutes
3. Try again
```

---

## Quick Health Checks

### Check 1: Is the backend running?
Open this in your browser:
```
https://synapse-backend-7lq6.onrender.com/api/v1/agents/health
```
You should see: `{"success":true,"status":"healthy"}`

### Check 2: Are you logged in?
Open browser console and run:
```javascript
console.log(localStorage.getItem('token') ? 'Logged in ✅' : 'Not logged in ❌');
```

### Check 3: Is your agent active?
Open browser console and run:
```javascript
fetch('https://synapse-backend-7lq6.onrender.com/api/v1/agents', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
})
.then(r => r.json())
.then(d => {
  const yad2 = d.data?.find(a => a.name === 'yad2');
  console.log('Agent:', yad2?.name);
  console.log('Active:', yad2?.isActive ? '✅ Yes' : '❌ No');
  console.log('Status:', yad2?.status);
});
```

---

## After You Deploy My Fix

Once you deploy the updated code:

1. **Open the AI Agents page on your phone**
2. **Try to execute the "yad2" agent**
3. **You'll see a helpful error message** that tells you exactly what's wrong
4. **Follow the suggestion in the error message**

For example:
- If it says "Please activate the agent", toggle it to Active
- If it says "Already running", wait or reset it
- If it says "Session expired", log in again

---

## Need More Help?

If you're still stuck:

1. **Open Chrome DevTools** (using `chrome://inspect`)
2. **Try to execute the agent**
3. **Take screenshots** of:
   - The error message in the toast/notification
   - The Console tab output
   - The Network tab (find the failed request, click it, show Response)
4. **Share these with me**:
   - The console logs
   - The exact error message
   - Whether the agent shows "Active" or "Inactive"
   - The agent type (what kind of agent is "yad2"?)

---

## Summary

**What's Wrong**: Generic error message doesn't tell you the real problem

**What I Fixed**: Now shows specific, helpful error messages

**Next Step**: 
- ✅ **Best**: Use Chrome DevTools to see the error right now (no deploy needed)
- ⚡ **Quick**: Check if agent is inactive and toggle it to active
- 🚀 **Deploy**: Build and deploy the fix to see better errors on mobile

**Most Likely Fix**: Your agent is inactive - just toggle it to "Active" and try again!

---

## How to Deploy the Fix (If Needed)

If you want to deploy the improved error handling:

```bash
# 1. Navigate to frontend folder
cd /workspace/src/frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Build the frontend
npm run build

# 4. Deploy
# If you have auto-deploy on git push:
cd /workspace
git add .
git commit -m "fix: improve agent execution error messages"
git push origin main

# Then wait for Render.com to rebuild (~5-10 minutes)
```

After deployment, the error messages will be much more helpful and guide you to the solution!
