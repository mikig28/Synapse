# Search Functionality Fix Guide

## Issue Diagnosed ✅

The search page was showing "failed search" because the required backend services were not running. Here's what was identified and fixed:

### Root Causes Found:
1. **Backend Server Not Running** - The Node.js backend server on port 3001 wasn't started
2. **ChromaDB Not Running** - The vector database service on port 8000 wasn't started  
3. **MongoDB Missing** - The main database wasn't installed/configured
4. **Poor Error Messages** - The frontend didn't provide helpful error information

## Fixes Applied ✅

### 1. Enhanced Error Handling
- ✅ Added detailed error messages in the search interface
- ✅ Improved user feedback with troubleshooting steps
- ✅ Better error categorization (network, auth, service errors)

### 2. Service Setup Preparation
- ✅ Created comprehensive startup script (`start-search-services.sh`)
- ✅ Set up ChromaDB environment with proper CORS configuration
- ✅ Configured backend environment variables in `.env` file
- ✅ Fixed dependency conflicts in backend packages

### 3. Created Automated Setup
- ✅ Built automated service checker and starter
- ✅ Added fallback behavior when services are unavailable
- ✅ Improved service status monitoring

## Quick Fix Instructions 🚀

### Option 1: Use the Automated Script
```bash
# Run from the project root
./start-search-services.sh
```

### Option 2: Manual Setup

#### Step 1: Start ChromaDB
```bash
# Create and activate virtual environment
python3 -m venv chroma_env
source chroma_env/bin/activate

# Install ChromaDB
pip install chromadb

# Start ChromaDB with CORS
export CHROMA_SERVER_CORS_ALLOW_ORIGINS="*"
chroma run --host 0.0.0.0 --port 8000
```

#### Step 2: Start Backend Server
```bash
cd src/backend

# Install dependencies
npm install --legacy-peer-deps

# Start backend (will show MongoDB connection error but search will work with ChromaDB)
npm start
```

#### Step 3: Start Frontend
```bash
cd src/frontend

# Install dependencies if needed
npm install

# Start development server
npm run dev
```

### Step 4: Test Search
1. Open http://localhost:5173
2. Navigate to the Search page
3. Try searching - you should now see proper error messages or results

## Database Setup (Optional for Full Functionality)

### MongoDB Setup
For full functionality, you'll need MongoDB:

```bash
# Option 1: Docker (Recommended)
docker run -d --name mongodb -p 27017:27017 mongo:7

# Option 2: Install MongoDB Community Edition
# Follow official MongoDB installation guide for your OS

# Option 3: Use MongoDB Atlas (Cloud)
# Sign up at https://cloud.mongodb.com and get connection string
```

### Environment Variables
Update `src/backend/.env` with your configurations:

```env
# Required for search
MONGODB_URI=mongodb://localhost:27017/synapse-dev
CHROMA_URL=http://localhost:8000
EMBEDDING_PROVIDER=openai

# Optional API keys for enhanced search
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here
VOYAGE_API_KEY=your_voyage_key_here
```

## Service Status Check 🔍

Check if services are running:

```bash
# Check ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Check Backend
curl http://localhost:3001/api/v1/health

# Check Frontend
curl http://localhost:5173
```

## Troubleshooting 🔧

### Common Issues:

1. **"Network Error" in search**
   - ❌ Backend not running
   - ✅ Start backend: `cd src/backend && npm start`

2. **"Search service not found"**
   - ❌ Wrong backend URL in frontend config
   - ✅ Check `src/frontend/src/services/axiosConfig.ts`

3. **"Internal server error during search"**
   - ❌ ChromaDB not running or Vector database connection failed
   - ✅ Start ChromaDB: `./start-search-services.sh`

4. **Search returns no results**
   - ❌ No data indexed in vector database
   - ✅ Add some content (documents, notes) first
   - ✅ Ensure embeddings are generated

### Logs to Check:
- Backend logs: Check console where `npm start` is running
- ChromaDB logs: Check console where `chroma run` is running
- Frontend browser console: F12 → Console tab

## Architecture Overview 📊

```
Frontend (Port 5173)
    ↓ HTTP requests
Backend API (Port 3001)
    ↓ Vector queries
ChromaDB (Port 8000)
    ↓ Metadata storage
MongoDB (Port 27017)
```

The search flow:
1. User types query in frontend
2. Frontend sends request to backend API
3. Backend generates embeddings and queries ChromaDB
4. ChromaDB returns relevant document chunks
5. Backend fetches metadata from MongoDB
6. Results returned to frontend

## Next Steps 🎯

1. **Immediate**: Run `./start-search-services.sh` to start all services
2. **Short-term**: Set up MongoDB for full functionality
3. **Long-term**: Configure API keys for better embedding models
4. **Optimization**: Add more content to search through

## Support 💡

If you're still experiencing issues:
1. Check that all ports (3001, 8000, 27017, 5173) are not blocked
2. Verify environment variables in `.env` files
3. Look at console logs for specific error messages
4. Ensure all dependencies are installed correctly

The search page should now show helpful error messages and guide you through fixing any remaining issues!