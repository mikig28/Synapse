# WhatsApp Phone Number Pairing Guide

This guide explains how to connect WhatsApp to your platform using phone number pairing codes instead of QR codes.

## Overview

The phone pairing feature allows users to link WhatsApp to your platform by entering an 8-digit code in their WhatsApp app, similar to how WhatsApp Web works with the "Link with phone number" option.

## How It Works

1. **Request Pairing Code**: Your platform generates an 8-digit pairing code
2. **Enter Code in WhatsApp**: User enters this code in their WhatsApp app
3. **Automatic Connection**: WhatsApp connects to your platform automatically

## API Endpoints

### 1. Request Pairing Code

```bash
POST /api/v1/whatsapp/auth/phone
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN

{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pairing code generated successfully. Enter this code in your WhatsApp app.",
  "data": {
    "phoneNumber": "+1234567890",
    "codeRequested": true,
    "pairingCode": "12345678"
  }
}
```

### 2. Verify Pairing Status

```bash
POST /api/v1/whatsapp/auth/verify
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN

{
  "phoneNumber": "+1234567890",
  "code": "12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone verification successful - WhatsApp connected",
  "data": {
    "authenticated": true,
    "phoneNumber": "+1234567890"
  }
}
```

## User Instructions

### For End Users:

1. **Open WhatsApp** on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **"Link a Device"**
4. Select **"Link with phone number"** instead of scanning QR code
5. Enter the **8-digit code** provided by the platform
6. WhatsApp will automatically connect to the platform

### For Developers:

1. Call the `/auth/phone` endpoint with the user's phone number
2. Display the returned 8-digit code to the user
3. Instruct the user to enter this code in WhatsApp
4. Poll the `/auth/verify` endpoint to check connection status
5. Once verified, the WhatsApp connection is established

## Testing

Use the provided test script:

```bash
# Test with default phone number
node test-whatsapp-pairing.js

# Test with specific phone number
node test-whatsapp-pairing.js +1234567890
```

## Important Notes

1. **Phone Format**: Always include country code (e.g., +1 for US)
2. **Code Expiry**: Pairing codes expire after 3 minutes
3. **One Device**: Only one device can be paired at a time
4. **Security**: Never share pairing codes publicly

## Troubleshooting

### Code Not Working
- Ensure you're using the latest version of WhatsApp
- Check that "Link with phone number" option is available in your region
- Verify the phone number format includes country code

### Connection Failed
- Clear existing authentication: `POST /api/v1/whatsapp/clear-auth`
- Restart the service: `POST /api/v1/whatsapp/restart`
- Try QR code method as fallback: `GET /api/v1/whatsapp/qr`

### Platform Not Generating Code
- Check backend logs for errors
- Ensure WhatsApp service is running
- Verify Baileys/WhatsApp Web.js is properly configured

## Frontend Integration Example

```javascript
async function linkWhatsApp(phoneNumber) {
  try {
    // Request pairing code
    const response = await fetch('/api/v1/whatsapp/auth/phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ phoneNumber })
    });
    
    const data = await response.json();
    
    if (data.success && data.data.pairingCode) {
      // Display code to user
      showPairingCode(data.data.pairingCode);
      
      // Start polling for verification
      pollVerificationStatus(phoneNumber, data.data.pairingCode);
    }
  } catch (error) {
    console.error('Failed to generate pairing code:', error);
  }
}

async function pollVerificationStatus(phoneNumber, code) {
  const maxAttempts = 30;
  let attempts = 0;
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch('/api/v1/whatsapp/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ phoneNumber, code })
      });
      
      const data = await response.json();
      
      if (data.success) {
        clearInterval(interval);
        onConnectionSuccess();
      }
    } catch (error) {
      // Continue polling
    }
    
    attempts++;
    if (attempts >= maxAttempts) {
      clearInterval(interval);
      onConnectionTimeout();
    }
  }, 10000); // Poll every 10 seconds
}
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting on pairing code requests
2. **Authentication**: Always require user authentication before generating codes
3. **Logging**: Log all pairing attempts for security auditing
4. **HTTPS**: Use HTTPS in production to protect code transmission
5. **Code Complexity**: 8-digit codes provide sufficient entropy for security

## Alternative Methods

If phone pairing is not available or fails:

1. **QR Code**: Use the traditional QR code scanning method
2. **WhatsApp Business API**: For enterprise solutions
3. **WAHA**: Alternative WhatsApp HTTP API with phone support

For more information, see the main [WhatsApp Setup Guide](./WHATSAPP_SETUP.md).