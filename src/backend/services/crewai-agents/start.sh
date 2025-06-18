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

# Install any missing dependencies
echo "📦 Checking dependencies..."
pip install --no-cache-dir requests flask flask-cors python-dotenv

# Start the Flask app
echo "🌐 Starting Flask on port $PORT..."
python -m flask run --host=0.0.0.0 --port=$PORT 