import { Request, Response } from 'express';
import Task, { ITask } from '../../models/Task';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';

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
    const { title, description, status, priority, source, telegramMessageId } = req.body;
    const newTask = new Task({
      userId: new mongoose.Types.ObjectId(userId),
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      source,
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
    const { title, description, status, priority } = req.body;
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, userId: new mongoose.Types.ObjectId(userId) },
      { title, description, status, priority },
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