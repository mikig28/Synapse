/**
 * Check user's WhatsApp session ID in main database
 */

const { MongoClient } = require('mongodb');

async function checkUserSession() {
  const MONGO_URL = 'mongodb+srv://mikig20:5AWJfSRAb1eCvLKk@cluster0.7tekyw1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(MONGO_URL);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected');

    const db = client.db('test'); // Your main database
    const users = db.collection('users');

    // Find the user
    const { ObjectId } = require('mongodb');
    const user = await users.findOne({ _id: new ObjectId('6828510b49ea27a15a2226c0') });

    if (user) {
      console.log('\n👤 Found user:', user.email || user.username || user._id);
      console.log('📱 WhatsApp session ID:', user.whatsappSessionId || 'NOT SET');

      if (user.whatsappSessionId) {
        console.log('\n⚠️  Found existing session ID:', user.whatsappSessionId);
        console.log('🗑️  Clearing it to allow new shorter format...');

        await users.updateOne(
          { _id: new ObjectId('6828510b49ea27a15a2226c0') },
          {
            $unset: { whatsappSessionId: '' },
            $set: { whatsappConnected: false }
          }
        );

        console.log('✅ Cleared old session ID from user record');
        console.log('📝 Next login will create new short session: u_6828510b49ea');
      } else {
        console.log('✅ Session ID is already clean or not set');
      }
    } else {
      console.log('❌ User not found with ID: 6828510b49ea27a15a2226c0');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected');
  }
}

checkUserSession().catch(console.error);
