// Test script to verify the environment variable fix
// Run this in your browser console after the fix is deployed

console.log('🔧 TESTING ENVIRONMENT VARIABLE FIX');
console.log('===================================');

// Check if axios config logs are showing the correct backend URL
console.log('1. Check the [AxiosConfig] logs above this message');
console.log('   ✅ Should show: VITE_BACKEND_ROOT_URL from env: https://synapse-pxad.onrender.com');
console.log('   ✅ Should show: Full API Base URL: https://synapse-pxad.onrender.com/api/v1');
console.log('   ✅ Should show: Is valid backend URL: true');
console.log('');

// Test the actual backend connection
console.log('2. Testing backend connection...');

const expectedBackendUrl = 'https://synapse-pxad.onrender.com/api/v1';

// Get token for auth
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

if (!token) {
    console.log('❌ No authentication token found. Please log in first.');
    console.log('   Go to your app, log in, then run this test again.');
} else {
    console.log('✅ Authentication token found');
    
    // Test agents endpoint
    fetch(expectedBackendUrl + '/agents', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log(`3. Backend response: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
            console.log('✅ Backend connection successful!');
            return response.json();
        } else if (response.status === 401) {
            console.log('⚠️ Authentication failed - try logging out and back in');
            throw new Error('Auth failed');
        } else {
            console.log('❌ Unexpected response status');
            throw new Error(`Status: ${response.status}`);
        }
    })
    .then(data => {
        const agents = data.data || [];
        console.log(`4. Found ${agents.length} agents`);
        
        if (agents.length === 0) {
            console.log('⚠️ No agents found. Create an agent first:');
            console.log('   - Go to your app');
            console.log('   - Click "Create Agent"');
            console.log('   - Choose "CrewAI News" type');
            console.log('   - Fill in the configuration and save');
            return;
        }
        
        // Find an active agent to test
        const activeAgent = agents.find(a => a.isActive) || agents[0];
        console.log(`5. Testing execution of agent: ${activeAgent.name} (${activeAgent.type})`);
        
        // Test agent execution
        fetch(expectedBackendUrl + `/agents/${activeAgent._id}/execute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log(`6. Execution response: ${response.status} ${response.statusText}`);
            return response.json();
        })
        .then(execData => {
            if (execData.success) {
                console.log('🎉 AGENT EXECUTION SUCCESSFUL!');
                console.log(`   Run ID: ${execData.data._id}`);
                console.log(`   Status: ${execData.data.status}`);
                console.log('');
                console.log('✅ Fix is working! Your agents should now execute properly.');
                
                // Check run status after a few seconds
                setTimeout(() => {
                    fetch(expectedBackendUrl + `/agents/${activeAgent._id}/runs?limit=1`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(r => r.json())
                    .then(runData => {
                        if (runData.data && runData.data.length > 0) {
                            const run = runData.data[0];
                            console.log(`📊 Run status update: ${run.status}`);
                            console.log(`   Items processed: ${run.itemsProcessed}`);
                            console.log(`   Logs: ${run.logs?.length || 0} entries`);
                        }
                    })
                    .catch(() => console.log('Could not fetch run status'));
                }, 5000);
                
            } else {
                console.log('❌ Agent execution failed:');
                console.log(`   Error: ${execData.message}`);
                console.log(`   Error Type: ${execData.errorType}`);
                console.log(`   Details:`, execData.details);
                
                // Provide specific guidance based on error type
                if (execData.errorType === 'agent_inactive') {
                    console.log('💡 Solution: Activate the agent in your app settings');
                } else if (execData.errorType === 'service_unavailable') {
                    console.log('💡 Solution: CrewAI service may be starting up, try again in 30 seconds');
                } else if (execData.errorType === 'executor_not_available') {
                    console.log('💡 Solution: Agent type may not be supported, check agent configuration');
                }
            }
        })
        .catch(error => {
            console.log('❌ Execution request failed:', error.message);
        });
    })
    .catch(error => {
        console.log('❌ Backend connection test failed:', error.message);
        console.log('');
        console.log('🔍 Troubleshooting:');
        console.log('   1. Check if the [AxiosConfig] logs show the correct backend URL');
        console.log('   2. Make sure you are logged in to your app');
        console.log('   3. Try refreshing the page and running this test again');
        console.log('   4. Check if your backend service is running on Render');
    });
}

console.log('');
console.log('📋 Next steps:');
console.log('   1. If this test passes, your agents should work in the app');
console.log('   2. Try executing an agent in your app interface');
console.log('   3. Check the 🐛 debug panel if you still have issues');
console.log('   4. Monitor the console for any new error messages');