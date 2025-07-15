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
    const { title, content, source, telegramMessageId, location } = req.body;
    const newNote = new Note({
      userId: new mongoose.Types.ObjectId(userId),
      title,
      content,
      source,
      location,
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

export const updateNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const noteId = req.params.id;
    const userId = req.user?.id;
    const { title, content, source, location } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findOne({ _id: noteId, userId: new mongoose.Types.ObjectId(userId) });

    if (!note) {
      return res.status(404).json({ message: 'Note not found or user not authorized' });
    }

    // Update fields if they are provided in the request body
    if (title !== undefined) {
      note.title = title;
    }
    if (content !== undefined) {
      note.content = content;
    }
    if (source !== undefined) {
      note.source = source;
    }
    if (location !== undefined) {
      note.location = location;
    }

    const updatedNote = await note.save();
    res.status(200).json(updatedNote);

  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Failed to update note', error: (error as Error).message });
  }
};

export const geotagNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }

    if (!location || !location.type || !Array.isArray(location.coordinates)) {
      return res.status(400).json({ error: 'Invalid location format. Expected GeoJSON Point.' });
    }

    if (location.type !== 'Point' || location.coordinates.length !== 2) {
      return res.status(400).json({ error: 'Location must be a GeoJSON Point with [longitude, latitude]' });
    }

    const note = await Note.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      { location },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found or user not authorized' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error geotagging note:', error);
    res.status(500).json({ error: 'Failed to geotag note', message: (error as Error).message });
  }
};

export const getNearbyNotes = async (req: AuthenticatedRequest, res: Response) => {
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

    const notes = await Note.find({
      userId: new mongoose.Types.ObjectId(userId),
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: searchRadius
        }
      }
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching nearby notes:', error);
    res.status(500).json({ error: 'Failed to fetch nearby notes', message: (error as Error).message });
  }
}; 