"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyTasks = exports.geotagTask = exports.sendTaskReminder = exports.deleteTask = exports.updateTask = exports.createTask = exports.getTasks = void 0;
const Task_1 = __importDefault(require("../../models/Task"));
const mongoose_1 = __importDefault(require("mongoose"));
const taskReminderService_1 = require("../../services/taskReminderService");
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
        const { title, description, status, priority, dueDate, reminderEnabled, source, telegramMessageId, location } = req.body;
        const newTask = new Task_1.default({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title,
            description,
            status: status || 'pending',
            priority: priority || 'medium',
            dueDate: dueDate ? new Date(dueDate) : undefined,
            reminderEnabled: reminderEnabled || false,
            source,
            location,
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
        const { title, description, status, priority, dueDate, reminderEnabled, location } = req.body;
        const updatedTask = await Task_1.default.findOneAndUpdate({ _id: taskId, userId: new mongoose_1.default.Types.ObjectId(userId) }, {
            title,
            description,
            status,
            priority,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            reminderEnabled,
            location
        }, { new: true, runValidators: true });
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
const sendTaskReminder = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        await (0, taskReminderService_1.sendTaskReminderToUser)(userId);
        res.status(200).json({ message: 'Task reminder sent successfully' });
    }
    catch (error) {
        console.error('Error sending task reminder:', error);
        res.status(500).json({ message: 'Failed to send task reminder', error: error.message });
    }
};
exports.sendTaskReminder = sendTaskReminder;
const geotagTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { location } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid task ID' });
        }
        if (!location || !location.type || !Array.isArray(location.coordinates)) {
            return res.status(400).json({ error: 'Invalid location format. Expected GeoJSON Point.' });
        }
        if (location.type !== 'Point' || location.coordinates.length !== 2) {
            return res.status(400).json({ error: 'Location must be a GeoJSON Point with [longitude, latitude]' });
        }
        const task = await Task_1.default.findOneAndUpdate({ _id: id, userId: new mongoose_1.default.Types.ObjectId(userId) }, { location }, { new: true });
        if (!task) {
            return res.status(404).json({ error: 'Task not found or user not authorized' });
        }
        res.json(task);
    }
    catch (error) {
        console.error('Error geotagging task:', error);
        res.status(500).json({ error: 'Failed to geotag task', message: error.message });
    }
};
exports.geotagTask = geotagTask;
const getNearbyTasks = async (req, res) => {
    try {
        const { lat, lng, radius = 1000 } = req.query;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng query parameters are required' });
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const searchRadius = parseInt(radius);
        if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
            return res.status(400).json({ error: 'lat, lng, and radius must be valid numbers' });
        }
        const tasks = await Task_1.default.find({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                    $maxDistance: searchRadius
                }
            }
        });
        res.json(tasks);
    }
    catch (error) {
        console.error('Error fetching nearby tasks:', error);
        res.status(500).json({ error: 'Failed to fetch nearby tasks', message: error.message });
    }
};
exports.getNearbyTasks = getNearbyTasks;
