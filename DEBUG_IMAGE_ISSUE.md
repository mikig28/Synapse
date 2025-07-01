# Debug Guide: Missing Images in CrewAI Reports

## Current Status ✅
- **Backend Fix Applied**: `skipExisting: false` ✅
- **Fallback System Working**: Placeholder images generate correctly ✅  
- **API Keys Configured**: Available in Render environment ✅
- **Frontend Display Ready**: Code correctly checks for `item.generatedImage?.url` ✅

## Issue: Images Still Not Appearing

Despite the fixes, you're still not seeing images. Here's how to debug this step by step:

### Step 1: Check Agent Run Logs 🔍

When you run a CrewAI agent, check the **agent run logs** for these specific messages:

**✅ What you SHOULD see:**
```
🖼️ Enhanced news item with unsplash image
Enhanced article with image (imageSource: unsplash, imageUrl: https://...)
```

**❌ If you see this instead:**
```
⚠️ Image enhancement returned null for item: [title]
Image enhancement failed (error: ..., suggestion: Check if REPLICATE_API_TOKEN or UNSPLASH_ACCESS_KEY are configured)
```

### Step 2: Database Check 🗄️

Run this in your production database to check if images are actually being saved:

```bash
# If you have database access, run:
db.newsitems.find({}, {title: 1, generatedImage: 1}).limit(5)

# Or use the backend enhancement script:
cd src/backend
node enhance-existing-news.js
```

### Step 3: API Key Verification 🔑

Verify your API keys are actually accessible to the backend service:

**In Render Dashboard:**
1. Go to your backend service
2. Check Environment Variables
3. Verify `UNSPLASH_ACCESS_KEY` and/or `REPLICATE_API_TOKEN` are set

**Test API keys work:**
- Try a simple Unsplash API call: `https://api.unsplash.com/photos/random?client_id=YOUR_KEY`
- Should return photo data, not an error

### Step 4: Check Frontend Data 📱

Open browser dev tools on the news page and check what data is actually being received:

```javascript
// In browser console:
console.log("News items:", newsItems)
console.log("First item image data:", newsItems[0]?.generatedImage)
```

**If `generatedImage` is `undefined`** → Backend issue (images not being generated/saved)
**If `generatedImage` has data** → Frontend display issue

## Most Likely Causes & Solutions

### Cause 1: Build Not Deployed 🚀
**Problem**: The TypeScript changes weren't built/deployed to production
**Solution**: 
```bash
cd src/backend
npm run build
# Deploy to Render or restart the service
```

### Cause 2: Cache Issue 💾
**Problem**: Existing news items have no images, new ones aren't being generated
**Solution**: Run the enhancement script on existing items:
```bash
node enhance-existing-news.js
```

### Cause 3: API Key Environment Issue 🔧
**Problem**: API keys not accessible in production environment
**Check**: 
- Restart your backend service in Render after adding keys
- Check if keys were added to the correct service (backend vs CrewAI)
- Verify no typos in environment variable names

### Cause 4: MongoDB Connection Issues 🌐
**Problem**: Image cache lookups failing (like in our test)
**Solution**: The emergency fallback should still work, but check MongoDB connection

## Quick Test Commands

### Test Image Generation (Local)
```bash
cd src/backend
node test-image-generation.js
```

### Test News Enhancement (Production)
```bash
cd src/backend
node enhance-existing-news.js
```

### Check Recent Agent Runs
Look at the newest agent run logs in your dashboard for the image enhancement messages.

## Expected Results After Fix

### With API Keys:
- News items get real images from Unsplash or Replicate
- Agent logs show: "🖼️ Enhanced news item with unsplash image"
- Database has `generatedImage: { url: "...", source: "unsplash", attribution: "..." }`

### Without API Keys (Fallback):
- News items get placeholder images with article titles
- Agent logs show: "🖼️ Enhanced news item with unsplash image" (uses unsplash source for placeholder)
- Database has `generatedImage: { url: "https://via.placeholder.com/...", source: "unsplash", attribution: "Placeholder..." }`

## What to Check Next

1. **Agent Run Logs**: Do you see the image enhancement messages?
2. **Database Content**: Do news items have `generatedImage` fields?  
3. **Frontend Network**: Are the image URLs working when you visit them directly?
4. **Browser Console**: Any errors when loading the news page?

## Contact Points

If you're still not seeing images, share:
1. Recent agent run logs (copy the relevant parts)
2. Result of database check (do items have `generatedImage` field?)
3. Whether you restarted services after adding API keys

The system is definitely set up to work - we just need to find where in the chain the images are getting lost!