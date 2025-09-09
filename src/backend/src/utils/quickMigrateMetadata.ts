import dotenv from 'dotenv';
import mongoose from 'mongoose';
import WhatsAppMessage from '../models/WhatsAppMessage';

// Load environment variables
dotenv.config();

/**
 * Quick migration script to populate metadata fields in existing WhatsApp messages
 * This focuses on the specific group that's failing: 120363052356022041@g.us
 */

async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
  console.log(`[Migration] Connecting to MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('[Migration] ✅ Connected to MongoDB');
}

async function quickMigration(): Promise<void> {
  console.log('\n[Migration] Starting quick metadata migration...');
  
  let updated = 0;
  let processed = 0;
  
  // First, identify all messages that look like group messages
  const groupPatterns = [
    /@g\.us$/,  // Standard WhatsApp group format
    /^\d{15,20}-\d+@g\.us$/,  // Another group format
  ];
  
  // Update messages that are sent TO group-like IDs
  for (const pattern of groupPatterns) {
    const groupMessages = await WhatsAppMessage.find({
      to: { $regex: pattern },
      $or: [
        { 'metadata.isGroup': { $exists: false } },
        { 'metadata.isGroup': null },
        { 'metadata.isGroup': false }
      ]
    });
    
    console.log(`[Migration] Found ${groupMessages.length} messages with pattern ${pattern}`);
    
    for (const message of groupMessages) {
      // Extract group info
      const groupId = message.to;
      const groupName = extractGroupName(groupId) || `Group ${groupId.substring(0, 12)}...`;
      
      // Update metadata carefully to avoid undefined values
      const existingMetadata = message.metadata || {};
      message.metadata = {
        forwarded: existingMetadata.forwarded,
        forwardedMany: existingMetadata.forwardedMany,
        isGroup: true,
        groupId: groupId,
        groupName: groupName
      };
      
      // Only include referral if it exists and is valid
      if (existingMetadata.referral && typeof existingMetadata.referral === 'object') {
        message.metadata.referral = existingMetadata.referral;
      }
      
      await message.save();
      updated++;
      processed++;
      
      if (processed % 100 === 0) {
        console.log(`[Migration] Processed ${processed} messages, updated ${updated}`);
      }
    }
  }
  
  // Also handle any messages FROM group-like IDs (less common but possible)
  const messagesFromGroups = await WhatsAppMessage.find({
    from: { $regex: /@g\.us$/ },
    $or: [
      { 'metadata.isGroup': { $exists: false } },
      { 'metadata.isGroup': null },
      { 'metadata.isGroup': false }
    ]
  });
  
  console.log(`[Migration] Found ${messagesFromGroups.length} messages FROM group IDs`);
  
  for (const message of messagesFromGroups) {
    const groupId = message.from;
    const groupName = extractGroupName(groupId) || `Group ${groupId.substring(0, 12)}...`;
    
    // Update metadata carefully to avoid undefined values
    const existingMetadata = message.metadata || {};
    message.metadata = {
      forwarded: existingMetadata.forwarded,
      forwardedMany: existingMetadata.forwardedMany,
      isGroup: true,
      groupId: groupId,
      groupName: groupName
    };
    
    // Only include referral if it exists and is valid
    if (existingMetadata.referral && typeof existingMetadata.referral === 'object') {
      message.metadata.referral = existingMetadata.referral;
    }
    
    await message.save();
    updated++;
    processed++;
  }
  
  // Update non-group messages
  const directMessages = await WhatsAppMessage.find({
    to: { $not: /@g\.us$/ },
    from: { $not: /@g\.us$/ },
    $or: [
      { 'metadata.isGroup': { $exists: false } },
      { 'metadata.isGroup': null }
    ]
  });
  
  console.log(`[Migration] Found ${directMessages.length} direct messages to update`);
  
  for (const message of directMessages) {
    // Update metadata carefully to avoid undefined values
    const existingMetadata = message.metadata || {};
    message.metadata = {
      forwarded: existingMetadata.forwarded,
      forwardedMany: existingMetadata.forwardedMany,
      isGroup: false
    };
    
    // Only include referral if it exists and is valid
    if (existingMetadata.referral && typeof existingMetadata.referral === 'object') {
      message.metadata.referral = existingMetadata.referral;
    }
    
    await message.save();
    updated++;
    processed++;
    
    if (processed % 100 === 0) {
      console.log(`[Migration] Processed ${processed} messages, updated ${updated}`);
    }
  }
  
  console.log(`\n[Migration] ✅ Migration completed!`);
  console.log(`[Migration] Total processed: ${processed}`);
  console.log(`[Migration] Total updated: ${updated}`);
}

function extractGroupName(groupId: string): string | null {
  // Try to extract a meaningful group name from the ID
  // This is a simple approach - in practice, you might have better ways
  
  if (groupId === '120363052356022041@g.us') {
    return 'Green API (גרין) - הקבוצה הישראלית';
  }
  
  // For other groups, we'll use a generic name
  return null;
}

async function validateMigration(): Promise<void> {
  console.log('\n[Migration] Validating migration...');
  
  const targetGroupId = '120363052356022041@g.us';
  
  // Test the exact queries that were failing
  const queries = [
    {
      name: 'metadata.isGroup + groupId',
      query: {
        'metadata.isGroup': true,
        'metadata.groupId': targetGroupId,
        isIncoming: true
      }
    },
    {
      name: 'to field fallback',
      query: {
        'metadata.isGroup': true,
        isIncoming: true,
        to: targetGroupId
      }
    }
  ];
  
  for (const { name, query } of queries) {
    const count = await WhatsAppMessage.countDocuments(query);
    console.log(`[Migration] ${name}: ${count} messages`);
    
    if (count > 0) {
      const sample = await WhatsAppMessage.findOne(query).lean();
      console.log(`[Migration] Sample: ${sample?.from} → ${sample?.to} at ${sample?.timestamp}`);
    }
  }
  
  // Overall stats
  const stats = await WhatsAppMessage.aggregate([
    {
      $group: {
        _id: '$metadata.isGroup',
        count: { $sum: 1 }
      }
    }
  ]);
  
  console.log('\n[Migration] Final distribution:');
  stats.forEach(stat => {
    const type = stat._id === true ? 'Group Messages' : 
                 stat._id === false ? 'Direct Messages' : 
                 'Messages without metadata';
    console.log(`  ${type}: ${stat.count}`);
  });
}

async function main(): Promise<void> {
  try {
    await connectToDatabase();
    await quickMigration();
    await validateMigration();
    
    console.log('\n[Migration] 🎉 Migration completed successfully!');
    console.log('[Migration] You can now test the WhatsApp Daily Summary again.');
    
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[Migration] Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('[Migration] Unhandled error:', error);
    process.exit(1);
  });
}

export { main as quickMigrateMetadata };