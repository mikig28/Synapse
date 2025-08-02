import mongoose, { Document, Schema } from 'mongoose';

// Usage tracking for beta pricing model
export interface IUsageDocument {
  userId: mongoose.Types.ObjectId;
  
  // Time period for usage tracking
  period: {
    start: Date;
    end: Date;
    type: 'daily' | 'weekly' | 'monthly'; // Track usage by different periods
  };
  
  // Core feature usage metrics
  features: {
    // Search usage
    searches: {
      count: number;
      uniqueQueries: number;
      avgResponseTime: number;
      totalResultsReturned: number;
    };
    
    // AI Agent usage
    agents: {
      executionsCount: number;
      totalExecutionTime: number; // in milliseconds
      uniqueAgentsUsed: number;
      scheduledAgentsCount: number;
    };
    
    // Data management
    data: {
      documentsUploaded: number;
      documentsAnalyzed: number;
      totalStorageUsed: number; // in bytes
      exportJobsCreated: number;
    };
    
    // Integrations usage
    integrations: {
      whatsappMessages: number;
      telegramMessages: number;
      calendarEvents: number;
      newsArticlesProcessed: number;
    };
    
    // Content creation
    content: {
      notesCreated: number;
      ideasCreated: number;
      tasksCreated: number;
      meetingsCreated: number;
      bookmarksAdded: number;
    };
    
    // Advanced features
    advanced: {
      vectorSearchQueries: number;
      aiSummariesGenerated: number;
      videoTranscriptions: number;
      ttsGenerations: number;
    };
  };
  
  // API usage metrics
  api: {
    totalRequests: number;
    averageRequestsPerHour: number;
    peakHourRequests: number;
    errorRate: number; // percentage
    avgResponseTime: number; // in milliseconds
  };
  
  // Usage patterns
  patterns: {
    mostActiveHours: number[]; // Hours of day (0-23)
    mostUsedFeatures: string[]; // Top 5 features by usage
    sessionDuration: number; // Average session length in minutes
    loginFrequency: number; // Logins per period
  };
  
  // Resource consumption
  resources: {
    computeTime: number; // Total compute time in milliseconds
    bandwidthUsed: number; // in bytes
    apiCallsExternal: number; // Calls to external APIs (OpenAI, etc.)
    storageOperations: number; // DB read/write operations
  };
  
  // Compliance and billing preparation
  billing: {
    estimatedCost: number; // Estimated cost in USD
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    overageFlags: string[]; // Features that exceeded limits
    credits: {
      used: number;
      remaining: number;
      type: 'api_calls' | 'compute_time' | 'storage' | 'features';
    };
  };
  
  // Metadata
  metadata: {
    platform: string; // web, mobile, api
    userAgent: string;
    location?: {
      country: string;
      region: string;
      timezone: string;
    };
    deviceInfo: {
      type: 'desktop' | 'mobile' | 'tablet';
      os: string;
      browser: string;
    };
  };
  
  // Flags for analytics
  flags: {
    isPowerUser: boolean; // High usage across multiple features
    isNewUser: boolean; // First 30 days
    isChurnRisk: boolean; // Declining usage pattern
    hasHitLimits: boolean; // Reached any usage limits
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IUsage extends IUsageDocument, Document {
  totalUsageScore: number;
  checkUsageLimits(): string[];
  getTierLimits(): any;
  calculateEstimatedCost(): number;
}

const UsageSchema = new Schema<IUsage>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  period: {
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      index: true
    }
  },
  
  features: {
    searches: {
      count: { type: Number, default: 0 },
      uniqueQueries: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
      totalResultsReturned: { type: Number, default: 0 }
    },
    
    agents: {
      executionsCount: { type: Number, default: 0 },
      totalExecutionTime: { type: Number, default: 0 },
      uniqueAgentsUsed: { type: Number, default: 0 },
      scheduledAgentsCount: { type: Number, default: 0 }
    },
    
    data: {
      documentsUploaded: { type: Number, default: 0 },
      documentsAnalyzed: { type: Number, default: 0 },
      totalStorageUsed: { type: Number, default: 0 },
      exportJobsCreated: { type: Number, default: 0 }
    },
    
    integrations: {
      whatsappMessages: { type: Number, default: 0 },
      telegramMessages: { type: Number, default: 0 },
      calendarEvents: { type: Number, default: 0 },
      newsArticlesProcessed: { type: Number, default: 0 }
    },
    
    content: {
      notesCreated: { type: Number, default: 0 },
      ideasCreated: { type: Number, default: 0 },
      tasksCreated: { type: Number, default: 0 },
      meetingsCreated: { type: Number, default: 0 },
      bookmarksAdded: { type: Number, default: 0 }
    },
    
    advanced: {
      vectorSearchQueries: { type: Number, default: 0 },
      aiSummariesGenerated: { type: Number, default: 0 },
      videoTranscriptions: { type: Number, default: 0 },
      ttsGenerations: { type: Number, default: 0 }
    }
  },
  
