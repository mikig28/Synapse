import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

// Define the ScheduledAgent schema
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

async function fixScheduledAgents() {
  await connectDB();
  
  console.log('\n🔧 Fixing Scheduled Agent Issues');
  console.log('==================================');
  
  try {
    // Find the "Daily tech news" agent
    const dailyTechNewsAgent = await ScheduledAgent.findOne({ 
      name: { $regex: /daily tech news/i }
    });
    
    if (!dailyTechNewsAgent) {
      console.log('❌ "Daily tech news" agent not found in database');
      console.log('   This explains the execution failure');
      
      // Create the missing agent
      console.log('\n🆕 Creating "Daily tech news" scheduled agent...');
      const newAgent = new ScheduledAgent({
        userId: new mongoose.Types.ObjectId(), // Placeholder user ID
        name: 'Daily tech news',
        description: 'Daily technology news aggregation',
        agentConfig: {
          type: 'crewai',
          topics: ['technology', 'AI', 'programming', 'tech news'],
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
          intervalMinutes: 60, // Every hour
          timezone: 'UTC'
        },
        isActive: true,
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      });
      
      await newAgent.save();
      console.log(`✅ Created "Daily tech news" agent (ID: ${newAgent._id})`);
      console.log(`   Status: ${newAgent.isActive ? 'Active' : 'Inactive'}`);
    } else {
      console.log(`✅ Found "Daily tech news" agent (ID: ${dailyTechNewsAgent._id})`);
      console.log(`   Status: ${dailyTechNewsAgent.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Next execution: ${dailyTechNewsAgent.nextExecution || 'Not scheduled'}`);
      
      // Activate the agent if it's inactive
      if (!dailyTechNewsAgent.isActive) {
        console.log('\n🔄 Activating the scheduled agent...');
        dailyTechNewsAgent.isActive = true;
        
        // Set next execution time
        if (!dailyTechNewsAgent.nextExecution) {
          const nextExecution = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
          dailyTechNewsAgent.nextExecution = nextExecution;
          console.log(`   Setting next execution to: ${nextExecution}`);
        }
        
        await dailyTechNewsAgent.save();
        console.log('✅ Agent activated successfully');
      }
    }
    
    // List all scheduled agents
    console.log('\n📋 All Scheduled Agents:');
    const allAgents = await ScheduledAgent.find({}).sort({ createdAt: -1 });
    
    allAgents.forEach((agent, index) => {
      console.log(`\n   ${index + 1}. ${agent.name} (${agent._id})`);
      console.log(`      Active: ${agent.isActive ? '✅' : '❌'}`);
      console.log(`      Type: ${agent.agentConfig.type}`);
      console.log(`      Topics: ${agent.agentConfig.topics.join(', ')}`);
      console.log(`      Next execution: ${agent.nextExecution || 'Not scheduled'}`);
      console.log(`      Executions: ${agent.executionCount} (${agent.successCount} success, ${agent.failureCount} failed)`);
    });
    
  } catch (error) {
    console.error('\n❌ Fix script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix script
fixScheduledAgents().catch(console.error);