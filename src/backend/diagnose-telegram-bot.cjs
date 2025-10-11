// Diagnostic script for Telegram bot issues (CommonJS)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');

// Load environment variables
dotenv.config({ path: './src/backend/.env' });

// Define User schema inline
const userSchema = new mongoose.Schema({
  email: String,
  telegramBotToken: String,
  telegramBotUsername: String,
  telegramBotActive: Boolean,
  monitoredTelegramChats: [Number]
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// Define TelegramItem schema inline
const telegramItemSchema = new mongoose.Schema({
  synapseUserId: mongoose.Schema.Types.ObjectId,
  telegramMessageId: Number,
  chatId: Number,
  text: String,
  urls: [String],
  messageType: String,
  receivedAt: Date
}, { collection: 'telegramitems' });

const TelegramItem = mongoose.model('TelegramItem', telegramItemSchema);

async function diagnoseTelegramBot() {
  try {
    console.log('🔍 Starting Telegram Bot Diagnosis...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find users with Telegram bot configured
    console.log('👥 Checking for users with Telegram bot configuration...');
    const usersWithBots = await User.find({
      telegramBotToken: { $exists: true, $ne: null }
    }).select('email telegramBotToken telegramBotUsername telegramBotActive monitoredTelegramChats');

    if (usersWithBots.length === 0) {
      console.log('❌ No users found with Telegram bot tokens configured');
      console.log('\n📝 To fix: User needs to set up their Telegram bot token in the app');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`✅ Found ${usersWithBots.length} user(s) with Telegram bot(s)\n`);

    // Check each user's bot status
    for (const user of usersWithBots) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`👤 USER: ${user.email}`);
      console.log(`${'='.repeat(80)}`);
      
      console.log(`\n📱 Bot Configuration:`);
      console.log(`   - Bot Username: ${user.telegramBotUsername || 'Not set'}`);
      console.log(`   - Bot Token: ${user.telegramBotToken ? user.telegramBotToken.substring(0, 20) + '...' : 'Not set'}`);
      console.log(`   - Bot Active: ${user.telegramBotActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Monitored Chats: ${user.monitoredTelegramChats?.length || 0}`);
      
      if (user.monitoredTelegramChats && user.monitoredTelegramChats.length > 0) {
        console.log(`   - Chat IDs: ${user.monitoredTelegramChats.join(', ')}`);
      }

      // Check for recent Telegram messages
      console.log(`\n📨 Recent Messages (last 24 hours):`);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentMessages = await TelegramItem.find({
        synapseUserId: user._id,
        receivedAt: { $gte: yesterday }
      }).sort({ receivedAt: -1 }).limit(10);

      if (recentMessages.length === 0) {
        console.log(`   ❌ No messages received in the last 24 hours`);
      } else {
        console.log(`   ✅ Found ${recentMessages.length} recent message(s):`);
        recentMessages.forEach((msg, i) => {
          console.log(`      ${i + 1}. [${msg.messageType}] from chat ${msg.chatId} - ${msg.receivedAt.toLocaleString()}`);
          if (msg.text) {
            console.log(`         Text: "${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}"`);
          }
          if (msg.urls && msg.urls.length > 0) {
            console.log(`         URLs: ${msg.urls.join(', ')}`);
          }
        });
      }

      // Check for any messages ever
      const totalMessages = await TelegramItem.countDocuments({
        synapseUserId: user._id
      });
      console.log(`\n📊 Total messages ever received: ${totalMessages}`);

      // Diagnose issues
      console.log(`\n🔍 Diagnosis:`);
      const issues = [];
      const suggestions = [];

      if (!user.telegramBotToken) {
        issues.push('No bot token configured');
        suggestions.push('User needs to set up a Telegram bot token in the app');
      }

      if (!user.telegramBotActive) {
        issues.push('Bot is not marked as active');
        suggestions.push('Bot needs to be activated in the system');
      }

      if (!user.monitoredTelegramChats || user.monitoredTelegramChats.length === 0) {
        issues.push('No monitored chats configured');
        suggestions.push('User needs to add the bot to a chat/group and run /start command');
        suggestions.push('Then configure the chat ID in the app settings');
      }

      if (totalMessages === 0) {
        issues.push('Bot has never received any messages');
        suggestions.push('Check if bot is actually running and polling for messages');
        suggestions.push('Verify bot token is valid');
        suggestions.push('Test by sending /start to the bot');
      }

      if (recentMessages.length === 0 && totalMessages > 0) {
        issues.push('Bot was working before but stopped receiving messages');
        suggestions.push('Bot polling might have stopped - server restart needed');
        suggestions.push('Check for polling conflicts (409 errors in logs)');
        suggestions.push('Verify bot token is still valid');
      }

      if (issues.length === 0) {
        console.log('   ✅ No issues detected - bot appears to be configured correctly');
      } else {
        console.log(`   ❌ Issues found (${issues.length}):`);
        issues.forEach((issue, i) => {
          console.log(`      ${i + 1}. ${issue}`);
        });
      }

      if (suggestions.length > 0) {
        console.log(`\n💡 Suggestions:`);
        suggestions.forEach((suggestion, i) => {
          console.log(`      ${i + 1}. ${suggestion}`);
        });
      }

      // Check bot token validity (if available)
      if (user.telegramBotToken) {
        console.log(`\n🧪 Testing Bot Token...`);
        try {
          const testBot = new TelegramBot(user.telegramBotToken, { polling: false });
          const botInfo = await testBot.getMe();
          console.log(`   ✅ Bot token is VALID!`);
          console.log(`      - Bot ID: ${botInfo.id}`);
          console.log(`      - Bot Username: @${botInfo.username}`);
          console.log(`      - Bot Name: ${botInfo.first_name}`);
          
          if (botInfo.username !== user.telegramBotUsername) {
            console.log(`   ⚠️  Warning: Bot username in DB (${user.telegramBotUsername}) doesn't match token (@${botInfo.username})`);
          }
        } catch (error) {
          console.log(`   ❌ Bot token is INVALID or there's a connection error`);
          console.log(`      Error: ${error.message}`);
          suggestions.push('Update bot token in the app - current token is invalid');
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📋 SUMMARY');
    console.log(`${'='.repeat(80)}`);
    console.log(`Total users with bots: ${usersWithBots.length}`);
    console.log(`Active bots: ${usersWithBots.filter(u => u.telegramBotActive).length}`);
    console.log(`Bots with monitored chats: ${usersWithBots.filter(u => u.monitoredTelegramChats?.length > 0).length}`);

    console.log(`\n✅ Diagnosis complete!`);

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
  }
}

// Run diagnosis
diagnoseTelegramBot();
