# WhatsApp 405 Error Fix

## Problem
The backend was experiencing a WhatsApp connection error with the following characteristics:
- Error code: 405 (Method Not Allowed)
- Error data: `{ reason: '405', location: 'frc' }`
- Connection failure preventing WhatsApp functionality

## Root Cause
The error was caused by:
1. **Protocol Version Mismatch**: The WhatsApp Web protocol version being used was outdated
2. **Browser Configuration**: The browser identification string was not matching WhatsApp's expectations
3. **Missing Error Handling**: No specific handling for 405 protocol errors

## Solution Implemented

### 1. Updated Protocol Version
Changed from: `version: [2, 2323, 4]`
To: `version: [2, 3000, 1026266956]`
- This matches the latest WhatsApp Web protocol version

### 2. Fixed Browser Configuration
Changed from: `browser: ['Synapse Bot', 'Chrome', '120.0.0']`
To: `browser: Browsers.macOS('Chrome')`
- Uses official Baileys browser configuration

### 3. Added 405 Error Handling
Implemented specific handling for 405 errors that:
- Detects the error based on status code and error data
- Automatically clears authentication
- Attempts reconnection with backoff strategy (10s, 15s, 20s)
- Provides clear status messages to users
- Falls back to manual intervention after 3 attempts

### 4. Enabled Query Initialization
Changed: `fireInitQueries: false` to `fireInitQueries: true`
- Ensures proper WhatsApp initialization

## Files Modified
- `/src/backend/src/services/whatsappBaileysService.ts`

## Recovery Strategy
When a 405 error occurs, the system will:
1. **First Attempt**: Clear auth, wait 10 seconds, reconnect
2. **Second Attempt**: Clear auth, wait 15 seconds, reconnect
3. **Third Attempt**: Clear auth, wait 20 seconds, reconnect
4. **After 3 Attempts**: Request manual intervention (re-scan QR code)

## Manual Recovery Options
If automatic recovery fails, users can:
1. **Force Restart**: Restart the WhatsApp service
2. **Clear Authentication**: Remove stored credentials and re-authenticate
3. **Re-scan QR Code**: Generate a new QR code for fresh authentication

## Prevention
To prevent future 405 errors:
- Keep Baileys library updated to latest version
- Monitor WhatsApp Web protocol changes
- Implement proactive version checking
- Use official browser configurations

## Testing
After deployment, verify:
1. WhatsApp connection establishes successfully
2. No 405 errors in logs
3. Automatic recovery works if errors occur
4. QR code generation works for fresh authentication

## Monitoring
Watch for these log messages:
- `⚠️ WhatsApp protocol version mismatch (405 error) detected` - Indicates 405 error occurred
- `⏳ 405 error recovery attempt X/3` - Shows recovery in progress
- `✅ WhatsApp connected successfully!` - Confirms successful connection