import mongoose from 'mongoose';
import WhatsAppMessage from '../models/WhatsAppMessage';

/**
 * Quick diagnostic script to understand the actual structure of messages in the database
 */

async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
  console.log(`[Diagnostic] Connecting to MongoDB: ${mongoUri}`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('[Diagnostic] ✅ Connected to MongoDB');
  } catch (error) {
    console.error('[Diagnostic] ❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function analyzeMessageStructure(): Promise<void> {
  console.log('\n[Diagnostic] Analyzing message structure...');
  
  // Get total message count
  const totalMessages = await WhatsAppMessage.countDocuments();
  console.log(`[Diagnostic] Total messages in database: ${totalMessages}`);
  
  if (totalMessages === 0) {
    console.log('[Diagnostic] ❌ No messages found in database!');
    return;
  }
  
  // Sample a few messages to see their structure
  const sampleMessages = await WhatsAppMessage.find()
    .limit(5)
    .lean();
  
  console.log('\n[Diagnostic] Sample message structures:');
  sampleMessages.forEach((msg, index) => {
    console.log(`\n--- Message ${index + 1} ---`);
    console.log(`ID: ${msg._id}`);
    console.log(`MessageId: ${msg.messageId}`);
    console.log(`From: ${msg.from}`);
    console.log(`To: ${msg.to}`);
    console.log(`Timestamp: ${msg.timestamp}`);
    console.log(`isIncoming: ${msg.isIncoming}`);
    console.log(`Type: ${msg.type}`);
    console.log(`Message: ${msg.message?.substring(0, 50)}...`);
    console.log(`Metadata:`, msg.metadata);
  });
  
  // Check for messages with the target group
  const targetGroupId = '120363052356022041@g.us';
  console.log(`\n[Diagnostic] Searching for messages with target group: ${targetGroupId}`);
  
  // Check different query patterns
  const queries = [
    { name: 'to = groupId', query: { to: targetGroupId } },
    { name: 'from = groupId', query: { from: targetGroupId } },
    { name: 'contains groupId anywhere', query: { $or: [{ to: { $regex: '120363052356022041' } }, { from: { $regex: '120363052356022041' } }] } },
    { name: 'messages with @g.us', query: { $or: [{ to: /@g\.us/ }, { from: /@g\.us/ }] } },
    { name: 'metadata.isGroup exists', query: { 'metadata.isGroup': { $exists: true } } },
    { name: 'metadata.isGroup = true', query: { 'metadata.isGroup': true } }
  ];
  
  for (const { name, query } of queries) {
    const count = await WhatsAppMessage.countDocuments(query);
    console.log(`[Diagnostic] ${name}: ${count} messages`);
    
    if (count > 0 && count <= 3) {
      const samples = await WhatsAppMessage.find(query).limit(2).lean();
      samples.forEach((msg, idx) => {
        console.log(`  Sample ${idx + 1}: from=${msg.from}, to=${msg.to}, metadata=${JSON.stringify(msg.metadata)}`);
      });
    }
  }
  
  // Check for recent messages
  console.log('\n[Diagnostic] Recent messages (last 24 hours):');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMessages = await WhatsAppMessage.find({
    timestamp: { $gte: yesterday }
  }).limit(5).lean();
  
  console.log(`Found ${recentMessages.length} recent messages:`);
  recentMessages.forEach((msg, idx) => {
    console.log(`${idx + 1}. ${msg.timestamp.toISOString()}: ${msg.from} → ${msg.to}: "${msg.message?.substring(0, 30)}..."`);
  });
}

async function main(): Promise<void> {
  try {
    await connectToDatabase();
    await analyzeMessageStructure();
    
    console.log('\n[Diagnostic] ✅ Analysis complete!');
    console.log('\n[Diagnostic] Next steps:');
    console.log('1. If no metadata.isGroup fields exist, run: npm run migrate:whatsapp');
    console.log('2. If messages exist but with wrong group IDs, update the migration script');
    console.log('3. If no messages exist at all, check WAHA service integration');
    
  } catch (error) {
    console.error('[Diagnostic] ❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Diagnostic] Disconnected from MongoDB');
  }
}

// Run diagnostic if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('[Diagnostic] Unhandled error:', error);
    process.exit(1);
  });
}

export { main as diagnoseDatabaseMessages };