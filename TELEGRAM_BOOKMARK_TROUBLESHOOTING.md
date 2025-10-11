# Telegram Bookmark Bot Troubleshooting Guide

## Overview
The Telegram bookmark bot system allows users to save links sent via Telegram, with optional voice memo annotations and AI-powered reminder extraction.

## Architecture

### Components
1. **telegramBotManager** (`src/backend/src/services/telegramBotManager.ts`)
   - Manages multiple user bots (one per user)
   - Handles bot initialization and lifecycle
   - Monitors polling status and conflicts

2. **telegramServiceNew** (`src/backend/src/services/telegramServiceNew.ts`)
   - Processes incoming messages
   - Extracts URLs and creates bookmarks
   - Handles voice memos and AI analysis
   - Manages reminder creation

3. **captureController** (`src/backend/src/api/controllers/captureController.ts`)
   - Processes Telegram items for bookmark creation
   - Calls bookmarkUtils for URL processing

4. **bookmarkUtils** (`src/backend/src/utils/bookmarkUtils.ts`)
   - Handles URL extraction and classification
   - Creates bookmark entries in database

## Common Issues & Solutions

### 1. Bot Not Receiving Messages

**Symptoms:**
- No messages appearing in Telegram items
- Bookmarks not being created
- No voice memo prompts

**Causes:**
- Bot not initialized (no token configured)
- Bot marked as inactive in database
- No monitored chat IDs configured
- Polling stopped due to server restart
- 409 Conflict error (multiple polling instances)

**Solutions:**

#### Check Bot Configuration
```bash
# Run diagnostic script on Render
cd src/backend
node diagnose-telegram-bot.cjs
```

This will show:
- Bot token status (valid/invalid)
- Active status (yes/no)
- Monitored chat IDs
- Recent message count
- Specific issues and suggestions

#### Fix Bot Configuration

1. **In Synapse App:**
   - Go to Settings → Telegram Settings
   - Add bot token from @BotFather
   - Ensure bot is toggled "Active"
   - Add chat ID to monitored chats list

2. **Get Chat ID:**
   - Add bot to your chat/group
   - Send /start command
   - Check server logs for chat ID
   - Or use this test endpoint: `GET /api/v1/users/me` (shows monitored chats)

3. **Restart Backend:**
   - On Render: Go to service → Manual Deploy → Deploy Latest Commit
   - Or restart via Render dashboard
   - This reinitializes all user bots

### 2. Bookmarks Not Appearing on Page

**Symptoms:**
- Bot receives messages
- URLs detected in logs
- But bookmarks don't show on bookmarks page

**Causes:**
- Bookmark creation failed silently
- Frontend not fetching bookmarks
- Database query issue

**Solutions:**

1. **Check Server Logs:**
```
Look for:
[processTelegramItemForBookmarks] Starting URL processing
[BOOKMARK_CREATION] Successfully created bookmark
```

2. **Check Database:**
```javascript
// In MongoDB, check bookmarks collection
db.bookmarks.find({ userId: ObjectId("your-user-id") }).sort({ createdAt: -1 }).limit(10)
```

3. **Check Frontend:**
- Open browser console
- Look for API errors when loading bookmarks page
- Check network tab for failed requests to `/api/v1/bookmarks`

### 3. Voice Memo Not Working

**Symptoms:**
- Bot doesn't prompt for voice memo after bookmark creation
- Voice memo doesn't get analyzed
- Reminders not created from voice memos

**Causes:**
- `promptForBookmarkVoiceNote` not called
- User not responding within 5-minute timeout
- AI analysis service error

**Solutions:**

1. **Check Logs:**
```
Look for:
[TelegramService] Bookmark voice note prompt sent
[TelegramService] Voice note detected for pending bookmark
[TelegramService] ==================== BOOKMARK REMINDER ANALYSIS ====================
```

2. **Verify AI Services:**
- Ensure ANTHROPIC_API_KEY is set
- Check Claude API quota/limits
- Verify bookmarkVoiceMemoAnalysisService is working

3. **Test Flow:**
   - Send URL to bot
   - Wait for "📚 Bookmark saved!" message
   - Send voice memo within 5 minutes
   - Should receive confirmation with reminder details

