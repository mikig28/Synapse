# WAHA (WhatsApp HTTP API) Setup Guide

## Overview

Synapse uses WAHA (WhatsApp HTTP API) for WhatsApp integration. This guide covers setup, configuration, and troubleshooting.

## Installation Methods

### Option 1: Docker Compose (Recommended)

The easiest way to run WAHA is using the included Docker Compose configuration:

```bash
# Start all services including WAHA
docker-compose up -d

# Or just WAHA
docker-compose up -d waha
```

WAHA will be available at `http://localhost:3001`

### Option 2: Standalone Docker

```bash
docker run -d \
  --name synapse-waha \
  -p 3001:3000 \
  -e WHATSAPP_API_KEY=your-secure-api-key \
  -e WHATSAPP_DEFAULT_ENGINE=WEBJS \
  -v waha_sessions:/app/sessions \
  devlikeapro/waha:latest
```

### Option 3: External Service

You can use an external WAHA service (like Render.com), but be aware of:
- Cold start delays
- Rate limits
- Network latency
- Potential timeouts with large chat lists

## Configuration

### 1. Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Configure WAHA settings:

```env
# WAHA WhatsApp Configuration
WAHA_SERVICE_URL=http://localhost:3001     # For local Docker
WAHA_API_KEY=your-secure-api-key-here      # Must match Docker config

# Performance Settings
WAHA_TIMEOUT_MS=30000                      # Request timeout (milliseconds)
WAHA_CHATS_LIMIT=300                       # Max chats to load
WAHA_MESSAGES_LIMIT=50                     # Max messages per chat
```

### 2. API Key Security

WAHA requires API key authentication. The key must:
- Be set in both WAHA service and backend `.env`
- Be sent as `X-API-Key` header
- Match exactly between services

## Initial Setup

### 1. Start Services

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f waha
```

### 2. Connect WhatsApp

1. Navigate to: `http://localhost:5173/integrations/whatsapp`
2. Click "Connect WhatsApp"
3. Scan the QR code with WhatsApp mobile app
4. Wait for connection confirmation

### 3. Verify Connection

Run the diagnostic tool:

```bash
node scripts/diagnose-waha.js
```

## Common Issues & Solutions

### Issue 1: Service Exceeding / Timeouts

**Symptoms:**
- "Service exceeding" errors
- Chats not loading
- Request timeouts

**Solutions:**

1. **Reduce chat limit:**
   ```env
   WAHA_CHATS_LIMIT=100  # Start with fewer chats
   ```

2. **Increase timeout:**
   ```env
   WAHA_TIMEOUT_MS=60000  # 60 seconds
   ```

3. **Use local WAHA instead of external:**
   ```env
   WAHA_SERVICE_URL=http://localhost:3001
   ```

### Issue 2: Authentication Errors (401)

**Symptoms:**
- 401 Unauthorized errors
- "Authentication failed" messages

**Solutions:**

1. **Check API key configuration:**
   ```bash
   # In .env
   WAHA_API_KEY=your-secure-api-key
   
   # In docker-compose.yml
   - WHATSAPP_API_KEY=${WAHA_API_KEY:-your-secure-api-key-here}
   ```

2. **Restart services:**
   ```bash
   docker-compose restart waha backend
   ```

### Issue 3: Connection Refused

**Symptoms:**
- ECONNREFUSED errors
- Cannot reach WAHA service

**Solutions:**

1. **Check if WAHA is running:**
   ```bash
   docker-compose ps waha
   ```

2. **Check port binding:**
   ```bash
   # Should show port 3001
   docker ps | grep waha
   ```

3. **Check network connectivity:**
   ```bash
   curl http://localhost:3001/health
   ```

### Issue 4: Chats Not Loading

**Symptoms:**
- Empty chat list
- No messages appearing

**Solutions:**

1. **Force refresh chats:**
   ```bash
   # Using the API
   curl -X POST http://localhost:3000/api/v1/whatsapp/refresh-chats
   ```

2. **Check session status:**
   ```bash
   node scripts/diagnose-waha.js
   ```

3. **Restart session:**
   ```bash
   # Via API
   curl -X POST http://localhost:3000/api/v1/whatsapp/restart
   ```

## Performance Optimization

### 1. Limit Data Loading

Configure reasonable limits:

```env
WAHA_CHATS_LIMIT=200      # Adjust based on needs
WAHA_MESSAGES_LIMIT=30    # Recent messages only
```

### 2. Disable Media Download

In `docker-compose.yml`:

```yaml
environment:
  - WHATSAPP_DOWNLOAD_MEDIA=false
```

### 3. Use Pagination

When fetching chats:

```javascript
// API supports pagination
GET /api/v1/whatsapp/chats?limit=50&offset=0
```

## Monitoring

### View Logs

```bash
# WAHA logs
docker-compose logs -f waha

# Backend logs
docker-compose logs -f backend

# Filter for WAHA-specific logs
docker-compose logs backend | grep "WAHA"
```

### Health Checks

```bash
# WAHA health
curl http://localhost:3001/health

# Backend WhatsApp status
curl http://localhost:3000/api/v1/whatsapp/status
```

## Advanced Configuration

### Using Different WAHA Engines

WAHA supports multiple engines. In `docker-compose.yml`:

```yaml
environment:
  - WHATSAPP_DEFAULT_ENGINE=WEBJS  # Default, most stable
  # - WHATSAPP_DEFAULT_ENGINE=VENOM  # Alternative
```

### Session Persistence

Sessions are stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep waha

# Backup sessions
docker run --rm -v synapse_waha_sessions:/data -v $(pwd):/backup alpine tar czf /backup/waha-sessions.tar.gz -C /data .
```

## Troubleshooting Checklist

1. ✅ Check `.env` configuration
2. ✅ Verify WAHA service is running
3. ✅ Confirm API key matches
4. ✅ Test with diagnostic script
5. ✅ Check Docker logs
6. ✅ Verify WhatsApp is connected
7. ✅ Try reducing limits
8. ✅ Restart services if needed

## Support

For WAHA-specific issues:
- Documentation: https://waha.devlike.pro/docs/
- GitHub: https://github.com/devlikeapro/waha

For Synapse integration issues:
- Check `scripts/diagnose-waha.js`
- Review backend logs
- Verify environment configuration