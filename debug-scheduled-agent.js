const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Define the ScheduledAgent schema (simplified)
const ScheduledAgentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  agentConfig: {
    type: { type: String, enum: ['crewai', 'custom'], default: 'crewai' },
    topics: [{ type: String, required: true }],
    sources: {
      reddit: { type: Boolean, default: true },
      linkedin: { type: Boolean, default: true },
      telegram: { type: Boolean, default: true },
      news_websites: { type: Boolean, default: true }
    },
    parameters: {
      maxItemsPerRun: { type: Number, default: 10 },
      qualityThreshold: { type: Number, default: 0.7 },
      timeRange: { type: String, default: '24h' }
    }
  },
  schedule: {
    type: { type: String, enum: ['cron', 'interval'], required: true },
    cronExpression: String,
    intervalMinutes: Number,
    timezone: { type: String, default: 'UTC' }
  },
  isActive: { type: Boolean, default: true },
  lastExecuted: Date,
  nextExecution: Date,
  executionCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  lastResult: {
    status: { type: String, enum: ['success', 'error'] },
    message: String,
    reportId: mongoose.Schema.Types.ObjectId,
    executedAt: Date,
    duration: Number
  }
}, { timestamps: true });

const ScheduledAgent = mongoose.model('ScheduledAgent', ScheduledAgentSchema);

async function debugScheduledAgent() {
  await connectDB();
  
  const targetAgentId = '68605f38a1e78fcb9e0ac824';
  
  console.log('\n🔍 Debugging Scheduled Agent Issues');
  console.log('=====================================');
  
  try {
    // 1. Check if the agent ID is valid
    console.log(`\n1. Validating Agent ID: ${targetAgentId}`);
    const isValidId = mongoose.Types.ObjectId.isValid(targetAgentId);
    console.log(`   Valid ObjectId: ${isValidId ? '✅' : '❌'}`);
    
    if (!isValidId) {
      console.log('   ❌ Invalid ObjectId format - this is the issue!');
      return;
    }
    
    // 2. Check if agent exists in database
    console.log('\n2. Checking if agent exists in database...');
    const agent = await ScheduledAgent.findById(targetAgentId);
    
    if (!agent) {
      console.log('   ❌ Agent not found in database');
      
      // Check if there are any scheduled agents at all
      const totalAgents = await ScheduledAgent.countDocuments();
      console.log(`   📊 Total scheduled agents in database: ${totalAgents}`);
      
      if (totalAgents > 0) {
        console.log('\n   📋 Available scheduled agents:');
        const allAgents = await ScheduledAgent.find({}, { _id: 1, name: 1, userId: 1, isActive: 1 }).limit(10);
        allAgents.forEach(a => {
          console.log(`      - ID: ${a._id}, Name: ${a.name}, User: ${a.userId}, Active: ${a.isActive}`);
        });
      }
    } else {
      console.log('   ✅ Agent found in database');
      console.log(`   📋 Agent details:`);
      console.log(`      - Name: ${agent.name}`);
      console.log(`      - User ID: ${agent.userId}`);
      console.log(`      - Active: ${agent.isActive}`);
      console.log(`      - Schedule Type: ${agent.schedule.type}`);
      console.log(`      - Created: ${agent.createdAt}`);
      console.log(`      - Last Executed: ${agent.lastExecuted || 'Never'}`);
      console.log(`      - Next Execution: ${agent.nextExecution || 'Not scheduled'}`);
      console.log(`      - Execution Count: ${agent.executionCount}`);
      console.log(`      - Success Rate: ${agent.executionCount > 0 ? Math.round((agent.successCount / agent.executionCount) * 100) : 0}%`);
      
      if (agent.schedule.type === 'interval') {
        console.log(`      - Interval: ${agent.schedule.intervalMinutes} minutes`);
      } else if (agent.schedule.type === 'cron') {
        console.log(`      - Cron Expression: ${agent.schedule.cronExpression}`);
      }
      
      if (agent.lastResult) {
        console.log(`      - Last Result: ${agent.lastResult.status} - ${agent.lastResult.message || 'No message'}`);
      }
    }
    
    // 3. Check database connection health
    console.log('\n3. Database Connection Health:');
    console.log(`   Connection State: ${mongoose.connection.readyState} (1=connected, 0=disconnected)`);
    console.log(`   Database Name: ${mongoose.connection.db?.databaseName || 'Unknown'}`);
    
    // 4. Test a simple query
    console.log('\n4. Testing database queries...');
    try {
      const testCount = await ScheduledAgent.countDocuments();
      console.log(`   ✅ Query test passed - found ${testCount} scheduled agents`);
    } catch (queryError) {
      console.log(`   ❌ Query test failed:`, queryError.message);
    }
    
    // 5. Check for any agents with scheduling issues
    console.log('\n5. Checking for scheduling issues...');
    const agentsWithoutNextExecution = await ScheduledAgent.countDocuments({
      isActive: true,
      nextExecution: { $exists: false }
    });
    console.log(`   Agents without next execution: ${agentsWithoutNextExecution}`);
    
    const overdueAgents = await ScheduledAgent.countDocuments({
      isActive: true,
      nextExecution: { $lt: new Date() }
    });
    console.log(`   Overdue agents: ${overdueAgents}`);
    
    // 6. Suggest fixes
    console.log('\n6. Suggested Fixes:');
    if (!agent) {
      console.log('   🔧 The agent ID in the frontend might be stale or incorrect');
      console.log('   🔧 Try refreshing the scheduled agents list');
      console.log('   🔧 Check if the agent was deleted or belongs to a different user');
    } else {
      console.log('   ✅ Agent exists - the 500 error might be due to:');
      console.log('   🔧 Authentication issues (check JWT token)');
      console.log('   🔧 CORS issues (check browser network tab)');
      console.log('   🔧 Server-side error handling (check server logs)');
      
      if (!agent.nextExecution && agent.isActive) {
        console.log('   🔧 Agent needs next execution time calculated');
        
        // Try to fix the next execution
        try {
          let nextExecution;
          if (agent.schedule.type === 'interval' && agent.schedule.intervalMinutes) {
            const intervalMs = agent.schedule.intervalMinutes * 60 * 1000;
            nextExecution = new Date(Date.now() + intervalMs);
          } else if (agent.schedule.type === 'cron' && agent.schedule.cronExpression) {
            // Simple next execution calculation for common patterns
            const now = new Date();
            nextExecution = new Date(now.getTime() + 60000); // Default to 1 minute from now
          }
          
          if (nextExecution) {
            await ScheduledAgent.findByIdAndUpdate(targetAgentId, { nextExecution });
            console.log(`   ✅ Fixed next execution time: ${nextExecution}`);
          }
        } catch (fixError) {
          console.log(`   ❌ Failed to fix next execution:`, fixError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Debug script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug script
debugScheduledAgent().catch(console.error);
