#!/usr/bin/env ts-node
/**
 * MongoDB Monitoring Database Diagnostic Script
 *
 * Checks:
 * 1. Database connection and name
 * 2. User's whatsappSessionId field
 * 3. GroupMonitor documents and their configuration
 * 4. WhatsApp message counts
 * 5. Recent webhook activity indicators
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Models
import User from '../src/backend/src/models/User';
import GroupMonitor from '../src/backend/src/models/GroupMonitor';
import WhatsAppMessage from '../src/backend/src/models/WhatsAppMessage';

async function checkMonitoringDatabase() {
  try {
    console.log('🔍 MongoDB Monitoring Database Diagnostic\n');
    console.log('=' .repeat(60));

    // 1. Connect to database
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('\n📡 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));

    await mongoose.connect(MONGODB_URI);

    const dbName = mongoose.connection.db.databaseName;
    console.log('✅ Connected successfully');
    console.log('📊 Database name:', dbName);
    console.log('🌍 Host:', mongoose.connection.host);

    // 2. Check User document
    console.log('\n' + '=' .repeat(60));
    console.log('👤 Checking User Configuration\n');

    const users = await User.find({}).select('email whatsappSessionId whatsappConnected whatsappPhoneNumber');
    console.log(`Found ${users.length} user(s):`);

    for (const user of users) {
      console.log(`\n  User: ${user.email}`);
      console.log(`  - ID: ${user._id}`);
      console.log(`  - WhatsApp Session ID: ${user.whatsappSessionId || '❌ NOT SET'}`);
      console.log(`  - WhatsApp Connected: ${user.whatsappConnected ? '✅' : '❌'}`);
      console.log(`  - WhatsApp Phone: ${user.whatsappPhoneNumber || 'Not set'}`);

      if (!user.whatsappSessionId) {
        console.log(`  ⚠️  WARNING: User ${user.email} has no whatsappSessionId!`);
        console.log(`      Webhooks will not route to this user.`);
      }
    }

    // 3. Check GroupMonitor documents
    console.log('\n' + '=' .repeat(60));
    console.log('📱 Checking Group Monitors\n');

    const monitors = await GroupMonitor.find({}).populate('userId', 'email');
    console.log(`Found ${monitors.length} group monitor(s):`);

    for (const monitor of monitors) {
      console.log(`\n  Monitor: ${monitor.groupName}`);
      console.log(`  - ID: ${monitor._id}`);
      console.log(`  - Group ID: ${monitor.groupId}`);
      console.log(`  - User: ${(monitor.userId as any)?.email || 'Unknown'}`);
      console.log(`  - Active: ${monitor.isActive ? '✅' : '❌'}`);
      console.log(`  - Statistics:`);
      console.log(`    • Total Messages: ${monitor.statistics.totalMessages}`);
      console.log(`    • Images Processed: ${monitor.statistics.imagesProcessed}`);
      console.log(`    • Persons Detected: ${monitor.statistics.personsDetected}`);
      console.log(`    • Last Activity: ${monitor.statistics.lastActivity || 'Never'}`);
      console.log(`  - Settings:`);
      console.log(`    • Notify on Match: ${monitor.settings.notifyOnMatch ? '✅' : '❌'}`);
      console.log(`    • Save All Images: ${monitor.settings.saveAllImages ? '✅' : '❌'}`);
      console.log(`    • Confidence Threshold: ${monitor.settings.confidenceThreshold}%`);
      console.log(`    • Process Voice Notes: ${monitor.settings.processVoiceNotes ? '✅' : '❌'}`);
      console.log(`    • Send Feedback Messages: ${monitor.settings.sendFeedbackMessages ? '✅' : '❌'}`);
      console.log(`    • Capture Social Links: ${monitor.settings.captureSocialLinks ? '✅' : '❌'}`);
    }

    // 4. Check WhatsApp messages
    console.log('\n' + '=' .repeat(60));
    console.log('💬 Checking WhatsApp Messages\n');

    const messageCount = await WhatsAppMessage.countDocuments({});
    console.log(`Total WhatsApp messages in database: ${messageCount}`);

    if (messageCount > 0) {
      const recentMessages = await WhatsAppMessage.find({})
        .sort({ timestamp: -1 })
        .limit(5)
        .select('chatId from body timestamp');

      console.log('\nMost recent 5 messages:');
      for (const msg of recentMessages) {
        console.log(`  - ${new Date(msg.timestamp).toISOString()}`);
        console.log(`    Chat: ${msg.chatId}`);
        console.log(`    From: ${msg.from}`);
        console.log(`    Body: ${msg.body?.substring(0, 50) || '[no text]'}...`);
      }

      // Check for recent messages (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCount = await WhatsAppMessage.countDocuments({
        timestamp: { $gte: oneDayAgo }
      });

      console.log(`\n📊 Messages in last 24 hours: ${recentCount}`);
      if (recentCount === 0) {
        console.log('⚠️  No recent messages - webhook may not be working!');
      }
    }

    // 5. Database health summary
    console.log('\n' + '=' .repeat(60));
    console.log('📋 Summary & Recommendations\n');

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check database name
    if (dbName === 'test') {
      warnings.push('Database name is "test" - ensure this is intentional for production');
    }

    // Check users have session IDs
    const usersWithoutSession = users.filter(u => !u.whatsappSessionId);
    if (usersWithoutSession.length > 0) {
      issues.push(`${usersWithoutSession.length} user(s) missing whatsappSessionId`);
    }

    // Check active monitors exist
    const activeMonitors = monitors.filter(m => m.isActive);
    if (activeMonitors.length === 0) {
      warnings.push('No active group monitors found');
    }

    // Check recent activity
    const hasRecentActivity = monitors.some(m => {
      if (!m.statistics.lastActivity) return false;
      const lastActivity = new Date(m.statistics.lastActivity);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return lastActivity > oneDayAgo;
    });

    if (!hasRecentActivity && activeMonitors.length > 0) {
      issues.push('No monitoring activity in last 24 hours despite active monitors');
    }

    // Print issues and warnings
    if (issues.length > 0) {
      console.log('❌ Issues Found:');
      issues.forEach(issue => console.log(`  • ${issue}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ Database configuration looks good!');
    }

    console.log('\n' + '=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Error during diagnostic:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run diagnostic
checkMonitoringDatabase().then(() => {
  console.log('\n✅ Diagnostic complete\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Diagnostic failed:', err);
  process.exit(1);
});
