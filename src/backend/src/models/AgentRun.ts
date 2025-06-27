import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentRun extends Document {
  agentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  itemsProcessed: number;
  itemsAdded: number;
  errorMessages: string[];
  logs: {
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }[];
  results: {
    summary: string;
    details?: any;
    sessionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Method signatures
  addLog(level: 'info' | 'warn' | 'error', message: string, data?: any): Promise<IAgentRun>;
  complete(summary: string, details?: any): Promise<IAgentRun>;
  fail(error: string): Promise<IAgentRun>;
}

const AgentRunSchema: Schema<IAgentRun> = new Schema(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'cancelled'],
      required: true,
      default: 'running',
    },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number }, // in milliseconds
    itemsProcessed: { type: Number, default: 0 },
    itemsAdded: { type: Number, default: 0 },
    errorMessages: { type: [String], default: [] },
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        level: {
          type: String,
          enum: ['info', 'warn', 'error'],
          required: true,
        },
        message: { type: String, required: true },
        data: { type: Schema.Types.Mixed },
      },
    ],
    results: {
      summary: { type: String, default: '' },
      details: { type: Schema.Types.Mixed },
      sessionId: { type: String },
    },
  },
  { timestamps: true }
);

// Index for efficient querying
AgentRunSchema.index({ agentId: 1, createdAt: -1 });
AgentRunSchema.index({ userId: 1, createdAt: -1 });
AgentRunSchema.index({ status: 1, createdAt: -1 });

// Method to add log entry
AgentRunSchema.methods.addLog = function (level: 'info' | 'warn' | 'error', message: string, data?: any) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    data,
  });
  return this.save();
};

// Method to complete the run
AgentRunSchema.methods.complete = function (summary: string, details?: any) {
  this.status = 'completed';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.results = { summary, details };
  return this.save();
};

// Method to fail the run
AgentRunSchema.methods.fail = function (error: string) {
  this.status = 'failed';
  this.endTime = new Date();
  this.duration = this.endTime.getTime() - this.startTime.getTime();
  this.errorMessages.push(error);
  return this.save();
};

const AgentRun = mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);

export default AgentRun;