import mongoose from 'mongoose';
import { addDays, isAfter, set } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import WhatsAppSummarySchedule, {
  IWhatsAppSummarySchedule,
  IWhatsAppSummaryScheduleExecution,
  IWhatsAppSummaryScheduleExecutionGroupResult
} from '../models/WhatsAppSummarySchedule';
import WhatsAppGroupSummary from '../models/WhatsAppGroupSummary';
import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppSummarizationService from './whatsappSummarizationService';
import WhatsAppAISummarizationService from './whatsappAISummarizationService';
import { SummaryGenerationOptions, SummaryRequest, MessageData } from '../types/whatsappSummary';

export class WhatsAppSummaryScheduleService {
  private readonly pollIntervalMs = 60_000;
  private timer?: NodeJS.Timeout;
  private isProcessing = false;

  // Use the same AI service selection logic as the controller
  private readonly summarizationService = (() => {
    const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
    const hasGemini = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

    console.log('[WhatsApp Summary Schedule] AI API Keys Status:', {
      openai: hasOpenAI ? 'Available' : 'Not configured',
      anthropic: hasAnthropic ? 'Available' : 'Not configured',
      gemini: hasGemini ? 'Available' : 'Not configured'
    });

    if (hasOpenAI || hasAnthropic || hasGemini) {
      console.log('[WhatsApp Summary Schedule] Using WhatsAppAISummarizationService');
      return new WhatsAppAISummarizationService();
    } else {
      console.log('[WhatsApp Summary Schedule] Using WhatsAppSummarizationService (fallback)');
      return new WhatsAppSummarizationService();
    }
  })();

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
      try {
        console.log('[WhatsApp Summary Schedule] Starting summary for group', {
          scheduleId: schedule._id,
          groupId: target.groupId,
          groupName: target.groupName,
          executionWindow
        });

        // Fetch messages from database (same approach as controller)
        const messages = await WhatsAppMessage.find({
          $and: [
            { timestamp: { $gte: new Date(executionWindow.startUtc) } },
            { timestamp: { $lte: new Date(executionWindow.endUtc) } },
            {
              $or: [
                { 'metadata.groupId': target.groupId },
                { 'metadata.groupName': target.groupName },
                { to: target.groupId },
                { from: target.groupId }
              ]
            }
          ]
        })
          .populate('contactId', 'name phoneNumber avatar')
          .sort({ timestamp: 1 })
          .lean();

        console.log(`[WhatsApp Summary Schedule] Found ${messages.length} messages for group ${target.groupName}`);

        if (messages.length === 0) {
          groupResults.push({
            groupId: target.groupId,
            groupName: target.groupName,
            status: 'skipped',
            error: 'No messages found for the time period'
          });
          continue;
        }

        // Convert to MessageData format
        const messageData: MessageData[] = messages.map(msg => ({
          id: (msg as any)._id.toString(),
          message: (msg as any).body || '',
          timestamp: new Date((msg as any).timestamp),
          type: 'text', // Default to text type for schedule summaries
          senderName: ((msg as any).contactId as any)?.name || (msg as any).from || 'Unknown',
          senderPhone: (msg as any).from
        }));

        // Generate summary using the same service as the controller
        const summaryData = await this.summarizationService.generateGroupSummary(
          target.groupId,
          target.groupName,
          messageData,
          {
            start: new Date(executionWindow.startUtc),
            end: new Date(executionWindow.endUtc),
            label: `Automated ${executionStartedAt.toDateString()}`,
            type: 'custom'
          },
          {
            ...summaryOptions,
            timezone,
            targetLanguage: 'auto',
            speakerAttribution: true,
            maxSpeakerAttributions: 5
          }
        );

        // Save summary to database
        const summaryDoc = new WhatsAppGroupSummary({
          userId: schedule.userId,
          groupId: target.groupId,
          groupName: target.groupName,
          date: executionWindow.startUtc.split('T')[0],
          summaryData,
          scheduleId: schedule._id,
          generatedAt: executionStartedAt
        });

        const savedSummary = await summaryDoc.save();
        const summaryObjectId = savedSummary._id as mongoose.Types.ObjectId;
        summaryIds.push(summaryObjectId);

        groupResults.push({
          groupId: target.groupId,
          groupName: target.groupName,
          summaryId: summaryObjectId,
          status: 'success'
        });

        console.log('[WhatsApp Summary Schedule] Group summary succeeded', {
          scheduleId: schedule._id,
          groupId: target.groupId,
          summaryId: savedSummary._id,
          messageCount: messageData.length
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;

        console.error('[WhatsApp Summary Schedule] Group summary failed', {
          scheduleId: schedule._id,
          groupId: target.groupId,
          groupName: target.groupName,
          error: message,
          stack
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


