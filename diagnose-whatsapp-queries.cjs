#!/usr/bin/env node

/**
 * Diagnostic script for WhatsApp query issues
 * 
 * This script tests different query approaches to understand
 * why messages aren't being found
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function diagnose() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('whatsappmessages');

    // 1. Check total message count
    const totalCount = await collection.countDocuments({});
    console.log(`Total WhatsApp messages in database: ${totalCount}`);

    // 2. Check group messages
    const groupMessages = await collection.countDocuments({ 'metadata.isGroup': true });
    console.log(`Group messages: ${groupMessages}`);

    // 3. Sample a few group messages to understand structure
    console.log('\n--- Sample Group Messages Structure ---');
    const sampleMessages = await collection.find({ 'metadata.isGroup': true })
      .limit(3)
      .toArray();
    
    sampleMessages.forEach((msg, index) => {
      console.log(`\nMessage ${index + 1}:`);
      console.log('  _id:', msg._id);
      console.log('  timestamp:', msg.timestamp ? `${msg.timestamp} (${typeof msg.timestamp})` : 'undefined');
      console.log('  createdAt:', msg.createdAt ? `${msg.createdAt} (${typeof msg.createdAt})` : 'undefined');
      console.log('  metadata.groupId:', msg.metadata?.groupId);
      console.log('  metadata.groupName:', msg.metadata?.groupName);
      console.log('  to:', msg.to);
      console.log('  from:', msg.from);
      console.log('  isIncoming:', msg.isIncoming);
    });

    // 4. Test different date queries
    console.log('\n--- Testing Date Queries ---');
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Test timestamp field
    const withTimestampRange = await collection.countDocuments({
      'metadata.isGroup': true,
      timestamp: { $gte: lastWeek, $lte: now }
    });
    console.log(`Messages with timestamp in last week: ${withTimestampRange}`);
    
    // Test createdAt field
    const withCreatedAtRange = await collection.countDocuments({
      'metadata.isGroup': true,
      createdAt: { $gte: lastWeek, $lte: now }
    });
    console.log(`Messages with createdAt in last week: ${withCreatedAtRange}`);
    
    // Test $or query
    const withOrQuery = await collection.countDocuments({
      'metadata.isGroup': true,
      $or: [
        { timestamp: { $gte: lastWeek, $lte: now } },
        { createdAt: { $gte: lastWeek, $lte: now } }
      ]
    });
    console.log(`Messages with $or query in last week: ${withOrQuery}`);

    // 5. Test groupId queries
    console.log('\n--- Testing Group ID Queries ---');
    
    // Get a sample group
    const sampleGroup = await collection.findOne({ 
      'metadata.isGroup': true,
      'metadata.groupId': { $exists: true, $ne: null }
    });
    
    if (sampleGroup) {
      const groupId = sampleGroup.metadata.groupId;
      console.log(`Testing with groupId: ${groupId}`);
      
      // Test direct groupId match
      const byGroupId = await collection.countDocuments({
        'metadata.isGroup': true,
        'metadata.groupId': groupId
      });
      console.log(`  Messages by metadata.groupId: ${byGroupId}`);
      
      // Test with date range
      const byGroupIdWithDate = await collection.countDocuments({
        'metadata.isGroup': true,
        'metadata.groupId': groupId,
        $or: [
          { timestamp: { $gte: lastWeek, $lte: now } },
          { createdAt: { $gte: lastWeek, $lte: now } }
        ]
      });
      console.log(`  Messages by groupId with date range: ${byGroupIdWithDate}`);
    } else {
      console.log('No group with groupId found for testing');
    }

    // 6. Check for data type issues
    console.log('\n--- Data Type Analysis ---');
    
    // Check if timestamp/createdAt are stored as strings
    const stringTimestamp = await collection.findOne({
      'metadata.isGroup': true,
      timestamp: { $type: 'string' }
    });
    
    const stringCreatedAt = await collection.findOne({
      'metadata.isGroup': true,
      createdAt: { $type: 'string' }
    });
    
    if (stringTimestamp) {
      console.log('⚠️ Found messages with timestamp as STRING - this will break date queries!');
      console.log('  Example:', stringTimestamp.timestamp);
    }
    
    if (stringCreatedAt) {
      console.log('⚠️ Found messages with createdAt as STRING - this will break date queries!');
      console.log('  Example:', stringCreatedAt.createdAt);
    }
    
    if (!stringTimestamp && !stringCreatedAt) {
      console.log('✅ Date fields appear to be stored correctly as Date objects');
    }

    // 7. Get date ranges of messages
    console.log('\n--- Message Date Ranges ---');
    
    const oldestByTimestamp = await collection.findOne(
      { 'metadata.isGroup': true, timestamp: { $exists: true } },
      { sort: { timestamp: 1 } }
    );
    
    const newestByTimestamp = await collection.findOne(
      { 'metadata.isGroup': true, timestamp: { $exists: true } },
      { sort: { timestamp: -1 } }
    );
    
    const oldestByCreatedAt = await collection.findOne(
      { 'metadata.isGroup': true, createdAt: { $exists: true } },
      { sort: { createdAt: 1 } }
    );
    
    const newestByCreatedAt = await collection.findOne(
      { 'metadata.isGroup': true, createdAt: { $exists: true } },
      { sort: { createdAt: -1 } }
    );
    
    if (oldestByTimestamp && newestByTimestamp) {
      console.log(`Timestamp range: ${oldestByTimestamp.timestamp} to ${newestByTimestamp.timestamp}`);
    }
    
    if (oldestByCreatedAt && newestByCreatedAt) {
      console.log(`CreatedAt range: ${oldestByCreatedAt.createdAt} to ${newestByCreatedAt.createdAt}`);
    }

    // 8. Recommendations
    console.log('\n--- Diagnosis Summary ---');
    
    if (groupMessages === 0) {
      console.log('❌ No group messages found in database');
      console.log('   → Check WhatsApp connection and group sync');
    } else if (stringTimestamp || stringCreatedAt) {
      console.log('❌ Date fields stored as strings instead of Date objects');
      console.log('   → Need to migrate data to proper Date format');
    } else if (withOrQuery === 0) {
      console.log('❌ No messages found in date range despite having group messages');
      console.log('   → Messages might be too old or dates might be in unexpected format');
    } else {
      console.log('✅ Messages exist and queries should work');
      console.log('   → Check query logic and timezone handling');
    }

  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run diagnostics
diagnose().catch(console.error);