import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { reminderService } from '../../services/reminderService';
import { CreateReminderDto, UpdateReminderDto, ReminderQueryFilters } from '../../types/reminder.types';

/**
 * Create a new reminder
 * POST /api/v1/reminders
 */
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id; // From auth middleware

    const createData: CreateReminderDto = {
      userId: new mongoose.Types.ObjectId(userId),
      bookmarkId: new mongoose.Types.ObjectId(req.body.bookmarkId),
      scheduledFor: new Date(req.body.scheduledFor),
      reminderMessage: req.body.reminderMessage,
      telegramChatId: req.body.telegramChatId,
      extractedTags: req.body.extractedTags,
      extractedNotes: req.body.extractedNotes,
      priority: req.body.priority,
      temporalExpression: req.body.temporalExpression
    };

    const reminder = await reminderService.createReminder(createData);

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Reminder created successfully'
    });
  } catch (error: any) {
    console.error('[RemindersController] Error creating reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create reminder'
    });
  }
};

/**
 * Get reminder by ID
 * GET /api/v1/reminders/:id
 */
export const getReminderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const reminder = await reminderService.getReminderById(id);

    if (!reminder) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
      return;
    }

    // Verify ownership
    if (reminder.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    console.error('[RemindersController] Error getting reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve reminder'
    });
  }
};

/**
 * Get reminders with filters
 * GET /api/v1/reminders
 */
export const getReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const filters: ReminderQueryFilters = {
      userId: new mongoose.Types.ObjectId(userId),
      status: req.query.status as any,
      priority: req.query.priority as any,
      scheduledAfter: req.query.scheduledAfter ? new Date(req.query.scheduledAfter as string) : undefined,
      scheduledBefore: req.query.scheduledBefore ? new Date(req.query.scheduledBefore as string) : undefined,
      bookmarkId: req.query.bookmarkId ? new mongoose.Types.ObjectId(req.query.bookmarkId as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip as string) : undefined
    };

    const reminders = await reminderService.getReminders(filters);

    res.status(200).json({
      success: true,
      data: reminders,
      count: reminders.length
    });
  } catch (error: any) {
    console.error('[RemindersController] Error getting reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve reminders'
    });
  }
};

/**
 * Get pending reminders for authenticated user
 * GET /api/v1/reminders/pending
 */
export const getPendingReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const reminders = await reminderService.getPendingRemindersByUser(
      new mongoose.Types.ObjectId(userId),
      limit
    );

    res.status(200).json({
      success: true,
      data: reminders,
      count: reminders.length
    });
  } catch (error: any) {
    console.error('[RemindersController] Error getting pending reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve pending reminders'
    });
  }
};

/**
 * Update reminder
 * PUT /api/v1/reminders/:id
 */
export const updateReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify ownership
    const existingReminder = await reminderService.getReminderById(id);
    if (!existingReminder) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
      return;
    }

    if (existingReminder.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const updateData: UpdateReminderDto = {
      scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
      reminderMessage: req.body.reminderMessage,
      status: req.body.status,
      priority: req.body.priority,
      extractedTags: req.body.extractedTags,
      extractedNotes: req.body.extractedNotes
    };

    const updatedReminder = await reminderService.updateReminder(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedReminder,
      message: 'Reminder updated successfully'
    });
  } catch (error: any) {
    console.error('[RemindersController] Error updating reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update reminder'
    });
  }
};

/**
 * Cancel reminder
 * POST /api/v1/reminders/:id/cancel
 */
export const cancelReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify ownership
    const existingReminder = await reminderService.getReminderById(id);
    if (!existingReminder) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
      return;
    }

    if (existingReminder.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const cancelledReminder = await reminderService.cancelReminder(id);

    res.status(200).json({
      success: true,
      data: cancelledReminder,
      message: 'Reminder cancelled successfully'
    });
  } catch (error: any) {
    console.error('[RemindersController] Error cancelling reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel reminder'
    });
  }
};

/**
 * Snooze reminder
 * POST /api/v1/reminders/:id/snooze
 */
export const snoozeReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { durationMinutes } = req.body;

    if (!durationMinutes || durationMinutes <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid snooze duration'
      });
      return;
    }

    // Verify ownership
    const existingReminder = await reminderService.getReminderById(id);
    if (!existingReminder) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
      return;
    }

    if (existingReminder.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    const snoozedReminder = await reminderService.snoozeReminder(id, durationMinutes);

    res.status(200).json({
      success: true,
      data: snoozedReminder,
      message: `Reminder snoozed for ${durationMinutes} minutes`
    });
  } catch (error: any) {
    console.error('[RemindersController] Error snoozing reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to snooze reminder'
    });
  }
};

/**
 * Delete reminder
 * DELETE /api/v1/reminders/:id
 */
export const deleteReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify ownership
    const existingReminder = await reminderService.getReminderById(id);
    if (!existingReminder) {
      res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
      return;
    }

    if (existingReminder.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    await reminderService.deleteReminder(id);

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error: any) {
    console.error('[RemindersController] Error deleting reminder:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete reminder'
    });
  }
};

/**
 * Get reminder statistics for user
 * GET /api/v1/reminders/stats
 */
export const getReminderStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    const stats = await reminderService.getReminderStats(
      new mongoose.Types.ObjectId(userId)
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('[RemindersController] Error getting reminder stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve reminder statistics'
    });
  }
};
