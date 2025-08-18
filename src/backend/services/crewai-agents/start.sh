#!/bin/bash

echo "🚀 Starting CrewAI service..."

# Export default environment variables if not set
export FLASK_APP=${FLASK_APP:-main.py}
export FLASK_ENV=${FLASK_ENV:-production}
export PORT=${PORT:-10000}

# Log environment status
echo "📋 Environment Check:"
echo "   Python: $(python --version)"
echo "   Port: $PORT"
echo "   OpenAI Key: ${OPENAI_API_KEY:+Set}"
echo "   Anthropic Key: ${ANTHROPIC_API_KEY:+Set}"
echo "   Reddit Client ID: ${REDDIT_CLIENT_ID:+Set}"
echo "   Telegram Token: ${TELEGRAM_BOT_TOKEN:+Set}"

# Install any missing dependencies with version constraints
echo "📦 Checking dependencies..."
pip install --no-cache-dir "requests>=2.25.0,<3.0.0" "flask>=2.0.0,<3.0.0" "flask-cors>=3.0.0,<5.0.0" "python-dotenv>=0.19.0,<2.0.0"

# Check if CrewAI can be imported (test the fix)
echo "🧪 Testing CrewAI import..."
python3 -c "
try:
    from crewai import Agent, Task, Crew, Process
    print('✅ CrewAI import successful - fix is working!')
except ImportError as e:
    print(f'❌ CrewAI import failed: {e}')
    print('🔧 This indicates the version fix may need adjustment')
    exit(1)
except Exception as e:
    print(f'⚠️  CrewAI imported but other error: {e}')
"

# Start the Flask app
echo "🌐 Starting Flask on port $PORT..."
python -m flask run --host=0.0.0.0 --port=$PORT 