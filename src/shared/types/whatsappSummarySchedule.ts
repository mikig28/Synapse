import type { SummaryGenerationOptions } from './whatsappSummaryOptions';

export type WhatsAppSummaryScheduleStatus = 'active' | 'paused';
export type WhatsAppSummaryScheduleFrequency = 'daily';

export interface WhatsAppSummaryScheduleTargetGroup {
  groupId: string;
  groupName: string;
}

export interface WhatsAppSummaryScheduleExecutionGroupResult {
  groupId: string;
  groupName: string;
  summaryId?: string;
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}

export interface WhatsAppSummaryScheduleExecution {
  executedAt: string;
  durationMs?: number;
  status: 'success' | 'partial' | 'failed';
  summaryIds?: string[];
  groupResults?: WhatsAppSummaryScheduleExecutionGroupResult[];
  error?: string;
}

export interface WhatsAppSummarySchedule {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: WhatsAppSummaryScheduleFrequency;
  runAt: string;
  timezone: string;
  targetGroups: WhatsAppSummaryScheduleTargetGroup[];
  summaryOptions?: Partial<SummaryGenerationOptions>;
  includeAIInsights?: boolean;
  status: WhatsAppSummaryScheduleStatus;
  nextExecutionAt?: string;
  lastExecutionAt?: string;
  lastExecutionStatus?: 'success' | 'partial' | 'failed';
  failCount?: number;
  consecutiveFailures?: number;
  maxRetries?: number;
  history?: WhatsAppSummaryScheduleExecution[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhatsAppSummaryScheduleRequest {
  name: string;
  description?: string;
  frequency?: WhatsAppSummaryScheduleFrequency;
  runAt: string;
  timezone: string;
  targetGroups: WhatsAppSummaryScheduleTargetGroup[];
  summaryOptions?: Partial<SummaryGenerationOptions>;
  includeAIInsights?: boolean;
}

export interface UpdateWhatsAppSummaryScheduleRequest {
  name?: string;
  description?: string;
  frequency?: WhatsAppSummaryScheduleFrequency;
  runAt?: string;
  timezone?: string;
  targetGroups?: WhatsAppSummaryScheduleTargetGroup[];
  summaryOptions?: Partial<SummaryGenerationOptions>;
  includeAIInsights?: boolean;
  status?: WhatsAppSummaryScheduleStatus;
}
