# WhatsApp QR Code Authentication Guide

Since Baileys doesn't support WhatsApp's phone number pairing feature, QR code authentication is the recommended approach for connecting WhatsApp to your platform.

## Why QR Code Instead of Phone Pairing?

The "Link with phone number" feature you see in WhatsApp is proprietary and only works with:
- Official WhatsApp Web (web.whatsapp.com)
- WhatsApp Business API
- Official WhatsApp desktop applications

Third-party libraries like Baileys use the WhatsApp Web protocol, which primarily supports QR code authentication.

## How to Use QR Code Authentication

### 1. Request QR Code

```bash
GET /api/v1/whatsapp/qr
Authorization: Bearer YOUR_AUTH_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "timeout": 60000
  }
}
```

### 2. Display QR Code

Show the QR code image to the user. The QR code expires after 60 seconds, so you'll need to refresh it.

### 3. User Scans QR Code

Instructions for users:
1. Open WhatsApp on your phone
2. Go to **Settings** → **Linked Devices**
3. Tap **"Link a Device"**
4. Scan the QR code displayed on the screen

### 4. Check Connection Status

```bash
GET /api/v1/whatsapp/status
Authorization: Bearer YOUR_AUTH_TOKEN
```

## Frontend Implementation Example

```javascript
async function connectWhatsApp() {
  try {
    // Get QR code
    const qrResponse = await fetch('/api/v1/whatsapp/qr', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const qrData = await qrResponse.json();
    
    if (qrData.success) {
      // Display QR code
      document.getElementById('qr-code').src = qrData.data.qr;
      
      // Start polling for connection status
      pollConnectionStatus();
    }
  } catch (error) {
    console.error('Failed to get QR code:', error);
  }
}

async function pollConnectionStatus() {
  const interval = setInterval(async () => {
    try {
      const statusResponse = await fetch('/api/v1/whatsapp/status', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const status = await statusResponse.json();
      
      if (status.connected) {
        clearInterval(interval);
        onConnectionSuccess();
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }, 5000); // Check every 5 seconds
  
  // Stop polling after 5 minutes
  setTimeout(() => clearInterval(interval), 300000);
}
```

## Troubleshooting

### QR Code Not Working
- Ensure you're using the latest version of WhatsApp
- Check your internet connection
- Try clearing browser cache
- Restart the WhatsApp service: `POST /api/v1/whatsapp/restart`

### Connection Drops
- WhatsApp Web sessions can timeout
- Implement auto-reconnection logic
- Monitor connection status regularly

## Alternative: WhatsApp Business API

If you absolutely need phone number pairing, consider using:

1. **WhatsApp Business API** - Official API with phone pairing support
2. **WAHA (WhatsApp HTTP API)** - Some versions support phone pairing
3. **whatsapp-web.js** - Another library that might add this feature

## Security Notes

- QR codes contain sensitive session data
- Never share QR codes publicly
- Implement proper authentication before showing QR codes
- QR codes expire after 60 seconds for security

For more details, see the main [WhatsApp Setup Guide](./WHATSAPP_SETUP.md).