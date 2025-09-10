#!/usr/bin/env node

/**
 * Diagnostic script for WhatsApp message retrieval issues
 * 
 * This script helps diagnose why WhatsApp summaries might show 0 messages
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

    // 3. Check messages with different timestamp fields
    const withTimestamp = await collection.countDocuments({ timestamp: { $exists: true } });
    const withCreatedAt = await collection.countDocuments({ createdAt: { $exists: true } });
    console.log(`Messages with 'timestamp' field: ${withTimestamp}`);
    console.log(`Messages with 'createdAt' field: ${withCreatedAt}`);

    // 4. Check isIncoming distribution
    const incoming = await collection.countDocuments({ isIncoming: true });
    const outgoing = await collection.countDocuments({ isIncoming: false });
    const noIncoming = await collection.countDocuments({ isIncoming: { $exists: false } });
    console.log(`\nMessage direction:`);
    console.log(`- Incoming: ${incoming}`);
    console.log(`- Outgoing: ${outgoing}`);
    console.log(`- No isIncoming field: ${noIncoming}`);

    // 5. Sample a group message to see its structure
    console.log('\n--- Sample Group Message Structure ---');
    const sampleMessage = await collection.findOne({ 'metadata.isGroup': true });
    if (sampleMessage) {
      console.log(JSON.stringify({
        _id: sampleMessage._id,
        from: sampleMessage.from,
        to: sampleMessage.to,
        timestamp: sampleMessage.timestamp,
        createdAt: sampleMessage.createdAt,
        isIncoming: sampleMessage.isIncoming,
        metadata: sampleMessage.metadata,
        message: sampleMessage.message ? sampleMessage.message.substring(0, 50) + '...' : 'No message text'
      }, null, 2));
    } else {
      console.log('No group messages found');
    }

    // 6. Check unique groups
    console.log('\n--- Unique Groups ---');
    const groups = await collection.distinct('metadata.groupName', { 'metadata.isGroup': true });
    console.log(`Found ${groups.length} unique groups:`);
    groups.slice(0, 5).forEach(group => {
      console.log(`- ${group}`);
    });
    if (groups.length > 5) {
      console.log(`... and ${groups.length - 5} more`);
    }

    // 7. Check date ranges
    console.log('\n--- Date Ranges ---');
    const oldestMessage = await collection.findOne({}, {}, { sort: { createdAt: 1 } });
    const newestMessage = await collection.findOne({}, {}, { sort: { createdAt: -1 } });
    
    if (oldestMessage && newestMessage) {
      console.log(`Oldest message: ${oldestMessage.createdAt || oldestMessage.timestamp}`);
      console.log(`Newest message: ${newestMessage.createdAt || newestMessage.timestamp}`);
    }

    // 8. Check today's messages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMessages = await collection.countDocuments({
      'metadata.isGroup': true,
      $or: [
        { createdAt: { $gte: today, $lt: tomorrow } },
        { timestamp: { $gte: today, $lt: tomorrow } }
      ]
    });
    console.log(`\nGroup messages today: ${todayMessages}`);

    // 9. Recommendations
    console.log('\n--- Recommendations ---');
    if (groupMessages === 0) {
      console.log('❌ No group messages found. Check WhatsApp connection and group sync.');
    } else if (incoming === 0 && outgoing > 0) {
      console.log('⚠️  Only outgoing messages found. The isIncoming filter might be the issue.');
    } else if (withTimestamp === 0 && withCreatedAt > 0) {
      console.log('⚠️  Messages only have createdAt field. Queries should use createdAt instead of timestamp.');
    } else if (withCreatedAt === 0 && withTimestamp > 0) {
      console.log('⚠️  Messages only have timestamp field. Queries should use timestamp instead of createdAt.');
    } else {
      console.log('✅ Database structure looks normal. Check query logic and date ranges.');
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