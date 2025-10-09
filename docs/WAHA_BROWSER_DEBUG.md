# WAHA Browser Debug Configuration

## How to Verify Browser Launch Success

Add these environment variables to your WAHA service on Railway to get detailed browser launch logs:

### Debug Environment Variables

```bash
# Enable Puppeteer debug logging
DEBUG=puppeteer:*

# Enable WAHA debug mode
WAHA_LOG_LEVEL=debug

# Show Puppeteer protocol messages
DEBUG_COLORS=true
```

### What to Look For in Logs

#### ✅ Browser Launch SUCCESS Indicators:

```
puppeteer:launcher Browser launch attempt
puppeteer:launcher Launching browser with args: [...]
puppeteer:protocol:SEND Target.setDiscoverTargets
puppeteer:protocol:RECV Target.targetCreated
puppeteer:protocol:RECV Target.targetInfoChanged
[WAHA] Browser process started with PID: 123
[WAHA] Browser connected successfully
[WEBJS] WhatsApp Web client initializing...
```

**If you see these logs, then browser IS launching correctly.**
**The 428 error happens AFTER browser launch = IP block confirmed.**

#### ❌ Browser Launch FAILURE Indicators:

```
Error: Failed to launch the browser process!
spawn /usr/bin/chromium ENOENT
Could not find Chrome (ver. XXX). This can occur if...
Error: Browser closed unexpectedly
Protocol error: Browser.getVersion
```

**If you see these errors, then browser is NOT launching = Need to fix Chrome path.**

### Quick Browser Health Check

Add this temporary endpoint to verify browser can launch:

```bash
# Test if Chrome is installed and executable
WAHA_TEST_BROWSER=true
```

This will make WAHA attempt a test browser launch on startup and log the result.

### Common Browser Issues and Fixes

#### Issue 1: Chrome Not Found
```bash
# Try different Chrome paths
CHROME_PATH=/usr/bin/google-chrome        # Try this first
# OR
CHROME_PATH=/usr/bin/chromium-browser     # Try this second
# OR
CHROME_PATH=/usr/bin/chromium             # Try this third
# OR remove it entirely and let Puppeteer auto-detect
# (Delete CHROME_PATH variable)
```

#### Issue 2: Chrome Crashes on Launch
```bash
# Add shared memory to prevent crashes
PUPPETEER_ARGS=--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --single-process

# Increase memory limits
NODE_OPTIONS=--max-old-space-size=4096
```

#### Issue 3: Chrome Version Mismatch
```bash
# Let Puppeteer download its own Chrome
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=  # Leave empty or remove

# Then rebuild/redeploy WAHA service
```

### Definitive Browser Test Command

SSH into Railway service (if available) or use Railway's console:

```bash
# Test 1: Check if Chrome exists
which google-chrome chromium chromium-browser
ls -la /usr/bin/google-chrome /usr/bin/chromium

# Test 2: Check Chrome version
google-chrome --version
chromium --version

# Test 3: Try launching Chrome (will fail but shows error)
google-chrome --headless --no-sandbox --dump-dom about:blank

# Test 4: Check Puppeteer's bundled Chromium
node -e "const puppeteer = require('puppeteer'); console.log(puppeteer.executablePath())"
```

## Decision Tree

```
Is browser launching?
│
├─ YES (seeing navigation/page logs)
│  └─ Then 428 error = IP block confirmed ✅
│     └─ Solution: Change IP or use NOWEB engine
│
└─ NO (seeing launch errors)
   └─ Browser issue = Chrome path/config problem ✅
      └─ Solution: Fix CHROME_PATH or Puppeteer config
```

## Quick Test: Add This to WAHA Environment

```bash
# Enable maximum debugging
DEBUG=puppeteer:*,waha:*
WAHA_LOG_LEVEL=debug
PUPPETEER_DUMPIO=true  # Shows browser stdout/stderr
```

Then check logs. You should see **hundreds of lines** of Puppeteer debug output if browser is attempting to launch.

### What the Logs Will Tell You:

**Scenario A: Browser Launches Successfully**
```
[Logs show]: 500+ lines of Puppeteer debug, navigation events, protocol messages
[Then]: ❌ Connection Terminated by Server (428)
[Conclusion]: IP BLOCK - browser works fine, WhatsApp rejects connection
```

**Scenario B: Browser Fails to Launch**
```
[Logs show]: 10-20 lines only, ending with launch error
[Error]: spawn ENOENT / Chrome not found / Protocol error
[Conclusion]: BROWSER ISSUE - need to fix Chrome installation/path
```
