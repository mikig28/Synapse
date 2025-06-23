"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAudio = exports.getMeetingStats = exports.reprocessMeeting = exports.deleteMeeting = exports.updateMeeting = exports.processTranscription = exports.createMeeting = exports.getMeeting = exports.getMeetings = void 0;
const Meeting_1 = __importDefault(require("../../models/Meeting"));
const transcriptionService_1 = require("../../services/transcriptionService");
const meetingAnalysisService_1 = require("../../services/meetingAnalysisService");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer")); // TODO: Configure multer
// TODO: Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, '../../../public/uploads/meeting_audio');
        // Ensure the directory exists
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({ storage: storage }); // TODO: Add file filter if needed
// Get all meetings for the authenticated user
const getMeetings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const { status, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const filter = { userId };
        if (status && typeof status === 'string') {
            filter.status = status;
        }
        const meetings = await Meeting_1.default.find(filter)
            .sort({ meetingDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Meeting_1.default.countDocuments(filter);
        res.json({
            meetings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('[MeetingsController]: Error fetching meetings:', error);
        res.status(500).json({ message: 'Failed to fetch meetings' });
    }
};
exports.getMeetings = getMeetings;
// Get a specific meeting by ID
const getMeeting = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const meeting = await Meeting_1.default.findOne({ _id: id, userId }).lean();
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        res.json(meeting);
    }
    catch (error) {
        console.error('[MeetingsController]: Error fetching meeting:', error);
        res.status(500).json({ message: 'Failed to fetch meeting' });
    }
};
exports.getMeeting = getMeeting;
// Create a new meeting
const createMeeting = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const { title, description, meetingDate, transcriptionMethod } = req.body;
        const meeting = new Meeting_1.default({
            userId,
            title: title || 'Untitled Meeting',
            description,
            meetingDate: meetingDate || new Date(),
            transcriptionMethod: transcriptionMethod || 'api',
            status: 'processing'
        });
        const savedMeeting = await meeting.save();
        res.status(201).json(savedMeeting);
    }
    catch (error) {
        console.error('[MeetingsController]: Error creating meeting:', error);
        res.status(500).json({ message: 'Failed to create meeting' });
    }
};
exports.createMeeting = createMeeting;
// Process transcription from text input (for now, until we add file upload)
const processTranscription = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { transcription } = req.body;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (!transcription || typeof transcription !== 'string') {
            res.status(400).json({ message: 'Transcription text is required' });
            return;
        }
        const meeting = await Meeting_1.default.findOne({ _id: id, userId });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        // Update meeting with transcription
        meeting.transcription = transcription;
        meeting.status = 'processing';
        meeting.processingProgress = 50;
        await meeting.save();
        // Start analysis process asynchronously
        processTranscriptionAnalysis(meeting);
        res.json({
            message: 'Transcription received, processing analysis...',
            meeting: {
                _id: meeting._id,
                status: meeting.status,
                processingProgress: meeting.processingProgress
            }
        });
    }
    catch (error) {
        console.error('[MeetingsController]: Error processing transcription:', error);
        res.status(500).json({ message: 'Failed to process transcription' });
    }
};
exports.processTranscription = processTranscription;
// Process transcription analysis
const processTranscriptionAnalysis = async (meeting) => {
    try {
        if (!meeting.transcription) {
            throw new Error('No transcription found');
        }
        // Update progress
        meeting.processingProgress = 60;
        await meeting.save();
        // Analyze transcription
        console.log(`[MeetingsController]: Starting analysis for meeting ${meeting._id}`);
        const analysis = await meetingAnalysisService_1.MeetingAnalysisService.analyzeMeetingTranscription(meeting.transcription);
        meeting.summary = analysis.summary;
        meeting.keyHighlights = analysis.keyHighlights;
        meeting.processingProgress = 80;
        await meeting.save();
        // Create tasks and notes
        console.log(`[MeetingsController]: Creating extracted items for meeting ${meeting._id}`);
        await meetingAnalysisService_1.MeetingAnalysisService.createExtractedItems(meeting, analysis);
        meeting.status = 'completed';
        meeting.processingProgress = 100;
        await meeting.save();
        console.log(`[MeetingsController]: Successfully processed meeting ${meeting._id}`);
    }
    catch (error) {
        console.error(`[MeetingsController]: Error processing meeting ${meeting._id}:`, error);
        meeting.status = 'failed';
        meeting.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await meeting.save();
    }
};
// Update meeting
const updateMeeting = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const { title, description, meetingDate } = req.body;
        const meeting = await Meeting_1.default.findOneAndUpdate({ _id: id, userId }, {
            title,
            description,
            meetingDate,
            updatedAt: new Date()
        }, { new: true });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        res.json(meeting);
    }
    catch (error) {
        console.error('[MeetingsController]: Error updating meeting:', error);
        res.status(500).json({ message: 'Failed to update meeting' });
    }
};
exports.updateMeeting = updateMeeting;
// Delete meeting
const deleteMeeting = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const meeting = await Meeting_1.default.findOne({ _id: id, userId });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        // Delete audio file if it exists
        if (meeting.audioFilePath && fs_1.default.existsSync(meeting.audioFilePath)) {
            try {
                fs_1.default.unlinkSync(meeting.audioFilePath);
            }
            catch (fileError) {
                console.error('[MeetingsController]: Error deleting audio file:', fileError);
            }
        }
        await Meeting_1.default.findByIdAndDelete(id);
        res.json({ message: 'Meeting deleted successfully' });
    }
    catch (error) {
        console.error('[MeetingsController]: Error deleting meeting:', error);
        res.status(500).json({ message: 'Failed to delete meeting' });
    }
};
exports.deleteMeeting = deleteMeeting;
// Reprocess meeting (re-run analysis)
const reprocessMeeting = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const meeting = await Meeting_1.default.findOne({ _id: id, userId });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        if (!meeting.transcription) {
            res.status(400).json({ message: 'No transcription found for this meeting' });
            return;
        }
        // Reset meeting analysis
        meeting.status = 'processing';
        meeting.processingProgress = 50;
        meeting.summary = undefined;
        meeting.keyHighlights = [];
        meeting.extractedTasks = [];
        meeting.extractedNotes = [];
        meeting.errorMessage = undefined;
        await meeting.save();
        // Start processing again
        processTranscriptionAnalysis(meeting);
        res.json({
            message: 'Meeting reprocessing started',
            meeting: {
                _id: meeting._id,
                status: meeting.status,
                processingProgress: meeting.processingProgress
            }
        });
    }
    catch (error) {
        console.error('[MeetingsController]: Error reprocessing meeting:', error);
        res.status(500).json({ message: 'Failed to reprocess meeting' });
    }
};
exports.reprocessMeeting = reprocessMeeting;
// Get meeting statistics
const getMeetingStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const [totalMeetings, completedMeetings, processingMeetings, failedMeetings] = await Promise.all([
            Meeting_1.default.countDocuments({ userId }),
            Meeting_1.default.countDocuments({ userId, status: 'completed' }),
            Meeting_1.default.countDocuments({ userId, status: 'processing' }),
            Meeting_1.default.countDocuments({ userId, status: 'failed' })
        ]);
        // Get recent meetings (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentMeetings = await Meeting_1.default.countDocuments({
            userId,
            createdAt: { $gte: weekAgo }
        });
        res.json({
            totalMeetings,
            completedMeetings,
            processingMeetings,
            failedMeetings,
            recentMeetings
        });
    }
    catch (error) {
        console.error('[MeetingsController]: Error fetching meeting stats:', error);
        res.status(500).json({ message: 'Failed to fetch meeting statistics' });
    }
};
exports.getMeetingStats = getMeetingStats;
// Upload audio for a meeting
exports.uploadAudio = [
    // Multer middleware for single file upload
    // Make sure the field name in the form-data matches 'audioFile'
    upload.single('audioFile'),
    async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }
            if (!req.file) {
                res.status(400).json({ message: 'No audio file uploaded' });
                return;
            }
            const meeting = await Meeting_1.default.findOne({ _id: id, userId });
            if (!meeting) {
                // If meeting not found, delete uploaded file
                if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
                    fs_1.default.unlinkSync(req.file.path);
                }
                res.status(404).json({ message: 'Meeting not found' });
                return;
            }
            // Delete old audio file if it exists
            if (meeting.audioFilePath && fs_1.default.existsSync(meeting.audioFilePath)) {
                try {
                    fs_1.default.unlinkSync(meeting.audioFilePath);
                }
                catch (fileError) {
                    console.error('[MeetingsController]: Error deleting old audio file:', fileError);
                    // Continue even if old file deletion fails
                }
            }
            meeting.audioFilePath = req.file.path;
            meeting.status = 'processing'; // Reset status for new audio
            meeting.processingProgress = 10; // Initial progress for audio uploaded
            meeting.transcription = undefined; // Clear previous transcription
            meeting.summary = undefined;
            meeting.keyHighlights = [];
            meeting.extractedTasks = [];
            meeting.extractedNotes = [];
            meeting.errorMessage = undefined;
            await meeting.save();
            // Start transcription process asynchronously
            // We'll use the existing transcribeAudio service, assuming it can handle file paths
            // If not, transcribeAudio service will need an update.
            (async () => {
                try {
                    console.log(`[MeetingsController]: Starting transcription for meeting ${meeting._id} with audio file ${meeting.audioFilePath}`);
                    meeting.processingProgress = 20;
                    await meeting.save();
                    const transcriptionText = await (0, transcriptionService_1.transcribeAudio)(meeting.audioFilePath); // Assuming transcribeAudio handles file path
                    meeting.transcription = transcriptionText;
                    meeting.processingProgress = 50;
                    await meeting.save();
                    console.log(`[MeetingsController]: Transcription complete for meeting ${meeting._id}. Starting analysis.`);
                    // Now process the analysis
                    await processTranscriptionAnalysis(meeting);
                }
                catch (transcriptionError) {
                    console.error(`[MeetingsController]: Error during audio transcription or analysis for meeting ${meeting._id}:`, transcriptionError);
                    meeting.status = 'failed';
                    meeting.errorMessage = transcriptionError instanceof Error ? transcriptionError.message : 'Transcription/Analysis failed';
                    meeting.processingProgress = 0;
                    await meeting.save();
                }
            })();
            res.json({
                message: 'Audio uploaded successfully, processing transcription and analysis...',
                meeting: {
                    _id: meeting._id,
                    status: meeting.status,
                    audioFilePath: meeting.audioFilePath,
                    processingProgress: meeting.processingProgress
                }
            });
        }
        catch (error) {
            console.error('[MeetingsController]: Error uploading audio:', error);
            // If an error occurs after file upload, attempt to delete the uploaded file
            if (req.file && req.file.path && fs_1.default.existsSync(req.file.path)) {
                try {
                    fs_1.default.unlinkSync(req.file.path);
                }
                catch (fileError) {
                    console.error('[MeetingsController]: Error deleting uploaded file during error handling:', fileError);
                }
            }
            res.status(500).json({ message: 'Failed to upload audio' });
        }
    }
];
