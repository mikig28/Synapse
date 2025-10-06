/**
 * Quick script to promote user to admin
 * Run with: node scripts/promoteAdmin.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ADMIN_EMAIL = 'mikig14@yahoo.com';

async function promoteToAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Define User schema inline
    const UserSchema = new mongoose.Schema({
      email: String,
      role: String,
      fullName: String,
    });

    const User = mongoose.model('User', UserSchema);

    // Find and update user
    console.log(`\n🔍 Searching for user: ${ADMIN_EMAIL}...`);
    const user = await User.findOne({ email: ADMIN_EMAIL });

    if (!user) {
      console.error(`❌ User not found: ${ADMIN_EMAIL}`);
      console.log('\n💡 Make sure this email is registered in the system first!');
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`✅ User ${ADMIN_EMAIL} is already an admin!`);
    } else {
      user.role = 'admin';
      await user.save();
      console.log(`\n✅ SUCCESS! User promoted to admin:`);
    }

    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`\n🎉 ${user.email} now has full admin access!\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
}

promoteToAdmin();
