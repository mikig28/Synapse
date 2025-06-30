import axios from 'axios';

async function debugImageGeneration() {
  console.log('🔍 Debugging Image Generation System\n');
  
  try {
    // 1. Test backend connectivity
    console.log('1. Testing backend connectivity...');
    const healthResponse = await axios.get('https://synapse-backend-7lq6.onrender.com/health');
    console.log('✅ Backend is accessible:', healthResponse.status);
    
    // 2. Get recent news items (you'll need to add your JWT token here)
    console.log('\n2. Fetching recent news items...');
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your actual token
    
    if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
      console.log('⚠️ Please add your JWT token to this script');
      console.log('   You can get it from browser dev tools > Application > Local Storage > authToken');
      return;
    }
    
    const newsResponse = await axios.get('https://synapse-backend-7lq6.onrender.com/api/news?limit=10', {
      headers: { Authorization: `Bearer ${JWT_TOKEN}` }
    });
    
    const newsItems = newsResponse.data.data || [];
    console.log(`Found ${newsItems.length} news items\n`);
    
    // 3. Analyze image status
    let withGeneratedImages = 0;
    let withUrlImages = 0;
    let withNoImages = 0;
    
    console.log('📊 Image Analysis:');
    newsItems.forEach((item, i) => {
      console.log(`${i+1}. "${item.title.substring(0, 50)}..."`);
      console.log(`   Created: ${new Date(item.createdAt).toLocaleString()}`);
      console.log(`   Source: ${item.source?.name || 'Unknown'} (${item.source?.id || 'no-id'})`);
      
      if (item.generatedImage?.url) {
        console.log(`   ✅ Generated Image: ${item.generatedImage.source} - ${item.generatedImage.url.substring(0, 50)}...`);
        withGeneratedImages++;
      } else if (item.urlToImage) {
        console.log(`   📷 URL Image: ${item.urlToImage.substring(0, 50)}...`);
        withUrlImages++;
      } else {
        console.log(`   ❌ No Images`);
        withNoImages++;
      }
      console.log('');
    });
    
    console.log('📈 Summary:');
    console.log(`   Items with generated images: ${withGeneratedImages}`);
    console.log(`   Items with URL images: ${withUrlImages}`);
    console.log(`   Items with no images: ${withNoImages}`);
    console.log(`   Generation rate: ${newsItems.length > 0 ? Math.round((withGeneratedImages / newsItems.length) * 100) : 0}%`);
    
    // 4. Test image enhancement API on a recent item without images
    const itemWithoutImage = newsItems.find(item => !item.generatedImage?.url);
    if (itemWithoutImage) {
      console.log(`\n4. Testing image enhancement on: "${itemWithoutImage.title.substring(0, 40)}..."`);
      console.log('⏳ Calling enhancement API...');
      
      try {
        const enhanceResponse = await axios.post(
          `https://synapse-backend-7lq6.onrender.com/api/news/${itemWithoutImage._id}/enhance-image`,
          { force: true },
          { headers: { Authorization: `Bearer ${JWT_TOKEN}` } }
        );
        
        console.log('✅ Enhancement API Response:', enhanceResponse.data);
        
        // Check if image was actually added
        const updatedResponse = await axios.get(
          `https://synapse-backend-7lq6.onrender.com/api/news/${itemWithoutImage._id}`,
          { headers: { Authorization: `Bearer ${JWT_TOKEN}` } }
        );
        
        const updatedItem = updatedResponse.data.data;
        if (updatedItem.generatedImage?.url) {
          console.log('🎉 SUCCESS! Image was generated:');
          console.log(`   URL: ${updatedItem.generatedImage.url}`);
          console.log(`   Source: ${updatedItem.generatedImage.source}`);
          console.log(`   Attribution: ${updatedItem.generatedImage.attribution || 'None'}`);
        } else {
          console.log('⚠️ Enhancement completed but no image was added to the item');
        }
        
      } catch (enhanceError) {
        console.error('❌ Enhancement failed:', enhanceError.response?.data || enhanceError.message);
        
        if (enhanceError.response?.status === 500) {
          console.log('💡 This suggests an API key or configuration issue');
        }
      }
    } else {
      console.log('\n4. All items already have images - testing batch enhancement...');
      
      try {
        const batchResponse = await axios.post(
          'https://synapse-backend-7lq6.onrender.com/api/news/enhance/recent',
          { hoursBack: 24, skipExisting: false },
          { headers: { Authorization: `Bearer ${JWT_TOKEN}` } }
        );
        console.log('Batch enhancement result:', batchResponse.data);
      } catch (batchError) {
        console.error('❌ Batch enhancement failed:', batchError.response?.data || batchError.message);
      }
    }
    
    // 5. Test direct image generation
    console.log('\n5. Testing direct image generation...');
    try {
      const testResponse = await axios.post(
        'https://synapse-backend-7lq6.onrender.com/api/news/images/test',
        { prompt: 'artificial intelligence technology innovation' },
        { headers: { Authorization: `Bearer ${JWT_TOKEN}` } }
      );
      console.log('✅ Direct generation test:', testResponse.data);
    } catch (testError) {
      console.error('❌ Direct generation test failed:', testError.response?.data || testError.message);
      
      if (testError.response?.data?.details?.includes('not configured')) {
        console.log('💡 API keys are missing or incorrectly configured in Render');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Backend server is not accessible');
    } else if (error.response?.status === 401) {
      console.log('💡 JWT token is invalid or expired');
    }
  }
}

debugImageGeneration();