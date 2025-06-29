const axios = require('axios');

// Test script for image service functionality
async function testImageService() {
  const baseUrl = 'http://localhost:3001/api';
  
  // You'll need to get a valid JWT token first
  const token = 'your-jwt-token-here'; // Replace with actual token
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Testing Image Service...\n');

  try {
    // Test 1: Generate a test image with relevant content
    console.log('1. Testing image generation with relevant prompts...');
    
    const testPrompts = [
      'Tesla announces breakthrough in battery technology',
      'AI startup raises $50M funding round',
      'Climate change summit reaches historic agreement',
      'New medical breakthrough in cancer treatment',
      'SpaceX launches satellite mission to Mars'
    ];
    
    for (const prompt of testPrompts) {
      console.log(`\n🧪 Testing prompt: "${prompt}"`);
      const testImageResponse = await axios.post(
        `${baseUrl}/news/images/test`,
        { prompt },
        { headers }
      );
      
      console.log('✅ Generated image:');
      console.log(`   Source: ${testImageResponse.data.data.source}`);
      console.log(`   URL: ${testImageResponse.data.data.url}`);
             if (testImageResponse.data.data.attribution) {
         console.log(`   Attribution: ${testImageResponse.data.data.attribution}`);
       }
     }
    console.log();

    // Test 2: Get image enhancement statistics
    console.log('2. Getting image enhancement statistics...');
    const statsResponse = await axios.get(`${baseUrl}/news/images/stats`, { headers });
    
    console.log('✅ Image enhancement stats:');
    console.log(`   Total news items: ${statsResponse.data.data.total}`);
    console.log(`   Items with images: ${statsResponse.data.data.withImages}`);
    console.log(`   Enhancement percentage: ${statsResponse.data.data.enhancementPercentage}%`);
    console.log(`   Unsplash images: ${statsResponse.data.data.unsplashImages}`);
    console.log(`   Replicate images: ${statsResponse.data.data.replicateImages}`);
    console.log();

    // Test 3: Enhance recent news items
    console.log('3. Enhancing recent news items...');
    const enhanceResponse = await axios.post(
      `${baseUrl}/news/enhance/recent`,
      { 
        hoursBack: 24,
        batchSize: 3,
        skipExisting: true 
      },
      { headers }
    );
    
    console.log('✅ Recent news enhancement completed:');
    console.log(`   Enhanced: ${enhanceResponse.data.data.enhanced}`);
    console.log(`   Failed: ${enhanceResponse.data.data.failed}`);
    console.log(`   Skipped: ${enhanceResponse.data.data.skipped}`);
    console.log();

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Make sure to set a valid JWT token in the script');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tip: Make sure the backend server is running on port 3001');
    }
  }
}

// Helper function to get a JWT token (for testing)
async function getTestToken() {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'your-email@example.com', // Replace with your test user
      password: 'your-password'        // Replace with your test password
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Failed to get test token:', error.response?.data || error.message);
    return null;
  }
}

// Instructions for running the test
console.log(`
🔧 Image Service Test Setup Instructions:

1. Make sure your backend server is running:
   cd src/backend && npm run dev

2. Set your environment variables:
   REPLICATE_API_TOKEN=your-replicate-api-token-here
   UNSPLASH_ACCESS_KEY=your-unsplash-key (optional)

3. Update the JWT token in this script:
   - Either login via the frontend and copy the token from localStorage
   - Or use the getTestToken() function with your credentials

4. Run this test:
   node test-image-service.js

Environment Variables Status:
- REPLICATE_API_TOKEN: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Missing'}
- UNSPLASH_ACCESS_KEY: ${process.env.UNSPLASH_ACCESS_KEY ? '✅ Set' : '⚠️ Optional (will use Replicate only)'}

`);

// Only run tests if token is provided
if (process.argv.includes('--run')) {
  testImageService();
} else {
  console.log('Add --run flag to execute tests after setup');
} 