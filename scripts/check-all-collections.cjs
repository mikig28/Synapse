// Check ALL collections in test database
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function checkAllCollections() {
  const client = new MongoClient(uri);

  try {
    console.log('🔍 Checking ALL collections in "test" database...\n');
    await client.connect();

    const db = client.db('test');
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections:\n`);

    // Check each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();

      console.log(`✅ ${collectionName}`);
      console.log(`   Documents: ${count}`);

      // Show sample for important collections
      if (count > 0 && ['users', 'groupmonitors', 'tasks', 'notes', 'bookmarks', 'telegrambotmanagers', 'locations', 'ideas'].includes(collectionName)) {
        const sample = await db.collection(collectionName).findOne({});
        if (sample) {
          if (collectionName === 'users') {
            console.log(`   Sample: ${sample.email}`);
          } else if (collectionName === 'groupmonitors') {
            console.log(`   Sample: ${sample.groupName}`);
          } else if (collectionName === 'tasks') {
            console.log(`   Sample: ${sample.text?.substring(0, 50)}...`);
          } else if (collectionName === 'bookmarks') {
            console.log(`   Sample: ${sample.title?.substring(0, 50)}...`);
          } else if (collectionName === 'notes') {
            console.log(`   Sample: ${sample.content?.substring(0, 50)}...`);
          }
        }
      }
      console.log('');
    }

    console.log('\n✅ All your data is in the "test" database!');
    console.log('   Adding /test to MongoDB URI will access the SAME data.');
    console.log('   Nothing will change - you will just be explicit about which database to use.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAllCollections();
