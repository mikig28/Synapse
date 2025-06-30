const axios = require('axios');

async function testImageEnhancement() {
  try {
    console.log('🧪 Testing Image Enhancement System\n');
    
    // Get recent news items
    console.log('📰 Fetching recent news items...');
    const response = await axios.get('http://localhost:3001/api/news?limit=5');
    const newsItems = response.data.data || [];
    
    console.log(`Found ${newsItems.length} recent news items:\n`);
    
    newsItems.forEach((item, i) => {
      console.log(`${i+1}. ${item.title.substring(0, 60)}...`);
      console.log(`   Original image: ${item.urlToImage ? '✅ Yes' : '❌ No'}`);
      console.log(`   Generated image: ${item.generatedImage?.url ? '✅ Yes (' + item.generatedImage.source + ')' : '❌ No'}`);
      console.log(`   ID: ${item._id}`);
      console.log('');
    });
    
    // Test enhancement on first item without generated image
    const itemToEnhance = newsItems.find(item => !item.generatedImage?.url);
    if (itemToEnhance) {
      console.log(`🎨 Testing enhancement on: "${itemToEnhance.title.substring(0, 50)}..."`);
      console.log('⏳ Calling enhancement API...\n');
      
      const enhanceResponse = await axios.post(`http://localhost:3001/api/news/${itemToEnhance._id}/enhance-image`);
      console.log('✅ Enhancement result:', enhanceResponse.data);
      
      // Check if the item now has an image
      const updatedResponse = await axios.get(`http://localhost:3001/api/news?limit=5`);
      const updatedItem = updatedResponse.data.data.find(item => item._id === itemToEnhance._id);
      
      if (updatedItem?.generatedImage?.url) {
        console.log('\n🎉 Success! Generated image added:');
        console.log(`   URL: ${updatedItem.generatedImage.url}`);
        console.log(`   Source: ${updatedItem.generatedImage.source}`);
        console.log(`   Attribution: ${updatedItem.generatedImage.attribution}`);
      } else {
        console.log('\n⚠️ Enhancement completed but no image was added');
      }
    } else {
      console.log('ℹ️ All items already have generated images');
      
      // Test batch enhancement
      console.log('\n🔄 Testing batch enhancement...');
      const batchResponse = await axios.post('http://localhost:3001/api/news/enhance-recent');
      console.log('Batch enhancement result:', batchResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running. Start it with: npm run dev');
    }
  }
}

testImageEnhancement(); 