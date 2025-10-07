/**
 * Emergency cleanup script for broken WAHA session
 * Run this to manually clean up the MongoDB database
 */

const { MongoClient } = require('mongodb');

async function cleanupBrokenSession() {
  const MONGO_URL = process.env.WHATSAPP_SESSIONS_MONGO_URL || 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

  const client = new MongoClient(MONGO_URL);

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const admin = client.db().admin();

    // List all databases
    console.log('\n📋 Listing all databases...');
    const { databases } = await admin.listDatabases();

    console.log('\nFound databases:');
    databases.forEach(db => {
      const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      console.log(`  - ${db.name} (${sizeMB} MB)`);
    });

    // Find the problematic database
    const brokenDbName = databases.find(db =>
      db.name.includes('user_6828510b49ea27a15a2226c0_mgg36r3k_23fyy')
    );

    if (brokenDbName) {
      console.log(`\n⚠️  Found broken database: ${brokenDbName.name}`);
      console.log('❌ This database name is too long for MongoDB Atlas (max 38 bytes)');

      // MongoDB Atlas has this limitation but we can try to drop it
      try {
        console.log('\n🗑️  Attempting to drop the broken database...');
        const brokenDb = client.db(brokenDbName.name);
        await brokenDb.dropDatabase();
        console.log('✅ Successfully dropped broken database!');
      } catch (dropError) {
        console.error('❌ Cannot drop database:', dropError.message);
        console.log('\n💡 Manual cleanup required via MongoDB Atlas dashboard');
      }
    } else {
      console.log('\n✅ No broken databases found with that session ID');
    }

    // Check for session metadata in WAHA database
    console.log('\n🔍 Checking WAHA session metadata...');

    try {
      const wahaDb = client.db('waha');
      const sessions = await wahaDb.collection('sessions').find({}).toArray();

      console.log(`\nFound ${sessions.length} sessions in WAHA metadata:`);
      sessions.forEach(session => {
        console.log(`  - ${session.name || session._id} (status: ${session.status || 'unknown'})`);
      });

      // Try to remove the broken session metadata
      const brokenSession = sessions.find(s =>
        s.name && s.name.includes('user_6828510b49ea27a15a2226c0_mgg36r3k_23fyy')
      );

      if (brokenSession) {
        console.log('\n🗑️  Deleting broken session metadata...');
        const result = await wahaDb.collection('sessions').deleteOne({
          _id: brokenSession._id
        });
        console.log(`✅ Deleted ${result.deletedCount} session(s) from metadata`);
      } else {
        console.log('✅ No broken session found in metadata');
      }
    } catch (metaError) {
      console.log('⚠️  WAHA metadata database not found (this is okay)');
    }

    console.log('\n🎉 Cleanup completed!');
    console.log('📝 Next step: Try connecting WhatsApp again in the frontend');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanupBrokenSession().catch(console.error);
