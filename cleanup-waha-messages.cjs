/**
 * Clean up old WAHA message data to free up MongoDB storage
 *
 * WAHA stores message history which can grow very large.
 * This script will clean up old messages while keeping recent ones.
 */

const { MongoClient } = require('mongodb');

async function cleanupWahaData() {
  const MONGO_URL = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(MONGO_URL);

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected\n');

    // Get the WAHA database
    const wahaDb = client.db('waha_webjs_u_6828510b49ea');

    console.log('📋 Analyzing WAHA database collections...\n');

    const collections = await wahaDb.listCollections().toArray();

    for (const collInfo of collections) {
      const collName = collInfo.name;
      const coll = wahaDb.collection(collName);

      // Get collection stats
      const stats = await wahaDb.command({ collStats: collName });
      const sizeMB = stats.size / 1024 / 1024;
      const count = await coll.countDocuments();

      console.log(`📦 Collection: ${collName}`);
      console.log(`   Documents: ${count.toLocaleString()}`);
      console.log(`   Size: ${sizeMB.toFixed(2)} MB`);

      // Check if this is a messages collection
      if (collName.includes('message') || collName.includes('chat')) {
        console.log('   🔍 Analyzing for cleanup...');

        // Sample a document to see structure
        const sample = await coll.findOne({});
        if (sample) {
          console.log('   Sample keys:', Object.keys(sample).join(', '));

          // Check for timestamp fields
          const hasTimestamp = sample.timestamp || sample.createdAt || sample._id;

          if (hasTimestamp) {
            // Calculate cutoff date (keep last 30 days)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);

            let oldCount = 0;

            // Try different timestamp field names
            if (sample.timestamp) {
              oldCount = await coll.countDocuments({
                timestamp: { $lt: cutoffDate.getTime() }
              });
            } else if (sample.createdAt) {
              oldCount = await coll.countDocuments({
                createdAt: { $lt: cutoffDate }
              });
            }

            if (oldCount > 0) {
              console.log(`   ⚠️  Found ${oldCount.toLocaleString()} old documents (>30 days)`);
              console.log(`   💾 Potential space savings: ~${(sizeMB * (oldCount/count)).toFixed(2)} MB`);
            }
          }
        }
      }

      console.log('');
    }

    console.log('\n🤔 Cleanup Options:\n');
    console.log('1. Keep messages from last 7 days (aggressive)');
    console.log('2. Keep messages from last 30 days (moderate)');
    console.log('3. Keep messages from last 90 days (conservative)');
    console.log('4. Delete all message history (keep only session/auth data)');
    console.log('5. Cancel and upgrade MongoDB instead\n');

    console.log('⚠️  WARNING: This will permanently delete old WhatsApp message data!');
    console.log('📝 Recommendation: Option 2 (keep last 30 days) or upgrade MongoDB\n');

    // For safety, don't auto-delete - require manual confirmation
    console.log('🛑 SCRIPT STOPPED - Manual review required');
    console.log('   To proceed, uncomment the cleanup code below and run again:\n');
    console.log('   // Uncomment and choose days to keep:');
    console.log('   // const daysToKeep = 30;');
    console.log('   // await cleanupOldMessages(wahaDb, daysToKeep);\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

/**
 * Actually perform the cleanup (commented out for safety)
 */
async function cleanupOldMessages(wahaDb, daysToKeep) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  console.log(`\n🗑️  Deleting messages older than ${daysToKeep} days (before ${cutoffDate.toISOString()})...\n`);

  const collections = await wahaDb.listCollections().toArray();
  let totalDeleted = 0;

  for (const collInfo of collections) {
    const collName = collInfo.name;

    // Only clean up message/chat collections, not auth/session data
    if (collName.includes('message') || collName.includes('chat')) {
      const coll = wahaDb.collection(collName);

      // Try different timestamp field names
      let deleteResult;
      try {
        deleteResult = await coll.deleteMany({
          timestamp: { $lt: cutoffDate.getTime() }
        });
      } catch (e) {
        try {
          deleteResult = await coll.deleteMany({
            createdAt: { $lt: cutoffDate }
          });
        } catch (e2) {
          console.log(`   ⏭️  Skipped ${collName} (no timestamp field)`);
          continue;
        }
      }

      if (deleteResult.deletedCount > 0) {
        console.log(`   ✅ Deleted ${deleteResult.deletedCount.toLocaleString()} documents from ${collName}`);
        totalDeleted += deleteResult.deletedCount;
      }
    }
  }

  console.log(`\n✅ Total deleted: ${totalDeleted.toLocaleString()} documents`);
  console.log('🔄 Run check-mongodb-size.cjs to verify space freed');
}

cleanupWahaData().catch(console.error);
