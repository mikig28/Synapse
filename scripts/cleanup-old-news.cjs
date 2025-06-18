#!/usr/bin/env node

/**
 * Database cleanup script for old news items
 * This helps resolve duplicate detection issues by removing old entries
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';

// Define NewsItem schema inline to avoid import issues
const NewsItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentRun' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String },
    url: { type: String, required: true },
    urlToImage: { type: String },
    source: {
      id: { type: String },
      name: { type: String, required: true, trim: true },
    },
    author: { type: String, trim: true },
    publishedAt: { type: Date, required: true },
    category: { type: String, trim: true },
    language: { type: String, default: 'en' },
    country: { type: String },
    summary: { type: String },
    tags: { type: [String], default: [] },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
    },
    relevanceScore: { type: Number, min: 0, max: 1 },
    status: {
      type: String,
      enum: ['pending', 'summarized', 'archived', 'error'],
      default: 'pending',
    },
    isRead: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    readAt: { type: Date },
    contentHash: { type: String, sparse: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const NewsItem = mongoose.model('NewsItem', NewsItemSchema);

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function getStats() {
  const totalItems = await NewsItem.countDocuments();
  const last24h = await NewsItem.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  const last7days = await NewsItem.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  const last30days = await NewsItem.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  
  console.log('\n📊 Database Statistics:');
  console.log(`Total news items: ${totalItems}`);
  console.log(`Last 24 hours: ${last24h}`);
  console.log(`Last 7 days: ${last7days}`);
  console.log(`Last 30 days: ${last30days}`);
  console.log(`Older than 30 days: ${totalItems - last30days}`);
  
  // Check duplicates
  const duplicates = await NewsItem.aggregate([
    {
      $group: {
        _id: '$url',
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
  
  console.log(`\n🔍 Duplicate URLs found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Top 5 duplicated URLs:');
    duplicates.slice(0, 5).forEach(dup => {
      console.log(`  - ${dup._id}: ${dup.count} copies`);
    });
  }
}

async function cleanupOldItems(daysToKeep = 30, dryRun = true) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const query = {
    createdAt: { $lt: cutoffDate },
    isFavorite: false // Don't delete favorited items
  };
  
  const itemsToDelete = await NewsItem.countDocuments(query);
  
  console.log(`\n🗑️  Items to delete (older than ${daysToKeep} days): ${itemsToDelete}`);
  
  if (dryRun) {
    console.log('ℹ️  DRY RUN - No items will be deleted');
    console.log('Run with --execute flag to actually delete items');
  } else {
    console.log('⚠️  Deleting items...');
    const result = await NewsItem.deleteMany(query);
    console.log(`✅ Deleted ${result.deletedCount} items`);
  }
}

async function removeDuplicates(dryRun = true) {
  console.log('\n🔄 Finding and removing duplicates...');
  
  const duplicates = await NewsItem.aggregate([
    {
      $group: {
        _id: '$url',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        dates: { $push: '$createdAt' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ]);
  
  let totalDuplicates = 0;
  
  for (const dup of duplicates) {
    // Keep the oldest one, delete the rest
    const sortedIds = dup.ids.slice(1); // Skip the first (oldest) one
    totalDuplicates += sortedIds.length;
    
    if (!dryRun) {
      await NewsItem.deleteMany({
        _id: { $in: sortedIds }
      });
    }
  }
  
  if (dryRun) {
    console.log(`ℹ️  DRY RUN - Would delete ${totalDuplicates} duplicate items`);
    console.log('Run with --execute flag to actually delete duplicates');
  } else {
    console.log(`✅ Deleted ${totalDuplicates} duplicate items`);
  }
}

async function clearAllItems(dryRun = true) {
  const totalItems = await NewsItem.countDocuments();
  
  console.log(`\n⚠️  WARNING: This will delete ALL ${totalItems} news items!`);
  
  if (dryRun) {
    console.log('ℹ️  DRY RUN - No items will be deleted');
    console.log('Run with --execute --clear-all flag to actually delete ALL items');
  } else {
    console.log('⏳ Waiting 5 seconds before deletion... Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const result = await NewsItem.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} items`);
  }
}

async function main() {
  await connectDB();
  
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const clearAll = args.includes('--clear-all');
  const noDuplicates = args.includes('--remove-duplicates');
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 30;
  
  console.log('🧹 News Database Cleanup Tool\n');
  
  // Always show stats first
  await getStats();
  
  if (clearAll) {
    await clearAllItems(!execute);
  } else if (noDuplicates) {
    await removeDuplicates(!execute);
  } else {
    await cleanupOldItems(days, !execute);
  }
  
  if (execute) {
    console.log('\n📊 Updated Statistics:');
    await getStats();
  }
  
  console.log('\n✅ Cleanup complete');
  process.exit(0);
}

// Usage information
if (process.argv.includes('--help')) {
  console.log(`
News Database Cleanup Tool

Usage: node cleanup-old-news.cjs [options]

Options:
  --execute           Actually perform the cleanup (default is dry run)
  --days=N           Keep items from last N days (default: 30)
  --remove-duplicates Remove duplicate URLs, keeping the oldest
  --clear-all        Delete ALL news items (use with caution!)
  --help            Show this help message

Examples:
  node cleanup-old-news.cjs                    # Dry run, show what would be deleted
  node cleanup-old-news.cjs --execute          # Delete items older than 30 days
  node cleanup-old-news.cjs --days=7 --execute # Delete items older than 7 days
  node cleanup-old-news.cjs --remove-duplicates --execute # Remove duplicates
  `);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 