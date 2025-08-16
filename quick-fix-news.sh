#!/bin/bash

# Quick News Page Fix Script
# This script starts the frontend and a mock backend for the news page

echo "🚀 Starting News Page Services..."

# Kill any existing processes on our ports
pkill -f "port 3001" 2>/dev/null
pkill -f "port 5173" 2>/dev/null
fuser -k 3001/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null

# Start mock backend in background
echo "📦 Starting mock backend on port 3001..."
cd /home/user/webapp
node -e "
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Sample news data
const newsData = [
  {
    _id: 'demo-1',
    title: 'AI Market Analysis: Comprehensive Report by CrewAI Agents',
    description: 'Multi-agent system analyzed latest AI market trends and developments',
    content: '## Executive Summary\\n\\n- AI market growth: 47% increase in enterprise adoption\\n- Investment surge: Over \$50B in Q4 2024\\n- Key trend: Multimodal AI and edge computing\\n\\n## Trending Topics\\n\\n- **Artificial Intelligence** - 127 mentions - Score: 98\\n- **Machine Learning** - 89 mentions - Score: 92\\n- **GPT-5 Launch** - 76 mentions - Score: 88\\n\\n## Analysis Sources\\n\\n### News Articles 📰\\n- OpenAI announces GPT-5 with enhanced reasoning\\n- Google DeepMind protein folding breakthrough\\n- Microsoft AI Copilot integration\\n\\n### Reddit Posts 🔴\\n- r/MachineLearning: Training efficiency improvements\\n- r/singularity: AGI timeline discussions\\n\\n### LinkedIn Posts 💼\\n- Enterprise AI adoption case studies\\n- Cost reduction success stories\\n\\n## Recommendations\\n\\n- Monitor regulatory compliance requirements\\n- Invest in AI talent and training\\n- Develop AI governance frameworks',
    url: '#internal-analysis',
    source: { id: 'crewai_analysis', name: 'CrewAI System' },
    author: 'AI Agent Team',
    publishedAt: new Date().toISOString(),
    category: 'AI Analysis',
    tags: ['crewai', 'analysis', 'ai', 'market'],
    sentiment: 'positive',
    relevanceScore: 0.95,
    isRead: false,
    isFavorite: false
  },
  {
    _id: 'demo-2',
    title: 'Breaking: Major AI Healthcare Breakthrough',
    description: 'Revolutionary AI diagnoses rare diseases with 99% accuracy',
    summary: 'New AI system achieves unprecedented accuracy in rare disease diagnosis.',
    url: 'https://example.com/ai-healthcare',
    urlToImage: 'https://picsum.photos/400/300?random=1',
    source: { id: 'tech_news', name: 'Tech Daily' },
    author: 'Dr. Sarah Johnson',
    publishedAt: new Date(Date.now() - 2*3600000).toISOString(),
    category: 'Healthcare',
    tags: ['ai', 'healthcare', 'breakthrough'],
    sentiment: 'positive',
    relevanceScore: 0.92,
    isRead: false,
    isFavorite: false
  },
  {
    _id: 'demo-3',
    title: 'OpenAI GPT-5: Revolutionary Capabilities Revealed',
    description: 'Next-gen language model with multimodal understanding',
    url: 'https://example.com/gpt5',
    urlToImage: 'https://picsum.photos/400/300?random=2',
    source: { id: 'openai', name: 'OpenAI Blog' },
    author: 'OpenAI Team',
    publishedAt: new Date(Date.now() - 4*3600000).toISOString(),
    category: 'AI Technology',
    tags: ['openai', 'gpt5', 'llm'],
    sentiment: 'positive',
    relevanceScore: 0.98,
    isRead: false,
    isFavorite: true
  },
  {
    _id: 'demo-4',
    title: 'Reddit Hot: Is AGI Closer Than Expected?',
    description: 'Community debates on r/singularity about AGI timelines',
    url: 'https://reddit.com/r/singularity',
    source: { id: 'reddit', name: 'r/singularity' },
    author: 'u/ai_researcher',
    publishedAt: new Date(Date.now() - 8*3600000).toISOString(),
    category: 'Discussion',
    tags: ['reddit', 'agi', 'debate'],
    sentiment: 'neutral',
    relevanceScore: 0.75,
    isRead: true,
    isFavorite: false
  },
  {
    _id: 'demo-5',
    title: 'LinkedIn: AI Transforms Fortune 500 Operations',
    description: 'CEO shares 35% cost reduction through AI implementation',
    url: 'https://linkedin.com/posts/ai-success',
    source: { id: 'linkedin', name: 'LinkedIn' },
    author: 'John Smith, CEO',
    publishedAt: new Date(Date.now() - 12*3600000).toISOString(),
    category: 'Business',
    tags: ['linkedin', 'business', 'case-study'],
    sentiment: 'positive',
    relevanceScore: 0.82,
    isRead: false,
    isFavorite: false
  },
  {
    _id: 'demo-6',
    title: 'Telegram Alert: New AI Crypto Project Launch',
    description: 'Blockchain project leveraging AI for smart contracts',
    url: '#telegram-msg',
    source: { id: 'telegram', name: 'CryptoAI Channel' },
    author: '@cryptoai_channel',
    publishedAt: new Date(Date.now() - 24*3600000).toISOString(),
    category: 'Cryptocurrency',
    tags: ['telegram', 'crypto', 'blockchain'],
    sentiment: 'positive',
    relevanceScore: 0.70,
    isRead: false,
    isFavorite: false
  }
];

