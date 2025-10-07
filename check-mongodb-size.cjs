/**
 * Check MongoDB Atlas storage usage
 */

const { MongoClient } = require('mongodb');

async function checkStorage() {
  const MONGO_URL = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(MONGO_URL);

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected\n');

    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();

    console.log('📊 STORAGE USAGE BY DATABASE:\n');

    let totalSize = 0;
    const dbSizes = [];

    for (const db of databases) {
      const sizeMB = db.sizeOnDisk / 1024 / 1024;
      totalSize += sizeMB;
      dbSizes.push({ name: db.name, sizeMB });
    }

    // Sort by size descending
    dbSizes.sort((a, b) => b.sizeMB - a.sizeMB);

    dbSizes.forEach(db => {
      const percentage = (db.sizeMB / totalSize * 100).toFixed(1);
      console.log(`  ${db.name}`);
      console.log(`    Size: ${db.sizeMB.toFixed(2)} MB (${percentage}%)`);
      console.log('');
    });

    console.log(`📦 Total Usage: ${totalSize.toFixed(2)} MB / 512 MB`);
    console.log(`⚠️  ${(totalSize / 512 * 100).toFixed(1)}% of free tier limit used`);

    if (totalSize > 500) {
      console.log('\n🚨 CRITICAL: Near or over storage limit!');
      console.log('   Actions needed:');
      console.log('   1. Delete unused databases (sample_mflix)');
      console.log('   2. Archive old messages/data');
      console.log('   3. Upgrade to paid tier ($9/month for 2GB)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected');
  }
}

checkStorage().catch(console.error);
