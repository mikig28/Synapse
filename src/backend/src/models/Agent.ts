import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'twitter' | 'news' | 'crewai_news' | 'custom';
  description?: string;
  isActive: boolean;
  configuration: {
    // Twitter agent config
    keywords?: string[];
    minLikes?: number;
    minRetweets?: number;
    excludeReplies?: boolean;
    // News agent config
    newsSources?: string[];
    categories?: string[];
    language?: string;
    // CrewAI agent config
    topics?: string[];
    crewaiSources?: {
      reddit?: boolean;
      linkedin?: boolean;
      telegram?: boolean;
      news_websites?: boolean;
    };
    // Duplicate detection config
    refreshMode?: boolean; // When true, ignores recent duplicates
    duplicateWindow?: number; // Hours to check for duplicates (default 4)
    // MCP (Model Context Protocol) configuration
    mcpServers?: {
      name: string;
      serverUri: string;
      enabled: boolean;
      capabilities: string[];
      description?: string;
      authentication?: {
        type: 'none' | 'bearer' | 'basic' | 'apikey';
        credentials?: string;
      };
    }[];
    // Agent tools configuration
    tools?: {
      name: string;
      type: 'builtin' | 'custom' | 'mcp';
      enabled: boolean;
      configuration?: Record<string, any>;
      description?: string;
      mcpServerId?: string;
    }[];
    // Common config
    schedule?: string; // cron expression
    maxItemsPerRun?: number;
  };
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'error' | 'paused';
  errorMessage?: string;
  statistics: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalItemsProcessed: number;
    totalItemsAdded: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema: Schema<IAgent> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['twitter', 'news', 'crewai_news', 'custom'],
      required: true,
    },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    configuration: {
      // Twitter agent configuration
      keywords: { type: [String], default: [] },
      minLikes: { type: Number, default: 0 },
      minRetweets: { type: Number, default: 0 },
      excludeReplies: { type: Boolean, default: true },
      
      // News agent configuration
      newsSources: { type: [String], default: [] },
      categories: { type: [String], default: [] },
      language: { type: String, default: 'en' },
      
      // CrewAI agent configuration
      topics: { type: [String], default: [] },
      crewaiSources: {
        reddit: { type: Boolean, default: true },
        linkedin: { type: Boolean, default: true },
        telegram: { type: Boolean, default: true },
        news_websites: { type: Boolean, default: true },
      },
      
      // Duplicate detection configuration
      refreshMode: { type: Boolean, default: false },
      duplicateWindow: { type: Number, default: 4 },
      
      // MCP (Model Context Protocol) configuration
      mcpServers: {
        type: [{
          name: { type: String, required: true },
          serverUri: { type: String, required: true },
          enabled: { type: Boolean, default: true },
          capabilities: { type: [String], default: [] },
          description: { type: String },
          authentication: {
            type: { type: String, enum: ['none', 'bearer', 'basic', 'apikey'], default: 'none' },
            credentials: { type: String }
          }
        }],
        default: []
      },
      
      // Agent tools configuration
      tools: {
        type: [{
          name: { type: String, required: true },
          type: { type: String, enum: ['builtin', 'custom', 'mcp'], required: true },
          enabled: { type: Boolean, default: true },
          configuration: { type: Schema.Types.Mixed, default: {} },
          description: { type: String },
          mcpServerId: { type: String }
        }],
        default: []
      },
      
      // Common configuration
      schedule: { type: String, default: '0 */6 * * *' }, // Every 6 hours by default
      maxItemsPerRun: { type: Number, default: 10 },
    },
    lastRun: { type: Date },
    nextRun: { type: Date },
    status: {
      type: String,
      enum: ['idle', 'running', 'error', 'paused'],
      default: 'idle',
    },
    errorMessage: { type: String },
    statistics: {
      totalRuns: { type: Number, default: 0 },
      successfulRuns: { type: Number, default: 0 },
      failedRuns: { type: Number, default: 0 },
      totalItemsProcessed: { type: Number, default: 0 },
      totalItemsAdded: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Index for efficient querying
AgentSchema.index({ userId: 1, type: 1 });
AgentSchema.index({ userId: 1, isActive: 1 });
AgentSchema.index({ nextRun: 1, isActive: 1 });

const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent;