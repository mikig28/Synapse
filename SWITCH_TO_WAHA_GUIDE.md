# Switching to WAHA for Phone Pairing Support

If you need WhatsApp phone number pairing functionality, you'll need to switch from Baileys to WAHA (WhatsApp HTTP API).

## Why Switch to WAHA?

- **Baileys** doesn't support WhatsApp's phone pairing feature
- **WAHA** (with certain engines) may support phone pairing
- WAHA provides a REST API interface for WhatsApp

## Setting Up WAHA

### 1. Install WAHA using Docker

```bash
docker run -it -p 3000:3000 devlikeapro/waha:latest
```

### 2. Update Your Backend Configuration

In your `.env` file:
```env
WHATSAPP_SERVICE=waha
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your-api-key
```

### 3. Switch Service in Your Code

Update `/src/backend/src/api/controllers/whatsappController.ts`:

```typescript
import { WahaService } from '../../services/wahaService';

const getWhatsAppService = () => {
  if (process.env.WHATSAPP_SERVICE === 'waha') {
    return WahaService.getInstance();
  }
  return WhatsAppBaileysService.getInstance();
};
```

### 4. Test Phone Pairing with WAHA

```bash
# Request pairing code
curl -X POST http://localhost:3000/api/default/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Response should include pairing code
{
  "success": true,
  "code": "12345678"
}
```

## Important Notes

1. **WAHA Versions**: Not all WAHA engines support phone pairing
2. **Cost**: WAHA Plus (paid version) has more features
3. **Stability**: Test thoroughly before switching
4. **Migration**: Existing sessions may need to be re-authenticated

## Staying with Baileys + QR Code

If switching to WAHA is not feasible, the QR code method with Baileys is still reliable and widely used. Most WhatsApp Web implementations use QR codes successfully.

See [WhatsApp QR Code Guide](./WHATSAPP_QR_CODE_GUIDE.md) for implementation details.