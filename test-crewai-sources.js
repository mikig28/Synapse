// Test script to diagnose CrewAI source issues
// Run this to test individual data sources

const CREWAI_URL = 'https://synapse-crewai.onrender.com';

async function testCrewAISources() {
    console.log('🔍 Testing CrewAI Individual Data Sources');
    console.log('==========================================');
    
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${CREWAI_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health status:', healthData.status);
        console.log('   Mode:', healthData.current_mode);
        console.log('   Initialized:', healthData.initialized);
        
        // Check for missing dependencies
        if (healthData.dependencies) {
            Object.entries(healthData.dependencies).forEach(([dep, status]) => {
                if (status.includes('❌')) {
                    console.log(`❌ Missing dependency: ${dep}`);
                }
            });
        }
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        return;
    }
    
    // Test system info
    console.log('\n2. Testing system info...');
    try {
        const sysResponse = await fetch(`${CREWAI_URL}/system-info`);
        const sysData = await sysResponse.json();
        console.log('✅ System mode:', sysData.mode);
        console.log('   Supported sources:', sysData.supported_sources);
        console.log('   Available features:', Object.keys(sysData.features));
    } catch (error) {
        console.log('❌ System info failed:', error.message);
    }
    
    // Test different source configurations
    console.log('\n3. Testing different source configurations...');
    
    const testConfigs = [
        {
            name: 'Reddit only',
            config: {
                topics: ['technology'],
                sources: { reddit: true },
                max_items: 3
            }
        },
        {
            name: 'News websites only', 
            config: {
                topics: ['technology'],
                sources: { news_websites: true },
                max_items: 3
            }
        },
        {
            name: 'LinkedIn only',
            config: {
                topics: ['technology'],
                sources: { linkedin: true },
                max_items: 3
            }
        },
        {
            name: 'All sources',
            config: {
                topics: ['technology'],
                sources: { 
                    reddit: true, 
                    news_websites: true, 
                    linkedin: true, 
                    telegram: true 
                },
                max_items: 5
            }
        }
    ];
    
    for (const test of testConfigs) {
        console.log(`\n   Testing: ${test.name}`);
        try {
            const startTime = Date.now();
            const response = await fetch(`${CREWAI_URL}/gather-news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test.config)
            });
            
            const duration = Date.now() - startTime;
            console.log(`   Response time: ${duration}ms`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`   Success: ${data.success}`);
                console.log(`   Mode: ${data.mode}`);
                
                // Check if we got real data or mock data
                const articles = data.data?.organized_content?.validated_articles || [];
                const crewResult = data.data?.crew_result || '';
                
                console.log(`   Articles found: ${articles.length}`);
                
                // Detect if it's mock data (contains certain phrases)
                const isMockData = crewResult.includes('Global Climate Summit') || 
                                 crewResult.includes('mock') || 
                                 crewResult.includes('simulated') ||
                                 articles.length === 0;
                
                console.log(`   Data type: ${isMockData ? '🤖 Mock/Fallback' : '📰 Real'}`);
                
                if (data.data?.organized_content) {
                    const content = data.data.organized_content;
                    console.log(`   Reddit posts: ${content.reddit_posts?.length || 0}`);
                    console.log(`   News articles: ${content.news_articles?.length || 0}`);
                    console.log(`   LinkedIn posts: ${content.linkedin_posts?.length || 0}`);
                    console.log(`   Telegram messages: ${content.telegram_messages?.length || 0}`);
                }
                
                // Check for error indicators
                if (data.data?.error_details) {
                    console.log(`   ❌ Errors: ${JSON.stringify(data.data.error_details)}`);
                }
                
            } else {
                console.log(`   ❌ Request failed: ${response.statusText}`);
                const errorText = await response.text();
                console.log(`   Error: ${errorText}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n4. Testing with verbose logging...');
    try {
        const response = await fetch(`${CREWAI_URL}/gather-news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topics: ['technology'],
                sources: { reddit: true, news_websites: true },
                max_items: 2,
                debug: true,
                verbose: true
            })
        });
        
        const data = await response.json();
        console.log('   Verbose response keys:', Object.keys(data));
        
        if (data.debug_info) {
            console.log('   Debug info:', data.debug_info);
        }
        
        if (data.execution_info?.progress_steps) {
            console.log('   Execution steps:');
            data.execution_info.progress_steps.forEach(step => {
                console.log(`     ${step.agent}: ${step.message} (${step.status})`);
            });
        }
        
    } catch (error) {
        console.log(`   ❌ Verbose test failed: ${error.message}`);
    }
    
    console.log('\n==========================================');
    console.log('🎯 DIAGNOSIS COMPLETE');
    console.log('');
    console.log('💡 Common issues to check:');
    console.log('   1. API rate limits (Reddit, Twitter, etc.)');
    console.log('   2. Missing or invalid API credentials');
    console.log('   3. Blocked IPs or regions');
    console.log('   4. Source websites blocking automated requests');
    console.log('   5. Network connectivity from Render servers');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Check if mock data is being returned consistently');
    console.log('   2. Verify API credentials in CrewAI service');
    console.log('   3. Test with simpler/more reliable sources first');
    console.log('   4. Check CrewAI logs for detailed error messages');
}

// Run the test
testCrewAISources().catch(console.error);