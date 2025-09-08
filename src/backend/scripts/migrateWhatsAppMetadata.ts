import mongoose from 'mongoose';
import WhatsAppMessage from '../src/models/WhatsAppMessage';
import WhatsAppBaileysService from '../src/services/whatsappBaileysService';
import WAHAService from '../src/services/wahaService';

/**
 * Migration script to populate metadata fields in existing WhatsApp messages
 * This is needed because the new WhatsApp summary queries depend on metadata.isGroup, 
 * metadata.groupId, and metadata.groupName fields.
 */

interface GroupInfo {
  id: string;
  name: string;
  participantCount?: number;
}

async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
  console.log(`[Migration] Connecting to MongoDB: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('[Migration] Connected to MongoDB');
}

async function getGroupsFromServices(): Promise<Map<string, GroupInfo>> {
  const groupsMap = new Map<string, GroupInfo>();
  
  try {
    // Try to get groups from Baileys service
    const baileysService = WhatsAppBaileysService.getInstance();
    const baileysGroups = baileysService.getGroups();
    console.log(`[Migration] Found ${baileysGroups.length} groups from Baileys service`);
    
    baileysGroups.forEach(group => {
      groupsMap.set(group.id, {
        id: group.id,
        name: group.name,
        participantCount: group.participantCount
      });
    });
  } catch (error) {
    console.warn('[Migration] Baileys service not available:', error);
  }
  
  try {
    // Try to get groups from WAHA service
    const wahaService = WAHAService.getInstance();
    const wahaGroups = await wahaService.getGroups('default');
    console.log(`[Migration] Found ${wahaGroups.length} groups from WAHA service`);
    
    wahaGroups.forEach(group => {
      if (!groupsMap.has(group.id)) {
        groupsMap.set(group.id, {
          id: group.id,
          name: group.name,
          participantCount: group.participantCount
        });
      }
    });
  } catch (error) {
    console.warn('[Migration] WAHA service not available:', error);
  }
  
  return groupsMap;
}

async function inferGroupsFromMessages(): Promise<Map<string, GroupInfo>> {
  console.log('[Migration] Analyzing existing messages to infer groups...');
  
  // Find messages that look like group messages based on patterns
  const groupLikeMessages = await WhatsAppMessage.aggregate([
    {
      $match: {
        // Messages where 'to' looks like a group ID (typically longer format)
        $or: [
          { to: { $regex: /@g\.us$/ } }, // WhatsApp group format
          { to: { $regex: /^\d{15,20}-\d+@g\.us$/ } }, // Another group format
          // Look for messages with multiple participants from same 'to'
        ]
      }
    },
    {
      $group: {
        _id: '$to',
        messageCount: { $sum: 1 },
        uniqueSenders: { $addToSet: '$from' },
        firstSeen: { $min: '$timestamp' },
        lastSeen: { $max: '$timestamp' }
      }
    },
    {
      $match: {
        // Groups typically have multiple participants
        $expr: { $gt: [{ $size: '$uniqueSenders' }, 1] }
      }
    },
    {
      $sort: { messageCount: -1 }
    }
  ]);
  
  const inferredGroups = new Map<string, GroupInfo>();
  
  for (const group of groupLikeMessages) {
    const groupId = group._id;
    const participantCount = group.uniqueSenders.length;
    
    // Try to find a meaningful group name from recent messages
    const recentMessage = await WhatsAppMessage.findOne({
      to: groupId
    }).sort({ timestamp: -1 }).lean();
    
    const groupName = `Group ${groupId.substring(0, 8)}...` + 
      (participantCount > 1 ? ` (${participantCount} participants)` : '');
    
    inferredGroups.set(groupId, {
      id: groupId,
      name: groupName,
      participantCount
    });
    
    console.log(`[Migration] Inferred group: ${groupId} with ${participantCount} participants`);
  }
  
  return inferredGroups;
}

async function migrateMessages(allGroups: Map<string, GroupInfo>): Promise<void> {
  console.log(`[Migration] Starting migration with ${allGroups.size} known groups...`);
  
  let processed = 0;
  let updated = 0;
  const batchSize = 1000;
  
  // Process messages that need metadata updates
  const messagesToUpdate = WhatsAppMessage.find({
    $or: [
      { 'metadata.isGroup': { $exists: false } },
      { 'metadata.isGroup': null }
    ]
  });
  
  for await (const message of messagesToUpdate) {
    const groupInfo = allGroups.get(message.to);
    
    if (groupInfo) {
      // This is a group message
      message.metadata = {
        ...message.metadata,
        isGroup: true,
        groupId: groupInfo.id,
        groupName: groupInfo.name
      };
      
      await message.save();
      updated++;
    } else {
      // This is likely a direct message
      message.metadata = {
        ...message.metadata,
        isGroup: false
      };
      
      await message.save();
    }
    
    processed++;
    
    if (processed % batchSize === 0) {
      console.log(`[Migration] Processed ${processed} messages, updated ${updated} with group metadata`);
    }
  }
  
  console.log(`[Migration] Migration complete. Processed ${processed} messages, updated ${updated} with group metadata`);
}

async function validateMigration(): Promise<void> {
  console.log('[Migration] Validating migration results...');
  
  const stats = await WhatsAppMessage.aggregate([
    {
      $group: {
        _id: '$metadata.isGroup',
        count: { $sum: 1 }
      }
    }
  ]);
  
  console.log('[Migration] Message distribution:');
  stats.forEach(stat => {
    const type = stat._id === true ? 'Group Messages' : 
                 stat._id === false ? 'Direct Messages' : 
                 'Messages without metadata';
    console.log(`  - ${type}: ${stat.count}`);
  });
  
  // Check group messages specifically
  const groupStats = await WhatsAppMessage.aggregate([
    {
      $match: { 'metadata.isGroup': true }
    },
    {
      $group: {
        _id: '$metadata.groupName',
        messageCount: { $sum: 1 },
        groupId: { $first: '$metadata.groupId' }
      }
    },
    {
      $sort: { messageCount: -1 }
    },
    {
      $limit: 10
    }
  ]);
  
  console.log('\n[Migration] Top 10 groups by message count:');
  groupStats.forEach((group, index) => {
    console.log(`  ${index + 1}. ${group._id} (${group.groupId}): ${group.messageCount} messages`);
  });
}

async function main(): Promise<void> {
  try {
    await connectToDatabase();
    
    // Get groups from services
    const serviceGroups = await getGroupsFromServices();
    
    // Infer additional groups from message patterns
    const inferredGroups = await inferGroupsFromMessages();
    
    // Combine all groups
    const allGroups = new Map([...serviceGroups, ...inferredGroups]);
    console.log(`[Migration] Total groups identified: ${allGroups.size}`);
    
    // Migrate messages
    await migrateMessages(allGroups);
    
    // Validate results
    await validateMigration();
    
    console.log('[Migration] Migration completed successfully!');
    
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
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

export { main as migrateWhatsAppMetadata };