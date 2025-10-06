/**
 * Database Migration Script: Add userId to WhatsApp Data
 * 
 * This script adds userId field to existing WhatsAppContact and WhatsAppMessage documents.
 * It assigns all existing data to the primary user (oldest account or first admin).
 * 
 * CRITICAL: Run this before deploying the multi-user WhatsApp fix!
 * 
 * Usage:
 *   npm run ts-node scripts/migrate-whatsapp-add-userid.ts
 *   
 * Or with custom MongoDB URI:
 *   MONGODB_URI="your_uri" npm run ts-node scripts/migrate-whatsapp-add-userid.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import User from '../models/User';
import WhatsAppContact from '../models/WhatsAppContact';
import WhatsAppMessage from '../models/WhatsAppMessage';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface MigrationStats {
  contactsWithoutUserId: number;
  contactsUpdated: number;
  messagesWithoutUserId: number;
  messagesUpdated: number;
  errors: string[];
}

async function migrateWhatsAppData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    contactsWithoutUserId: 0,
    contactsUpdated: 0,
    messagesWithoutUserId: 0,
    messagesUpdated: 0,
    errors: []
  };

  try {
    console.log('\n🔍 Starting WhatsApp Data Migration...\n');
    console.log('=' .repeat(60));

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGO_URI environment variable is not set!');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully\n');

    // Find the primary user (oldest account or first admin)
    console.log('👤 Finding primary user...');
    let primaryUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
    
    if (!primaryUser) {
      console.log('   No admin found, using oldest user...');
      primaryUser = await User.findOne().sort({ createdAt: 1 });
    }

    if (!primaryUser) {
      throw new Error('❌ No users found in the database! Cannot proceed with migration.');
    }

    console.log(`✅ Primary user identified:`);
    console.log(`   - Email: ${primaryUser.email}`);
    console.log(`   - Role: ${primaryUser.role}`);
    console.log(`   - ID: ${primaryUser._id}`);
    console.log(`   - Created: ${primaryUser.createdAt}\n`);

    // Migrate Contacts
    console.log('=' .repeat(60));
    console.log('📇 Migrating WhatsApp Contacts...\n');
    
    // Count contacts without userId
    stats.contactsWithoutUserId = await WhatsAppContact.countDocuments({ 
      userId: { $exists: false } 
    });
    
    console.log(`   Found ${stats.contactsWithoutUserId} contacts without userId`);

    if (stats.contactsWithoutUserId > 0) {
      // Update contacts
      const contactResult = await WhatsAppContact.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: primaryUser._id } }
      );
      
      stats.contactsUpdated = contactResult.modifiedCount;
      console.log(`   ✅ Updated ${stats.contactsUpdated} contacts`);
      
      if (stats.contactsUpdated !== stats.contactsWithoutUserId) {
        const warning = `   ⚠️  Warning: Expected to update ${stats.contactsWithoutUserId} but only updated ${stats.contactsUpdated}`;
        console.log(warning);
        stats.errors.push(warning);
      }
    } else {
      console.log(`   ℹ️  No contacts need migration (all have userId already)`);
    }

    // Migrate Messages
    console.log('\n' + '='.repeat(60));
    console.log('💬 Migrating WhatsApp Messages...\n');
    
    // Count messages without userId
    stats.messagesWithoutUserId = await WhatsAppMessage.countDocuments({ 
      userId: { $exists: false } 
    });
    
    console.log(`   Found ${stats.messagesWithoutUserId} messages without userId`);

    if (stats.messagesWithoutUserId > 0) {
      // Update messages in batches (more efficient for large collections)
      const BATCH_SIZE = 1000;
      let processed = 0;
      
      while (processed < stats.messagesWithoutUserId) {
        const messageResult = await WhatsAppMessage.updateMany(
          { userId: { $exists: false } },
          { $set: { userId: primaryUser._id } },
          { limit: BATCH_SIZE }
        );
        
        processed += messageResult.modifiedCount;
        stats.messagesUpdated += messageResult.modifiedCount;
        
        if (stats.messagesWithoutUserId > BATCH_SIZE) {
          console.log(`   Progress: ${processed}/${stats.messagesWithoutUserId} messages...`);
        }
        
        // If no more documents were modified, break
        if (messageResult.modifiedCount === 0) {
          break;
        }
      }
      
      console.log(`   ✅ Updated ${stats.messagesUpdated} messages`);
      
      if (stats.messagesUpdated !== stats.messagesWithoutUserId) {
        const warning = `   ⚠️  Warning: Expected to update ${stats.messagesWithoutUserId} but only updated ${stats.messagesUpdated}`;
        console.log(warning);
        stats.errors.push(warning);
      }
    } else {
      console.log(`   ℹ️  No messages need migration (all have userId already)`);
    }

    // Verification
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Verifying Migration...\n');
    
    const remainingContactsWithoutUserId = await WhatsAppContact.countDocuments({ 
      userId: { $exists: false } 
    });
    const remainingMessagesWithoutUserId = await WhatsAppMessage.countDocuments({ 
      userId: { $exists: false } 
    });
    
    console.log(`   Contacts without userId: ${remainingContactsWithoutUserId}`);
    console.log(`   Messages without userId: ${remainingMessagesWithoutUserId}`);
    
    if (remainingContactsWithoutUserId === 0 && remainingMessagesWithoutUserId === 0) {
      console.log(`   ✅ All WhatsApp data now has userId assigned!`);
    } else {
      const error = `   ❌ Migration incomplete! ${remainingContactsWithoutUserId} contacts and ${remainingMessagesWithoutUserId} messages still need userId`;
      console.log(error);
      stats.errors.push(error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:\n');
    console.log(`   Contacts migrated: ${stats.contactsUpdated}/${stats.contactsWithoutUserId}`);
    console.log(`   Messages migrated: ${stats.messagesUpdated}/${stats.messagesWithoutUserId}`);
    console.log(`   Errors: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n   ⚠️  Warnings/Errors:`);
      stats.errors.forEach(err => console.log(`      - ${err}`));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Migration Error:', error);
    stats.errors.push(error.message);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  }

  return stats;
}

// Run migration
if (require.main === module) {
  migrateWhatsAppData()
    .then((stats) => {
      if (stats.errors.length > 0) {
        console.error('❌ Migration completed with errors');
        process.exit(1);
      } else {
        console.log('✅ Migration completed successfully');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateWhatsAppData };

