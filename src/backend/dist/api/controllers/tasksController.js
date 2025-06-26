"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const mongoose_1 = __importDefault(require("mongoose"));
const getTasks = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const tasks = await Task_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json(tasks);
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
};
exports.getTasks = getTasks;
const createTask = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { title, description, status, priority, source, telegramMessageId } = req.body;
        const newTask = new Task_1.default({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title,
            description,
            status: status || 'pending',
            priority: priority || 'medium',
            source,
            ...(telegramMessageId && mongoose_1.default.Types.ObjectId.isValid(telegramMessageId) && { telegramMessageId: new mongoose_1.default.Types.ObjectId(telegramMessageId) }),
        });
        await newTask.save();
        res.status(201).json(newTask);
    }
    catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ message: 'Failed to create task', error: error.message });
    }
};
exports.createTask = createTask;
const updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: 'Invalid task ID' });
        }
        const { title, description, status, priority } = req.body;
        const updatedTask = await Task_1.default.findOneAndUpdate({ _id: taskId, userId: new mongoose_1.default.Types.ObjectId(userId) }, { title, description, status, priority }, { new: true, runValidators: true });
        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found or user not authorized' });
        }
        res.status(200).json(updatedTask);
    }
    catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Failed to update task', error: error.message });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: 'Invalid task ID' });
        }
        const result = await Task_1.default.deleteOne({ _id: taskId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Task not found or user not authorized' });
        }
        res.status(200).json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Failed to delete task', error: error.message });
    }
};
exports.deleteTask = deleteTask;
