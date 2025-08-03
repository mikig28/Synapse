#!/usr/bin/env node

/**
 * Debug WAHA Backend Issues
 */

import axios from 'axios';

const WAHA_URL = 'https://synapse-waha.onrender.com';

async function debugWAHABackend() {
  console.log('🔍 WAHA Backend Debug');
  console.log('='.repeat(50));
  console.log(`WAHA URL: ${WAHA_URL}`);
  
  try {
    // Test 1: Health check
    console.log('\n📋 Test 1: WAHA Service Health');
    const health = await axios.get(`${WAHA_URL}/api/version`, { timeout: 10000 });
    console.log('✅ WAHA Service is responding:', health.status);
    
    // Test 2: Session status
    console.log('\n📋 Test 2: Session Status');
    const sessionStatus = await axios.get(`${WAHA_URL}/api/sessions/default`, { timeout: 10000 });
    console.log('✅ Session status:', sessionStatus.data.status);
    
    // Test 3: Direct QR generation
    console.log('\n📋 Test 3: Direct QR Generation');
    if (sessionStatus.data.status === 'SCAN_QR_CODE') {
      try {
        const qrResponse = await axios.get(`${WAHA_URL}/api/default/auth/qr`, { 
          timeout: 15000,
          responseType: 'arraybuffer'
        });
        console.log('✅ QR Generation successful:', qrResponse.status);
        console.log('📊 QR Data size:', qrResponse.data.length, 'bytes');
      } catch (qrError) {
        console.log('❌ QR Generation failed:', qrError.response?.status, qrError.response?.data);
      }
    } else {
      console.log('⚠️ Session not ready for QR generation. Status:', sessionStatus.data.status);
    }
    
  } catch (error) {
    console.error('❌ WAHA Backend debug failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

debugWAHABackend().catch(console.error);