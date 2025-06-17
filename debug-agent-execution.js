// Debug script to test agent execution
// Run this in your browser console to debug the issue

console.log('🔍 Starting Agent Execution Debug...');

// 1. Check if we're on the right page
console.log('1. Current URL:', window.location.href);

// 2. Check if ErrorHandler is available
if (window.ErrorHandler) {
    console.log('2. ✅ ErrorHandler is available');
} else {
    console.log('2. ❌ ErrorHandler not found - debug panel may not work');
}

// 3. Check axios configuration
const axiosConfig = localStorage.getItem('debug_axios_config');
console.log('3. Backend URL from logs (check console for [AxiosConfig] logs)');

// 4. Check authentication
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
console.log('4. Auth token present:', !!token);
if (token) {
    console.log('   Token preview:', token.substring(0, 20) + '...');
}

// 5. Test backend connectivity
console.log('5. Testing backend connectivity...');
fetch(window.location.origin + '/api/v1/agents', {
    headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('   Backend response status:', response.status);
    if (response.status === 401) {
        console.log('   ❌ Authentication failed - try logging in again');
    } else if (response.status === 200) {
        console.log('   ✅ Backend accessible');
        return response.json();
    } else {
        console.log('   ⚠️ Unexpected status code');
    }
})
.then(data => {
    if (data) {
        console.log('   Agent count:', data.data?.length || 0);
        console.log('   Agents:', data.data?.map(a => ({ id: a._id, name: a.name, type: a.type, active: a.isActive })));
    }
})
.catch(error => {
    console.log('   ❌ Backend connection failed:', error.message);
});

// 6. Instructions
console.log(`
📋 DEBUG INSTRUCTIONS:
1. Check the output above for any ❌ errors
2. Try clicking the 🐛 button if visible
3. Try executing an agent and watch for new console logs
4. If auth fails, try logging out and back in
5. Check Network tab for failed requests

If you see errors, copy the console output and share it!
`);