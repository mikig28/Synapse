# WhatsApp Business Integration Setup Guide

This guide explains how to complete the WhatsApp Business integration for the Synapse platform.

## Overview

The WhatsApp integration includes:
- Complete frontend interface with modern UI/UX matching Synapse design system
- Backend API endpoints for webhook handling and message management
- Real-time messaging capabilities
- Contact management system
- Analytics and statistics
- Configuration management

## What's Been Implemented

### Frontend Components
- **WhatsApp Page** (`/src/frontend/src/pages/WhatsAppPage.tsx`)
  - Modern chat interface with contact list
  - Real-time messaging display
  - Analytics dashboard with statistics
  - Configuration settings panel
  - Contact management features

- **WhatsApp Service** (`/src/frontend/src/services/whatsappService.ts`)
  - Complete API client for all WhatsApp endpoints
  - Message formatting utilities
  - Contact management functions
  - Media upload capabilities

### Backend Components
- **WhatsApp Controller** (`/src/backend/src/api/controllers/whatsappController.ts`)
  - Webhook verification and message processing
  - Contact and message management endpoints
  - Statistics and analytics endpoints
  - Configuration management

- **Database Models**
  - `WhatsAppMessage.ts` - Message storage with metadata
  - `WhatsAppContact.ts` - Contact management with interaction tracking

- **API Routes** (`/src/backend/src/api/routes/whatsappRoutes.ts`)
  - Webhook endpoints (GET/POST `/webhook`)
  - Contact management (`/contacts`, `/contacts/:id/messages`)
  - Message sending (`/send`)
  - Statistics (`/stats`)
  - Configuration (`/config`, `/status`)

### UI/UX Features
- **Modern Design**: Matches Synapse platform's gradient theme and glass morphism effects
- **Real-time Updates**: Socket.io integration for live message updates
- **Responsive Layout**: Works on desktop and mobile devices
- **Contact Management**: Search, filter, and organize contacts
- **Message History**: Complete conversation tracking
- **Analytics Dashboard**: Response rates, message statistics, and performance metrics
- **Configuration Panel**: Easy setup and management of WhatsApp Business API

## Setup Requirements

To complete the WhatsApp integration, you need:

### 1. WhatsApp Business API Account
- Register for WhatsApp Business API through Meta Business
- Get your Business Account ID and Phone Number ID
- Generate Access Token for API authentication

### 2. Environment Variables
Add these to your `.env` file:

```bash
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/v1/whatsapp/webhook

# Optional Settings
WHATSAPP_AUTO_REPLY_ENABLED=true
WHATSAPP_BUSINESS_PHONE=+1234567890
```

### 3. Meta Webhook Configuration
In your Meta App Dashboard:
1. Go to WhatsApp > Configuration
2. Set Webhook URL to: `https://your-domain.com/api/v1/whatsapp/webhook`
3. Set Verify Token to match `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to webhook fields: `messages`, `message_deliveries`, `message_reads`

### 4. Required Permissions
Ensure your WhatsApp Business API app has these permissions:
- `whatsapp_business_messaging`
- `whatsapp_business_management`

## Integration with External WhatsApp Service

If you're using the external WhatsApp webhook service from your repository:

### 1. Deploy the External Service
- Deploy your WhatsApp webhook repository to Render
- Note the service URL (e.g., `https://your-whatsapp-service.onrender.com`)

### 2. Configure Proxy Integration
Update the backend controller to proxy requests to your external service:

```typescript
// In whatsappController.ts
const EXTERNAL_WHATSAPP_SERVICE = process.env.EXTERNAL_WHATSAPP_SERVICE_URL;

export const sendWhatsAppMessage = async (req: Request, res: Response) => {
  try {
    if (EXTERNAL_WHATSAPP_SERVICE) {
      // Proxy to external service
      const response = await axios.post(`${EXTERNAL_WHATSAPP_SERVICE}/send`, req.body);
      res.json(response.data);
    } else {
      // Use direct WhatsApp Business API
      // ... existing implementation
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 3. Update Environment Variables
```bash
EXTERNAL_WHATSAPP_SERVICE_URL=https://your-whatsapp-service.onrender.com
```

## Testing the Integration

### 1. Backend Testing
```bash
# Start the backend server
npm run dev:backend

# Test webhook verification
curl -X GET "http://localhost:3001/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test_challenge"

# Test message sending
curl -X POST "http://localhost:3001/api/v1/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"to": "+1234567890", "message": "Test message", "type": "text"}'
```

### 2. Frontend Testing
1. Start the frontend: `npm run dev`
2. Navigate to `/whatsapp`
3. Test the interface components:
   - Contact list loading
   - Message sending
   - Real-time updates
   - Analytics display

## Features Included

### Contact Management
- Automatic contact creation from incoming messages
- Contact search and filtering
- Interaction history tracking
- Business contact categorization
- Contact blocking/muting capabilities

### Message Features
- Text message sending/receiving
- Message status tracking (sent, delivered, read)
- Message history and conversation threads
- Real-time message updates via Socket.io
- Auto-reply functionality

### Analytics & Reporting
- Total message count
- Response rate calculations
- Average response time
- Weekly message statistics
- Contact engagement metrics

### Business Features
- Business hours configuration
- Auto-reply message customization
- Webhook status monitoring
- Connection health checks
- Message templates (ready for implementation)

## Next Steps

1. **Complete Meta Business Setup**: Register and configure your WhatsApp Business API account
2. **Deploy to Production**: Update environment variables and deploy both services
3. **Configure Webhooks**: Set up Meta webhooks to point to your deployed service
4. **Test End-to-End**: Send test messages and verify the complete flow
5. **Customize Templates**: Add message templates and auto-reply rules
6. **Monitor Performance**: Use the analytics dashboard to track usage

## Security Considerations

- All API endpoints require authentication (except webhook verification)
- Webhook verification uses secure token validation
- Message content is stored securely in MongoDB
- Personal data handling complies with privacy requirements
- Rate limiting should be implemented for production use

## Support and Troubleshooting

Common issues and solutions:

1. **Webhook Verification Fails**: Check that `WHATSAPP_VERIFY_TOKEN` matches Meta configuration
2. **Messages Not Sending**: Verify WhatsApp Business API permissions and access token
3. **Real-time Updates Not Working**: Check Socket.io connection and server configuration
4. **Contact Not Created**: Verify webhook payload structure and database connection

The WhatsApp integration is now fully implemented and ready for configuration with your WhatsApp Business API credentials.