import { Request, Response } from 'express';
import CalendarEvent, { ICalendarEvent } from '../../models/CalendarEvent';
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
