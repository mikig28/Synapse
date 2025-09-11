#!/bin/bash

# Monitor Synapse Backend Deployment Status
# This script checks if the backend is healthy and deployment is successful

BACKEND_URL="https://synapse-backend-7lq6.onrender.com"
HEALTH_ENDPOINT="/api/v1/health"
SUMMARY_ENDPOINT="/api/v1/whatsapp-summary/groups"

echo "=========================================="
echo "Synapse Backend Deployment Monitor"
echo "=========================================="
echo "Backend URL: $BACKEND_URL"
echo "Checking deployment status..."
echo ""

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    # Make request and capture status code
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL$endpoint")
    
    if [ "$status" = "200" ]; then
        echo "✅ OK (HTTP $status)"
        return 0
    elif [ "$status" = "404" ]; then
        echo "⚠️  Not Found (HTTP $status) - Backend may still be building"
        return 1
    elif [ "$status" = "500" ] || [ "$status" = "502" ] || [ "$status" = "503" ]; then
        echo "❌ Error (HTTP $status) - Server error, check logs"
        return 1
    else
        echo "❓ Unknown (HTTP $status)"
        return 1
    fi
}

# Check health endpoint
check_endpoint "$HEALTH_ENDPOINT" "Health Endpoint"
health_status=$?

# Check WhatsApp summary endpoint
check_endpoint "$SUMMARY_ENDPOINT" "WhatsApp Summary API"
summary_status=$?

echo ""
echo "=========================================="

if [ $health_status -eq 0 ] && [ $summary_status -eq 0 ]; then
    echo "✅ Deployment Successful!"
    echo "The backend is healthy and WhatsApp summary API is responding."
    echo ""
    echo "Next steps:"
    echo "1. Configure AI API keys in Render dashboard:"
    echo "   - OPENAI_API_KEY"
    echo "   - ANTHROPIC_API_KEY (optional)"
    echo "   - GEMINI_API_KEY (optional)"
    echo ""
    echo "2. Test the summary feature:"
    echo "   node test-whatsapp-summary-fix.js --production"
else
    echo "⚠️  Deployment In Progress or Failed"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check Render dashboard for build logs:"
    echo "   https://dashboard.render.com"
    echo ""
    echo "2. Common issues:"
    echo "   - TypeScript compilation errors"
    echo "   - Memory limit exceeded during build"
    echo "   - Missing environment variables"
    echo ""
    echo "3. Recent fixes applied:"
    echo "   - Fixed MongoDB query syntax (duplicate \$or operators)"
    echo "   - Added AI service integration"
    echo "   - Increased build memory to 4GB"
    echo ""
    echo "4. If build keeps failing:"
    echo "   - Check Dockerfile NODE_OPTIONS setting"
    echo "   - Verify all TypeScript files compile locally"
    echo "   - Consider simplifying the build process"
fi

echo "=========================================="
echo "Deployment URL: https://dashboard.render.com"
echo "Repository: https://github.com/mikig28/Synapse"
echo "=========================================="