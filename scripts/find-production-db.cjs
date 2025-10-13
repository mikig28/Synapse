// Find which database has the production user ID
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const productionUserId = '6828510b49ea27a15a2226c0'; // From logs

async function findProductionDatabase() {
  const client = new MongoClient(uri);

  try {
    console.log('🔍 Searching for production database...\n');
    console.log(`Looking for user ID: ${productionUserId}\n`);

    await client.connect();

    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    console.log('Checking databases:');

    for (const dbInfo of databases) {
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      if (collectionNames.includes('users')) {
        try {
          // Try to find user with this ID
          const user = await db.collection('users').findOne({
            _id: new ObjectId(productionUserId)
          });

          if (user) {
            console.log(`\n✅ FOUND PRODUCTION DATABASE: ${dbInfo.name}`);
            console.log(`   User: ${user.email}`);
            console.log(`   whatsappSessionId: ${user.whatsappSessionId || '❌ NOT SET'}`);
            console.log(`   whatsappConnected: ${user.whatsappConnected || false}`);

            // Check for group monitors
            if (collectionNames.includes('groupmonitors')) {
              const monitorCount = await db.collection('groupmonitors').countDocuments({
                userId: new ObjectId(productionUserId)
              });
              console.log(`   Group monitors: ${monitorCount}`);
            }

            // Check for messages
            if (collectionNames.includes('whatsappmessages')) {
              const msgCount = await db.collection('whatsappmessages').countDocuments();
              const recentCount = await db.collection('whatsappmessages').countDocuments({
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              });
              console.log(`   WhatsApp messages: ${msgCount} total, ${recentCount} in last 24h`);
            }

            return dbInfo.name;
          }
        } catch (error) {
          // Skip databases where we don't have access or ObjectId is invalid
        }
      }
    }

    console.log('\n❌ Production user not found in any database');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

findProductionDatabase();
