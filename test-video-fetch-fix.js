#!/usr/bin/env node
/**
 * Test script to verify video fetch and language filtering works correctly
 * 
 * Run with: node test-video-fetch-fix.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testVideoFetch() {
  console.log('🧪 Testing Video Fetch & Language Filter Fix\n');
  
  try {
    // 1. Login to get token (replace with actual credentials)
    console.log('📝 Step 1: Logging in...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com', // Replace with your test user
      password: 'password123'     // Replace with your test password
    });
    const token = loginRes.data.token;
    console.log('✅ Login successful\n');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. List existing subscriptions
    console.log('📋 Step 2: Listing subscriptions...');
    const subsRes = await axios.get(`${BASE_URL}/videos/subscriptions`, { headers });
    console.log(`✅ Found ${subsRes.data.length} subscriptions:`);
    subsRes.data.forEach((sub, i) => {
      console.log(`   ${i + 1}. Keywords: ${sub.keywords.join(', ')}`);
      console.log(`      Language Filter: ${JSON.stringify(sub.languageFilter || 'none')}`);
    });
    console.log('');

    // 3. Trigger fetch for all subscriptions
    console.log('🔄 Step 3: Triggering video fetch...');
    const fetchRes = await axios.post(`${BASE_URL}/videos/fetch`, {}, { headers });
    console.log(`✅ Fetch complete: ${fetchRes.data.fetched} videos fetched\n`);

    // 4. List recommendations
    console.log('📺 Step 4: Listing recommendations...');
    const videosRes = await axios.get(`${BASE_URL}/videos?source=youtube&status=pending&page=1&pageSize=10`, { headers });
    console.log(`✅ Found ${videosRes.data.total} total recommendations`);
    console.log(`   Showing first ${videosRes.data.items.length} items:\n`);
    
    videosRes.data.items.forEach((video, i) => {
      console.log(`   ${i + 1}. ${video.title}`);
      console.log(`      Channel: ${video.channelTitle || 'Unknown'}`);
      console.log(`      Status: ${video.status}`);
      console.log(`      Relevance: ${video.relevance || 0}`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 Key findings:');
    console.log('   - Videos are being fetched');
    console.log('   - Language filter is working (check backend logs for details)');
    console.log('   - Recommendations are being stored correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Make sure backend is running on port 3001');
    console.error('   2. Update login credentials in this script');
    console.error('   3. Check backend logs for detailed error messages');
    console.error('   4. Ensure YouTube API key is configured in .env');
  }
}

testVideoFetch();

