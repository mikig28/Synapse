require('dotenv').config();
const mongoose = require('mongoose');
const NewsItem = require('./dist/models/NewsItem').default;
const { enhanceNewsItemWithImage } = require('./dist/services/newsEnhancementService');

async function enhanceExistingNews() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse');
    console.log('Connected to MongoDB');
    
    // Find recent news items without images
    const newsItems = await NewsItem.find({
      $or: [
        { 'generatedImage.url': { $exists: false } },
        { 'generatedImage.url': null }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10);
    
    console.log(`Found ${newsItems.length} news items without images`);
    
    if (newsItems.length === 0) {
      console.log('All recent news items already have images');
      return;
    }
    
    console.log('\nStarting image enhancement...\n');
    
    let enhanced = 0;
    let failed = 0;
    
    for (let i = 0; i < newsItems.length; i++) {
      const item = newsItems[i];
      console.log(`${i + 1}/${newsItems.length}: Enhancing "${item.title.substring(0, 60)}..."`);
      
      try {
        const result = await enhanceNewsItemWithImage(item, { skipExisting: false });
        if (result && result.generatedImage?.url) {
          enhanced++;
          console.log(`  ✅ Enhanced with ${result.generatedImage.source} image`);
          console.log(`  🖼️  ${result.generatedImage.url}`);
          if (result.generatedImage.attribution) {
            console.log(`  📝 ${result.generatedImage.attribution}`);
          }
        } else {
          failed++;
          console.log(`  ❌ Enhancement failed or returned null`);
        }
      } catch (error) {
        failed++;
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
      
      // Small delay to be nice to APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\nEnhancement complete:`);
    console.log(`  Enhanced: ${enhanced}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Success rate: ${newsItems.length > 0 ? Math.round((enhanced / newsItems.length) * 100) : 0}%`);
    
    // Show final stats
    const stats = await NewsItem.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        withImages: { $sum: { $cond: [{ $ifNull: ['$generatedImage.url', false] }, 1, 0] } }
      }}
    ]);
    
    if (stats[0]) {
      console.log(`\nOverall stats:`);
      console.log(`  Total items: ${stats[0].total}`);
      console.log(`  Items with images: ${stats[0].withImages}`);
      console.log(`  Overall generation rate: ${stats[0].total > 0 ? Math.round((stats[0].withImages / stats[0].total) * 100) : 0}%`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

console.log('Synapse Image Enhancement Tool');
console.log('==============================');
console.log('');
console.log('Environment check:');
console.log(`  UNSPLASH_ACCESS_KEY: ${process.env.UNSPLASH_ACCESS_KEY ? '✅ Set' : '⚠️  Not set'}`);
console.log(`  REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '⚠️  Not set'}`);
console.log('');

if (!process.env.UNSPLASH_ACCESS_KEY && !process.env.REPLICATE_API_TOKEN) {
  console.log('⚠️  No image API keys configured.');
  console.log('   Placeholder images will be used instead of AI-generated images.');
  console.log('   To enable full image generation:');
  console.log('   1. Get a free Unsplash API key: https://unsplash.com/developers');
  console.log('   2. Get a Replicate API token: https://replicate.com');
  console.log('   3. Add them to your .env file');
  console.log('');
}

enhanceExistingNews();