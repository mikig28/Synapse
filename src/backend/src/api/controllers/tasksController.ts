import { Request, Response } from 'express';
import Task, { ITask } from '../../models/Task';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';
import { sendTaskReminderToUser } from '../../services/taskReminderService';

export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const tasks = await Task.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks', error: (error as Error).message });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const { title, description, status, priority, dueDate, reminderEnabled, source, telegramMessageId, location } = req.body;
    const newTask = new Task({
      userId: new mongoose.Types.ObjectId(userId),
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      reminderEnabled: reminderEnabled || false,
      source,
      location,
      ...(telegramMessageId && mongoose.Types.ObjectId.isValid(telegramMessageId) && { telegramMessageId: new mongoose.Types.ObjectId(telegramMessageId) }),
    });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task', error: (error as Error).message });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    const { title, description, status, priority, dueDate, reminderEnabled, location } = req.body;
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, userId: new mongoose.Types.ObjectId(userId) },
      { 
        title, 
        description, 
        status, 
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        reminderEnabled,
        location
      },
      { new: true, runValidators: true }
    );
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found or user not authorized' });
    }
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task', error: (error as Error).message });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    const result = await Task.deleteOne({ _id: taskId, userId: new mongoose.Types.ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Task not found or user not authorized' });
    }
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task', error: (error as Error).message });
  }
};

export const sendTaskReminder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await sendTaskReminderToUser(userId);
    res.status(200).json({ message: 'Task reminder sent successfully' });
  } catch (error) {
    console.error('Error sending task reminder:', error);
    res.status(500).json({ message: 'Failed to send task reminder', error: (error as Error).message });
  }
};

export const geotagTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    if (!location || !location.type || !Array.isArray(location.coordinates)) {
      return res.status(400).json({ error: 'Invalid location format. Expected GeoJSON Point.' });
    }

    if (location.type !== 'Point' || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Location must be a GeoJSON Point with [longitude, latitude]' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      { location },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found or user not authorized' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error geotagging task:', error);
    res.status(500).json({ error: 'Failed to geotag task', message: (error as Error).message });
  }
};

export const getNearbyTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lat, lng, radius = 1000 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const searchRadius = parseInt(radius as string);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
      return res.status(400).json({ error: 'lat, lng, and radius must be valid numbers' });
    }

    const tasks = await Task.find({
      userId: new mongoose.Types.ObjectId(userId),
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: searchRadius
        }
      }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching nearby tasks:', error);
    res.status(500).json({ error: 'Failed to fetch nearby tasks', message: (error as Error).message });
  }
}; 