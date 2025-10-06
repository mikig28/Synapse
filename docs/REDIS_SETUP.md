# Redis Setup for Horizontal Scaling

## Overview

This document explains how to set up Redis for Socket.io horizontal scaling in the Synapse application.

## Why Redis?

### The Problem Without Redis
```
┌─────────────────┐     ┌──────────────────┐
│   User Alice    │────▶│  Server 1        │
└─────────────────┘     │  (Port 3000)     │
                        └──────────────────┘
                              ❌ Can't communicate
┌─────────────────┐     ┌──────────────────┐
│   User Bob      │────▶│  Server 2        │
└─────────────────┘     │  (Port 3001)     │
                        └──────────────────┘
```

When Alice (on Server 1) emits a Socket.io event, Bob (on Server 2) never receives it because Socket.io stores connections only in local memory.

### The Solution With Redis
```
┌─────────────────┐     ┌──────────────────┐
│   User Alice    │────▶│  Server 1        │
└─────────────────┘     │  emit('event')   │
                        └────────┬─────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │      REDIS             │
                    │   (Pub/Sub Broker)     │
                    └────────┬───────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          ▼                                     ▼
┌──────────────────┐                   ┌──────────────────┐
│  Server 1        │                   │  Server 2        │
└──────────────────┘                   └─────────┬────────┘
                                                 │
                                                 ▼
                                       ┌─────────────────┐
                                       │   User Bob      │
                                       │  ✅ Receives!   │
                                       └─────────────────┘
```

Redis acts as a message broker, allowing WebSocket events to reach users on ANY server instance.

## Installation

### Local Development

**Option 1: Docker (Recommended)**
```bash
# Run Redis in Docker
docker run -d \
  --name synapse-redis \
  -p 6379:6379 \
  redis:7-alpine

# Verify it's running
docker ps | grep redis
```

**Option 2: Native Installation**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Windows (WSL recommended)
sudo apt-get install redis-server
```

### Production (Render.com)

1. **Add Redis Service via Render Dashboard:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Redis"
   - Choose a plan (Free tier available for testing)
   - Name: `synapse-redis`
   - Region: Same as your web service (e.g., Oregon)
   - Click "Create Redis"

2. **Copy Connection URL:**
   - After creation, copy the "Internal Redis URL"
   - Format: `redis://red-xxxxx:6379`

3. **Add to Environment Variables:**
   - Go to your web service settings
   - Add environment variable:
     - Key: `REDIS_URL`
     - Value: `redis://red-xxxxx:6379` (your internal URL)

### Other Cloud Providers

**AWS ElastiCache:**
```bash
REDIS_HOST=your-cluster.cache.amazonaws.com
REDIS_PORT=6379
```

**Azure Cache for Redis:**
```bash
REDIS_HOST=your-cache.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-access-key
```

**Google Cloud Memorystore:**
```bash
REDIS_HOST=10.0.0.3  # Internal IP
REDIS_PORT=6379
```

## Environment Variables

### Option 1: Full URL (Recommended for Render/Heroku)
```bash
REDIS_URL=redis://username:password@host:port/db
# or for TLS
REDIS_TLS_URL=rediss://username:password@host:port/db
```

### Option 2: Individual Variables
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # Optional
REDIS_USERNAME=default        # Optional
REDIS_DB=0                    # Optional, defaults to 0
```

## Testing Redis Connection

```bash
# Local testing
redis-cli ping
# Expected output: PONG

# Test with authentication
redis-cli -h localhost -p 6379 -a your_password ping

# Check if server is using Redis
curl http://localhost:3000/health
# Look for redis_status in response
```

## Verifying Horizontal Scaling

### Test Setup
1. **Start Server Instance 1:**
```bash
PORT=3000 npm start
```

2. **Start Server Instance 2 (different terminal):**
```bash
PORT=3001 npm start
```

3. **Open Browser Consoles:**
- Tab 1: Connect to `http://localhost:3000`
- Tab 2: Connect to `http://localhost:3001`

4. **Test Cross-Server Events:**
```javascript
// In Tab 1 (Server 1)
socket.emit('test_event', { message: 'Hello from Server 1' });

// In Tab 2 (Server 2) - You should receive the event!
socket.on('test_event', (data) => {
  console.log('Received:', data); // ✅ Should log if Redis is working
});
```

## Production Deployment with Load Balancer

```
                    ┌──────────────────┐
                    │  Load Balancer   │
                    │  (Nginx/ALB)     │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Server 1        │ │  Server 2        │ │  Server 3        │
│  (Port 3000)     │ │  (Port 3000)     │ │  (Port 3000)     │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                             │
                             ▼
                    ┌────────────────────────┐
                    │      REDIS             │
                    │   (Pub/Sub Broker)     │
                    └────────────────────────┘
```

All server instances connect to the same Redis instance for event synchronization.

## Troubleshooting

### Server starts but logs "Running without Redis adapter"
**Cause:** Redis connection failed
**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Verify environment variables are set
3. Check logs for connection errors

### Events not reaching users on different servers
**Cause:** Redis adapter not configured
**Solution:**
1. Check server logs for "Redis adapter configured successfully"
2. Verify both servers use same REDIS_URL
3. Test Redis Pub/Sub manually:
```bash
# Terminal 1: Subscribe
redis-cli SUBSCRIBE socket.io#/

# Terminal 2: Publish
redis-cli PUBLISH socket.io#/ "test message"
```

### Redis connection timeout in production
**Cause:** Network restrictions or wrong URL
**Solution:**
1. Use **Internal Redis URL** from Render (not External URL)
2. Ensure web service and Redis are in the same region
3. Check firewall rules

### High memory usage in Redis
**Cause:** Too many Socket.io events stored
**Solution:**
1. Redis Pub/Sub doesn't store messages (very low memory)
2. If using caching, implement TTL (Time To Live)
3. Monitor with: `redis-cli INFO memory`

## Performance Considerations

### Connection Limits
- **Development:** Redis free tier handles 10 concurrent connections
- **Production:** Consider Redis connection pooling for 100+ servers

### Latency
- **Same Region:** < 1ms between server and Redis
- **Cross Region:** 50-200ms (not recommended)
- **Best Practice:** Deploy Redis in same region as web services

### Scalability Metrics
- **Without Redis:** 1 server = max 10k concurrent WebSocket connections
- **With Redis:** 10 servers = 100k concurrent connections
- **With Redis:** 100 servers = 1M concurrent connections

## Cost Comparison

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| Render.com | 25MB RAM | $10/mo (100MB), $25/mo (1GB) |
| Railway.app | Shared | $5/mo (512MB) |
| Upstash | 10k commands/day | $0.20 per 100k commands |
| AWS ElastiCache | None | ~$15/mo (cache.t3.micro) |
| Azure Redis | None | ~$16/mo (Basic 250MB) |

**Recommendation:** Start with Render.com free tier for testing, upgrade to paid when scaling beyond 100 concurrent users.

## Next Steps

After Redis is configured:
1. ✅ Test horizontal scaling with 2+ server instances
2. ✅ Add load balancer (Nginx, ALB, or Render's built-in)
3. ✅ Implement Redis caching for AI/search operations (Week 2.1)
4. ✅ Set up monitoring for Redis health and performance
5. ✅ Configure Redis persistence for production reliability

## References

- [Socket.io Redis Adapter Docs](https://socket.io/docs/v4/redis-adapter/)
- [Redis Pub/Sub Documentation](https://redis.io/docs/interact/pubsub/)
- [Render Redis Documentation](https://render.com/docs/redis)
