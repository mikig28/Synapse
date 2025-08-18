#!/usr/bin/env node

/**
 * Comprehensive News Page Diagnostic and Fix Script
 * This script will:
 * 1. Check backend server status
 * 2. Test database connectivity
 * 3. Create sample news data if needed
 * 4. Verify API endpoints
 * 5. Start necessary services
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '.env') });

const execAsync = promisify(exec);

// Configuration
const BACKEND_PORT = process.env.BACKEND_PORT || 3000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 5173;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';
const API_BASE_URL = `http://localhost:${BACKEND_PORT}`;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

// Step 1: Check if MongoDB is running
async function checkMongoDB() {
  logSection('1. Checking MongoDB Connection');
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    log('✅ MongoDB connection successful', 'green');
    
    // Check collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const newsCollection = collections.find(c => c.name === 'newsitems');
    
    if (newsCollection) {
      const NewsItem = mongoose.models.NewsItem || mongoose.model('NewsItem', new mongoose.Schema({
        userId: mongoose.Schema.Types.ObjectId,
        title: String
      }));
      const count = await NewsItem.countDocuments();
      log(`📊 Found ${count} news items in database`, 'blue');
      
      if (count === 0) {
        log('⚠️  No news items found. Will create sample data.', 'yellow');
        return { connected: true, hasData: false };
      }
    } else {
      log('⚠️  NewsItems collection not found. Will create.', 'yellow');
      return { connected: true, hasData: false };
    }
    
    return { connected: true, hasData: true };
  } catch (error) {
    log(`❌ MongoDB connection failed: ${error.message}`, 'red');
    return { connected: false, hasData: false };
  }
}

// Step 2: Create sample news data
async function createSampleNewsData() {
  logSection('2. Creating Sample News Data');
  
  try {
    // Import NewsItem model
    const NewsItemSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
      runId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentRun' },
      title: { type: String, required: true },
      description: String,
      content: String,
      url: { type: String, required: true },
      urlToImage: String,
      source: {
        id: String,
        name: { type: String, required: true }
      },
      author: String,
      publishedAt: { type: Date, required: true },
      category: String,
      language: { type: String, default: 'en' },
      country: String,
      summary: String,
      tags: [String],
      sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
      relevanceScore: Number,
      status: { type: String, default: 'pending' },
      isRead: { type: Boolean, default: false },
      isFavorite: { type: Boolean, default: false },
      readAt: Date,
      contentHash: String,
      metadata: mongoose.Schema.Types.Mixed,
      generatedImage: {
        url: String,
        source: String,
        attribution: String
      }
    }, { timestamps: true });

    const NewsItem = mongoose.models.NewsItem || mongoose.model('NewsItem', NewsItemSchema);

    // Create a sample user ID (you might need to get this from an actual user)
    const sampleUserId = new mongoose.Types.ObjectId();
    const sampleAgentId = new mongoose.Types.ObjectId();
    const sampleRunId = new mongoose.Types.ObjectId();

    // Sample news data with CrewAI analysis report
    const sampleNewsItems = [
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        runId: sampleRunId,
        title: 'AI Market Analysis: Comprehensive Report',
        description: 'An in-depth analysis of the latest AI market trends and developments',
        content: `## Executive Summary

- The AI market has shown unprecedented growth with 47% increase in adoption rates across enterprise solutions
- Major tech companies are investing heavily in AI infrastructure with over $50B allocated in Q4 2024
- Regulatory frameworks are evolving rapidly with the EU AI Act setting global standards
- Small businesses are increasingly adopting AI tools for automation and efficiency

## Trending Topics

- **Artificial Intelligence** - 127 mentions - Score: 98
- **Machine Learning** - 89 mentions - Score: 92
- **Large Language Models** - 76 mentions - Score: 88
- **Computer Vision** - 64 mentions - Score: 85
- **Natural Language Processing** - 58 mentions - Score: 83

## News Articles 📰

- OpenAI announces new GPT-5 model with enhanced reasoning capabilities
- Google DeepMind achieves breakthrough in protein folding prediction
- Microsoft integrates AI copilot across entire Office suite
- Amazon launches AI-powered supply chain optimization platform

## Reddit Posts 🔴

- r/MachineLearning: "New paper shows 10x improvement in training efficiency"
- r/artificial: "Discussion on the implications of AGI timeline predictions"
- r/singularity: "Analysis of recent AI consciousness debates"

## LinkedIn Posts 💼

- Industry leader discusses transformation of workforce with AI adoption
- Case study: How AI reduced operational costs by 35% at Fortune 500 company
- Expert panel insights on AI ethics and responsible development

## AI Insights

\`\`\`json
{
  "market_sentiment": "highly_positive",
  "growth_rate": "47%",
  "key_sectors": ["healthcare", "finance", "retail", "manufacturing"],
  "emerging_trends": ["multimodal_ai", "edge_computing", "ai_agents"],
  "risk_factors": ["regulation", "talent_shortage", "ethical_concerns"],
  "investment_opportunities": ["ai_infrastructure", "specialized_chips", "ai_saas"]
}
\`\`\`

## Recommendations

- Monitor regulatory developments closely for compliance requirements
- Invest in AI talent acquisition and training programs
- Consider strategic partnerships with AI technology providers
- Develop comprehensive AI governance frameworks
- Explore opportunities in emerging AI applications`,
        url: '#internal-analysis-1',
        source: {
          id: 'crewai_analysis',
          name: 'CrewAI Multi-Agent System'
        },
        author: 'AI Research Team',
        publishedAt: new Date(),
        category: 'AI Analysis',
        tags: ['crewai', 'ai', 'analysis', 'market-research'],
        sentiment: 'positive',
        relevanceScore: 0.95,
        status: 'summarized',
        isRead: false,
        isFavorite: false,
        metadata: {
          sourceUrls: [
            'https://openai.com/blog/gpt-5-announcement',
            'https://deepmind.google/research/protein-folding',
            'https://microsoft.com/ai-copilot',
            'https://reddit.com/r/MachineLearning/comments/xyz123'
          ],
          analysisVersion: '2.0',
          agentCount: 5
        }
      },
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        title: 'Breaking: Major AI Breakthrough in Healthcare',
        description: 'Revolutionary AI system diagnoses rare diseases with 99% accuracy',
        summary: 'A new AI system developed by researchers has achieved unprecedented accuracy in diagnosing rare diseases, potentially saving millions of lives.',
        content: 'Full article content about the AI breakthrough in healthcare...',
        url: 'https://example.com/ai-healthcare-breakthrough',
        urlToImage: 'https://picsum.photos/400/300?random=1',
        source: {
          id: 'tech_news',
          name: 'Tech News Daily'
        },
        author: 'Dr. Sarah Johnson',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        category: 'Healthcare',
        tags: ['ai', 'healthcare', 'breakthrough', 'medical'],
        sentiment: 'positive',
        relevanceScore: 0.92,
        status: 'pending',
        isRead: false,
        isFavorite: false
      },
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        title: 'OpenAI Announces GPT-5: What to Expect',
        description: 'The next generation of language models promises unprecedented capabilities',
        summary: 'OpenAI reveals details about GPT-5, featuring improved reasoning, reduced hallucinations, and multimodal capabilities.',
        content: 'Detailed analysis of GPT-5 features and capabilities...',
        url: 'https://example.com/gpt5-announcement',
        urlToImage: 'https://picsum.photos/400/300?random=2',
        source: {
          id: 'openai_blog',
          name: 'OpenAI Blog'
        },
        author: 'Sam Altman',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        category: 'AI Technology',
        tags: ['openai', 'gpt5', 'llm', 'artificial-intelligence'],
        sentiment: 'positive',
        relevanceScore: 0.98,
        status: 'pending',
        isRead: false,
        isFavorite: true
      },
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        title: 'EU Passes Comprehensive AI Regulation Act',
        description: 'New regulations will shape the future of AI development in Europe',
        summary: 'The European Union has passed the AI Act, establishing strict guidelines for AI development and deployment.',
        content: 'Complete coverage of the EU AI Act and its implications...',
        url: 'https://example.com/eu-ai-regulation',
        urlToImage: 'https://picsum.photos/400/300?random=3',
        source: {
          id: 'reuters',
          name: 'Reuters'
        },
        author: 'Maria González',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        category: 'Regulation',
        tags: ['eu', 'regulation', 'ai-act', 'policy'],
        sentiment: 'neutral',
        relevanceScore: 0.88,
        status: 'pending',
        isRead: true,
        readAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isFavorite: false
      },
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        runId: sampleRunId,
        title: 'Reddit Discussion: Is AGI Closer Than We Think?',
        description: 'Hot debate on r/singularity about AGI timeline predictions',
        content: 'Summary of Reddit discussion about AGI timelines and implications...',
        url: 'https://reddit.com/r/singularity/comments/abc123',
        source: {
          id: 'reddit',
          name: 'r/singularity'
        },
        author: 'u/ai_enthusiast',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        category: 'Discussion',
        tags: ['reddit', 'agi', 'singularity', 'discussion'],
        sentiment: 'neutral',
        relevanceScore: 0.75,
        status: 'pending',
        isRead: false,
        isFavorite: false
      },
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        title: 'LinkedIn: How AI Transformed Our Business',
        description: 'CEO shares success story of AI implementation',
        content: 'Case study on successful AI transformation in enterprise...',
        url: 'https://linkedin.com/posts/ceo-success-story',
        source: {
          id: 'linkedin',
          name: 'LinkedIn'
        },
        author: 'John Smith, CEO',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        category: 'Business',
        tags: ['linkedin', 'business', 'transformation', 'case-study'],
        sentiment: 'positive',
        relevanceScore: 0.82,
        status: 'pending',
        isRead: false,
        isFavorite: false
      },
      {
        userId: sampleUserId,
        agentId: sampleAgentId,
        title: 'Telegram Alert: AI Crypto Project Launches',
        description: 'New blockchain project leveraging AI for smart contracts',
        content: 'Details about the new AI-powered blockchain project...',
        url: '#telegram-message-123',
        source: {
          id: 'telegram',
          name: 'CryptoAI Channel'
        },
        author: '@cryptoai_channel',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        category: 'Cryptocurrency',
        tags: ['telegram', 'crypto', 'blockchain', 'ai'],
        sentiment: 'positive',
        relevanceScore: 0.70,
        status: 'pending',
        isRead: false,
        isFavorite: false
      }
    ];

    // Clear existing data for the sample user
    await NewsItem.deleteMany({ userId: sampleUserId });

    // Insert sample data
    const inserted = await NewsItem.insertMany(sampleNewsItems);
    log(`✅ Created ${inserted.length} sample news items`, 'green');
    
    // Log sample user ID for reference
    log(`📝 Sample User ID: ${sampleUserId}`, 'cyan');
    log('   (You may need to update this in your authentication)', 'cyan');
    
    return { success: true, userId: sampleUserId, count: inserted.length };
  } catch (error) {
    log(`❌ Failed to create sample data: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Step 3: Check if backend server is running
async function checkBackendServer() {
  logSection('3. Checking Backend Server');
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000
    }).catch(() => null);
    
    if (response && response.ok) {
      log('✅ Backend server is running', 'green');
      return true;
    } else {
      log('⚠️  Backend server is not responding', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Backend server check failed: ${error.message}`, 'red');
    return false;
  }
}

// Step 4: Start backend server if needed
async function startBackendServer() {
  logSection('4. Starting Backend Server');
  
  try {
    // Check if PM2 is installed
    const { stdout: pm2Check } = await execAsync('which pm2').catch(() => ({ stdout: '' }));
    
    if (pm2Check) {
      // Use PM2 to start the backend
      log('Starting backend with PM2...', 'blue');
      
      // Create PM2 ecosystem file
      const ecosystemConfig = {
        apps: [{
          name: 'synapse-backend',
          script: './src/backend/dist/server.js',
          cwd: '/home/user/webapp',
          env: {
            NODE_ENV: 'development',
            PORT: BACKEND_PORT,
            MONGODB_URI: MONGODB_URI
          },
          error_file: './logs/backend-error.log',
          out_file: './logs/backend-out.log',
          merge_logs: true,
          time: true
        }]
      };
      
      await fs.writeFile(
        path.join(__dirname, 'ecosystem.backend.config.js'),
        `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)}`
      );
      
      // Build backend if needed
      log('Building backend...', 'blue');
      await execAsync('cd src/backend && npm run build');
      
      // Start with PM2
      await execAsync('pm2 start ecosystem.backend.config.js');
      log('✅ Backend server started with PM2', 'green');
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      return true;
    } else {
      // Start directly with node
      log('Starting backend directly...', 'blue');
      
      // Build backend first
      await execAsync('cd src/backend && npm run build');
      
      // Start in background
      exec('cd src/backend && node dist/server.js', {
        env: { ...process.env, PORT: BACKEND_PORT }
      });
      
      log('✅ Backend server started', 'green');
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    }
  } catch (error) {
    log(`❌ Failed to start backend: ${error.message}`, 'red');
    return false;
  }
}

// Step 5: Check frontend
async function checkFrontend() {
  logSection('5. Checking Frontend');
  
  try {
    const response = await fetch(`http://localhost:${FRONTEND_PORT}`, {
      method: 'GET',
      timeout: 5000
    }).catch(() => null);
    
    if (response) {
      log('✅ Frontend is running', 'green');
      log(`🌐 Access the News page at: http://localhost:${FRONTEND_PORT}/news`, 'cyan');
      return true;
    } else {
      log('⚠️  Frontend is not running', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ Frontend check failed: ${error.message}`, 'red');
    return false;
  }
}

// Step 6: Start frontend if needed
async function startFrontend() {
  logSection('6. Starting Frontend');
  
  try {
    // Check if PM2 is installed
    const { stdout: pm2Check } = await execAsync('which pm2').catch(() => ({ stdout: '' }));
    
    if (pm2Check) {
      // Use PM2 to start the frontend
      log('Starting frontend with PM2...', 'blue');
      
      // Create PM2 ecosystem file for frontend
      const ecosystemConfig = {
        apps: [{
          name: 'synapse-frontend',
          script: 'npm',
          args: 'run dev',
          cwd: '/home/user/webapp/src/frontend',
          env: {
            NODE_ENV: 'development',
            PORT: FRONTEND_PORT
          },
          error_file: '../../logs/frontend-error.log',
          out_file: '../../logs/frontend-out.log',
          merge_logs: true,
          time: true
        }]
      };
      
      await fs.writeFile(
        path.join(__dirname, 'ecosystem.frontend.config.js'),
        `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)}`
      );
      
      // Start with PM2
      await execAsync('pm2 start ecosystem.frontend.config.js');
      log('✅ Frontend started with PM2', 'green');
      
      // Wait for frontend to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    } else {
      // Start directly
      log('Starting frontend directly...', 'blue');
      
      exec('cd src/frontend && npm run dev', {
        env: { ...process.env, PORT: FRONTEND_PORT }
      });
      
      log('✅ Frontend started', 'green');
      
      // Wait for frontend to be ready
      await new Promise(resolve => setTimeout(resolve, 8000));
      return true;
    }
  } catch (error) {
    log(`❌ Failed to start frontend: ${error.message}`, 'red');
    return false;
  }
}

// Step 7: Create test authentication and provide instructions
async function provideAccessInstructions(sampleUserId) {
  logSection('7. Access Instructions');
  
  log('📱 To access the News page on your phone:', 'bright');
  log('', 'reset');
  log('1. First, ensure your phone is on the same network as this server', 'cyan');
  log('2. Find your server\'s IP address:', 'cyan');
  
  try {
    const { stdout } = await execAsync('hostname -I | cut -d\' \' -f1');
    const serverIP = stdout.trim();
    
    log(`   Your server IP: ${serverIP}`, 'green');
    log('', 'reset');
    log(`3. On your phone, open: http://${serverIP}:${FRONTEND_PORT}/news`, 'bright');
    log('', 'reset');
    log('4. If you need to log in:', 'cyan');
    log('   - Use the test credentials created by the system', 'cyan');
    log('   - Or register a new account', 'cyan');
    log('', 'reset');
    log('5. The News page should now display the sample data!', 'green');
    
    if (sampleUserId) {
      log('', 'reset');
      log(`📝 Note: Sample data was created for User ID: ${sampleUserId}`, 'yellow');
      log('   You may need to update your authentication to use this ID', 'yellow');
    }
  } catch (error) {
    log('   Run: hostname -I', 'cyan');
    log('   to find your server IP address', 'cyan');
  }
  
  log('', 'reset');
  log('🔧 Troubleshooting tips:', 'bright');
  log('  - Clear your browser cache if the page appears blank', 'cyan');
  log('  - Check browser console for any errors (F12 -> Console)', 'cyan');
  log('  - Ensure MongoDB is running: sudo systemctl status mongod', 'cyan');
  log('  - Check PM2 processes: pm2 list', 'cyan');
  log('  - View backend logs: pm2 logs synapse-backend', 'cyan');
  log('  - View frontend logs: pm2 logs synapse-frontend', 'cyan');
}

// Main execution
async function main() {
  log('\n🔧 NEWS PAGE DIAGNOSTIC AND FIX TOOL', 'bright');
  log('====================================\n', 'bright');
  
  try {
    // Step 1: Check MongoDB
    const mongoStatus = await checkMongoDB();
    
    if (!mongoStatus.connected) {
      log('⚠️  MongoDB is not running. Please start MongoDB first:', 'yellow');
      log('   sudo systemctl start mongod', 'cyan');
      process.exit(1);
    }
    
    // Step 2: Create sample data if needed
    let sampleUserId = null;
    if (!mongoStatus.hasData) {
      const sampleResult = await createSampleNewsData();
      if (sampleResult.success) {
        sampleUserId = sampleResult.userId;
      }
    }
    
    // Step 3: Check backend
    const backendRunning = await checkBackendServer();
    
    // Step 4: Start backend if needed
    if (!backendRunning) {
      await startBackendServer();
    }
    
    // Step 5: Check frontend
    const frontendRunning = await checkFrontend();
    
    // Step 6: Start frontend if needed
    if (!frontendRunning) {
      await startFrontend();
    }
    
    // Step 7: Provide access instructions
    await provideAccessInstructions(sampleUserId);
    
    log('\n✅ NEWS PAGE FIX COMPLETE!', 'green');
    log('===========================\n', 'green');
    
    // Keep the script running if we started services
    if (!backendRunning || !frontendRunning) {
      log('Press Ctrl+C to stop the services', 'yellow');
      // Keep process alive
      process.stdin.resume();
    } else {
      // Close MongoDB connection
      await mongoose.connection.close();
      process.exit(0);
    }
    
  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  log('\n\n🛑 Shutting down services...', 'yellow');
  
  try {
    await execAsync('pm2 stop synapse-backend synapse-frontend').catch(() => {});
    await mongoose.connection.close();
  } catch (error) {
    // Ignore errors during shutdown
  }
  
  log('Goodbye! 👋', 'cyan');
  process.exit(0);
});

// Run the main function
main().catch(console.error);