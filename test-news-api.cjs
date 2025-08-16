#!/usr/bin/env node

/**
 * Test News API to see what data is actually being returned
 */

const fetch = require('node-fetch');

const BACKEND_URL = 'https://synapse-backend-7lq6.onrender.com';

async function testNewsAPI() {
  console.log('🔍 Testing News API...\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('================================\n');

  try {
    // First, test if backend is responding
    console.log('1. Testing backend health...');
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      timeout: 30000
    }).catch(err => {
      console.log('❌ Backend health check failed:', err.message);
      return null;
    });

    if (!healthResponse) {
      console.log('\n⚠️  Backend seems to be down or sleeping.');
      console.log('Please wake it up by visiting:', `${BACKEND_URL}/health`);
      return;
    }

    console.log('✅ Backend is responding\n');

    // Test news API without auth
    console.log('2. Testing news API (no auth)...');
    const newsResponse = await fetch(`${BACKEND_URL}/api/v1/news`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', newsResponse.status);
    
    if (newsResponse.status === 401) {
      console.log('⚠️  Authentication required for news API');
      console.log('\nThe news API requires authentication. You need to:');
      console.log('1. Log in through the frontend');
      console.log('2. Use the JWT token from your browser session');
      return;
    }

    const contentType = newsResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await newsResponse.json();
      console.log('\n✅ News API Response:');
      console.log('========================');
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} news items\n`);
        
        // Show first few items
        data.data.slice(0, 3).forEach((item, index) => {
          console.log(`\n📰 Item ${index + 1}:`);
          console.log('  ID:', item._id);
          console.log('  Title:', item.title);
          console.log('  Source:', item.source?.name || 'Unknown');
          console.log('  URL:', item.url);
          console.log('  Has Content:', !!item.content ? 'Yes' : 'No');
          console.log('  Content Length:', item.content ? item.content.length : 0);
          console.log('  Is Internal:', item.url?.startsWith('#') ? 'Yes' : 'No');
          console.log('  Tags:', item.tags?.join(', ') || 'None');
          
          if (item.content && item.url?.startsWith('#')) {
            console.log('  📝 Content Preview (first 200 chars):');
            console.log('    ', item.content.substring(0, 200) + '...');
          }
        });
        
        // Check for CrewAI analysis reports
        const analysisReports = data.data.filter(item => 
          item.source?.id === 'crewai_analysis' || 
          item.tags?.includes('crewai') ||
          item.url?.startsWith('#')
        );
        
        console.log(`\n\n🤖 Found ${analysisReports.length} CrewAI analysis reports`);
        
        if (analysisReports.length > 0) {
          console.log('\nAnalysis Reports:');
          analysisReports.forEach((report, index) => {
            console.log(`\n  Report ${index + 1}:`);
            console.log('    Title:', report.title);
            console.log('    URL:', report.url);
            console.log('    Has Content:', !!report.content);
            console.log('    Content starts with:', report.content ? report.content.substring(0, 50) : 'N/A');
          });
        }
        
      } else {
        console.log('❌ Unexpected response format:', JSON.stringify(data, null, 2));
      }
    } else {
      const text = await newsResponse.text();
      console.log('❌ Non-JSON response:', text.substring(0, 500));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('\n\n================================');
  console.log('📋 DIAGNOSIS:');
  console.log('================================\n');
  
  console.log('If the eye icon click is not showing content:');
  console.log('\n1. Check if the news items have content field populated');
  console.log('2. Check if the URL starts with # for internal content');
  console.log('3. Check browser console for JavaScript errors');
  console.log('4. Make sure the Dialog/Modal component is working');
  console.log('\n5. Common issues:');
  console.log('   - Content field is empty or null');
  console.log('   - URL is not marked as internal (should start with #)');
  console.log('   - Modal state not updating properly');
  console.log('   - Content not being passed to modal correctly');
}

testNewsAPI().catch(console.error);