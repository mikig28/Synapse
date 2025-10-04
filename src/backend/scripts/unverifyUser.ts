/**
 * Script to unverify a user's email (for testing email verification)
 * Usage: npx tsx scripts/unverifyUser.ts <email>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import User model
import User from '../src/models/User';

async function unverifyUser(email: string) {
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

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user to unverified state with new token
    user.isEmailVerified = false;
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = tokenExpiry;
    await user.save();

    console.log(`\n❌ Email UNVERIFIED for ${email}`);
    console.log('✅ New verification token generated');
    console.log(`Token expires: ${tokenExpiry.toISOString()}`);
    console.log('\nUser can now test email verification flow!');
    console.log('They will need to receive verification email or use resend button.');

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
  console.log('Usage: npx tsx scripts/unverifyUser.ts <email>');
  process.exit(1);
}

unverifyUser(email);
