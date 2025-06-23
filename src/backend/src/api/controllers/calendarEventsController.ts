import { Request, Response } from 'express';
import CalendarEvent, { ICalendarEvent } from '../../models/CalendarEvent';
import GoogleCalendarService from '../../services/googleCalendarService';
import mongoose from 'mongoose';

// Get all calendar events for the authenticated user
export const getAllCalendarEvents = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Assuming req.user is populated by auth middleware
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const events = await CalendarEvent.find({ userId }).sort({ startTime: 'asc' });
    res.status(200).json(events);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error fetching calendar events', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

// Create a new calendar event
export const createCalendarEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { title, startTime, endTime, description, color } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: 'Title, startTime, and endTime are required' });
    }

    // Validate date formats and ensure endTime is after startTime
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format for startTime or endTime' });
    }

    if (endDate <= startDate) {
      return res.status(400).json({ message: 'endTime must be after startTime' });
    }

    const newEvent: ICalendarEvent = new CalendarEvent({
      title,
      startTime: startDate,
      endTime: endDate,
      description,
      color,
      userId,
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error creating calendar event', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

// Update an existing calendar event
export const updateCalendarEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const eventId = req.params.id;
    const { title, startTime, endTime, description, color } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    const event = await CalendarEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    if (event.userId.toString() !== userId) {
      return res.status(403).json({ message: 'User not authorized to update this event' });
    }

    // Validate date formats and ensure endTime is after startTime if provided
    if (startTime || endTime) {
        const newStartTime = startTime ? new Date(startTime) : event.startTime;
        const newEndTime = endTime ? new Date(endTime) : event.endTime;

        if (startTime && isNaN(newStartTime.getTime())) {
            return res.status(400).json({ message: 'Invalid date format for startTime' });
        }
        if (endTime && isNaN(newEndTime.getTime())) {
            return res.status(400).json({ message: 'Invalid date format for endTime' });
        }
        if (newEndTime <= newStartTime) {
            return res.status(400).json({ message: 'endTime must be after startTime' });
        }
        event.startTime = newStartTime;
        event.endTime = newEndTime;
    }


    event.title = title || event.title;
    event.description = description === undefined ? event.description : description;
    event.color = color || event.color;

    const updatedEvent = await event.save();
    res.status(200).json(updatedEvent);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error updating calendar event', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    const event = await CalendarEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }

    if (event.userId.toString() !== userId) {
      return res.status(403).json({ message: 'User not authorized to delete this event' });
    }

    await event.deleteOne(); // Corrected: use deleteOne method on the document
    res.status(200).json({ message: 'Calendar event deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error deleting calendar event', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

// Initialize Google Calendar Service
const initializeGoogleCalendarService = () => {
  return new GoogleCalendarService({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000',
  });
};

// Sync calendar with Google Calendar
export const syncWithGoogleCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { accessToken, timeRange } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!accessToken) {
      return res.status(400).json({ message: 'Google access token is required' });
    }

    const googleCalendarService = initializeGoogleCalendarService();
    googleCalendarService.setAccessToken(accessToken);

    // Parse time range if provided
    let parsedTimeRange;
    if (timeRange && timeRange.start && timeRange.end) {
      parsedTimeRange = {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      };
    }

    const syncResult = await googleCalendarService.syncWithGoogle(
      userId as unknown as mongoose.Schema.Types.ObjectId,
      parsedTimeRange
    );

    if (syncResult.success) {
      res.status(200).json({
        message: 'Sync completed successfully',
        result: syncResult,
      });
    } else {
      res.status(500).json({
        message: 'Sync completed with errors',
        result: syncResult,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error syncing with Google Calendar', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred during sync' });
    }
  }
};

// Get sync status
export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const googleCalendarService = initializeGoogleCalendarService();
    const syncStatus = await googleCalendarService.getSyncStatus(
      userId as unknown as mongoose.Schema.Types.ObjectId
    );

    res.status(200).json(syncStatus);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error getting sync status', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};

// Import events from Google Calendar
export const importFromGoogleCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { accessToken, timeMin, timeMax } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!accessToken) {
      return res.status(400).json({ message: 'Google access token is required' });
    }

    const googleCalendarService = initializeGoogleCalendarService();
    googleCalendarService.setAccessToken(accessToken);

    const result = await googleCalendarService.importEventsFromGoogle(
      userId as unknown as mongoose.Schema.Types.ObjectId,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined
    );

    res.status(200).json({
      message: 'Import completed',
      imported: result.imported,
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error importing from Google Calendar', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred during import' });
    }
  }
};

// Export events to Google Calendar
export const exportToGoogleCalendar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { accessToken } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!accessToken) {
      return res.status(400).json({ message: 'Google access token is required' });
    }

    const googleCalendarService = initializeGoogleCalendarService();
    googleCalendarService.setAccessToken(accessToken);

    const result = await googleCalendarService.exportEventsToGoogle(
      userId as unknown as mongoose.Schema.Types.ObjectId
    );

    res.status(200).json({
      message: 'Export completed',
      exported: result.exported,
      errors: result.errors,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error exporting to Google Calendar', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred during export' });
    }
  }
};
