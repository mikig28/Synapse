"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTaskReminderToUser = sendTaskReminderToUser;
exports.sendDailyTaskReminders = sendDailyTaskReminders;
exports.initializeTaskReminderScheduler = initializeTaskReminderScheduler;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const Task_1 = __importDefault(require("../models/Task"));
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined. Task reminder service cannot start.');
}
const bot = new node_telegram_bot_api_1.default(TELEGRAM_BOT_TOKEN);
/**
 * Get tasks that need reminders for a specific user
 */
async function getTasksForReminder(userId, options = {}) {
    const { includeOverdue = true, includeDueToday = true, includePendingNoDate = true } = options;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const query = {
        userId,
        reminderEnabled: true,
        status: { $in: ['pending', 'in-progress'] }
    };
    const orConditions = [];
    // Include overdue tasks
    if (includeOverdue) {
        orConditions.push({
            dueDate: { $lt: today }
        });
    }
    // Include tasks due today
    if (includeDueToday) {
        orConditions.push({
            dueDate: { $gte: today, $lt: tomorrow }
        });
    }
    // Include pending tasks without due date
    if (includePendingNoDate) {
        orConditions.push({
            dueDate: { $exists: false }
        });
    }
    if (orConditions.length > 0) {
        query.$or = orConditions;
    }
    return await Task_1.default.find(query).sort({ priority: -1, createdAt: 1 }).lean();
}
/**
 * Format tasks for Telegram message
 */
function formatTasksMessage(tasks) {
    if (tasks.length === 0) {
        return '✅ No tasks with reminders for today!';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let message = '📋 *Tasks you should complete today:*\n\n';
    const overdueTasks = tasks.filter(task => task.dueDate && new Date(task.dueDate) < today);
    const todayTasks = tasks.filter(task => {
        if (!task.dueDate)
            return false;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
    });
    const noDueDateTasks = tasks.filter(task => !task.dueDate);
    // Overdue tasks
    if (overdueTasks.length > 0) {
        message += '🔴 *Overdue:*\n';
        overdueTasks.forEach((task, index) => {
            const priorityIcon = task.priority === 'high' ? '🔥' : task.priority === 'medium' ? '⚡' : '📌';
            message += `${priorityIcon} ${task.title}\n`;
        });
        message += '\n';
    }
    // Due today
    if (todayTasks.length > 0) {
        message += '🟡 *Due Today:*\n';
        todayTasks.forEach((task, index) => {
            const priorityIcon = task.priority === 'high' ? '🔥' : task.priority === 'medium' ? '⚡' : '📌';
            message += `${priorityIcon} ${task.title}\n`;
        });
        message += '\n';
    }
    // No due date but reminders enabled
    if (noDueDateTasks.length > 0) {
        message += '📝 *Pending Tasks:*\n';
        noDueDateTasks.slice(0, 5).forEach((task, index) => {
            const priorityIcon = task.priority === 'high' ? '🔥' : task.priority === 'medium' ? '⚡' : '📌';
            message += `${priorityIcon} ${task.title}\n`;
        });
        if (noDueDateTasks.length > 5) {
            message += `... and ${noDueDateTasks.length - 5} more tasks\n`;
        }
    }
    message += '\n💪 Have a productive day!';
    return message;
}
/**
 * Send task reminder to a user's Telegram chats
 */
async function sendTaskReminderToUser(userId, options) {
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            console.error(`[TaskReminder]: User not found: ${userId}`);
            return;
        }
        if (!user.monitoredTelegramChats || user.monitoredTelegramChats.length === 0) {
            console.log(`[TaskReminder]: User ${userId} has no monitored Telegram chats`);
            return;
        }
        const tasks = await getTasksForReminder(new mongoose_1.default.Types.ObjectId(userId), options);
        const message = formatTasksMessage(tasks);
        // Send to all monitored chats
        for (const chatId of user.monitoredTelegramChats) {
            try {
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                console.log(`[TaskReminder]: Reminder sent to chat ${chatId} for user ${userId}`);
            }
            catch (error) {
                console.error(`[TaskReminder]: Failed to send to chat ${chatId}:`, error);
            }
        }
    }
    catch (error) {
        console.error('[TaskReminder]: Error sending task reminder:', error);
    }
}
/**
 * Send task reminders to all users with reminder-enabled tasks
 */
async function sendDailyTaskReminders() {
    try {
        console.log('[TaskReminder]: Starting daily task reminder process...');
        // Find all users who have tasks with reminders enabled
        const usersWithReminders = await Task_1.default.distinct('userId', {
            reminderEnabled: true,
            status: { $in: ['pending', 'in-progress'] }
        });
        console.log(`[TaskReminder]: Found ${usersWithReminders.length} users with reminder-enabled tasks`);
        for (const userId of usersWithReminders) {
            await sendTaskReminderToUser(userId.toString());
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('[TaskReminder]: Daily task reminder process completed');
    }
    catch (error) {
        console.error('[TaskReminder]: Error in daily task reminder process:', error);
    }
}
/**
 * Schedule daily task reminders
 * This function should be called when the server starts
 */
function initializeTaskReminderScheduler() {
    // Send reminders every day at 9:00 AM
    const scheduleTime = process.env.TASK_REMINDER_TIME || '09:00';
    const [hour, minute] = scheduleTime.split(':').map(Number);
    console.log(`[TaskReminder]: Initializing daily task reminders at ${scheduleTime}`);
    // Calculate milliseconds until next 9 AM
    function getTimeUntilNextReminder() {
        const now = new Date();
        const nextReminder = new Date();
        nextReminder.setHours(hour, minute, 0, 0);
        // If it's already past 9 AM today, schedule for tomorrow
        if (now > nextReminder) {
            nextReminder.setDate(nextReminder.getDate() + 1);
        }
        return nextReminder.getTime() - now.getTime();
    }
    // Initial timeout to first reminder
    setTimeout(() => {
        sendDailyTaskReminders();
        // Then schedule to repeat every 24 hours
        setInterval(() => {
            sendDailyTaskReminders();
        }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }, getTimeUntilNextReminder());
    console.log(`[TaskReminder]: Next reminder scheduled for ${new Date(Date.now() + getTimeUntilNextReminder())}`);
}
