import mongoose from 'mongoose';
import { addDays, isAfter, set } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import WhatsAppSummarySchedule, {
  IWhatsAppSummarySchedule,
  IWhatsAppSummaryScheduleExecution,
  IWhatsAppSummaryScheduleExecutionGroupResult
} from '../models/WhatsAppSummarySchedule';
import WhatsAppGroupSummary from '../models/WhatsAppGroupSummary';
import { MessageSummarizationService } from './messageSummarizationService';
import { SummaryGenerationOptions, SummaryRequest } from '../types/whatsappSummary';

export class WhatsAppSummaryScheduleService {
  private readonly pollIntervalMs = 60_000;
  private timer?: NodeJS.Timeout;
  private isProcessing = false;
  private readonly messageService = MessageSummarizationService.getInstance();

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.processDueSchedules();
    }, this.pollIntervalMs);

    void this.processDueSchedules();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async processDueSchedules(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      const now = new Date();
      const dueSchedules = await WhatsAppSummarySchedule.find({
        status: 'active',
        nextExecutionAt: { $lte: now }
      }).sort({ nextExecutionAt: 1 }).limit(10);

      for (const schedule of dueSchedules) {
        try {
          await this.executeSchedule(schedule);
        } catch (error) {
          console.error('[WhatsApp Summary Schedule] Failed to execute schedule', schedule._id, error);
        }
      }
    } catch (error) {
      console.error('[WhatsApp Summary Schedule] Error while processing due schedules:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  calculateNextExecution(
    schedule: Pick<IWhatsAppSummarySchedule, 'runAt' | 'timezone' | 'frequency'>,
    fromDate: Date = new Date()
  ): Date {
    const timezone = schedule.timezone || 'UTC';
    const [hourStr, minuteStr] = schedule.runAt.split(':');
    const hours = Number.parseInt(hourStr, 10);
    const minutes = Number.parseInt(minuteStr, 10);

    const zonedNow = toZonedTime(fromDate, timezone);
    let nextZoned = set(zonedNow, { hours, minutes, seconds: 0, milliseconds: 0 });

    if (!isAfter(nextZoned, zonedNow)) {
      nextZoned = addDays(nextZoned, 1);
    }

    return fromZonedTime(nextZoned, timezone);
  }

  async executeScheduleById(scheduleId: string): Promise<IWhatsAppSummaryScheduleExecution | null> {
    const schedule = await WhatsAppSummarySchedule.findById(scheduleId);
    if (!schedule) {
      return null;
    }
    return await this.executeSchedule(schedule);
  }

  private async executeSchedule(schedule: IWhatsAppSummarySchedule): Promise<IWhatsAppSummaryScheduleExecution> {
    const executionStartedAt = new Date();
    const timezone = schedule.timezone || 'UTC';
    const executionWindow = this.resolveExecutionWindow(executionStartedAt, timezone);

    const summaryOptions = { ...(schedule.summaryOptions || {}), timezone } as SummaryGenerationOptions;
    const summaryIds: mongoose.Types.ObjectId[] = [];
    const groupResults: IWhatsAppSummaryScheduleExecutionGroupResult[] = [];

    for (const target of schedule.targetGroups) {
      const request: SummaryRequest = {
        groupId: target.groupId,
        groupName: target.groupName,
        startTime: executionWindow.startUtc,
        endTime: executionWindow.endUtc,
        timezone,
        chatType: 'group'
      };

      try {
        console.log('[WhatsApp Summary Schedule] Starting summary for group', {
          scheduleId: schedule._id,
          groupId: target.groupId,
          groupName: target.groupName,
          executionWindow
        });

        const result = await this.messageService.generateGroupSummary(
          request,
          schedule.userId.toString(),
          summaryOptions,
          schedule._id.toString()
        );

        console.log('[WhatsApp Summary Schedule] Summary generation result', {
          scheduleId: schedule._id,
          groupId: target.groupId,
          result: {
            hasSummaryId: !!result.summaryId,
            summaryId: result.summaryId,
            cached: result.cached
          }
        });

        if (result.summaryId && mongoose.isValidObjectId(result.summaryId)) {
          const summaryObjectId = new mongoose.Types.ObjectId(result.summaryId);
          summaryIds.push(summaryObjectId);

          await WhatsAppGroupSummary.findByIdAndUpdate(result.summaryId, {
            scheduleId: schedule._id
          });

          groupResults.push({
            groupId: target.groupId,
            groupName: target.groupName,
            summaryId: summaryObjectId,
            status: 'success'
          });

          console.log('[WhatsApp Summary Schedule] Group summary succeeded', {
            scheduleId: schedule._id,
            groupId: target.groupId,
            summaryId: result.summaryId
          });
        } else {
          console.warn('[WhatsApp Summary Schedule] No valid summary ID returned', {
            scheduleId: schedule._id,
            groupId: target.groupId,
            result
          });

          groupResults.push({
            groupId: target.groupId,
            groupName: target.groupName,
            status: 'skipped',
            error: 'Summary ID was not returned by generator'
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;

        console.error('[WhatsApp Summary Schedule] Group summary failed', {
          scheduleId: schedule._id,
          groupId: target.groupId,
          groupName: target.groupName,
          error: message,
          stack,
          request,
          summaryOptions
        });

        groupResults.push({
          groupId: target.groupId,
          groupName: target.groupName,
          status: 'failed',
          error: message
        });
      }
    }

    const durationMs = Date.now() - executionStartedAt.getTime();
    const hasSuccess = groupResults.some(result => result.status === 'success');
    const hasFailure = groupResults.some(result => result.status === 'failed');

    let status: 'success' | 'partial' | 'failed';
    if (hasSuccess && hasFailure) {
      status = 'partial';
    } else if (hasFailure || groupResults.every(result => result.status !== 'success')) {
      status = 'failed';
    } else {
      status = 'success';
    }

    const executionRecord: IWhatsAppSummaryScheduleExecution = {
      executedAt: executionStartedAt,
      durationMs,
      status,
      summaryIds,
      groupResults,
      error: hasFailure ? 'One or more group summaries failed' : undefined
    };

    const isFailure = status !== 'success';
    const failCount = isFailure ? schedule.failCount + 1 : schedule.failCount;
    const consecutiveFailures = isFailure ? schedule.consecutiveFailures + 1 : 0;
    const nextExecutionAt = this.calculateNextExecution(schedule, new Date(executionStartedAt.getTime() + 1000));
    const shouldPause = schedule.maxRetries > 0 && consecutiveFailures >= schedule.maxRetries;

    const update: Partial<IWhatsAppSummarySchedule> = {
      lastExecutionAt: executionStartedAt,
      lastExecutionStatus: status,
      nextExecutionAt,
      failCount,
      consecutiveFailures
    } as Partial<IWhatsAppSummarySchedule>;

    if (shouldPause) {
      (update as any).status = 'paused';
    }

    await WhatsAppSummarySchedule.findByIdAndUpdate(schedule._id, {
      $set: update,
      $push: {
        history: {
          $each: [executionRecord],
          $position: 0,
          $slice: 20
        }
      }
    });

    return executionRecord;
  }

  private resolveExecutionWindow(executionInstant: Date, timezone: string): { startUtc: string; endUtc: string } {
    const zonedExecution = toZonedTime(executionInstant, timezone);
    const targetDay = addDays(zonedExecution, -1);
    const targetDateStr = formatInTimeZone(targetDay, timezone, 'yyyy-MM-dd');

    const startUtc = fromZonedTime(`${targetDateStr}T00:00:00`, timezone).toISOString();
    const endUtc = fromZonedTime(`${targetDateStr}T23:59:59.999`, timezone).toISOString();

    return { startUtc, endUtc };
  }
}

export const whatsappSummaryScheduleService = new WhatsAppSummaryScheduleService();


