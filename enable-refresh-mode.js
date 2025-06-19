#!/usr/bin/env node

/**
 * Script to enable refresh mode for agents
 * This allows bypassing duplicate detection temporarily
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';

// Define Agent schema inline
const AgentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  configuration: {
    refreshMode: { type: Boolean, default: false },
    duplicateWindow: { type: Number, default: 4 }
  }
}, { strict: false });

const Agent = mongoose.model('Agent', AgentSchema);

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const args = process.argv.slice(2);
    const action = args[0] || 'enable';
    const agentName = args[1];
    
    if (action === '--help' || action === '-h') {
      console.log(`
Refresh Mode Manager

Usage: node enable-refresh-mode.js [action] [agent-name]

Actions:
  enable [agent-name]   Enable refresh mode for a specific agent or all agents
  disable [agent-name]  Disable refresh mode for a specific agent or all agents
  status               Show refresh mode status for all agents
  
Examples:
  node enable-refresh-mode.js enable               # Enable for all agents
  node enable-refresh-mode.js enable "sport agent" # Enable for specific agent
  node enable-refresh-mode.js disable              # Disable for all agents
  node enable-refresh-mode.js status               # Check status
      `);
      process.exit(0);
    }
    
    if (action === 'status') {
      const agents = await Agent.find({});
      console.log('\n📊 Agent Refresh Mode Status:\n');
      
      for (const agent of agents) {
        const refreshMode = agent.configuration?.refreshMode || false;
        const window = agent.configuration?.duplicateWindow || 4;
        const status = refreshMode ? '✅ ENABLED' : '❌ DISABLED';
        console.log(`${agent.name} (${agent.type}): ${status} (${window}h window)`);
      }
      
    } else if (action === 'enable' || action === 'disable') {
      const enable = action === 'enable';
      const query = agentName ? { name: agentName } : {};
      
      const result = await Agent.updateMany(
        query,
        { 
          $set: { 
            'configuration.refreshMode': enable,
            'configuration.duplicateWindow': enable ? 1 : 4 // 1 hour in refresh mode
          } 
        }
      );
      
      console.log(`\n${enable ? '✅ Enabled' : '❌ Disabled'} refresh mode for ${result.modifiedCount} agents`);
      
      if (enable) {
        console.log('ℹ️  Refresh mode active: Duplicate detection window reduced to 1 hour');
        console.log('ℹ️  This allows fetching content that was recently seen');
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main(); 