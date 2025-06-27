"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIdea = exports.createIdea = exports.getIdeas = void 0;
const Idea_1 = __importDefault(require("../../models/Idea"));
const mongoose_1 = __importDefault(require("mongoose"));
const getIdeas = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'User not authenticated' });
        const ideas = await Idea_1.default.find({ userId: new mongoose_1.default.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .lean();
        res.json(ideas);
    }
    catch (error) {
        console.error('Error fetching ideas:', error);
        res.status(500).json({ message: 'Failed to fetch ideas', error: error.message });
    }
};
exports.getIdeas = getIdeas;
const createIdea = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'User not authenticated' });
        const { content, source, telegramMessageId } = req.body;
        const newIdea = new Idea_1.default({
            userId: new mongoose_1.default.Types.ObjectId(userId),
            content,
            source,
            ...(telegramMessageId && mongoose_1.default.Types.ObjectId.isValid(telegramMessageId) && { telegramMessageId: new mongoose_1.default.Types.ObjectId(telegramMessageId) }),
        });
        await newIdea.save();
        res.status(201).json(newIdea);
    }
    catch (error) {
        console.error('Error creating idea:', error);
        res.status(500).json({ message: 'Failed to create idea', error: error.message });
    }
};
exports.createIdea = createIdea;
const deleteIdea = async (req, res) => {
    try {
        const ideaId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(ideaId)) {
            return res.status(400).json({ message: 'Invalid idea ID' });
        }
        const result = await Idea_1.default.deleteOne({ _id: ideaId, userId: new mongoose_1.default.Types.ObjectId(userId) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Idea not found or user not authorized' });
        }
        res.status(200).json({ message: 'Idea deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting idea:', error);
        res.status(500).json({ message: 'Failed to delete idea', error: error.message });
    }
};
exports.deleteIdea = deleteIdea;
