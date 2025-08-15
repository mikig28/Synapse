const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api/v1';
const TOKEN = process.env.AUTH_TOKEN || 'your-auth-token';
const PHONE = process.env.PHONE || '+15555550123';

(async () => {
	try {
		console.log('Requesting pairing code for', PHONE);
		const res = await axios.post(`${API_BASE}/whatsapp-legacy/auth/phone`, { phoneNumber: PHONE }, {
			headers: { Authorization: `Bearer ${TOKEN}` }
		});
		console.log('Response:', res.data);
		if (res.data?.data?.pairingCode) {
			console.log('Pairing code:', res.data.data.pairingCode);
		} else {
			console.log('No code returned; follow instructions on device.');
		}
	} catch (e) {
		console.error('Error:', e.response?.data || e.message);
	}
})();