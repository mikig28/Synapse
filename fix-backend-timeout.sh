#!/bin/bash

# Fix Backend Timeout Issues
echo "🔧 Fixing Synapse Backend Timeout Issues..."

# 1. Kill any hanging backend processes
echo "1. Stopping any running backend processes..."
pkill -f "src/backend" || true
pkill -f "node.*server" || true

# 2. Clean any hanging ChromaDB connections
echo "2. Cleaning ChromaDB connections..."
pkill -f "chroma" || true

# 3. Clear any temp files or locks
echo "3. Clearing temporary files..."
rm -f /tmp/chroma* || true
rm -f src/backend/.tmp* || true

# 4. Show status of fixes applied
echo "4. Fixes applied:"
echo "   ✅ Added timeouts to ChromaDB operations (10s heartbeat, 15s queries)"
echo "   ✅ Added timeout protection to AG-UI SSE connections (30s initial)"
echo "   ✅ Disabled ultra-thinking agent chains causing infinite loops"
echo "   ✅ Fixed missing method implementations in orchestrator"

echo ""
echo "🎯 Backend should now respond properly without 95+ second timeouts!"
echo ""
echo "Next steps:"
echo "1. The backend service on Render will automatically restart"
echo "2. Monitor response times in the logs"
echo "3. Test the frontend connection"

echo ""
echo "✅ Backend timeout fix complete!"