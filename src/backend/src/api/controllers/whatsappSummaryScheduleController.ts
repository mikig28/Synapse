import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import WhatsAppSummarySchedule from '../../models/WhatsAppSummarySchedule';
import { whatsappSummaryScheduleService } from '../../services/whatsappSummaryScheduleService';
import { ApiResponse } from '../../types/whatsappSummary';

const DAILY_FREQUENCY = 'daily';

const validateTime = (time: string): boolean => /^\d{2}:\d{2}$/.test(time);

const normalizeTargetGroups = (groups: any[]): { groupId: string; groupName: string }[] => {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups
    .map(group => {
      const rawId = group?.groupId ?? group?.id;
      const rawName = group?.groupName ?? group?.name;
      const groupId = typeof rawId === 'string' ? rawId.trim() : '';
      const groupName = typeof rawName === 'string' ? rawName.trim() : '';
      return { groupId, groupName };
    })
    .filter(group => group.groupId.length > 0 && group.groupName.length > 0);
};

export const getSchedules = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const schedules = await WhatsAppSummarySchedule.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: schedules
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to fetch schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WhatsApp summary schedules'
    } as ApiResponse);
  }
};

export const createSchedule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const {
      name,
      description,
      frequency = DAILY_FREQUENCY,
      runAt,
      timezone,
      targetGroups,
      summaryOptions,
      includeAIInsights = true,
      maxRetries = 3
    } = req.body || {};

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Schedule name is required' });
      return;
    }

    if (!runAt || typeof runAt !== 'string' || !validateTime(runAt)) {
      res.status(400).json({ success: false, error: 'runAt must be in HH:mm format' });
      return;
    }

    if (!timezone || typeof timezone !== 'string') {
      res.status(400).json({ success: false, error: 'Timezone is required' });
      return;
    }

    if (frequency !== DAILY_FREQUENCY) {
      res.status(400).json({ success: false, error: 'Only daily frequency is supported at this time' });
      return;
    }

    const normalizedGroups = normalizeTargetGroups(targetGroups);
    if (normalizedGroups.length === 0) {
      res.status(400).json({ success: false, error: 'At least one target group must be provided' });
      return;
    }

    const nextExecutionAt = whatsappSummaryScheduleService.calculateNextExecution({
      runAt,
      timezone,
      frequency
    });

    const schedule = await WhatsAppSummarySchedule.create({
      userId,
      name,
      description,
      frequency,
      runAt,
      timezone,
      targetGroups: normalizedGroups,
      summaryOptions: summaryOptions && typeof summaryOptions === 'object' ? summaryOptions : {},
      includeAIInsights,
      status: 'active',
      nextExecutionAt,
      maxRetries,
      history: []
    });

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'WhatsApp summary schedule created'
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to create schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create WhatsApp summary schedule'
    } as ApiResponse);
  }
};

