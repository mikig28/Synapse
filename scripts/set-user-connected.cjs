// Set user as connected in database
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';
const productionUserId = '6828510b49ea27a15a2226c0';

async function setUserConnected() {
  const client = new MongoClient(uri);

  try {
    console.log('🔧 Setting user as connected...\n');
    await client.connect();

    const db = client.db('test');
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(productionUserId) },
      {
        $set: {
          whatsappConnected: true,
          whatsappLastConnected: new Date(),
          'whatsappSessionData.status': 'WORKING'
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ User updated successfully!');

      const user = await usersCollection.findOne({ _id: new ObjectId(productionUserId) });
      console.log('\nUser status:');
      console.log(`  Email: ${user.email}`);
      console.log(`  whatsappSessionId: ${user.whatsappSessionId}`);
      console.log(`  whatsappConnected: ${user.whatsappConnected}`);
      console.log(`  whatsappLastConnected: ${user.whatsappLastConnected}`);
      console.log(`  Session status: ${user.whatsappSessionData?.status || 'Not set'}`);
    } else {
      console.log('⚠️  No changes made');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

setUserConnected();
