/**
 * EMERGENCY: Delete sample_mflix database to free 145 MB
 * This buys time but doesn't solve the root problem (local database 4.4 GB)
 */

const { MongoClient } = require('mongodb');

async function emergencyCleanup() {
  const MONGO_URL = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(MONGO_URL);

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected\n');

    // Delete sample_mflix database
    console.log('🗑️  Deleting sample_mflix database...');
    await client.db('sample_mflix').dropDatabase();
    console.log('✅ Deleted sample_mflix database (freed ~145 MB)\n');

    // Check remaining storage
    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();

    console.log('📊 Remaining databases:\n');
    let total = 0;
    for (const db of databases) {
      const sizeMB = db.sizeOnDisk / 1024 / 1024;
      total += sizeMB;
      console.log(`  ${db.name}: ${sizeMB.toFixed(2)} MB`);
    }

    console.log(`\n📦 Total: ${total.toFixed(2)} MB / 512 MB`);
    console.log(`⚠️  Still ${((total / 512) * 100).toFixed(1)}% of limit used\n`);

    if (total > 500) {
      console.log('🚨 STILL OVER LIMIT!');
      console.log('   The local database (4.4 GB) is the real problem.');
      console.log('   You MUST upgrade to M2 Shared ($9/month) for WhatsApp to work.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected');
  }
}

emergencyCleanup().catch(console.error);
