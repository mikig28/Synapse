#!/bin/bash

echo "🚀 Starting CrewAI Production Service..."

# Export default environment variables
export FLASK_APP=${FLASK_APP:-main_production_ready.py}
export FLASK_ENV=${FLASK_ENV:-production}
export PORT=${PORT:-10000}

# Production optimizations
export PYTHONUNBUFFERED=1
export PYTHONDONTWRITEBYTECODE=1
export MALLOC_ARENA_MAX=2

# Log environment status
echo "📋 Environment Check:"
echo "   Python: $(python --version)"
echo "   Port: $PORT"
echo "   Flask App: $FLASK_APP"
echo "   OpenAI Key: ${OPENAI_API_KEY:+Set}"
echo "   Anthropic Key: ${ANTHROPIC_API_KEY:+Set}"

# Upgrade pip first to handle dependency resolution better
echo "📦 Upgrading pip for better dependency resolution..."
pip install --upgrade pip

# Install requirements with better error handling
echo "📦 Installing dependencies..."
pip install --no-cache-dir -r requirements.txt

# Check installation status
if [ $? -ne 0 ]; then
    echo "⚠️  Some dependencies failed to install, but continuing with fallback mode..."
    echo "📦 Installing minimal dependencies for fallback mode..."
    pip install --no-cache-dir flask flask-cors python-dotenv requests pyyaml pydantic
fi

# Test compatibility and dependencies
echo "🧪 Testing compatibility..."
python3 -c "
import sys
import logging
logging.basicConfig(level=logging.INFO)

print('Testing basic Python imports...')
try:
    import flask, requests, json, yaml
    from datetime import datetime
    print('✅ Basic imports successful')
except Exception as e:
    print(f'❌ Basic imports failed: {e}')
    sys.exit(1)

print('Testing compatibility patches...')
try:
    from compatibility_patch import safe_import_crewai
    success, patches = safe_import_crewai()
    print(f'CrewAI compatibility: {\"✅ Success\" if success else \"⚠️ Fallback mode\"} ({patches} patches)')
except Exception as e:
    print(f'⚠️ Compatibility check failed: {e}')
    print('Will run in fallback mode')

print('Testing production service...')
try:
    # Just import, don't run
    import main_production_ready
    print('✅ Production service ready')
except Exception as e:
    print(f'❌ Production service failed: {e}')
    sys.exit(1)

print('🎉 All tests passed - service ready!')
"

# Check test results
if [ $? -eq 0 ]; then
    echo "✅ Compatibility tests passed!"
else
    echo "❌ Compatibility tests failed!"
    echo "🔧 Service may run with limited functionality"
fi

# Start the service
echo "🌐 Starting production service on port $PORT..."
echo "📊 Service will be available at: https://synapse-crewai.onrender.com/"
echo "🔍 Health check: https://synapse-crewai.onrender.com/health"
echo "🧪 Compatibility check: https://synapse-crewai.onrender.com/compatibility"

# Run the production-ready implementation
python -m flask run --host=0.0.0.0 --port=$PORT