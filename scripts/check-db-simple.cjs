// Simple MongoDB check script
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkDatabase() {
  const client = new MongoClient(uri);

  try {
    console.log('🔍 Connecting to MongoDB...\n');
    await client.connect();

    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    console.log('📊 Available databases:');
    databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check each database for User and GroupMonitor collections
    console.log('\n🔍 Checking for monitoring collections...\n');

    for (const dbInfo of databases) {
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const hasUsers = collectionNames.includes('users');
      const hasMonitors = collectionNames.includes('groupmonitors');
      const hasMessages = collectionNames.includes('whatsappmessages');

      if (hasUsers || hasMonitors || hasMessages) {
        console.log(`Database: ${dbInfo.name}`);
        if (hasUsers) console.log('  ✅ users collection found');
        if (hasMonitors) console.log('  ✅ groupmonitors collection found');
        if (hasMessages) console.log('  ✅ whatsappmessages collection found');

        // Count documents
        if (hasUsers) {
          const userCount = await db.collection('users').countDocuments();
          console.log(`     ${userCount} user(s)`);

          // Check first user for whatsappSessionId
          const user = await db.collection('users').findOne({});
          if (user) {
            console.log(`     User email: ${user.email}`);
            console.log(`     whatsappSessionId: ${user.whatsappSessionId || '❌ NOT SET'}`);
          }
        }

        if (hasMonitors) {
          const monitorCount = await db.collection('groupmonitors').countDocuments();
          const activeCount = await db.collection('groupmonitors').countDocuments({ isActive: true });
          console.log(`     ${monitorCount} monitor(s), ${activeCount} active`);

          // Get monitor details
          const monitors = await db.collection('groupmonitors').find({}).toArray();
          for (const monitor of monitors) {
            console.log(`     - ${monitor.groupName}: ${monitor.statistics?.totalMessages || 0} messages`);
            console.log(`       Last activity: ${monitor.statistics?.lastActivity || 'Never'}`);
          }
        }

        if (hasMessages) {
          const msgCount = await db.collection('whatsappmessages').countDocuments();
          console.log(`     ${msgCount} message(s)`);

          // Check recent messages
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const recentCount = await db.collection('whatsappmessages').countDocuments({
            timestamp: { $gte: oneDayAgo }
          });
          console.log(`     ${recentCount} message(s) in last 24 hours`);
        }

        console.log('');
      }
    }

    console.log('✅ Check complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkDatabase();
