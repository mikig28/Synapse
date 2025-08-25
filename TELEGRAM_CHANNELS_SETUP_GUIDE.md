# Telegram Channels Setup Guide 📢

## Overview

This guide will help you set up Telegram channel monitoring in Synapse. The new system requires each user to configure their own personal Telegram bot for security and isolation.

## ⚠️ Important Changes

**Why you need your own bot:**
- **Security**: Each user has their own isolated bot instance
- **Privacy**: Your monitored channels are private to your account
- **Control**: You decide which channels/groups your bot can access
- **Reliability**: No shared bot limits or conflicts

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Your Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Start a chat** with BotFather
3. **Send `/newbot`** command
4. **Choose a name** for your bot (e.g., "MyPersonalSynapseBot")
5. **Choose a username** ending with `bot` (e.g., "mypersonalsynapse_bot")
6. **Copy the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Configure in Synapse

1. **Go to** [Telegram Channels page](https://synapse-frontend.onrender.com/telegram-channels)
2. **Click "Configure Bot"** (if you don't have one set up)
3. **Paste your bot token** from BotFather
4. **Click "Validate Token"** to verify it works
5. **Click "Save Bot Configuration"**

✅ **Your bot is now active!**

### Step 3: Add Channels/Groups

1. **Add your bot to the channel/group** you want to monitor:
   - For **Channels**: Make your bot an admin with "Read Messages" permission
   - For **Groups**: Add your bot as a regular member
2. **In Synapse**, click "Add Channel"
3. **Enter** the channel identifier (e.g., `@channelname` or chat ID)
4. **Add keywords** (optional) to filter messages
5. **Click "Add Channel"**

🎉 **You're all set! Messages will start appearing shortly.**

## 📋 Detailed Instructions

### Channel/Group Identifiers

**For Public Channels:**
- Use the channel username: `@channelname`
- Example: `@synapse_updates`

**For Private Groups:**
- Use the chat ID (negative number): `-123456789`
- To get the chat ID:
  1. Add your bot to the group
  2. Send a message in the group
  3. Visit: `https://api.telegram.org/bot<YourBotToken>/getUpdates`
  4. Look for the chat ID in the response

**For Public Groups:**
- Use the group username if available: `@groupname`
- Or use the chat ID method above

### Bot Permissions Required

**For Channels:**
- Bot must be added as **administrator**
- Enable "**Read Messages**" permission
- Other permissions are optional

**For Groups/Supergroups:**
- Bot can be added as a **regular member**
- No special permissions needed
- Bot will receive all messages

### Troubleshooting Common Issues

#### "Bot needs to be added as administrator"
- **Solution**: Go to channel settings → Administrators → Add your bot with "Read Messages" permission

#### "Bot needs to be added as a member to this group"
- **Solution**: Add your bot to the group through group settings → Add members

#### "Channel not found" 
- **Solution**: 
  - Check channel username spelling
  - Ensure channel is public or you have access
  - For private channels, use chat ID instead

#### "No messages appearing"
- **Possible causes**:
  - Bot not added to channel/group yet
  - Bot doesn't have proper permissions
  - No new messages since bot was added (historical messages aren't available)
  - Keywords are too restrictive

#### "Invalid bot token"
- **Solution**: 
  - Double-check token from BotFather
  - Ensure no extra spaces or characters
  - Generate a new token if needed

### Message Filtering

**Keywords (Optional):**
- Add keywords to filter messages
- Case-insensitive matching
- Multiple keywords = OR condition
- Leave empty to capture all messages

**Examples:**
- `ai, artificial intelligence, machine learning` - Tech topics
- `bitcoin, crypto, blockchain` - Crypto topics
- `sale, discount, offer` - Shopping deals

## 🔧 Advanced Configuration

### Multiple Channels
- You can monitor unlimited channels/groups
- Each has independent keyword filtering
- Toggle active/inactive per channel

### Bot Management
- **View Status**: See bot info and monitored chats count
- **Update Token**: Change bot token if needed
- **Remove Bot**: Completely remove bot configuration
- **Remove Channels**: Stop monitoring specific channels

### Real-time Updates
- New messages appear instantly via WebSocket
- Message counters update automatically
- Channel status shows last activity

## 🛡️ Security & Privacy

### Data Protection
- **Your bot token is encrypted** in our database
- **Messages are stored** in your private account only
- **No cross-user data sharing** - your messages stay yours
- **Bot isolation** - each user's bot is completely separate

### Token Security
- **Never share your bot token** with others
- **Regenerate token** if compromised (via BotFather)
- **Use unique bot per application**

### Permission Management
- **Principle of least privilege** - only give necessary permissions
- **Review monitored channels** regularly
- **Remove unused channels** from monitoring

## 📊 Monitoring & Analytics

### Message Statistics
- **Total messages** per channel
- **Last fetch time** tracking
- **Error status** monitoring
- **Active/inactive** channel counts

### Search Functionality
- **Cross-channel search** through all monitored messages
- **Keyword highlighting** in results
- **Date-based filtering**
- **Export capabilities** (coming soon)

## 🆘 Support

### Getting Help
1. **Check this guide** first
2. **Review error messages** in the UI
3. **Check bot permissions** in Telegram
4. **Contact support** if issues persist

### Common Solutions
- **Refresh the page** if messages don't appear
- **Re-add bot to channel** if permissions changed
- **Regenerate bot token** for authentication issues
- **Clear browser cache** for UI problems

## 🔄 Migration from Old System

If you were using the old shared bot system:

1. **Your existing channels** will show "Setup needed"
2. **Configure your personal bot** (follow Step 1-2 above)
3. **Re-add your bot** to existing channels
4. **Channels will start working** automatically

**Note**: Historical messages from the old system remain accessible, but new messages require the new bot setup.

---

## 📝 FAQ

**Q: Why can't I see old messages from before I added the bot?**
A: Telegram Bot API only provides messages sent after the bot joins. Historical messages aren't available.

**Q: Can I use the same bot for multiple Synapse accounts?**
A: No, each bot token can only be used by one user for security reasons.

**Q: What happens if I delete my bot?**
A: Your monitored channels will stop receiving new messages, but existing messages remain in Synapse.

**Q: Is there a limit on channels I can monitor?**
A: No hard limit, but Telegram may have rate limits for very high-volume monitoring.

**Q: Can I monitor private channels?**
A: Yes, if you have access and can add your bot as an administrator.

---

*Need help? Check the in-app setup guide or contact support.*