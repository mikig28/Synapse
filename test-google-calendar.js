// Simple test script to verify Google Calendar API access
// Run with: node test-google-calendar.js

const { google } = require('googleapis');

async function testGoogleCalendarAPI() {
  console.log('Testing Google Calendar API access...');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
  console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
  console.log('  GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || 'Not set');

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing required environment variables');
    return;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
    );

    console.log('✅ OAuth2 client created successfully');

    // Test with a dummy token to see if the structure is correct
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    console.log('✅ Calendar client created successfully');

    console.log('🔗 To get an access token, user needs to visit:');
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
    });
    console.log(authUrl);

  } catch (error) {
    console.error('❌ Error setting up Google Calendar API:', error.message);
  }
}

// Load environment variables if .env file exists
try {
  require('dotenv').config({ path: 'src/backend/.env' });
} catch (e) {
  console.log('No .env file found, using system environment variables');
}

testGoogleCalendarAPI(); 