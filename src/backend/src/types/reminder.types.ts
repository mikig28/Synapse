import mongoose from 'mongoose';
import { ReminderStatus, ReminderPriority } from '../models/Reminder';

// Voice memo analysis result
export interface VoiceMemoAnalysisResult {
  hasReminder: boolean;
  reminderTime?: Date;
  reminderMessage?: string;
  tags: string[];
  notes?: string;
  priority: ReminderPriority;
  temporalExpression?: string;
  confidence: number; // 0-1 score of analysis confidence
  language: 'en' | 'he' | 'unknown';
}

// Create reminder DTO
export interface CreateReminderDto {
  userId: mongoose.Types.ObjectId;
  bookmarkId?: mongoose.Types.ObjectId; // Optional - not required for voice-only reminders
  scheduledFor: Date;
  reminderMessage: string;
  telegramChatId?: number; // Optional - only for Telegram reminders
  whatsappChatId?: string; // Optional - only for WhatsApp reminders
  extractedTags?: string[];
  extractedNotes?: string;
  priority?: ReminderPriority;
  temporalExpression?: string;
}

// Update reminder DTO
export interface UpdateReminderDto {
  scheduledFor?: Date;
  reminderMessage?: string;
  status?: ReminderStatus;
  priority?: ReminderPriority;
  extractedTags?: string[];
  extractedNotes?: string;
}

// Reminder query filters
export interface ReminderQueryFilters {
  userId?: mongoose.Types.ObjectId;
  bookmarkId?: mongoose.Types.ObjectId;
  status?: ReminderStatus | ReminderStatus[];
  priority?: ReminderPriority | ReminderPriority[];
  scheduledBefore?: Date;
  scheduledAfter?: Date;
  limit?: number;
  skip?: number;
}

// Reminder notification result
export interface ReminderNotificationResult {
  success: boolean;
  reminderId: mongoose.Types.ObjectId;
  error?: string;
  sentAt?: Date;
}

// Temporal parsing result from chrono-node
export interface TemporalParseResult {
  found: boolean;
  parsedDate?: Date;
  originalText: string;
  confidence: number;
  index?: number; // Position in text where temporal expression was found
}

export interface BookmarkAnalysisMetadata {
  tags: string[];
  notes?: string;
  priority: ReminderPriority;
  hasReminder: boolean;
}
