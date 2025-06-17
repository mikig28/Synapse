// Quick test script - paste this in your browser console on your app
console.log('🔍 Quick Agent Execution Debug');

// 1. Check current environment
console.log('1. Current URL:', window.location.href);
console.log('2. Local storage token:', !!localStorage.getItem('token'));
console.log('3. Session storage token:', !!sessionStorage.getItem('token'));

// 2. Check axios base URL (should be visible in console)
console.log('4. Looking for [AxiosConfig] logs above...');

// 3. Check if ErrorHandler is working
if (typeof ErrorHandler !== 'undefined') {
    console.log('5. ✅ ErrorHandler available');
} else {
    console.log('5. ❌ ErrorHandler not available');
}

// 4. Test a simple agents request
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (token) {
    console.log('6. Testing agents endpoint with token...');
    
    fetch(window.location.origin + '/api/v1/agents', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('   Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('   Agents found:', data.data?.length || 0);
        if (data.data && data.data.length > 0) {
            console.log('   First agent:', {
                id: data.data[0]._id,
                name: data.data[0].name,
                type: data.data[0].type,
                active: data.data[0].isActive,
                status: data.data[0].status
            });
            
            // Try to execute the first agent
            console.log('7. Testing agent execution...');
            const agentId = data.data[0]._id;
            
            fetch(window.location.origin + `/api/v1/agents/${agentId}/execute`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('   Execution response status:', response.status);
                return response.json();
            })
            .then(execData => {
                if (execData.success) {
                    console.log('   ✅ Agent execution started!');
                    console.log('   Run ID:', execData.data._id);
                } else {
                    console.log('   ❌ Agent execution failed:', execData.message);
                    console.log('   Error type:', execData.errorType);
                    console.log('   Details:', execData.details);
                }
            })
            .catch(error => {
                console.log('   ❌ Execution request failed:', error.message);
            });
        } else {
            console.log('   ⚠️ No agents found - try creating one first');
        }
    })
    .catch(error => {
        console.log('   ❌ Agents request failed:', error.message);
    });
} else {
    console.log('6. ❌ No token found - please log in');
}

console.log('\n📋 Quick checklist:');
console.log('   - Are you logged in? Check tokens above');
console.log('   - Do you have agents? Check agents count above');
console.log('   - Are agents active? Check agent status above');
console.log('   - Is execution working? Check execution result above');