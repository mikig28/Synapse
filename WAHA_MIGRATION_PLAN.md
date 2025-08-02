# WAHA Migration Plan: From Custom Baileys to Production-Ready WhatsApp API

## 🎯 **Migration Overview**

This plan migrates Synapse from a custom 1,567-line WhatsApp Baileys implementation to the production-ready [WAHA (WhatsApp HTTP API)](https://github.com/devlikeapro/waha) microservice.

## 📊 **Benefits**

| Aspect | Before (Custom Baileys) | After (WAHA) |
|--------|-------------------------|--------------|
| **Code Maintenance** | 1,567 lines to maintain | 0 lines (external service) |
| **Stability** | Custom connection logic | Battle-tested (2.5k stars) |
| **Multi-session** | Single WhatsApp account | Multiple accounts |
| **Engine Options** | Baileys only | 3 engines (WEBJS, NOWEB, GOWS) |
| **Deployment** | Complex Puppeteer setup | Simple Docker container |
| **Documentation** | Internal only | Full Swagger API |
| **Error Recovery** | Custom implementation | Production-grade recovery |

## 🚀 **Migration Phases**

### **Phase 1: Infrastructure (Day 1) ✅**
- [x] Add WAHA service to `render.yaml`
- [x] Configure environment variables
- [x] Set up persistent storage for sessions

### **Phase 2: Service Layer (Day 1-2) ✅**
- [x] Create `WAHAService` class (`src/backend/src/services/wahaService.ts`)
- [x] Implement HTTP API wrapper
- [x] Add error handling and logging
- [x] Create webhook support

### **Phase 3: API Layer (Day 2) ✅**
- [x] Create `wahaController.ts` 
- [x] Create `wahaRoutes.ts`
- [x] Add both legacy and modern endpoints
- [x] Integrate with server

### **Phase 4: Testing & Validation (Day 3)**
- [ ] Deploy WAHA service
- [ ] Test API endpoints
- [ ] Validate message sending/receiving
- [ ] Test QR code authentication
- [ ] Verify webhook functionality

### **Phase 5: Frontend Integration (Day 3-4)**
- [ ] Update frontend WhatsApp components
- [ ] Switch API calls to WAHA endpoints
- [ ] Test UI functionality
- [ ] Update error handling

### **Phase 6: Cleanup (Day 4-5)**
- [ ] Remove `WhatsAppBaileysService` (1,567 lines)
- [ ] Remove Baileys dependencies
- [ ] Remove legacy routes
- [ ] Update documentation

## 🔧 **New API Endpoints**

### **WAHA Endpoints (Modern)**
```
GET  /api/v1/waha/health          - Health check
GET  /api/v1/waha/status          - Connection status  
GET  /api/v1/waha/qr              - Get QR code
POST /api/v1/waha/send            - Send text message
POST /api/v1/waha/send-media      - Send media message
GET  /api/v1/waha/chats           - Get all chats
GET  /api/v1/waha/messages/:chatId - Get chat messages
POST /api/v1/waha/session/start   - Start session
POST /api/v1/waha/session/stop    - Stop session
POST /api/v1/waha/webhook         - Webhook handler
```

### **Legacy Endpoints (Compatibility)**
```
GET  /api/v1/whatsapp/*          - Existing endpoints (will be removed)
```

## 📝 **Environment Variables**

Add to Render.com backend service:
```env
WAHA_SERVICE_URL=https://synapse-waha.onrender.com
```

## 🔄 **Migration Strategy**

### **Gradual Migration**
1. **Deploy both services** (WAHA + legacy Baileys)
2. **Test WAHA endpoints** in parallel
3. **Switch frontend** to use WAHA APIs
4. **Remove legacy code** once stable

### **Rollback Plan**
- Keep legacy endpoints during migration
- Environment variable to switch between services
- Database maintains same message format

## 🧪 **Testing Checklist**

### **WAHA Service**
- [ ] Service deployment successful
- [ ] Health check responds
- [ ] QR code generation works
- [ ] Session management functional

### **API Integration**
- [ ] All endpoints return expected responses
- [ ] Error handling works correctly
- [ ] Webhook events received
- [ ] Message format compatibility

### **Frontend**
- [ ] WhatsApp status displays correctly
- [ ] QR scanning flow works
- [ ] Message sending functional
- [ ] Chat list updates
- [ ] Media messages work

## 🚨 **Risk Mitigation**

### **Deployment Risks**
- **Risk**: WAHA service fails to start
- **Mitigation**: Keep legacy service running, gradual switchover

### **API Compatibility**
- **Risk**: Frontend breaks with new API
- **Mitigation**: Maintain response format compatibility

### **Data Loss**
- **Risk**: Lose chat history during migration  
- **Mitigation**: Export/import chat data, parallel operation

## 📋 **Post-Migration Tasks**

### **Code Cleanup**
1. Remove `src/backend/src/services/whatsappBaileysService.ts` (1,567 lines)
2. Remove `src/backend/src/api/controllers/whatsappController.ts`
3. Remove `src/backend/src/api/routes/whatsappRoutes.ts`
4. Update `package.json` to remove Baileys dependencies

### **Dependencies to Remove**
```json
{
  "@whiskeysockets/baileys": "^6.5.0",
  "whatsapp-web.js": "^1.23.0",
  "qrcode": "^1.5.3",
  "qrcode-terminal": "^0.12.0"
}
```

### **Documentation Updates**
- Update API documentation
- Update deployment guide
- Create WAHA configuration guide

## 🎉 **Success Metrics**

- ✅ **Reduced codebase**: -1,567 lines of WhatsApp code
- ✅ **Improved stability**: Production-grade WhatsApp service
- ✅ **Better scalability**: Multiple WhatsApp sessions
- ✅ **Easier maintenance**: Zero WhatsApp-specific code to maintain
- ✅ **Enhanced features**: More reliable message delivery

## 📞 **Support & Troubleshooting**

### **WAHA Documentation**
- Main docs: https://waha.devlike.pro/
- GitHub: https://github.com/devlikeapro/waha
- Swagger: https://waha.devlike.pro/swagger

### **Common Issues**
- **WAHA service not starting**: Check Docker logs, environment variables
- **QR code not generating**: Verify session status, check WAHA logs
- **Messages not sending**: Check webhook configuration, API authentication

---

**Migration Timeline**: 4-5 days
**Complexity**: Medium (mostly API endpoint switching)
**Risk Level**: Low (gradual migration with fallback)