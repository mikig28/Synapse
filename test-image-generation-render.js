import axios from 'axios';

async function testImageGenerationOnRender() {
  console.log('🧪 Testing Image Generation on Render Deployment\n');
  
  const baseUrl = 'https://synapse-backend-7lq6.onrender.com/api';
  
  // First, let's test if the backend is responsive
  console.log('1. Testing backend connectivity...');
  try {
    const healthResponse = await axios.get(`${baseUrl}/health`, { timeout: 10000 });
    console.log('✅ Backend is responsive');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.data)}\n`);
  } catch (error) {
    console.log('❌ Backend not accessible');
    console.log(`   Error: ${error.message}\n`);
    return;
  }
  
  // Test image generation endpoint without authentication (if available)
  console.log('2. Testing image generation API...');
  try {
    const testResponse = await axios.post(`${baseUrl}/news/images/test`, 
      { prompt: 'technology innovation artificial intelligence' },
      { 
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log('✅ Image generation API is working!');
    console.log(`   Generated image: ${testResponse.data.data.url}`);
    console.log(`   Source: ${testResponse.data.data.source}`);
    console.log(`   Attribution: ${testResponse.data.data.attribution || 'None'}\n`);
    
  } catch (error) {
    console.log('❌ Image generation failed');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data)}`);
      
      if (error.response.status === 401) {
        console.log('   → This endpoint requires authentication');
      } else if (error.response.status === 500) {
        console.log('   → Server error - likely API key or configuration issue');
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }
  
  // Test the news endpoint to see recent items
  console.log('3. Checking recent news items (public endpoint)...');
  try {
    const newsResponse = await axios.get(`${baseUrl}/news/public/recent`, { 
      timeout: 10000,
      params: { limit: 5 }
    });
    
    const newsItems = newsResponse.data.data || [];
    console.log(`✅ Found ${newsItems.length} recent news items`);
    
    let withGeneratedImages = 0;
    let withUrlImages = 0;
    let withNoImages = 0;
    
    newsItems.forEach((item, i) => {
      console.log(`${i+1}. "${item.title.substring(0, 40)}..."`);
      console.log(`   Source: ${item.source?.name || 'Unknown'}`);
      console.log(`   Published: ${new Date(item.publishedAt).toLocaleDateString()}`);
      
      if (item.generatedImage?.url) {
        console.log(`   ✅ Generated Image: ${item.generatedImage.source}`);
        withGeneratedImages++;
      } else if (item.urlToImage) {
        console.log(`   📷 URL Image available`);
        withUrlImages++;
      } else {
        console.log(`   ❌ No images`);
        withNoImages++;
      }
      console.log('');
    });
    
    console.log('📊 Image Summary:');
    console.log(`   Items with generated images: ${withGeneratedImages}`);
    console.log(`   Items with URL images: ${withUrlImages}`);
    console.log(`   Items with no images: ${withNoImages}`);
    console.log(`   Generation rate: ${newsItems.length > 0 ? Math.round((withGeneratedImages / newsItems.length) * 100) : 0}%\n`);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️ Public news endpoint not available');
      console.log('   → This is normal, you\'ll need to authenticate to see news items\n');
    } else {
      console.log('❌ Failed to fetch news items');
      console.log(`   Error: ${error.message}\n`);
    }
  }
  
  // Test the health endpoint specifically
  console.log('4. Testing image service health...');
  try {
    const systemInfoResponse = await axios.get(`${baseUrl}/system-info`, { timeout: 10000 });
    console.log('✅ System info available');
    console.log(`   Environment variables check:`);
    
    // Note: We can't see actual env var values for security, but we might get some info
    const systemInfo = systemInfoResponse.data;
    console.log(`   System: ${JSON.stringify(systemInfo)}\n`);
    
  } catch (error) {
    console.log('⚠️ System info not available');
    console.log(`   This is normal if endpoint doesn't exist\n`);
  }
  
  console.log('🔧 Diagnosis & Next Steps:');
  console.log('');
  console.log('If image generation is failing, check:');
  console.log('1. Render dashboard logs for your backend service');
  console.log('2. Look for errors like "Replicate API token not configured"');
  console.log('3. Verify the environment variable is set correctly in Render');
  console.log('4. Check if the variable name matches exactly: REPLICATE_API_TOKEN');
  console.log('');
  console.log('To debug further:');
  console.log('1. Check Render logs: Go to your backend service dashboard → Logs');
  console.log('2. Look for image generation errors when agents run');
  console.log('3. Verify the CrewAI service also has the API key configured');
  console.log('4. Try running a scheduled agent and watch the logs');
}

// Run the test
testImageGenerationOnRender().catch(console.error); 