### 4. 409 Conflict Errors

**Symptoms:**
```
[TelegramBotManager] ⚠️ Polling conflict detected
```

**Cause:**
Multiple instances trying to poll the same bot simultaneously

**Solutions:**

1. **Ensure Single Instance:**
   - Check Render: Only one instance should be running
   - Scale down to 1 if multiple instances exist

2. **Clear Existing Polling:**
   - Bot manager automatically stops conflicting instances
   - Restart backend to clean up

3. **Check for External Polling:**
   - Verify bot isn't being polled from another server
   - Check if you're running local development instance

## Diagnostic Commands

### Check Bot Status (On Render)
```bash
cd src/backend
node diagnose-telegram-bot.cjs
```

### Check Database Manually
```javascript
// Connect to MongoDB
db.users.find({ telegramBotToken: { $exists: true } }).pretty()
db.telegramitems.find().sort({ receivedAt: -1 }).limit(10).pretty()
db.bookmarks.find().sort({ createdAt: -1 }).limit(10).pretty()
```

### Check Server Logs
```bash
# On Render dashboard
- Go to Logs tab
- Filter for: "[TelegramService]" or "[TelegramBotManager]"
- Look for errors or initialization messages
```

## Configuration Checklist

- [ ] Telegram bot created via @BotFather
- [ ] Bot token added to user profile in Synapse
- [ ] Bot marked as active in database
- [ ] Bot added to target chat/group
- [ ] /start command sent to bot
- [ ] Chat ID added to monitored chats list
- [ ] Backend service running on Render
- [ ] MONGODB_URI set in Render environment
- [ ] ANTHROPIC_API_KEY set (for voice memo analysis)
- [ ] No 409 conflict errors in logs
- [ ] Recent messages visible in database

## Testing Procedure

1. **Basic Message Reception:**
   ```
   Send "Test" to bot
   → Check TelegramItems collection for new entry
   ```

2. **Bookmark Creation:**
   ```
   Send "Check this out: https://example.com" to bot
   → Wait for "📚 Bookmark saved!" confirmation
   → Check bookmarks page in app
   ```

3. **Voice Memo & Reminder:**
   ```
   Send URL to bot
   → Wait for voice memo prompt
   → Send voice note: "Remind me tomorrow at 2pm to read this"
   → Should receive confirmation with reminder details
   → Check reminders in database
   ```

## Debugging Tips

1. **Enable Verbose Logging:**
   - Set LOG_LEVEL=debug in Render environment
   - Restart service
   - Check logs for detailed message processing flow

2. **Test Bot Token Manually:**
   ```javascript
   const TelegramBot = require('node-telegram-bot-api');
   const bot = new TelegramBot('YOUR_BOT_TOKEN', { polling: false });
   bot.getMe().then(console.log).catch(console.error);
   ```

3. **Check Network:**
   - Ensure Render can reach Telegram API
   - Check for firewall/proxy issues
   - Verify no rate limiting from Telegram

## Support

If issues persist after following this guide:
1. Run diagnostic script and save output
2. Check server logs for errors
3. Verify all environment variables are set
4. Ensure MongoDB connection is stable
5. Check Render service status and metrics

## Quick Reference

**Important Files:**
- Bot Manager: `src/backend/src/services/telegramBotManager.ts`
- Message Processing: `src/backend/src/services/telegramServiceNew.ts`
- Bookmark Creation: `src/backend/src/api/controllers/captureController.ts`
- URL Processing: `src/backend/src/utils/bookmarkUtils.ts`
- AI Analysis: `src/backend/src/services/bookmarkVoiceMemoAnalysisService.ts`
- Reminders: `src/backend/src/services/reminderService.ts`

**Environment Variables:**
- `MONGODB_URI` - Database connection
- `ANTHROPIC_API_KEY` - For AI analysis
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

**User Model Fields:**
- `telegramBotToken` - Bot API token
- `telegramBotUsername` - Bot username (e.g., @mybot)
- `telegramBotActive` - Boolean, bot enabled status
- `monitoredTelegramChats` - Array of chat IDs to monitor
