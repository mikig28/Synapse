#!/bin/bash

echo "🔍 Verifying WAHA Engine Configuration..."
echo "============================================="

# Check current engine
echo "1. Checking current WAHA engine:"
RESPONSE=$(curl -s -H "X-API-Key: waha-synapse-2025-secure" "https://waha-synapse-production.up.railway.app/api/version")
echo "   Response: $RESPONSE"

# Extract engine from response
ENGINE=$(echo $RESPONSE | grep -o '"engine":"[^"]*"' | cut -d'"' -f4)
echo "   Current Engine: $ENGINE"

# Verify expectation
if [ "$ENGINE" = "NOWEB" ]; then
    echo "✅ SUCCESS: WAHA is using NOWEB engine (no browser conflicts)"
    echo "   This configuration supports the image fetching workaround."
elif [ "$ENGINE" = "WEBJS" ]; then
    echo "❌ ISSUE: WAHA is still using WEBJS engine (browser conflicts)"
    echo "   Please update Railway environment: WAHA_ENGINE=NOWEB"
    echo "   Then redeploy the service."
else
    echo "⚠️  UNKNOWN: Engine '$ENGINE' is not recognized"
fi

echo ""
echo "2. Testing session creation capability:"
# Try to list sessions
curl -s -H "X-API-Key: waha-synapse-2025-secure" "https://waha-synapse-production.up.railway.app/api/sessions" | \
  grep -q "\[\]" && echo "   ✅ Sessions endpoint accessible" || echo "   ❌ Sessions endpoint issue"

echo ""
echo "🏗️  Expected Architecture with NOWEB:"
echo "   📱 WAHA NOWEB → Message Detection (no browser)"
echo "   🌐 Puppeteer → Image Extraction (separate browser)"
echo "   💡 No conflicts between services"

if [ "$ENGINE" = "NOWEB" ]; then
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Create/restart WhatsApp session"
    echo "   2. Test image message detection"
    echo "   3. Test on-demand image extraction"
fi