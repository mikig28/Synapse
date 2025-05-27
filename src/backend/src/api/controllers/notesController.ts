import { Request, Response } from 'express';
import Note, { INote } from '../../models/Note';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../types/express';

export const getNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
    const notes = await Note.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Failed to fetch notes', error: (error as Error).message });
  }
};

export const createNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });
    const { content, source, telegramMessageId } = req.body;
    const newNote = new Note({
      userId: new mongoose.Types.ObjectId(userId),
      content,
      source,
      ...(telegramMessageId && mongoose.Types.ObjectId.isValid(telegramMessageId) && { telegramMessageId: new mongoose.Types.ObjectId(telegramMessageId) }),
    });
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Failed to create note', error: (error as Error).message });
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }
    const result = await Note.deleteOne({ _id: noteId, userId: new mongoose.Types.ObjectId(userId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Note not found or user not authorized' });
    }
    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Failed to delete note', error: (error as Error).message });
  }
}; 