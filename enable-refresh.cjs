const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synapse';

async function enableRefreshMode() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Direct database access
    const db = mongoose.connection.db;
    const agents = db.collection('agents');
    
    // First check if we have any agents
    const count = await agents.countDocuments({});
    console.log(`📊 Found ${count} agents in database`);
    
    if (count === 0) {
      console.log('❌ No agents found. Please create an agent first.');
      process.exit(1);
    }
    
    // List all agents
    const allAgents = await agents.find({}).toArray();
    console.log('\n📋 Current agents:');
    allAgents.forEach(agent => {
      const refreshMode = agent.configuration?.refreshMode || false;
      console.log(`- ${agent.name} (${agent.type}) - Refresh: ${refreshMode ? '✅' : '❌'}`);
    });
    
    // Enable refresh mode for all agents
    const result = await agents.updateMany(
      {},
      { 
        $set: { 
          'configuration.refreshMode': true,
          'configuration.duplicateWindow': 1 // 1 hour window
        } 
      }
    );
    
    console.log(`\n✅ Enabled refresh mode for ${result.modifiedCount} agents`);
    console.log('ℹ️  Duplicate detection window reduced to 1 hour');
    console.log('ℹ️  This allows fetching content that was recently seen');
    
    // Show updated status
    const updatedAgents = await agents.find({}).toArray();
    console.log('\n📋 Updated agent status:');
    updatedAgents.forEach(agent => {
      const refreshMode = agent.configuration?.refreshMode || false;
      const window = agent.configuration?.duplicateWindow || 4;
      console.log(`- ${agent.name}: Refresh ${refreshMode ? '✅' : '❌'} (${window}h window)`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

enableRefreshMode(); 