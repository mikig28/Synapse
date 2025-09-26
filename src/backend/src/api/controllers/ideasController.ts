import { Response } from 'express';
import Idea, { IIdea } from '../../models/Idea';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';

export const getIdeas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
    const ideas = await Idea.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    res.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ message: 'Failed to fetch ideas', error: (error as Error).message });
  }
};

export const createIdea = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
    const { content, source, telegramMessageId } = req.body;
    const newIdea = new Idea({
      userId: new mongoose.Types.ObjectId(userId),
      content,
      source,
      ...(telegramMessageId && mongoose.Types.ObjectId.isValid(telegramMessageId) && { telegramMessageId: new mongoose.Types.ObjectId(telegramMessageId) }),
    });
    await newIdea.save();
    res.status(201).json(newIdea);
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ message: 'Failed to create idea', error: (error as Error).message });
  }
};

export const deleteIdea = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      return res.status(400).json({ message: 'Invalid idea ID' });
    }
    const result = await Idea.deleteOne({ _id: ideaId, userId: new mongoose.Types.ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Idea not found or user not authorized' });
    }
    res.status(200).json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ message: 'Failed to delete idea', error: (error as Error).message });
  }
}; 