export const updateSchedule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid schedule id' });
      return;
    }

    const schedule = await WhatsAppSummarySchedule.findOne({ _id: id, userId });
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (req.body.name && typeof req.body.name === 'string') {
      updates.name = req.body.name;
    }

    if (req.body.description === null || typeof req.body.description === 'string') {
      updates.description = req.body.description;
    }

    if (req.body.includeAIInsights !== undefined) {
      updates.includeAIInsights = Boolean(req.body.includeAIInsights);
    }

    if (typeof req.body.maxRetries === 'number' && req.body.maxRetries >= 0) {
      updates.maxRetries = req.body.maxRetries;
    }

    let shouldRecalculateNextExecution = false;

    if (req.body.runAt) {
      if (typeof req.body.runAt !== 'string' || !validateTime(req.body.runAt)) {
        res.status(400).json({ success: false, error: 'runAt must be in HH:mm format' });
        return;
      }
      updates.runAt = req.body.runAt;
      shouldRecalculateNextExecution = true;
    }

    if (req.body.timezone) {
      if (typeof req.body.timezone !== 'string') {
        res.status(400).json({ success: false, error: 'Timezone must be a string' });
        return;
      }
      updates.timezone = req.body.timezone;
      shouldRecalculateNextExecution = true;
    }

    if (req.body.targetGroups) {
      const normalizedGroups = normalizeTargetGroups(req.body.targetGroups);
      if (normalizedGroups.length === 0) {
        res.status(400).json({ success: false, error: 'At least one target group must be provided' });
        return;
      }
      updates.targetGroups = normalizedGroups;
    }

    if (req.body.summaryOptions && typeof req.body.summaryOptions === 'object') {
      updates.summaryOptions = req.body.summaryOptions;
    }

    if (shouldRecalculateNextExecution) {
      const nextExecutionAt = whatsappSummaryScheduleService.calculateNextExecution({
        runAt: (updates.runAt as string) || schedule.runAt,
        timezone: (updates.timezone as string) || schedule.timezone,
        frequency: schedule.frequency
      });
      updates.nextExecutionAt = nextExecutionAt;
    }

    Object.assign(schedule, updates);
    await schedule.save();

    res.json({
      success: true,
      data: schedule,
      message: 'Schedule updated'
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to update schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update WhatsApp summary schedule'
    } as ApiResponse);
  }
};

export const toggleSchedule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid schedule id' });
      return;
    }

    const schedule = await WhatsAppSummarySchedule.findOne({ _id: id, userId });
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    const newStatus = schedule.status === 'active' ? 'paused' : 'active';
    schedule.status = newStatus;

    if (newStatus === 'active') {
      schedule.nextExecutionAt = whatsappSummaryScheduleService.calculateNextExecution({
        runAt: schedule.runAt,
        timezone: schedule.timezone,
        frequency: schedule.frequency
      });
      schedule.consecutiveFailures = 0;
    }

    await schedule.save();

    res.json({
      success: true,
      data: schedule,
      message: `Schedule ${newStatus === 'active' ? 'activated' : 'paused'}`
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to toggle schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle WhatsApp summary schedule'
    } as ApiResponse);
  }
};

export const deleteSchedule = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid schedule id' });
      return;
    }

    const schedule = await WhatsAppSummarySchedule.findOneAndDelete({ _id: id, userId });
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Schedule deleted'
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to delete schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete WhatsApp summary schedule'
    } as ApiResponse);
  }
};

export const runScheduleNow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid schedule id' });
      return;
    }

    const schedule = await WhatsAppSummarySchedule.findOne({ _id: id, userId });
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    // Check if custom time range is provided
    const { startTime, endTime } = req.body || {};
    let execution;

    if (startTime && endTime) {
      console.log(`[WhatsApp Summary Schedule] Running with custom time range: ${startTime} to ${endTime}`);
      execution = await whatsappSummaryScheduleService.executeScheduleByIdWithTimeRange(id, {
        startTime,
        endTime
      });
    } else {
      console.log(`[WhatsApp Summary Schedule] Running with default time range`);
      execution = await whatsappSummaryScheduleService.executeScheduleById(id);
    }

    res.json({
      success: true,
      data: execution,
      message: startTime && endTime ? 'Schedule executed with custom time range' : 'Schedule executed'
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to execute schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute WhatsApp summary schedule'
    } as ApiResponse);
  }
};

export const getScheduleHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, error: 'Invalid schedule id' });
      return;
    }

    const schedule = await WhatsAppSummarySchedule.findOne({ _id: id, userId }).lean();
    if (!schedule) {
      res.status(404).json({ success: false, error: 'Schedule not found' });
      return;
    }

    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '10'), 10)));
    const history = Array.isArray(schedule.history) ? schedule.history.slice(0, limit) : [];

    res.json({
      success: true,
      data: history
    } as ApiResponse);
  } catch (error) {
    console.error('[WhatsApp Summary Schedule] Failed to fetch schedule history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WhatsApp summary schedule history'
    } as ApiResponse);
  }
};

