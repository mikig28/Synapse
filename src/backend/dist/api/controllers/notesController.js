"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearbyNotes = exports.geotagNote = exports.updateNote = exports.deleteNote = exports.createNote = exports.getNotes = void 0;
const Note_1 = __importDefault(require("../../models/Note"));
const mongoose_1 = __importDefault(require("mongoose"));
const getNotes = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'User not authenticated' });
        const notes = await Note_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .lean();
        res.json(notes);
    }
    catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Failed to fetch notes', error: error.message });
    }
};
exports.getNotes = getNotes;
const createNote = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'User not authenticated' });
        const { title, content, source, telegramMessageId, location } = req.body;
        const newNote = new Note_1.default({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            title,
            content,
            source,
            location,
            ...(telegramMessageId && mongoose_1.default.Types.ObjectId.isValid(telegramMessageId) && { telegramMessageId: new mongoose_1.default.Types.ObjectId(telegramMessageId) }),
        });
        await newNote.save();
        res.status(201).json(newNote);
    }
    catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ message: 'Failed to create note', error: error.message });
    }
};
exports.createNote = createNote;
const deleteNote = async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ message: 'Invalid note ID' });
        }
        const result = await Note_1.default.deleteOne({ _id: noteId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Note not found or user not authorized' });
        }
        res.status(200).json({ message: 'Note deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Failed to delete note', error: error.message });
    }
};
exports.deleteNote = deleteNote;
const updateNote = async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.user?.id;
        const { title, content, source, location } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ message: 'Invalid note ID' });
        }
        const note = await Note_1.default.findOne({ _id: noteId, userId: new mongoose_1.default.Types.ObjectId(userId) });
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
    }
    catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ message: 'Failed to update note', error: error.message });
    }
};
exports.updateNote = updateNote;
const geotagNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { location } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid note ID' });
        }
        if (!location || !location.type || !Array.isArray(location.coordinates)) {
            return res.status(400).json({ error: 'Invalid location format. Expected GeoJSON Point.' });
        }
        if (location.type !== 'Point' || location.coordinates.length !== 2) {
            return res.status(400).json({ error: 'Location must be a GeoJSON Point with [longitude, latitude]' });
        }
        const note = await Note_1.default.findOneAndUpdate({ _id: id, userId: new mongoose_1.default.Types.ObjectId(userId) }, { location }, { new: true });
        if (!note) {
            return res.status(404).json({ error: 'Note not found or user not authorized' });
        }
        res.json(note);
    }
    catch (error) {
        console.error('Error geotagging note:', error);
        res.status(500).json({ error: 'Failed to geotag note', message: error.message });
    }
};
exports.geotagNote = geotagNote;
const getNearbyNotes = async (req, res) => {
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
        const notes = await Note_1.default.find({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                    $maxDistance: searchRadius
                }
            }
        });
        res.json(notes);
    }
    catch (error) {
        console.error('Error fetching nearby notes:', error);
        res.status(500).json({ error: 'Failed to fetch nearby notes', message: error.message });
    }
};
exports.getNearbyNotes = getNearbyNotes;
