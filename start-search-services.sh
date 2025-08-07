#!/bin/bash

# Search Services Startup Script
# This script starts all necessary services for the search functionality

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Search Services...${NC}"

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    if curl -s "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not responding on port $port${NC}"
        return 1
    fi
}

# Function to start MongoDB (if available)
start_mongodb() {
    echo -e "${YELLOW}📦 Checking MongoDB...${NC}"
    
    if pgrep mongod >/dev/null; then
        echo -e "${GREEN}✅ MongoDB is already running${NC}"
        return 0
    fi
    
    # Try to start MongoDB service
    if sudo systemctl start mongod 2>/dev/null; then
        echo -e "${GREEN}✅ MongoDB started successfully${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}⚠️ MongoDB service not available. Search may have limited functionality.${NC}"
    echo -e "${YELLOW}💡 For development, you can:"
    echo -e "   - Install MongoDB Community Edition"
    echo -e "   - Use MongoDB Atlas (cloud)"
    echo -e "   - Run MongoDB in Docker: docker run -d -p 27017:27017 mongo${NC}"
    return 1
}

# Function to start ChromaDB
start_chromadb() {
    echo -e "${YELLOW}🔍 Starting ChromaDB...${NC}"
    
    # Check if ChromaDB is already running
    if check_service "ChromaDB" "8000" "http://localhost:8000/api/v1/heartbeat"; then
        return 0
    fi
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "chroma_env" ]; then
        echo -e "${YELLOW}🛠️ Creating ChromaDB virtual environment...${NC}"
        python3 -m venv chroma_env
        source chroma_env/bin/activate
        pip install chromadb
    else
        source chroma_env/bin/activate
    fi
    
    # Start ChromaDB in background
    echo -e "${YELLOW}🌐 Starting ChromaDB server...${NC}"
    export CHROMA_SERVER_CORS_ALLOW_ORIGINS="*"
    nohup chroma run --host 0.0.0.0 --port 8000 >/dev/null 2>&1 &
    
    # Wait for ChromaDB to start
    for i in {1..10}; do
        sleep 2
        if check_service "ChromaDB" "8000" "http://localhost:8000/api/v1/heartbeat"; then
            return 0
        fi
        echo -e "${YELLOW}⏳ Waiting for ChromaDB to start (attempt $i/10)...${NC}"
    done
    
    echo -e "${RED}❌ Failed to start ChromaDB${NC}"
    return 1
}

# Function to start Backend
start_backend() {
    echo -e "${YELLOW}⚙️ Starting Backend Server...${NC}"
    
    # Check if backend is already running
    if check_service "Backend" "3001" "http://localhost:3001/api/v1/health"; then
        return 0
    fi
    
    cd src/backend
    
    # Check if node_modules exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
        npm install --legacy-peer-deps
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️ .env file not found. Creating basic configuration...${NC}"
        echo "Backend .env file needs to be configured manually."
        echo "Check /workspace/src/backend/.env for required environment variables."
    fi
    
    # Start backend in background
    echo -e "${YELLOW}🌐 Starting backend server...${NC}"
    nohup npm start >/dev/null 2>&1 &
    
    # Wait for backend to start
    for i in {1..15}; do
        sleep 2
        if check_service "Backend" "3001" "http://localhost:3001/api/v1/health"; then
            cd ../..
            return 0
        fi
        echo -e "${YELLOW}⏳ Waiting for backend to start (attempt $i/15)...${NC}"
    done
    
    cd ../..
    echo -e "${RED}❌ Failed to start backend. Check logs for errors.${NC}"
    return 1
}

# Function to start Frontend
start_frontend() {
    echo -e "${YELLOW}🎨 Starting Frontend...${NC}"
    
    # Check if frontend is already running
    if check_service "Frontend" "5173" "http://localhost:5173"; then
        return 0
    fi
    
    cd src/frontend
    
    # Check if node_modules exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
        npm install
    fi
    
    # Start frontend in background
    echo -e "${YELLOW}🌐 Starting frontend development server...${NC}"
    nohup npm run dev >/dev/null 2>&1 &
    
    # Wait for frontend to start
    for i in {1..10}; do
        sleep 3
        if check_service "Frontend" "5173" "http://localhost:5173"; then
            cd ../..
            return 0
        fi
        echo -e "${YELLOW}⏳ Waiting for frontend to start (attempt $i/10)...${NC}"
    done
    
    cd ../..
    echo -e "${RED}❌ Failed to start frontend${NC}"
    return 1
}

# Main execution
echo -e "${BLUE}🔧 Checking and starting services...${NC}"

# Start services in order
start_mongodb
start_chromadb
start_backend

echo -e "\n${BLUE}📊 Service Status Summary:${NC}"
echo -e "${BLUE}================================${NC}"

# Check all services
check_service "ChromaDB" "8000" "http://localhost:8000/api/v1/heartbeat"
check_service "Backend" "3001" "http://localhost:3001/api/v1/health"

echo -e "\n${BLUE}🎯 Next Steps:${NC}"
echo -e "${YELLOW}1. If MongoDB is not running, install it or use MongoDB Atlas${NC}"
echo -e "${YELLOW}2. Configure API keys in src/backend/.env for full search functionality${NC}"
echo -e "${YELLOW}3. Start the frontend: cd src/frontend && npm run dev${NC}"
echo -e "${YELLOW}4. Access the application at http://localhost:5173${NC}"

echo -e "\n${GREEN}🔍 Search Services Startup Complete!${NC}"