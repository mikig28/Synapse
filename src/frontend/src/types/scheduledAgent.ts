export interface ScheduledAgentConfig {
  type: 'crewai' | 'custom';
  topics: string[];
  sources?: {
    reddit?: boolean;
    linkedin?: boolean;
    telegram?: boolean;
    news_websites?: boolean;
  };
  parameters?: {
    maxItemsPerRun?: number;
    qualityThreshold?: number;
    timeRange?: string;
  };
}

export interface ScheduledAgentSchedule {
  type: 'cron' | 'interval';
  cronExpression?: string;
  intervalMinutes?: number;
  timezone?: string;
}

export interface ScheduledAgentResult {
  status: 'success' | 'error';
  message?: string;
  reportId?: string;
  executedAt: string;
  duration?: number;
}

export interface ScheduledAgent {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  agentConfig: ScheduledAgentConfig;
  schedule: ScheduledAgentSchedule;
  isActive: boolean;
  lastExecuted?: string;
  nextExecution?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastResult?: ScheduledAgentResult;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledAgentRequest {
  name: string;
  description?: string;
  agentConfig: ScheduledAgentConfig;
  schedule: ScheduledAgentSchedule;
}

export interface UpdateScheduledAgentRequest extends Partial<CreateScheduledAgentRequest> {
  isActive?: boolean;
}

export interface ScheduledAgentExecutionHistory {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  lastExecution?: string;
  lastResult?: ScheduledAgentResult;
  nextExecution?: string;
}

// Common cron expressions for easy selection
export const COMMON_CRON_EXPRESSIONS = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 2 hours', value: '0 */2 * * *', description: 'Runs every 2 hours' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Daily at 9 AM', value: '0 9 * * *', description: 'Runs every day at 9:00 AM' },
  { label: 'Daily at 6 PM', value: '0 18 * * *', description: 'Runs every day at 6:00 PM' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
  { label: 'Every Friday at 5 PM', value: '0 17 * * 5', description: 'Runs every Friday at 5:00 PM' },
  { label: 'Weekly (Sunday 9 AM)', value: '0 9 * * 0', description: 'Runs every Sunday at 9:00 AM' },
  { label: 'Monthly (1st at 9 AM)', value: '0 9 1 * *', description: 'Runs on the 1st of every month at 9:00 AM' }
];

// Common interval options
export const COMMON_INTERVALS = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 }
];

// Available timezones
export const COMMON_TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'New York (EST/EDT)', value: 'America/New_York' },
  { label: 'Los Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' }
];