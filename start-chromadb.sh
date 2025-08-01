#!/bin/bash

# ChromaDB Startup Script
# This script starts ChromaDB with the proper configuration for the Synapse application

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$SCRIPT_DIR/chroma_env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting ChromaDB Server...${NC}"

# Check if virtual environment exists
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}❌ ChromaDB virtual environment not found at $VENV_PATH${NC}"
    echo -e "${YELLOW}💡 Creating ChromaDB environment...${NC}"
    
    # Create virtual environment
    python3 -m venv "$VENV_PATH"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
    
    # Install ChromaDB
    echo -e "${YELLOW}📦 Installing ChromaDB...${NC}"
    source "$VENV_PATH/bin/activate"
    pip install chromadb
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install ChromaDB${NC}"
        exit 1
    fi
fi

# Check if ChromaDB is already running
if pgrep -f "chroma run" > /dev/null; then
    echo -e "${YELLOW}⚠️ ChromaDB appears to be already running${NC}"
    echo -e "${BLUE}🔍 Checking if port 8000 is accessible...${NC}"
    
    # Test connection
    if curl -s http://localhost:8000/api/v1 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ChromaDB is running and accessible on port 8000${NC}"
        exit 0
    else
        echo -e "${RED}❌ Port 8000 not responding, killing existing processes...${NC}"
        pkill -f "chroma run"
        sleep 2
    fi
fi

# Activate virtual environment and start ChromaDB
echo -e "${BLUE}🔄 Activating virtual environment...${NC}"
source "$VENV_PATH/bin/activate"

echo -e "${BLUE}🌐 Starting ChromaDB server with CORS enabled...${NC}"
echo -e "${YELLOW}📍 Server will be available at: http://localhost:8000${NC}"
echo -e "${YELLOW}🔧 CORS origins: * (all origins allowed)${NC}"

# Set CORS environment variable and start ChromaDB
export CHROMA_SERVER_CORS_ALLOW_ORIGINS="*"

# Start ChromaDB server
chroma run --host 0.0.0.0 --port 8000

# This line will only be reached if ChromaDB exits
echo -e "${RED}❌ ChromaDB server stopped${NC}"