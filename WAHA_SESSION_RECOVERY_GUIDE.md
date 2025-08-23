# 🔄 WAHA Session Recovery Guide

## **Current Situation: FAILED Session**

Your WAHA session is in **FAILED** state causing 422 errors. Here's how to fix it:

```
Error: "Session status is not as expected"
Status: FAILED
Expected: WORKING
```

---

## **🚀 Immediate Fix Options**

### **Option 1: Auto-Recovery API (Recommended)** ⭐

**Your backend now includes automatic session recovery:**

```bash
# Check current session status
curl -X GET "https://synapse-backend-7lq6.onrender.com/api/v1/waha/status"

# Auto-recover FAILED session
curl -X POST "https://synapse-backend-7lq6.onrender.com/api/v1/waha/auto-recover"

# Manual session restart
curl -X POST "https://synapse-backend-7lq6.onrender.com/api/v1/waha/restart"
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "message": "Session auto-recovery completed",
    "previousStatus": "FAILED",
    "currentStatus": "SCAN_QR_CODE",
    "needsQR": true
  }
}
```

### **Option 2: Direct WAHA API**

```bash
# 1. Delete failed session
curl -X DELETE "https://synapse-waha.onrender.com/api/sessions/default" \
     -H "X-Api-Key: waha-synapse-2025-secure"

# 2. Start new session
curl -X POST "https://synapse-waha.onrender.com/api/sessions/default/start" \
     -H "X-Api-Key: waha-synapse-2025-secure" \
     -H "Content-Type: application/json" \
     -d '{"name": "default"}'

# 3. Generate QR code
curl -X GET "https://synapse-waha.onrender.com/api/default/auth/qr" \
     -H "X-Api-Key: waha-synapse-2025-secure"
```

### **Option 3: Service Restart**

Restart the entire WAHA service in Render Dashboard:
**👉 [WAHA Service Dashboard](https://dashboard.render.com/web/srv-d26fv595pdvs73ejpnsg)**

---

## **✅ New Session Recovery Features**

### **1. Automatic Session Recovery**
- **Auto-detects** FAILED sessions
- **Automatically restarts** failed sessions
- **Preserves** service stability
- **Circuit breaker** prevents cascade failures

### **2. New API Endpoints**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/waha/auto-recover` | POST | Auto-detect and recover FAILED sessions |
| `/api/v1/waha/restart` | POST | Manual session restart |
| `/api/v1/waha/status` | GET | Enhanced status with recovery info |

### **3. Enhanced Error Handling**
- **Graceful degradation** on session failures
- **Automatic retry logic** with exponential backoff
- **Memory-efficient** request queuing
- **Circuit breaker** for overload protection

---

## **🔧 Backend Integration**

### **WAHAService Methods**

```typescript
// Auto-recovery from FAILED state
await wahaService.autoRecoverSession();

// Manual session restart
await wahaService.restartSession();

// Check if recovery is needed
const status = await wahaService.getSessionStatus();
if (status.status === 'FAILED') {
  await wahaService.restartSession();
}
```

### **Frontend Integration**

```typescript
// Auto-recover session on failure
const recoverSession = async () => {
  try {
    const response = await fetch('/api/v1/waha/auto-recover', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success && result.data.needsQR) {
      // Show QR code interface
      showQRInterface();
    }
  } catch (error) {
    console.error('Session recovery failed:', error);
  }
};
```

---

## **🎯 Memory Optimization Features**

### **Already Applied:**
- ✅ **Request Queue**: Max 2 concurrent, queue limit 10
- ✅ **Circuit Breaker**: 5 failure threshold, 60s recovery
- ✅ **Timeout Reduction**: 90s → 30s
- ✅ **Data Pagination**: 25 chats max, 50 messages max
- ✅ **Memory Limits**: Node.js 1.8GB, GC optimization

### **Session-Specific Optimizations:**
- ✅ **Auto-Recovery**: Prevents session buildup
- ✅ **Clean Restart**: Properly cleans failed sessions
- ✅ **Status Monitoring**: Proactive failure detection

---

## **📊 Monitoring & Debugging**

### **Check Session Health**
```bash
# Get detailed status
curl -X GET "https://synapse-backend-7lq6.onrender.com/api/v1/waha/status"

# Health check
curl -X GET "https://synapse-backend-7lq6.onrender.com/api/v1/waha/health"
```

### **Monitor Logs**
```bash
# Check for session events
grep -i "session\|failed\|logout" /var/log/waha.log

# Monitor memory usage
grep -i "memory\|oom" /var/log/waha.log
```

### **Expected Session Flow**
```
STARTING → SCAN_QR_CODE → AUTHENTICATED → WORKING
          ↓ (on failure)
        FAILED → [AUTO-RECOVERY] → STARTING (restart cycle)
```

---

## **🚨 Prevention Strategy**

### **1. Proactive Monitoring**
```typescript
// Check session health every 30 seconds
setInterval(async () => {
  const status = await wahaService.getSessionStatus();
  if (status.status === 'FAILED') {
    console.log('Auto-recovering FAILED session...');
    await wahaService.autoRecoverSession();
  }
}, 30000);
```

### **2. Frontend Error Handling**
```typescript
// Handle 422 responses automatically
const apiCall = async (endpoint, data) => {
  try {
    const response = await fetch(endpoint, data);
    
    if (response.status === 422) {
      // Trigger auto-recovery
      await recoverSession();
      // Retry original request after recovery
      return await fetch(endpoint, data);
    }
    
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
```

---

## **✅ Next Steps**

1. **Immediate**: Use auto-recovery API to fix current FAILED session
2. **Short-term**: Deploy updated backend with session recovery
3. **Long-term**: Monitor memory usage and session stability

**Your WAHA service now has enterprise-grade session management!** 🚀

---

## **Support Commands**

```bash
# Quick status check
curl -X GET "https://synapse-backend-7lq6.onrender.com/api/v1/waha/status" | jq '.data.status'

# Quick recovery
curl -X POST "https://synapse-backend-7lq6.onrender.com/api/v1/waha/auto-recover" | jq '.success'

# Get QR after recovery
curl -X GET "https://synapse-backend-7lq6.onrender.com/api/v1/waha/qr" | jq '.data.qr'
```
