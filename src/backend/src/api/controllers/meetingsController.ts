import { Request, Response } from 'express';
import Meeting, { IMeeting } from '../../models/Meeting';
import { transcribeAudio } from '../../services/transcriptionService';
import { MeetingAnalysisService } from '../../services/meetingAnalysisService';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Get all meetings for the authenticated user
export const getMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { userId };
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const meetings = await Meeting.find(filter)
      .sort({ meetingDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Meeting.countDocuments(filter);

    res.json({
      meetings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('[MeetingsController]: Error fetching meetings:', error);
    res.status(500).json({ message: 'Failed to fetch meetings' });
  }
};

// Get a specific meeting by ID
export const getMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const meeting = await Meeting.findOne({ _id: id, userId }).lean();

    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    res.json(meeting);
  } catch (error) {
    console.error('[MeetingsController]: Error fetching meeting:', error);
    res.status(500).json({ message: 'Failed to fetch meeting' });
  }
};

// Create a new meeting
export const createMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { title, description, meetingDate, transcriptionMethod } = req.body;

    const meeting = new Meeting({
      userId,
      title: title || 'Untitled Meeting',
      description,
      meetingDate: meetingDate || new Date(),
      transcriptionMethod: transcriptionMethod || 'api',
      status: 'processing'
    });

    const savedMeeting = await meeting.save();
    res.status(201).json(savedMeeting);
  } catch (error) {
    console.error('[MeetingsController]: Error creating meeting:', error);
    res.status(500).json({ message: 'Failed to create meeting' });
  }
};

// Process transcription from text input (for now, until we add file upload)
export const processTranscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const meeting = await Meeting.findOne({ _id: id, userId });
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
  } catch (error) {
    console.error('[MeetingsController]: Error processing transcription:', error);
    res.status(500).json({ message: 'Failed to process transcription' });
  }
};

// Process transcription analysis
const processTranscriptionAnalysis = async (meeting: IMeeting): Promise<void> => {
  try {
    if (!meeting.transcription) {
      throw new Error('No transcription found');
    }

    // Update progress
    meeting.processingProgress = 60;
    await meeting.save();

    // Analyze transcription
    console.log(`[MeetingsController]: Starting analysis for meeting ${meeting._id}`);
    const analysis = await MeetingAnalysisService.analyzeMeetingTranscription(meeting.transcription);
    
    meeting.summary = analysis.summary;
    meeting.keyHighlights = analysis.keyHighlights;
    meeting.processingProgress = 80;
    await meeting.save();

    // Create tasks and notes
    console.log(`[MeetingsController]: Creating extracted items for meeting ${meeting._id}`);
    await MeetingAnalysisService.createExtractedItems(meeting, analysis);
    
    meeting.status = 'completed';
    meeting.processingProgress = 100;
    await meeting.save();

    console.log(`[MeetingsController]: Successfully processed meeting ${meeting._id}`);
  } catch (error) {
    console.error(`[MeetingsController]: Error processing meeting ${meeting._id}:`, error);
    meeting.status = 'failed';
    meeting.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await meeting.save();
  }
};

// Update meeting
export const updateMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { title, description, meetingDate } = req.body;

    const meeting = await Meeting.findOneAndUpdate(
      { _id: id, userId },
      { 
        title, 
        description, 
        meetingDate,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    res.json(meeting);
  } catch (error) {
    console.error('[MeetingsController]: Error updating meeting:', error);
    res.status(500).json({ message: 'Failed to update meeting' });
  }
};

// Delete meeting
export const deleteMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const meeting = await Meeting.findOne({ _id: id, userId });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    // Delete audio file if it exists
    if (meeting.audioFilePath && fs.existsSync(meeting.audioFilePath)) {
      try {
        fs.unlinkSync(meeting.audioFilePath);
      } catch (fileError) {
        console.error('[MeetingsController]: Error deleting audio file:', fileError);
      }
    }

    await Meeting.findByIdAndDelete(id);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('[MeetingsController]: Error deleting meeting:', error);
    res.status(500).json({ message: 'Failed to delete meeting' });
  }
};

// Reprocess meeting (re-run analysis)
export const reprocessMeeting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const meeting = await Meeting.findOne({ _id: id, userId });
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
  } catch (error) {
    console.error('[MeetingsController]: Error reprocessing meeting:', error);
    res.status(500).json({ message: 'Failed to reprocess meeting' });
  }
};

// Get meeting statistics
export const getMeetingStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const [totalMeetings, completedMeetings, processingMeetings, failedMeetings] = await Promise.all([
      Meeting.countDocuments({ userId }),
      Meeting.countDocuments({ userId, status: 'completed' }),
      Meeting.countDocuments({ userId, status: 'processing' }),
      Meeting.countDocuments({ userId, status: 'failed' })
    ]);

    // Get recent meetings (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentMeetings = await Meeting.countDocuments({
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
  } catch (error) {
    console.error('[MeetingsController]: Error fetching meeting stats:', error);
    res.status(500).json({ message: 'Failed to fetch meeting statistics' });
  }
};
