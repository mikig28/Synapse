#!/usr/bin/env node

/**
 * News Page Demo Startup Script
 * This will start both frontend and backend with sample data
 * No MongoDB required - uses in-memory data
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Sample news data for demo
const sampleNewsData = [
  {
    _id: 'demo-1',
    title: 'AI Market Analysis: Comprehensive Report',
    description: 'An in-depth analysis of the latest AI market trends and developments',
    content: `## Executive Summary

- The AI market has shown unprecedented growth with 47% increase in adoption rates
- Major tech companies are investing heavily in AI infrastructure
- Regulatory frameworks are evolving rapidly with the EU AI Act setting global standards
- Small businesses are increasingly adopting AI tools for automation

## Trending Topics

- **Artificial Intelligence** - 127 mentions - Score: 98
- **Machine Learning** - 89 mentions - Score: 92
- **Large Language Models** - 76 mentions - Score: 88

## News Articles 📰

- OpenAI announces new GPT-5 model with enhanced reasoning capabilities
- Google DeepMind achieves breakthrough in protein folding prediction
- Microsoft integrates AI copilot across entire Office suite

## Reddit Posts 🔴

- r/MachineLearning: "New paper shows 10x improvement in training efficiency"
- r/artificial: "Discussion on the implications of AGI timeline predictions"

## LinkedIn Posts 💼

- Industry leader discusses transformation of workforce with AI adoption
- Case study: How AI reduced operational costs by 35% at Fortune 500 company

## AI Insights

\`\`\`json
{
  "market_sentiment": "highly_positive",
  "growth_rate": "47%",
  "key_sectors": ["healthcare", "finance", "retail", "manufacturing"],
  "emerging_trends": ["multimodal_ai", "edge_computing", "ai_agents"]
}
\`\`\`

## Recommendations

- Monitor regulatory developments closely for compliance requirements
- Invest in AI talent acquisition and training programs
- Consider strategic partnerships with AI technology providers`,
    url: '#internal-analysis-1',
    source: {
      id: 'crewai_analysis',
      name: 'CrewAI Multi-Agent System'
    },
    author: 'AI Research Team',
    publishedAt: new Date().toISOString(),
    category: 'AI Analysis',
    tags: ['crewai', 'ai', 'analysis', 'market-research'],
    sentiment: 'positive',
    relevanceScore: 0.95,
    status: 'summarized',
    isRead: false,
    isFavorite: false
  },
  {
    _id: 'demo-2',
    title: 'Breaking: Major AI Breakthrough in Healthcare',
    description: 'Revolutionary AI system diagnoses rare diseases with 99% accuracy',
    summary: 'A new AI system developed by researchers has achieved unprecedented accuracy in diagnosing rare diseases.',
    url: 'https://example.com/ai-healthcare',
    urlToImage: 'https://picsum.photos/400/300?random=1',
    source: {
      id: 'tech_news',
      name: 'Tech News Daily'
    },
    author: 'Dr. Sarah Johnson',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    category: 'Healthcare',
    tags: ['ai', 'healthcare', 'breakthrough'],
    sentiment: 'positive',
    relevanceScore: 0.92,
    status: 'pending',
    isRead: false,
    isFavorite: false
  },
  {
    _id: 'demo-3',
    title: 'OpenAI Announces GPT-5: What to Expect',
    description: 'The next generation of language models promises unprecedented capabilities',
    summary: 'OpenAI reveals details about GPT-5, featuring improved reasoning and multimodal capabilities.',
    url: 'https://example.com/gpt5',
    urlToImage: 'https://picsum.photos/400/300?random=2',
    source: {
      id: 'openai_blog',
      name: 'OpenAI Blog'
    },
    author: 'Sam Altman',
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    category: 'AI Technology',
    tags: ['openai', 'gpt5', 'llm'],
    sentiment: 'positive',
    relevanceScore: 0.98,
    status: 'pending',
    isRead: false,
    isFavorite: true
  },
  {
    _id: 'demo-4',
    title: 'Reddit Discussion: Is AGI Closer Than We Think?',
    description: 'Hot debate on r/singularity about AGI timeline predictions',
    url: 'https://reddit.com/r/singularity',
    source: {
      id: 'reddit',
      name: 'r/singularity'
    },
    author: 'u/ai_enthusiast',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    category: 'Discussion',
    tags: ['reddit', 'agi', 'singularity'],
    sentiment: 'neutral',
    relevanceScore: 0.75,
    status: 'pending',
    isRead: false,
    isFavorite: false
  },
  {
    _id: 'demo-5',
    title: 'LinkedIn: How AI Transformed Our Business',
    description: 'CEO shares success story of AI implementation',
    url: 'https://linkedin.com/posts/ceo-success',
    source: {
      id: 'linkedin',
      name: 'LinkedIn'
    },
    author: 'John Smith, CEO',
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    category: 'Business',
    tags: ['linkedin', 'business', 'transformation'],
    sentiment: 'positive',
    relevanceScore: 0.82,
    status: 'pending',
    isRead: false,
    isFavorite: false
  }
];

// Create a mock backend server
async function createMockBackend() {
  const express = require('express');
  const cors = require('cors');
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Mock authentication middleware
  app.use((req, res, next) => {
    req.user = { id: 'demo-user-id' };
    next();
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Mock backend is running' });
  });
  
  // Mock news endpoints
  app.get('/api/news', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const source = req.query.source;
    
    let filteredData = [...sampleNewsData];
    
    if (source) {
      filteredData = filteredData.filter(item => item.source.id === source);
    }
    
    res.json({
      success: true,
      data: filteredData,
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalItems: filteredData.length,
        itemsPerPage: limit,
        hasNextPage: false,
        hasPrevPage: false
      }
    });
  });
  
  app.get('/api/news/categories', (req, res) => {
    const categories = [...new Set(sampleNewsData.map(item => item.category).filter(Boolean))];
    res.json({
      success: true,
      data: categories
    });
  });
  
  app.get('/api/news/statistics', (req, res) => {
    res.json({
      success: true,
      data: {
        totalItems: sampleNewsData.length,
        unreadItems: sampleNewsData.filter(item => !item.isRead).length,
        favoriteItems: sampleNewsData.filter(item => item.isFavorite).length,
        archivedItems: 0,
        last24Hours: 3,
        last7Days: 5,
        readPercentage: 20
      }
    });
  });
  
  app.post('/api/news/:id/read', (req, res) => {
    const item = sampleNewsData.find(n => n._id === req.params.id);
    if (item) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
    }
    res.json({ success: true, data: item });
  });
  
  app.post('/api/news/:id/favorite', (req, res) => {
    const item = sampleNewsData.find(n => n._id === req.params.id);
    if (item) {
      item.isFavorite = !item.isFavorite;
    }
    res.json({ success: true, data: item });
  });
  
  app.post('/api/news/:id/archive', (req, res) => {
    const item = sampleNewsData.find(n => n._id === req.params.id);
    if (item) {
      item.status = req.body.archive ? 'archived' : 'pending';
    }
    res.json({ success: true, data: item });
  });
  
  app.delete('/api/news/:id', (req, res) => {
    const index = sampleNewsData.findIndex(n => n._id === req.params.id);
    if (index > -1) {
      sampleNewsData.splice(index, 1);
    }
    res.json({ success: true, message: 'Deleted' });
  });
  
  // Mock auth endpoints
  app.post('/api/auth/login', (req, res) => {
    res.json({
      success: true,
      data: {
        user: { id: 'demo-user-id', email: 'demo@example.com', name: 'Demo User' },
        token: 'demo-jwt-token'
      }
    });
  });
  
  app.get('/api/auth/me', (req, res) => {
    res.json({
      success: true,
      data: { id: 'demo-user-id', email: 'demo@example.com', name: 'Demo User' }
    });
  });
  
  const PORT = process.env.BACKEND_PORT || 3001;
  
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      log(`✅ Mock backend server started on port ${PORT}`, 'green');
      resolve(server);
    });
  });
}

// Start the services
async function startServices() {
  log('\n🚀 STARTING NEWS PAGE DEMO', 'bright');
  log('==========================\n', 'bright');
  
  try {
    // Step 1: Start mock backend
    log('1. Starting mock backend server...', 'blue');
    await createMockBackend();
    
    // Step 2: Check if frontend dependencies are installed
    log('\n2. Checking frontend dependencies...', 'blue');
    const frontendPackageJson = path.join(__dirname, 'src/frontend/package.json');
    if (!fs.existsSync(path.join(__dirname, 'src/frontend/node_modules'))) {
      log('Installing frontend dependencies...', 'yellow');
      await execAsync('cd src/frontend && npm install');
    }
    log('✅ Frontend dependencies ready', 'green');
    
    // Step 3: Start frontend
    log('\n3. Starting frontend development server...', 'blue');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'src/frontend'),
      env: { ...process.env, PORT: '5173' },
      stdio: 'pipe'
    });
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready in')) {
        log('✅ Frontend server started', 'green');
        provideAccessInstructions();
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      if (!data.toString().includes('warning')) {
        console.error(`Frontend error: ${data}`);
      }
    });
    
    // Wait a bit for frontend to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

function provideAccessInstructions() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📱 ACCESS INSTRUCTIONS', 'bright');
  log('='.repeat(60), 'cyan');
  
  log('\nThe News page demo is now running!', 'green');
  log('\n📍 Access URLs:', 'bright');
  log('   Local:    http://localhost:5173/news', 'cyan');
  
  // Try to get IP address
  exec('hostname -I | cut -d\' \' -f1', (err, stdout) => {
    if (!err && stdout) {
      const ip = stdout.trim();
      log(`   Network:  http://${ip}:5173/news`, 'cyan');
      log('\n📱 To access from your phone:', 'bright');
      log('   1. Ensure your phone is on the same WiFi network', 'yellow');
      log(`   2. Open browser and go to: http://${ip}:5173/news`, 'yellow');
    }
  });
  
  log('\n🎯 Demo Features:', 'bright');
  log('   - View AI-generated news analysis report', 'cyan');
  log('   - Browse news from different sources (Reddit, LinkedIn, etc.)', 'cyan');
  log('   - Mark items as read/favorite', 'cyan');
  log('   - Filter by source using quick filter buttons', 'cyan');
  log('   - View detailed content in modal', 'cyan');
  
  log('\n⚠️  Note: This is a demo with sample data (no database required)', 'yellow');
  log('\nPress Ctrl+C to stop the demo', 'yellow');
}

// Handle shutdown
process.on('SIGINT', () => {
  log('\n\n🛑 Shutting down demo...', 'yellow');
  process.exit(0);
});

// Start everything
startServices().catch(console.error);