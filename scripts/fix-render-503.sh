#!/bin/bash

# Fix Render 503 Errors Script
echo "🔧 Fixing Render 503 Errors..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking Render deployment configuration...${NC}"

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ render.yaml not found!${NC}"
    exit 1
fi

# Update render.yaml with optimized settings
echo -e "${YELLOW}Updating render.yaml with optimized settings...${NC}"

# Create a backup of render.yaml
cp render.yaml render.yaml.backup

# Update the synapse-backend service configuration
sed -i.bak '/name: synapse-backend/,/^  -/{
    /startupTimeout:/d
    /healthCheckPath:/d
    /plan:/d
}' render.yaml

# Add optimized settings after the dockerfilePath line
awk '/dockerfilePath:.*Dockerfile/ {
    print
    print "    plan: starter"
    print "    startupTimeout: 600  # 10 minutes for initialization"
    print "    healthCheckPath: /health"
    print "    initialDelay: 30  # Wait 30 seconds before first health check"
    print "    numInstances: 1  # Single instance to reduce memory usage"
    print "    envVars:"
    next
} 
/envVars:/ && !done {
    done=1
    next
}
{print}' render.yaml.bak > render.yaml.tmp && mv render.yaml.tmp render.yaml

# Add memory optimization environment variables
echo -e "${YELLOW}Adding memory optimization settings...${NC}"

# Check if NODE_OPTIONS is already set
if ! grep -q "NODE_OPTIONS" render.yaml; then
    # Add NODE_OPTIONS after BACKEND_URL
    sed -i '/BACKEND_URL/a\      - key: NODE_OPTIONS\n        value: "--max-old-space-size=512"' render.yaml
fi

# Add startup optimization flag
if ! grep -q "STARTUP_MODE" render.yaml; then
    sed -i '/NODE_OPTIONS/a\      - key: STARTUP_MODE\n        value: "phased"' render.yaml
fi

echo -e "${GREEN}✅ render.yaml updated with optimizations${NC}"

# Check package.json scripts
echo -e "${YELLOW}Checking package.json scripts...${NC}"

cd src/backend

# Update build script to include memory limits
if [ -f "package.json" ]; then
    # Create optimized build script
    cat > build-optimized.js << 'EOF'
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting optimized build process...');

// Clean previous build
if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
}

// Run TypeScript compiler with memory limit
try {
    execSync('node --max-old-space-size=512 ./node_modules/.bin/tsc', {
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' }
    });
    console.log('✅ Build completed successfully');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
EOF

    # Update package.json to use optimized build
    if ! grep -q "build:optimized" package.json; then
        sed -i '/"build": "tsc"/a\    "build:optimized": "node build-optimized.js",' package.json
    fi
fi

cd ../..

echo -e "${GREEN}✅ Build scripts optimized${NC}"

# Create deployment instructions
cat > RENDER_DEPLOYMENT_FIX.md << 'EOF'
# Render 503 Error Fix

## Changes Made:

1. **Dockerfile Optimization**:
   - Switched to Alpine Linux base image (smaller size)
   - Reduced Node.js memory limit to 512MB
   - Removed unnecessary files after build
   - Using production dependencies only

2. **Server Startup**:
   - Implemented phased initialization
   - Server starts accepting requests immediately
   - Services initialize in background with timeouts
   - Health check returns 200 during startup phase

3. **Health Check Improvements**:
   - Added /ready endpoint for proper readiness checks
   - Health check won't trigger restarts during startup
   - Proper 503 status only after startup grace period

4. **Memory Optimization**:
   - NODE_OPTIONS set to --max-old-space-size=512
   - Reduced concurrent service initialization
   - Cleanup of unused resources

## Deployment Steps:

1. Commit all changes:
   ```bash
   git add -A
   git commit -m "Fix: Optimize Render deployment to prevent 503 errors"
   git push
   ```

2. In Render Dashboard:
   - Go to your synapse-backend service
   - Click "Manual Deploy" > "Deploy latest commit"
   - Monitor the logs during deployment

3. After deployment:
   - Check https://synapse-backend-7lq6.onrender.com/health
   - Monitor logs for initialization phases
   - Services should initialize within 10 minutes

## Monitoring:

Watch for these log messages:
- "RENDER DEPLOYMENT - Server accepting requests"
- "StartupManager] All phases completed"
- "RENDER DEPLOYMENT READY"

## If Issues Persist:

1. Check Render service logs for specific errors
2. Increase plan if memory limits are hit
3. Consider disabling non-essential services
4. Contact Render support with logs

EOF

echo -e "${GREEN}✅ Deployment instructions created in RENDER_DEPLOYMENT_FIX.md${NC}"

# Summary
echo -e "\n${GREEN}=== Summary of Changes ===${NC}"
echo "1. ✅ Updated render.yaml with startup optimizations"
echo "2. ✅ Added memory limits and phased startup"
echo "3. ✅ Created optimized build scripts"
echo "4. ✅ Documentation created"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review the changes"
echo "2. Commit and push to trigger new deployment"
echo "3. Monitor Render logs during deployment"
echo -e "\n${GREEN}Done! 🎉${NC}"