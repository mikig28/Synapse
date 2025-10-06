/**
 * Script to promote a user to admin role
 * Usage: npx ts-node scripts/promoteToAdmin.ts <email>
 */

import mongoose from 'mongoose';
import User from '../src/models/User';
import { connectToDatabase } from '../src/config/database';

async function promoteUserToAdmin(email: string): Promise<void> {
  try {
    console.log(`\n🔍 Searching for user: ${email}...`);

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Check if already admin
    if (user.role === 'admin') {
      console.log(`✅ User ${email} is already an admin!`);
      process.exit(0);
    }

    // Promote to admin
    user.role = 'admin';
    await user.save();

    console.log(`\n✅ SUCCESS! User promoted to admin:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.fullName || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`\n🎉 ${user.email} now has full admin access to the platform!\n`);

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error promoting user: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error(`
❌ Error: Email required

Usage:
  npx ts-node scripts/promoteToAdmin.ts <email>

Example:
  npx ts-node scripts/promoteToAdmin.ts admin@example.com
    `);
    process.exit(1);
  }

  console.log('📡 Connecting to database...');
  await connectToDatabase();

  await promoteUserToAdmin(email);
}

main();