// Mock API endpoints
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/news', (req, res) => {
  const source = req.query.source;
  let data = source ? newsData.filter(item => item.source.id === source) : newsData;
  
  res.json({
    success: true,
    data: data,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: data.length,
      itemsPerPage: 20,
      hasNextPage: false,
      hasPrevPage: false
    }
  });
});

app.get('/api/news/categories', (req, res) => {
  const categories = [...new Set(newsData.map(item => item.category))];
  res.json({ success: true, data: categories });
});

app.get('/api/news/statistics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalItems: newsData.length,
      unreadItems: newsData.filter(i => !i.isRead).length,
      favoriteItems: newsData.filter(i => i.isFavorite).length,
      archivedItems: 0,
      last24Hours: 4,
      last7Days: 6,
      readPercentage: 17
    }
  });
});

app.post('/api/news/:id/read', (req, res) => {
  const item = newsData.find(n => n._id === req.params.id);
  if (item) item.isRead = true;
  res.json({ success: true, data: item });
});

app.post('/api/news/:id/favorite', (req, res) => {
  const item = newsData.find(n => n._id === req.params.id);
  if (item) item.isFavorite = !item.isFavorite;
  res.json({ success: true, data: item });
});

app.post('/api/news/:id/archive', (req, res) => {
  const item = newsData.find(n => n._id === req.params.id);
  if (item) item.status = req.body.archive ? 'archived' : 'pending';
  res.json({ success: true, data: item });
});

app.delete('/api/news/:id', (req, res) => {
  const index = newsData.findIndex(n => n._id === req.params.id);
  if (index > -1) newsData.splice(index, 1);
  res.json({ success: true });
});

// Mock auth
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      user: { id: 'demo-user', email: 'demo@test.com', name: 'Demo User' },
      token: 'demo-token'
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: { id: 'demo-user', email: 'demo@test.com', name: 'Demo User' }
  });
});

app.listen(3001, () => console.log('Mock backend running on port 3001'));
" &

BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend on port 5173..."
cd /home/user/webapp/src/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend in background
PORT=5173 npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Display access information
echo ""
echo "============================================================"
echo "✅ NEWS PAGE IS NOW RUNNING!"
echo "============================================================"
echo ""
echo "📱 Access the News Page:"
echo "   Local:    http://localhost:5173/news"

# Get IP address
IP=$(hostname -I | cut -d' ' -f1)
if [ ! -z "$IP" ]; then
    echo "   Network:  http://$IP:5173/news"
    echo ""
    echo "📲 To access from your phone:"
    echo "   1. Make sure your phone is on the same WiFi network"
    echo "   2. Open browser and go to: http://$IP:5173/news"
fi

echo ""
echo "🎯 Features Available:"
echo "   • View AI-generated analysis reports from CrewAI agents"
echo "   • Browse news from multiple sources (Reddit, LinkedIn, Telegram)"
echo "   • Filter by source using quick filter buttons"
echo "   • Mark items as read or favorite"
echo "   • View detailed content in modal"
echo ""
echo "⚠️  This is a demo with sample data (no database required)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep script running
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait