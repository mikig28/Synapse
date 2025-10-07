const { MongoClient } = require('mongodb');

async function testConnection() {
  const MONGO_URL = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

  console.log('Testing MongoDB connection after M2 upgrade...\n');

  const client = new MongoClient(MONGO_URL);

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();

    console.log('📊 STORAGE USAGE (M2 Tier - 2 GB quota):\n');

    let total = 0;
    for (const db of databases) {
      const sizeMB = db.sizeOnDisk / 1024 / 1024;
      total += sizeMB;
      console.log(`  ${db.name}: ${sizeMB.toFixed(2)} MB`);
    }

    console.log(`\n📦 Total: ${total.toFixed(2)} MB / 2048 MB (M2 tier)`);
    console.log(`✅ ${((total / 2048) * 100).toFixed(1)}% of M2 quota used\n`);

    // Test a write operation
    console.log('Testing write operation...');
    const testDb = client.db('test');
    const result = await testDb.collection('upgrade_test').insertOne({
      test: 'M2 upgrade verification',
      timestamp: new Date(),
      message: 'If you see this, writes are working!'
    });
    console.log('✅ Write successful! ID:', result.insertedId);

    // Clean up test document
    await testDb.collection('upgrade_test').deleteOne({ _id: result.insertedId });
    console.log('✅ Cleanup successful\n');

    console.log('🎉 MongoDB M2 upgrade verified! WhatsApp should now work.\n');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nPossible reasons:');
    console.log('1. MongoDB is still upgrading (wait 5 minutes)');
    console.log('2. Connection string changed after upgrade');
    console.log('3. IP whitelist needs updating\n');
  } finally {
    await client.close();
  }
}

testConnection();
