const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define WhatsApp Message schema inline
const whatsappMessageSchema = new Schema({
  messageId: String,
  from: String,
  to: String,
  text: String,
  timestamp: Date,
  metadata: {
    groupName: String
  }
});

const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsappMessageSchema);

// Define Schedule schema inline
const scheduleSchema = new Schema({
  name: String,
  status: String,
  targetGroups: [{
    groupId: String,
    groupName: String
  }],
  nextExecutionAt: Date,
  lastExecutionStatus: String
});

const WhatsAppSummarySchedule = mongoose.model('WhatsAppSummarySchedule', scheduleSchema);

async function debugWhatsAppData() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check total messages
    const totalMessages = await WhatsAppMessage.countDocuments();
    console.log(`📊 Total WhatsApp messages: ${totalMessages}`);

    // Check unique groups
    const uniqueGroups = await WhatsAppMessage.distinct('metadata.groupName');
    console.log(`👥 Unique groups: ${uniqueGroups.length}`);
    console.log('Groups:', uniqueGroups.slice(0, 10)); // Show first 10

    // Check recent messages (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMessages = await WhatsAppMessage.countDocuments({
      timestamp: { $gte: sevenDaysAgo }
    });
    console.log(`📅 Messages in last 7 days: ${recentMessages}`);

    // Check today's messages
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

    const todayMessages = await WhatsAppMessage.countDocuments({
      timestamp: { $gte: startOfToday, $lte: endOfToday }
    });
    console.log(`📅 Today's messages: ${todayMessages}`);

    // Check yesterday's messages
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(startOfYesterday.getTime() + 24 * 60 * 60 * 1000 - 1);

    const yesterdayMessages = await WhatsAppMessage.countDocuments({
      timestamp: { $gte: startOfYesterday, $lte: endOfYesterday }
    });
    console.log(`📅 Yesterday's messages: ${yesterdayMessages}`);

    // Check sample messages
    const sampleMessages = await WhatsAppMessage.find().limit(3).lean();
    console.log('📝 Sample messages:');
    sampleMessages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ID: ${msg.messageId}`);
      console.log(`     Group: ${msg.metadata?.groupName || 'N/A'}`);
      console.log(`     From: ${msg.from}`);
      console.log(`     To: ${msg.to}`);
      console.log(`     Timestamp: ${msg.timestamp}`);
      console.log(`     Text: ${(msg.text || '').substring(0, 50)}...`);
      console.log('     ---');
    });

    // Check active schedules
    const activeSchedules = await WhatsAppSummarySchedule.find({ status: 'active' });
    console.log(`⏰ Active schedules: ${activeSchedules.length}`);

    activeSchedules.forEach((schedule, i) => {
      console.log(`  ${i + 1}. Name: ${schedule.name}`);
      console.log(`     Groups: ${schedule.targetGroups.map(g => g.groupName).join(', ')}`);
      console.log(`     Next run: ${schedule.nextExecutionAt}`);
      console.log(`     Last status: ${schedule.lastExecutionStatus || 'never run'}`);
      console.log('     ---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

debugWhatsAppData();