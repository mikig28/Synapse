// Fix user whatsappSessionId in database
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function fixSessionId() {
  const client = new MongoClient(uri);

  try {
    console.log('🔧 Fixing WhatsApp Session IDs...\n');
    await client.connect();

    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find the main user (your account)
    const mainUser = await usersCollection.findOne({
      email: { $regex: /@gmail\.com$|mikig/i }
    });

    if (!mainUser) {
      console.error('❌ Could not find main user');
      console.log('\nAll users in database:');
      const allUsers = await usersCollection.find({}).toArray();
      allUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u._id})`));
      return;
    }

    console.log(`Found user: ${mainUser.email}`);
    console.log(`User ID: ${mainUser._id}`);
    console.log(`Current whatsappSessionId: ${mainUser.whatsappSessionId || '❌ NOT SET'}`);

    // The session ID from WAHA
    const sessionId = 'u_6828510b49ea';

    console.log(`\n🔄 Setting whatsappSessionId to: ${sessionId}`);

    const result = await usersCollection.updateOne(
      { _id: mainUser._id },
      {
        $set: {
          whatsappSessionId: sessionId,
          whatsappConnected: true,
          whatsappLastConnected: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated user whatsappSessionId!');

      // Verify the update
      const updatedUser = await usersCollection.findOne({ _id: mainUser._id });
      console.log('\nVerification:');
      console.log(`  whatsappSessionId: ${updatedUser.whatsappSessionId}`);
      console.log(`  whatsappConnected: ${updatedUser.whatsappConnected}`);
      console.log(`  whatsappLastConnected: ${updatedUser.whatsappLastConnected}`);
    } else {
      console.log('⚠️  No changes made (value already correct or user not found)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixSessionId();
