#!/usr/bin/env node
/**
 * Agents Dashboard Diagnostic Tool
 * 
 * This script checks all dependencies and configurations needed for 
 * the agents dashboard to work properly.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔍 AGENTS DASHBOARD DIAGNOSTIC TOOL');
console.log('=====================================\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkSection(title) {
  log(`\n${title}`, 'bold');
  log('-'.repeat(title.length), 'blue');
}

// 1. Check Project Structure
checkSection('📁 PROJECT STRUCTURE');

const requiredPaths = [
  'src/frontend/src/pages/AgentsPage.tsx',
  'src/frontend/src/components/AgentActivityDashboard.tsx',
  'src/frontend/src/components/CrewExecutionDashboard.tsx',
  'src/frontend/src/services/agentService.ts',
  'src/backend/src/services/agentService.ts',
  'src/backend/src/api/controllers/agentsController.ts',
  'src/backend/src/models/Agent.ts',
  'src/backend/src/models/AgentRun.ts',
];

requiredPaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    log(`✅ ${filePath}`, 'green');
  } else {
    log(`❌ ${filePath} - MISSING`, 'red');
  }
});

// 2. Check Environment Variables
checkSection('🔧 ENVIRONMENT VARIABLES');

const envPath = '.env';
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'CREWAI_SERVICE_URL'
];

if (fs.existsSync(envPath)) {
  log(`✅ .env file exists`, 'green');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  requiredEnvVars.forEach(envVar => {
    if (envContent.includes(`${envVar}=`)) {
      const match = envContent.match(new RegExp(`${envVar}=(.+)`));
      const value = match ? match[1].trim() : '';
      
      if (value && !value.includes('your_') && !value.includes('placeholder')) {
        log(`✅ ${envVar} is set`, 'green');
      } else {
        log(`⚠️  ${envVar} is set but appears to be placeholder`, 'yellow');
      }
    } else {
      log(`❌ ${envVar} is missing`, 'red');
    }
  });
} else {
  log(`❌ .env file not found`, 'red');
}

// 3. Check Package Dependencies
checkSection('📦 PACKAGE DEPENDENCIES');

const frontendPackageJson = 'src/frontend/package.json';
const backendPackageJson = 'src/backend/package.json';

function checkPackageJson(path, requiredDeps) {
  if (fs.existsSync(path)) {
    log(`✅ ${path} exists`, 'green');
    
    const packageData = JSON.parse(fs.readFileSync(path, 'utf8'));
    const allDeps = { ...packageData.dependencies, ...packageData.devDependencies };
    
    requiredDeps.forEach(dep => {
      if (allDeps[dep]) {
        log(`  ✅ ${dep} v${allDeps[dep]}`, 'green');
      } else {
        log(`  ❌ ${dep} missing`, 'red');
      }
    });
  } else {
    log(`❌ ${path} not found`, 'red');
  }
}

// Frontend dependencies
const frontendDeps = ['react', 'react-router-dom', 'framer-motion', 'socket.io-client', 'axios'];
checkPackageJson(frontendPackageJson, frontendDeps);

// Backend dependencies  
const backendDeps = ['express', 'mongoose', 'socket.io', 'jsonwebtoken', 'axios'];
checkPackageJson(backendPackageJson, backendDeps);

// 4. Process Checks
checkSection('🔄 PROCESS STATUS');

function checkProcess(command, description) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`❌ ${description}`, 'red');
        resolve(false);
      } else {
        log(`✅ ${description}`, 'green');
        resolve(true);
      }
    });
  });
}

async function runProcessChecks() {
  await checkProcess('pgrep node', 'Node.js processes running');
  await checkProcess('pgrep mongod', 'MongoDB process running');
  await checkProcess('curl -s http://localhost:3000', 'Frontend server (port 3000)');
  await checkProcess('curl -s http://localhost:3001', 'Backend server (port 3001)');
}

// 5. Database Connectivity
checkSection('🗄️  DATABASE CONNECTIVITY');

const mongoPath = 'src/backend/test-mongo.js';
fs.writeFileSync(mongoPath, `
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connection successful');
    
    const Agent = mongoose.model('Agent', new mongoose.Schema({}), 'agents');
    const agentCount = await Agent.countDocuments();
    console.log(\`📊 Found \${agentCount} agents in database\`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
  }
}

testConnection();
`);

// 6. API Endpoint Tests
checkSection('🌐 API ENDPOINT TESTS');

const apiTestPath = 'src/backend/test-api.js';
fs.writeFileSync(apiTestPath, `
const axios = require('axios');

async function testEndpoints() {
  const baseURL = 'http://localhost:3001/api/v1';
  
  const endpoints = [
    '/agents',
    '/agents/runs', 
    '/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(baseURL + endpoint, {
        timeout: 5000,
        headers: { 'Authorization': 'Bearer dummy-token' }
      });
      console.log(\`✅ \${endpoint} - Status: \${response.status}\`);
    } catch (error) {
      if (error.response) {
        console.log(\`⚠️  \${endpoint} - Status: \${error.response.status} (may need auth)\`);
      } else {
        console.log(\`❌ \${endpoint} - \${error.message}\`);
      }
    }
  }
}

testEndpoints();
`);

// 7. Generate Fix Script
checkSection('🔧 GENERATING FIX SCRIPT');

const fixScript = `#!/bin/bash
# Agents Dashboard Fix Script
# Auto-generated by diagnostic tool

echo "🚀 FIXING AGENTS DASHBOARD ISSUES..."

# 1. Install dependencies if missing
echo "📦 Installing dependencies..."
cd src/frontend && npm install --silent
cd ../backend && npm install --silent
cd ../..

# 2. Start MongoDB if not running
echo "🗄️  Starting MongoDB..."
if ! pgrep mongod > /dev/null; then
  if command -v brew > /dev/null; then
    brew services start mongodb/brew/mongodb-community
  elif command -v systemctl > /dev/null; then
    sudo systemctl start mongod
  else
    echo "⚠️  Please start MongoDB manually"
  fi
fi

# 3. Build frontend if needed
echo "🏗️  Building frontend..."
cd src/frontend && npm run build --silent
cd ../..

# 4. Start backend server
echo "🔄 Starting backend server..."
cd src/backend && npm run dev &
BACKEND_PID=$!
cd ../..

# 5. Start frontend server  
echo "🔄 Starting frontend server..."
cd src/frontend && npm run dev &
FRONTEND_PID=$!
cd ../..

echo "✅ Dashboard should be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
`;

fs.writeFileSync('fix-dashboard.sh', fixScript);
fs.chmodSync('fix-dashboard.sh', 0o755);

log('✅ Generated fix-dashboard.sh script', 'green');

// 8. Summary and Recommendations
checkSection('📋 DIAGNOSTIC SUMMARY');

log('\n🔍 NEXT STEPS:', 'bold');
log('1. Run: npm install in both frontend and backend directories');
log('2. Ensure MongoDB is running (brew services start mongodb or sudo systemctl start mongod)');
log('3. Update .env file with real API keys');
log('4. Run: ./fix-dashboard.sh to start both servers');
log('5. Check browser console for any remaining errors');
log('6. Test agent creation and execution');

log('\n🐛 DEBUGGING TIPS:', 'bold'); 
log('• Check browser Network tab for failed API calls');
log('• Monitor backend logs for database connection errors');
log('• Verify Socket.IO connection in browser DevTools');
log('• Test API endpoints manually with curl or Postman');

log('\n📞 IF ISSUES PERSIST:', 'bold');
log('• Check backend logs: cd src/backend && npm run dev');
log('• Test MongoDB: node src/backend/test-mongo.js'); 
log('• Test API endpoints: node src/backend/test-api.js');

// Cleanup temp files
setTimeout(() => {
  try {
    fs.unlinkSync(mongoPath);
    fs.unlinkSync(apiTestPath);
  } catch (e) {
    // Ignore cleanup errors
  }
}, 1000);

log('\n🎯 DIAGNOSTIC COMPLETE!', 'green');