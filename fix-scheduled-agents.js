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

// Helper function to calculate next execution time
function calculateNextExecution(agent) {
  if (!agent.isActive) return null;

  const now = new Date();
  
  if (agent.schedule.type === 'interval' && agent.schedule.intervalMinutes) {
    const intervalMs = agent.schedule.intervalMinutes * 60 * 1000;
    return new Date(now.getTime() + intervalMs);
  }
  
  if (agent.schedule.type === 'cron' && agent.schedule.cronExpression) {
    // Simple next execution calculation for common patterns
    const parts = agent.schedule.cronExpression.split(' ');
    const [minute, hour] = parts;
    
    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);
    
    // Set minute
    if (minute !== '*') {
      next.setMinutes(parseInt(minute));
    }
    
    // Set hour
    if (hour !== '*') {
      next.setHours(parseInt(hour));
    }
    
    // If the time has passed today, move to tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  return null;
}

async function fixScheduledAgents() {
  await connectDB();
  
  console.log('\n🔧 Fixing Scheduled Agent Issues');
  console.log('==================================');
  
  try {
    // 1. Find all scheduled agents
    const allAgents = await ScheduledAgent.find({});
    console.log(`\n📊 Found ${allAgents.length} scheduled agents`);
    
    if (allAgents.length === 0) {
      console.log('   No scheduled agents found. Creating a sample agent for testing...');
      
      // Create a sample scheduled agent for testing
      const sampleAgent = new ScheduledAgent({
        userId: new mongoose.Types.ObjectId(), // Random user ID for testing
        name: 'Daily tech news',
        description: 'recent news about tech, ai.',
        agentConfig: {
          type: 'crewai',
          topics: ['tech', 'claude code', 'n8n'],
          sources: {
            reddit: true,
            linkedin: true,
            telegram: true,
            news_websites: true
          },
          parameters: {
            maxItemsPerRun: 10,
            qualityThreshold: 0.7,
            timeRange: '24h'
          }
        },
        schedule: {
          type: 'interval',
          intervalMinutes: 5, // Every 5 minutes for testing
          timezone: 'UTC'
        },
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      });
      
      // Calculate next execution
      sampleAgent.nextExecution = calculateNextExecution(sampleAgent);
      
      await sampleAgent.save();
      console.log(`   ✅ Created sample agent: ${sampleAgent.name} (ID: ${sampleAgent._id})`);
      console.log(`   📅 Next execution: ${sampleAgent.nextExecution}`);
      
      return;
    }
    
    // 2. Fix agents with missing next execution times
    let fixedCount = 0;
    
    for (const agent of allAgents) {
      console.log(`\n🔍 Checking agent: ${agent.name} (${agent._id})`);
      console.log(`   Active: ${agent.isActive}`);
      console.log(`   Schedule: ${agent.schedule.type}`);
      
      if (agent.schedule.type === 'interval') {
        console.log(`   Interval: ${agent.schedule.intervalMinutes} minutes`);
      } else if (agent.schedule.type === 'cron') {
        console.log(`   Cron: ${agent.schedule.cronExpression}`);
      }
      
      console.log(`   Current next execution: ${agent.nextExecution || 'Not set'}`);
      
      let needsUpdate = false;
      const updates = {};
      
      // Fix missing next execution time
      if (agent.isActive && !agent.nextExecution) {
        const nextExecution = calculateNextExecution(agent);
        if (nextExecution) {
          updates.nextExecution = nextExecution;
          needsUpdate = true;
          console.log(`   🔧 Setting next execution to: ${nextExecution}`);
        }
      }
      
      // Fix invalid schedule configurations
      if (agent.schedule.type === 'interval' && !agent.schedule.intervalMinutes) {
        updates['schedule.intervalMinutes'] = 60; // Default to 1 hour
        needsUpdate = true;
        console.log(`   🔧 Setting default interval to 60 minutes`);
      }
      
      if (agent.schedule.type === 'cron' && !agent.schedule.cronExpression) {
        updates['schedule.cronExpression'] = '0 9 * * *'; // Default to 9 AM daily
        needsUpdate = true;
        console.log(`   🔧 Setting default cron expression to daily at 9 AM`);
      }
      
      // Apply updates
      if (needsUpdate) {
        await ScheduledAgent.findByIdAndUpdate(agent._id, updates);
        fixedCount++;
        console.log(`   ✅ Fixed agent: ${agent.name}`);
      } else {
        console.log(`   ✅ Agent is properly configured`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total agents: ${allAgents.length}`);
    console.log(`   Fixed agents: ${fixedCount}`);
    
    // 3. Show current status of all agents
    console.log(`\n📋 Current Agent Status:`);
    const updatedAgents = await ScheduledAgent.find({}).sort({ createdAt: -1 });
    
    updatedAgents.forEach((agent, index) => {
      console.log(`\n   ${index + 1}. ${agent.name} (${agent._id})`);
      console.log(`      User: ${agent.userId}`);
      console.log(`      Active: ${agent.isActive ? '✅' : '❌'}`);
      console.log(`      Schedule: ${agent.schedule.type}`);
      
      if (agent.schedule.type === 'interval') {
        console.log(`      Interval: ${agent.schedule.intervalMinutes} minutes`);
      } else if (agent.schedule.type === 'cron') {
        console.log(`      Cron: ${agent.schedule.cronExpression}`);
      }
      
      console.log(`      Next execution: ${agent.nextExecution || 'Not scheduled'}`);
      console.log(`      Executions: ${agent.executionCount} (${agent.successCount} success, ${agent.failureCount} failed)`);
      
      if (agent.lastResult) {
        console.log(`      Last result: ${agent.lastResult.status} - ${agent.lastResult.message || 'No message'}`);
      }
    });
    
    // 4. Test the problematic agent ID
    const problematicId = '68605f38a1e78fcb9e0ac824';
    console.log(`\n🎯 Testing problematic agent ID: ${problematicId}`);
    
    if (mongoose.Types.ObjectId.isValid(problematicId)) {
      const problematicAgent = await ScheduledAgent.findById(problematicId);
      if (problematicAgent) {
        console.log(`   ✅ Agent found: ${problematicAgent.name}`);
        console.log(`   📋 Details: Active=${problematicAgent.isActive}, Next=${problematicAgent.nextExecution}`);
      } else {
        console.log(`   ❌ Agent not found in database`);
        console.log(`   💡 This explains the 500 error - the frontend has a stale agent ID`);
      }
    } else {
      console.log(`   ❌ Invalid ObjectId format`);
    }
    
  } catch (error) {
    console.error('\n❌ Fix script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix script
fixScheduledAgents().catch(console.error);
