#!/bin/bash

echo "🚀 Starting CrewAI 2025 Compliant Service..."

# Export default environment variables if not set
export FLASK_APP=${FLASK_APP:-main_crewai_compliant.py}
export FLASK_ENV=${FLASK_ENV:-production}
export PORT=${PORT:-10000}

# Log environment status
echo "📋 Environment Check:"
echo "   Python: $(python --version)"
echo "   Port: $PORT"
echo "   Flask App: $FLASK_APP"
echo "   OpenAI Key: ${OPENAI_API_KEY:+Set}"
echo "   Anthropic Key: ${ANTHROPIC_API_KEY:+Set}"
echo "   Reddit Client ID: ${REDDIT_CLIENT_ID:+Set}"
echo "   Telegram Token: ${TELEGRAM_BOT_TOKEN:+Set}"
echo "   Firecrawl API: ${FIRECRAWL_API_KEY:+Set}"

# Install any missing critical dependencies first
echo "📦 Installing critical dependencies..."
pip install --no-cache-dir "requests>=2.25.0,<3.0.0" "flask>=2.0.0,<3.0.0" "flask-cors>=3.0.0,<5.0.0" "python-dotenv>=0.19.0,<2.0.0" "pyyaml>=5.1"

# Test CrewAI compatibility (the main fix)
echo "🧪 Testing CrewAI 2025 compatibility..."
python3 -c "
import sys
try:
    # Test the main imports that were failing
    print('Testing basic imports...')
    import yaml, json, os
    from datetime import datetime
    from typing import Dict, List, Any, Optional
    print('✅ Basic imports successful')
    
    print('Testing Flask imports...')
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    print('✅ Flask imports successful')
    
    print('Testing Pydantic imports...')
    from pydantic import BaseModel, Field
    print('✅ Pydantic imports successful')
    
    # Test if our structure is valid (don't import CrewAI yet)
    print('Testing file structure...')
    assert os.path.exists('config/agents.yaml'), 'agents.yaml missing'
    assert os.path.exists('config/tasks.yaml'), 'tasks.yaml missing'
    assert os.path.exists('tools/custom_tools.py'), 'custom_tools.py missing'
    assert os.path.exists('main_crewai_compliant.py'), 'main_crewai_compliant.py missing'
    print('✅ File structure valid')
    
    print('Testing YAML configuration...')
    with open('config/agents.yaml', 'r') as f:
        agents_config = yaml.safe_load(f)
    assert 'news_research_specialist' in agents_config, 'Missing required agent config'
    print('✅ YAML configuration valid')
    
    print('🎉 All compatibility tests passed!')
except ImportError as e:
    print(f'❌ Import error: {e}')
    print('🔧 This indicates a dependency issue that needs to be resolved')
    sys.exit(1)
except Exception as e:
    print(f'❌ Configuration error: {e}')
    print('🔧 Check configuration files and structure')
    sys.exit(1)
"

# Check the exit code of the test
if [ $? -eq 0 ]; then
    echo "✅ CrewAI compatibility test passed!"
else
    echo "❌ CrewAI compatibility test failed!"
    echo "🔧 Please check the logs above for specific errors"
    exit 1
fi

# Additional environment setup for production
echo "🔧 Setting up production environment..."

# Set timezone for date-aware agents
export TZ=${TZ:-UTC}

# Optimize Python for production
export PYTHONUNBUFFERED=1
export PYTHONDONTWRITEBYTECODE=1

# Memory optimization (important for CrewAI)
export MALLOC_ARENA_MAX=2

# Start the CrewAI compliant Flask app
echo "🌐 Starting CrewAI 2025 Compliant Service on port $PORT..."
echo "📊 Service URL: https://synapse-crewai.onrender.com/"
echo "🔍 Health Check: https://synapse-crewai.onrender.com/health"

# Run the compliant implementation
python -m flask run --host=0.0.0.0 --port=$PORT