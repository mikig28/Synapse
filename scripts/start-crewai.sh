#!/bin/bash

# Synapse CrewAI Service Startup Script

echo "🤖 Starting Synapse CrewAI Multi-Agent News System..."

# Check if we're in the right directory
if [ ! -f "src/backend/services/crewai-agents/main.py" ]; then
    echo "❌ Error: Please run this script from the Synapse root directory"
    exit 1
fi

# Navigate to CrewAI service directory
cd src/backend/services/crewai-agents

# Check if Python 3.11+ is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not installed"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.9"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Error: Python $REQUIRED_VERSION or higher is required. Found: $PYTHON_VERSION"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys:"
    echo "   - OPENAI_API_KEY (required)"
    echo "   - REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET (optional)"
    echo "   - TELEGRAM_BOT_TOKEN (optional)"
    echo ""
fi

# Install/upgrade dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if OpenAI API key is set
if [ -f ".env" ]; then
    source .env
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  Warning: OPENAI_API_KEY not set in .env file"
        echo "   The service will start but may not function properly without it"
    fi
fi

# Start the service
echo "🚀 Starting CrewAI service on port 5000..."
echo "   Health check: http://localhost:5000/health"
echo "   Service logs will appear below..."
echo "   Press Ctrl+C to stop"
echo ""

python main.py