#!/bin/bash

# Synapse Dashboard Quick Start Script
# This script ensures all dependencies are met and starts the dashboard

echo "🚀 STARTING SYNAPSE DASHBOARD"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "❌ Error: Not in Synapse root directory" $RED
    print_status "Please run this script from the Synapse project root" $YELLOW
    exit 1
fi

print_status "✅ Found Synapse project" $GREEN

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    print_status "❌ Node.js not found. Please install Node.js 18+" $RED
    exit 1
fi

print_status "✅ Node.js version: $NODE_VERSION" $GREEN

# Check if .env exists
if [ ! -f ".env" ]; then
    print_status "⚠️  .env file not found, copying from .env.example" $YELLOW
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "✅ Created .env file from template" $GREEN
    else
        print_status "❌ No .env.example found" $RED
        exit 1
    fi
else
    print_status "✅ .env file exists" $GREEN
fi

# Check and start MongoDB
print_status "🔍 Checking MongoDB..." $BLUE
if ! pgrep mongod > /dev/null; then
    print_status "⚠️  MongoDB not running, attempting to start..." $YELLOW
    
    # Try different methods to start MongoDB
    if command -v brew > /dev/null && brew services list | grep mongodb > /dev/null; then
        print_status "Starting MongoDB via Homebrew..." $BLUE
        brew services start mongodb/brew/mongodb-community
    elif command -v systemctl > /dev/null; then
        print_status "Starting MongoDB via systemctl..." $BLUE
        sudo systemctl start mongod
    elif command -v service > /dev/null; then
        print_status "Starting MongoDB via service..." $BLUE
        sudo service mongod start
    else
        print_status "❌ Cannot start MongoDB automatically" $RED
        print_status "Please start MongoDB manually and re-run this script" $YELLOW
        exit 1
    fi
    
    # Wait a moment for MongoDB to start
    sleep 3
    
    if pgrep mongod > /dev/null; then
        print_status "✅ MongoDB started successfully" $GREEN
    else
        print_status "❌ Failed to start MongoDB" $RED
        print_status "Please start MongoDB manually: mongod" $YELLOW
        exit 1
    fi
else
    print_status "✅ MongoDB is running" $GREEN
fi

# Install dependencies
print_status "📦 Installing dependencies..." $BLUE

print_status "Installing frontend dependencies..." $BLUE
cd src/frontend
if npm install --silent; then
    print_status "✅ Frontend dependencies installed" $GREEN
else
    print_status "❌ Failed to install frontend dependencies" $RED
    exit 1
fi

cd ../backend
print_status "Installing backend dependencies..." $BLUE
if npm install --silent; then
    print_status "✅ Backend dependencies installed" $GREEN
else
    print_status "❌ Failed to install backend dependencies" $RED
    exit 1
fi

cd ../..

# Check if ports are available
print_status "🔍 Checking ports..." $BLUE

if lsof -i :3000 > /dev/null 2>&1; then
    print_status "⚠️  Port 3000 is in use (frontend)" $YELLOW
    print_status "Kill existing process? (y/n): " $YELLOW
    read -r kill_3000
    if [ "$kill_3000" = "y" ] || [ "$kill_3000" = "Y" ]; then
        lsof -ti :3000 | xargs kill -9
        print_status "✅ Killed process on port 3000" $GREEN
    fi
fi

if lsof -i :3001 > /dev/null 2>&1; then
    print_status "⚠️  Port 3001 is in use (backend)" $YELLOW
    print_status "Kill existing process? (y/n): " $YELLOW
    read -r kill_3001
    if [ "$kill_3001" = "y" ] || [ "$kill_3001" = "Y" ]; then
        lsof -ti :3001 | xargs kill -9
        print_status "✅ Killed process on port 3001" $GREEN
    fi
fi

# Start the servers
print_status "🚀 Starting Synapse Dashboard..." $BLUE

# Start backend in background
print_status "Starting backend server..." $BLUE
cd src/backend
npm run dev > ../../backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
print_status "Waiting for backend to start..." $BLUE
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/api/v1/health > /dev/null; then
    print_status "✅ Backend server started (PID: $BACKEND_PID)" $GREEN
else
    print_status "⚠️  Backend may still be starting..." $YELLOW
fi

# Start frontend in background
print_status "Starting frontend server..." $BLUE
cd src/frontend
npm run dev > ../../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
print_status "Waiting for frontend to start..." $BLUE
sleep 8

# Success message
print_status "" $NC
print_status "🎉 SYNAPSE DASHBOARD IS STARTING!" $GREEN
print_status "=================================" $GREEN
print_status "" $NC
print_status "📱 Frontend: http://localhost:3000" $BLUE
print_status "🔧 Backend:  http://localhost:3001" $BLUE
print_status "🗄️  Database: mongodb://localhost:27017/synapse" $BLUE
print_status "" $NC
print_status "📝 Logs:" $BLUE
print_status "   Backend:  tail -f backend.log" $YELLOW
print_status "   Frontend: tail -f frontend.log" $YELLOW
print_status "" $NC
print_status "🛑 To stop servers:" $BLUE
print_status "   kill $BACKEND_PID $FRONTEND_PID" $YELLOW
print_status "" $NC

# Save PIDs for easy cleanup
echo "BACKEND_PID=$BACKEND_PID" > .dashboard_pids
echo "FRONTEND_PID=$FRONTEND_PID" >> .dashboard_pids

print_status "💡 PIDs saved to .dashboard_pids for easy cleanup" $BLUE
print_status "" $NC

# Wait for user input
print_status "Press Ctrl+C to stop all servers..." $YELLOW

# Trap Ctrl+C to cleanup
trap "echo ''; print_status '🛑 Stopping servers...' $YELLOW; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; print_status '✅ Servers stopped' $GREEN; exit 0" INT

# Keep script running
wait