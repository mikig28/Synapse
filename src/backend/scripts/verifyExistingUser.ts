/**
 * Script to manually verify an existing user's email
 * Usage: npx tsx scripts/verifyExistingUser.ts <email>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import User model
import User from '../src/models/User';

async function verifyUser(email: string) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\nUser found: ${user.email}`);
    console.log(`Current verification status: ${user.isEmailVerified ? '✅ Verified' : '❌ Not Verified'}`);
    console.log(`Google ID: ${user.googleId || 'None'}`);
    console.log(`Created: ${user.createdAt}`);

    // Update verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log(`\n✅ Email verified successfully for ${email}`);
    console.log('User can now login!');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: npx tsx scripts/verifyExistingUser.ts <email>');
  process.exit(1);
}

verifyUser(email);
