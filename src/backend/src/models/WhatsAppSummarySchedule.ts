import mongoose, { Document, Schema } from 'mongoose';

export interface IWhatsAppSummaryScheduleTargetGroup {
  groupId: string;
  groupName: string;
}

export interface IWhatsAppSummaryScheduleExecutionGroupResult {
  groupId: string;
  groupName: string;
  summaryId?: mongoose.Types.ObjectId;
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}

export interface IWhatsAppSummaryScheduleExecution {
  executedAt: Date;
  durationMs?: number;
  status: 'success' | 'partial' | 'failed';
  summaryIds: mongoose.Types.ObjectId[];
  groupResults: IWhatsAppSummaryScheduleExecutionGroupResult[];
  error?: string;
}

export interface IWhatsAppSummarySchedule extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  frequency: 'daily';
  runAt: string;
  timezone: string;
  targetGroups: IWhatsAppSummaryScheduleTargetGroup[];
  summaryOptions?: Record<string, unknown>;
  includeAIInsights?: boolean;
  status: 'active' | 'paused';
  nextExecutionAt?: Date;
  lastExecutionAt?: Date;
  lastExecutionStatus?: 'success' | 'partial' | 'failed';
  failCount: number;
  consecutiveFailures: number;
  maxRetries: number;
  history: IWhatsAppSummaryScheduleExecution[];
  createdAt: Date;
  updatedAt: Date;
}

const TargetGroupSchema = new Schema<IWhatsAppSummaryScheduleTargetGroup>({
  groupId: { type: String, required: true },
  groupName: { type: String, required: true }
}, { _id: false });

const ExecutionGroupResultSchema = new Schema<IWhatsAppSummaryScheduleExecutionGroupResult>({
  groupId: { type: String, required: true },
  groupName: { type: String, required: true },
  summaryId: { type: Schema.Types.ObjectId, ref: 'WhatsAppGroupSummary' },
  status: { type: String, enum: ['success', 'skipped', 'failed'], required: true },
  error: { type: String }
}, { _id: false });

const ExecutionSchema = new Schema<IWhatsAppSummaryScheduleExecution>({
  executedAt: { type: Date, required: true },
  durationMs: { type: Number },
  status: { type: String, enum: ['success', 'partial', 'failed'], required: true },
  summaryIds: [{ type: Schema.Types.ObjectId, ref: 'WhatsAppGroupSummary' }],
  groupResults: { type: [ExecutionGroupResultSchema], default: [] },
  error: { type: String }
}, { _id: false });

const WhatsAppSummaryScheduleSchema = new Schema<IWhatsAppSummarySchedule>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, maxlength: 500 },
  frequency: { type: String, enum: ['daily'], default: 'daily' },
  runAt: { type: String, required: true },
  timezone: { type: String, required: true },
  targetGroups: {
    type: [TargetGroupSchema],
    validate: {
      validator: (value: IWhatsAppSummaryScheduleTargetGroup[]) => Array.isArray(value) && value.length > 0,
      message: 'At least one target group is required'
    }
  },
  summaryOptions: { type: Schema.Types.Mixed, default: {} },
  includeAIInsights: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'paused'], default: 'active', index: true },
  nextExecutionAt: { type: Date, index: true },
  lastExecutionAt: { type: Date },
  lastExecutionStatus: { type: String, enum: ['success', 'partial', 'failed'] },
  failCount: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  history: { type: [ExecutionSchema], default: [] }
}, {
  timestamps: true
});

WhatsAppSummaryScheduleSchema.index({ userId: 1, status: 1 });
WhatsAppSummaryScheduleSchema.index({ status: 1, nextExecutionAt: 1 });

const WhatsAppSummarySchedule = mongoose.model<IWhatsAppSummarySchedule>(
  'WhatsAppSummarySchedule',
  WhatsAppSummaryScheduleSchema
);

export default WhatsAppSummarySchedule;
