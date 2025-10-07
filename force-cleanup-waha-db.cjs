/**
 * Force cleanup of broken WAHA databases via MongoDB Atlas API
 * This bypasses WAHA's delete endpoint which fails due to the long name
 */

const { MongoClient } = require('mongodb');

async function forceCleanup() {
  const MONGO_URL = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(MONGO_URL);

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected');

    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();

    console.log('\n📋 All databases:');
    databases.forEach(db => {
      const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      console.log(`  - ${db.name} (${sizeMB} MB)`);
    });

    // Find and drop any databases starting with waha_
    const wahaDbs = databases.filter(db => db.name.startsWith('waha_'));

    if (wahaDbs.length === 0) {
      console.log('\n✅ No WAHA databases found to clean');
      return;
    }

    console.log(`\n🗑️  Found ${wahaDbs.length} WAHA database(s) to clean:`);
    wahaDbs.forEach(db => console.log(`  - ${db.name}`));

    for (const dbInfo of wahaDbs) {
      try {
        console.log(`\n🗑️  Dropping database: ${dbInfo.name}`);
        const db = client.db(dbInfo.name);
        await db.dropDatabase();
        console.log(`✅ Successfully dropped: ${dbInfo.name}`);
      } catch (dropError) {
        console.error(`❌ Failed to drop ${dbInfo.name}:`, dropError.message);

        // Try alternative: drop all collections individually
        try {
          console.log(`  🔄 Trying to drop collections individually...`);
          const db = client.db(dbInfo.name);
          const collections = await db.listCollections().toArray();

          for (const coll of collections) {
            await db.collection(coll.name).drop();
            console.log(`  ✅ Dropped collection: ${coll.name}`);
          }

          console.log(`  ✅ All collections dropped from ${dbInfo.name}`);
        } catch (collError) {
          console.error(`  ❌ Collection cleanup failed:`, collError.message);
        }
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log('📝 Next step: Restart backend to create new session with short name');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

forceCleanup().catch(console.error);