  api: {
    totalRequests: { type: Number, default: 0 },
    averageRequestsPerHour: { type: Number, default: 0 },
    peakHourRequests: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 }
  },
  
  patterns: {
    mostActiveHours: [{ type: Number }],
    mostUsedFeatures: [{ type: String }],
    sessionDuration: { type: Number, default: 0 },
    loginFrequency: { type: Number, default: 0 }
  },
  
  resources: {
    computeTime: { type: Number, default: 0 },
    bandwidthUsed: { type: Number, default: 0 },
    apiCallsExternal: { type: Number, default: 0 },
    storageOperations: { type: Number, default: 0 }
  },
  
  billing: {
    estimatedCost: { type: Number, default: 0 },
    tier: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free'
    },
    overageFlags: [{ type: String }],
    credits: {
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 1000 }, // Default free credits
      type: {
        type: String,
        enum: ['api_calls', 'compute_time', 'storage', 'features'],
        default: 'api_calls'
      }
    }
  },
  
  metadata: {
    platform: { type: String, default: 'web' },
    userAgent: { type: String, default: '' },
    location: {
      country: { type: String },
      region: { type: String },
      timezone: { type: String }
    },
    deviceInfo: {
      type: { 
        type: String, 
        enum: ['desktop', 'mobile', 'tablet'],
        default: 'desktop'
      },
      os: { type: String, default: '' },
      browser: { type: String, default: '' }
    }
  },
  
  flags: {
    isPowerUser: { type: Boolean, default: false },
    isNewUser: { type: Boolean, default: true },
    isChurnRisk: { type: Boolean, default: false },
    hasHitLimits: { type: Boolean, default: false }
  }
  
}, {
  timestamps: true
});

// Compound indexes for efficient querying
UsageSchema.index({ userId: 1, 'period.start': 1, 'period.type': 1 });
UsageSchema.index({ 'period.start': 1, 'period.end': 1 });
UsageSchema.index({ 'billing.tier': 1, 'flags.isPowerUser': 1 });
UsageSchema.index({ 'flags.isChurnRisk': 1, updatedAt: 1 });

// Virtual for total feature usage score
UsageSchema.virtual('totalUsageScore').get(function() {
  const features = this.features;
  return (
    features.searches.count +
    features.agents.executionsCount +
    features.data.documentsUploaded +
    features.integrations.whatsappMessages +
    features.integrations.telegramMessages +
    features.content.notesCreated +
    features.content.ideasCreated +
    features.content.tasksCreated +
    features.advanced.vectorSearchQueries +
    features.advanced.aiSummariesGenerated
  );
});

// Method to check if user has exceeded limits for their tier
UsageSchema.methods.checkUsageLimits = function() {
  const limits = this.getTierLimits();
  const overages: string[] = [];
  
  // Check various limits based on tier
  if (this.features.searches.count > limits.searches) {
    overages.push('searches');
  }
  
  if (this.features.agents.executionsCount > limits.agentExecutions) {
    overages.push('agent_executions');
  }
  
  if (this.features.data.totalStorageUsed > limits.storage) {
    overages.push('storage');
  }
  
  if (this.api.totalRequests > limits.apiRequests) {
    overages.push('api_requests');
  }
  
  this.billing.overageFlags = overages;
  this.flags.hasHitLimits = overages.length > 0;
  
  return overages;
};

// Method to get tier limits
UsageSchema.methods.getTierLimits = function() {
  const tierLimits = {
    free: {
      searches: 100,
      agentExecutions: 10,
      storage: 100 * 1024 * 1024, // 100MB
      apiRequests: 1000,
      exportJobs: 3
    },
    starter: {
      searches: 1000,
      agentExecutions: 100,
      storage: 1024 * 1024 * 1024, // 1GB
      apiRequests: 10000,
      exportJobs: 10
    },
    pro: {
      searches: 10000,
      agentExecutions: 1000,
      storage: 10 * 1024 * 1024 * 1024, // 10GB
      apiRequests: 100000,
      exportJobs: 50
    },
    enterprise: {
      searches: Infinity,
      agentExecutions: Infinity,
      storage: Infinity,
      apiRequests: Infinity,
      exportJobs: Infinity
    }
  };
  
  return tierLimits[this.billing.tier as keyof typeof tierLimits] || tierLimits.free;
};

// Method to calculate estimated cost
UsageSchema.methods.calculateEstimatedCost = function() {
  const pricing = {
    searchCost: 0.001, // $0.001 per search
    agentExecutionCost: 0.01, // $0.01 per agent execution
    storageCost: 0.000001, // $0.000001 per byte per month
    apiRequestCost: 0.0001, // $0.0001 per API request
    aiSummaryCost: 0.05 // $0.05 per AI summary
  };
  
  const cost = (
    (this.features.searches.count * pricing.searchCost) +
    (this.features.agents.executionsCount * pricing.agentExecutionCost) +
    (this.features.data.totalStorageUsed * pricing.storageCost) +
    (this.api.totalRequests * pricing.apiRequestCost) +
    (this.features.advanced.aiSummariesGenerated * pricing.aiSummaryCost)
  );
  
  this.billing.estimatedCost = Math.round(cost * 100) / 100; // Round to 2 decimal places
  return this.billing.estimatedCost;
};

const Usage = mongoose.model<IUsage>('Usage', UsageSchema);
export { Usage };
export default Usage;