import axiosInstance from './src/frontend/src/services/axiosConfig.js';

// Debug script to help troubleshoot Telegram bot setup
async function debugTelegramBotSetup() {
  try {
    console.log('🔍 Debugging Telegram Bot Setup...\n');

    // Step 1: Check bot status
    console.log('1. Checking bot status...');
    try {
      const botStatus = await axiosInstance.get('/users/me/telegram-bot');
      console.log('✅ Bot Status:', {
        hasBot: botStatus.data.hasBot,
        isActive: botStatus.data.isActive,
        botUsername: botStatus.data.botUsername,
        monitoredChats: botStatus.data.monitoredChats
      });
      
      if (!botStatus.data.hasBot) {
        console.log('❌ No bot configured. Please configure your bot first.');
        return;
      }
      
      if (!botStatus.data.isActive) {
        console.log('❌ Bot is not active. Please check your bot token.');
        return;
      }
    } catch (error) {
      console.log('❌ Error checking bot status:', error.response?.data?.message);
      return;
    }

    // Step 2: Check channels
    console.log('\n2. Checking monitored channels...');
    try {
      const channels = await axiosInstance.get('/telegram-channels');
      console.log(`📊 Found ${channels.data.data?.length || 0} channels:`);
      
      if (!channels.data.data || channels.data.data.length === 0) {
        console.log('❌ No channels configured. Add some channels to monitor.');
        return;
      }

      channels.data.data.forEach((channel, index) => {
        console.log(`\n   Channel ${index + 1}:`);
        console.log(`   📢 Title: ${channel.channelTitle}`);
        console.log(`   🆔 ID: ${channel.channelId}`);
        console.log(`   📊 Type: ${channel.channelType}`);
        console.log(`   ✅ Active: ${channel.isActive}`);
        console.log(`   💬 Messages: ${channel.totalMessages}`);
        console.log(`   🔍 Keywords: ${channel.keywords?.join(', ') || 'None'}`);
        console.log(`   ⏰ Last Fetch: ${channel.lastFetchedAt || 'Never'}`);
        
        if (channel.lastError) {
          console.log(`   ❌ Error: ${channel.lastError}`);
        }
      });
    } catch (error) {
      console.log('❌ Error checking channels:', error.response?.data?.message);
    }

    // Step 3: Provide recommendations
    console.log('\n3. 🎯 Recommendations:');
    console.log('   • Make sure your bot is added to each channel/group as admin (channels) or member (groups)');
    console.log('   • Send a test message in the channel/group after adding your bot');
    console.log('   • Check if keywords are too restrictive (try removing them temporarily)');
    console.log('   • Historical messages before bot joined are not available');
    console.log('   • Only new messages after bot joins will appear');

  } catch (error) {
    console.log('❌ Debug script error:', error.message);
  }
}

console.log('This is a debugging guide. To actually debug your setup:');
console.log('1. Open browser dev tools on /telegram-channels page');
console.log('2. Check Network tab for API calls');
console.log('3. Look for errors in Console tab');
console.log('4. Follow the troubleshooting steps below\n');

debugTelegramBotSetup();