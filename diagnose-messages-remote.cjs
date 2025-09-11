#!/usr/bin/env node

/**
 * Remote Diagnostic for WhatsApp Messages
 * This will help us understand what fields the messages actually have
 */

const axios = require('axios');

const BACKEND_URL = 'https://synapse-backend-7lq6.onrender.com';

async function diagnose() {
  console.log('🔍 Diagnosing WhatsApp Messages Structure...\n');
  
  // Create a diagnostic endpoint temporarily
  const diagnosticCode = `
    const messages = await WhatsAppMessage.find({ 'metadata.isGroup': true })
      .limit(5)
      .lean();
    
    const analysis = {
      totalGroupMessages: await WhatsAppMessage.countDocuments({ 'metadata.isGroup': true }),
      sampleMessages: messages.map(m => ({
        hasTimestamp: !!m.timestamp,
        hasCreatedAt: !!m.createdAt,
        timestampType: m.timestamp ? typeof m.timestamp : 'missing',
        createdAtType: m.createdAt ? typeof m.createdAt : 'missing',
        timestampValue: m.timestamp ? m.timestamp : null,
        createdAtValue: m.createdAt ? m.createdAt : null,
        metadata: {
          isGroup: m.metadata?.isGroup,
          groupId: m.metadata?.groupId,
          groupName: m.metadata?.groupName
        }
      })),
      fieldStats: {
        withTimestamp: await WhatsAppMessage.countDocuments({ 
          'metadata.isGroup': true, 
          timestamp: { $exists: true } 
        }),
        withCreatedAt: await WhatsAppMessage.countDocuments({ 
          'metadata.isGroup': true, 
          createdAt: { $exists: true } 
        }),
        withBoth: await WhatsAppMessage.countDocuments({ 
          'metadata.isGroup': true,
          $and: [
            { timestamp: { $exists: true } },
            { createdAt: { $exists: true } }
          ]
        })
      },
      recentMessages: {
        last24h_timestamp: await WhatsAppMessage.countDocuments({
          'metadata.isGroup': true,
          timestamp: { 
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
          }
        }),
        last24h_createdAt: await WhatsAppMessage.countDocuments({
          'metadata.isGroup': true,
          createdAt: { 
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
          }
        })
      }
    };
    
    return analysis;
  `;
  
  console.log('Diagnostic Analysis:');
  console.log('====================\n');
  console.log('To properly diagnose, we need to:');
  console.log('1. Check what timestamp fields exist in the messages');
  console.log('2. Verify the data types of these fields');
  console.log('3. Count messages in different time ranges');
  console.log('4. Understand the actual data structure\n');
  
  console.log('Since we cannot directly query the database from here,');
  console.log('we need to add temporary logging to the backend.\n');
  
  console.log('📝 Recommended Diagnostic Steps:\n');
  console.log('1. Add this temporary endpoint to the backend:\n');
  
  console.log('```javascript');
  console.log('// In whatsappSummaryController.ts, add:');
  console.log('export const diagnoseDatabaseFields = async (req: Request, res: Response) => {');
  console.log('  try {');
  console.log('    const sample = await WhatsAppMessage.findOne({ "metadata.isGroup": true }).lean();');
  console.log('    const stats = {');
  console.log('      sampleMessage: {');
  console.log('        hasTimestamp: !!sample?.timestamp,');
  console.log('        hasCreatedAt: !!sample?.createdAt,');
  console.log('        timestampValue: sample?.timestamp,');
  console.log('        createdAtValue: sample?.createdAt,');
  console.log('        messageDate: sample?.timestamp || sample?.createdAt');
  console.log('      },');
  console.log('      totalWithTimestamp: await WhatsAppMessage.countDocuments({');
  console.log('        "metadata.isGroup": true,');
  console.log('        timestamp: { $exists: true }');
  console.log('      }),');
  console.log('      totalWithCreatedAt: await WhatsAppMessage.countDocuments({');
  console.log('        "metadata.isGroup": true,');
  console.log('        createdAt: { $exists: true }');
  console.log('      })');
  console.log('    };');
  console.log('    res.json({ success: true, data: stats });');
  console.log('  } catch (error) {');
  console.log('    res.status(500).json({ success: false, error: error.message });');
  console.log('  }');
  console.log('};');
  console.log('```\n');
  
  console.log('2. The issue is likely one of these:');
  console.log('   a) Messages have createdAt but we\'re querying timestamp');
  console.log('   b) Messages have timestamp but we\'re querying createdAt');
  console.log('   c) The date fields are stored as strings instead of Date objects');
  console.log('   d) The timezone conversion is causing date mismatches\n');
  
  console.log('3. Quick Fix Options:');
  console.log('   Option A: Query both fields with fallback');
  console.log('   Option B: Add a migration to standardize the timestamp field');
  console.log('   Option C: Use aggregation to coalesce the fields\n');
}

diagnose().catch(console.error);