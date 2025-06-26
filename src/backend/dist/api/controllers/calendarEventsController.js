"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugCalendarEvents = exports.exportToGoogleCalendar = exports.importFromGoogleCalendar = exports.getSyncStatus = exports.syncWithGoogleCalendar = exports.deleteCalendarEvent = exports.updateCalendarEvent = exports.createCalendarEvent = exports.getAllCalendarEvents = void 0;
const CalendarEvent_1 = __importDefault(require("../../models/CalendarEvent"));
const googleCalendarService_1 = __importDefault(require("../../services/googleCalendarService"));
const mongoose_1 = __importDefault(require("mongoose"));
// Get all calendar events for the authenticated user
const getAllCalendarEvents = async (req, res) => {
    try {
        const userId = req.user?.id; // Assuming req.user is populated by auth middleware
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const events = await CalendarEvent_1.default.find({ userId }).sort({ startTime: 'asc' });
        res.status(200).json(events);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error fetching calendar events', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
};
exports.getAllCalendarEvents = getAllCalendarEvents;
// Create a new calendar event
const createCalendarEvent = async (req, res) => {
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
        const newEvent = new CalendarEvent_1.default({
            title,
            startTime: startDate,
            endTime: endDate,
            description,
            color,
            userId,
            syncStatus: 'local_only', // Explicitly mark as local-only for sync
        });
        await newEvent.save();
        res.status(201).json(newEvent);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error creating calendar event', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
};
exports.createCalendarEvent = createCalendarEvent;
// Update an existing calendar event
const updateCalendarEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        const eventId = req.params.id;
        const { title, startTime, endTime, description, color } = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({
                message: 'Invalid event ID format. Expected MongoDB ObjectId (24 character hex string).',
                received: eventId,
                expectedFormat: 'MongoDB ObjectId (e.g., 507f1f77bcf86cd799439011)'
            });
        }
        const event = await CalendarEvent_1.default.findById(eventId);
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
        // Mark event as needing sync if it was previously synced with Google
        if (event.googleEventId && event.syncStatus === 'synced') {
            event.syncStatus = 'pending';
        }
        const updatedEvent = await event.save();
        res.status(200).json(updatedEvent);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error updating calendar event', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
};
exports.updateCalendarEvent = updateCalendarEvent;
// Delete a calendar event
const deleteCalendarEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        const eventId = req.params.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({
                message: 'Invalid event ID format. Expected MongoDB ObjectId (24 character hex string).',
                received: eventId,
                expectedFormat: 'MongoDB ObjectId (e.g., 507f1f77bcf86cd799439011)'
            });
        }
        const event = await CalendarEvent_1.default.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Calendar event not found' });
        }
        if (event.userId.toString() !== userId) {
            return res.status(403).json({ message: 'User not authorized to delete this event' });
        }
        await event.deleteOne(); // Corrected: use deleteOne method on the document
        res.status(200).json({ message: 'Calendar event deleted successfully' });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error deleting calendar event', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
};
exports.deleteCalendarEvent = deleteCalendarEvent;
// Initialize Google Calendar Service
const initializeGoogleCalendarService = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';
    if (!clientId || !clientSecret) {
        throw new Error('Google Calendar credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.');
    }
    return new googleCalendarService_1.default({
        clientId,
        clientSecret,
        redirectUri,
    });
};
// Sync calendar with Google Calendar
const syncWithGoogleCalendar = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { accessToken, timeRange } = req.body;
        console.log('[GoogleCalendarSync] Starting sync process...');
        console.log('[GoogleCalendarSync] User ID:', userId);
        console.log('[GoogleCalendarSync] Access token present:', !!accessToken);
        console.log('[GoogleCalendarSync] Access token length:', accessToken?.length || 0);
        console.log('[GoogleCalendarSync] Time range:', timeRange);
        if (!userId) {
            console.log('[GoogleCalendarSync] ERROR: User not authenticated');
            return res.status(401).json({ message: 'User not authenticated' });
        }
        if (!accessToken) {
            console.log('[GoogleCalendarSync] ERROR: No access token provided');
            return res.status(400).json({ message: 'Google access token is required' });
        }
        // Check environment variables
        console.log('[GoogleCalendarSync] Environment check:');
        console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
        console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
        console.log('  GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || 'Default will be used');
        let googleCalendarService;
        try {
            googleCalendarService = initializeGoogleCalendarService();
            console.log('[GoogleCalendarSync] Google Calendar service initialized');
        }
        catch (error) {
            console.log('[GoogleCalendarSync] ERROR: Failed to initialize Google Calendar service:', error);
            return res.status(500).json({
                message: 'Google Calendar service not configured properly. Please check server configuration.',
                error: error instanceof Error ? error.message : 'Configuration error'
            });
        }
        googleCalendarService.setAccessToken(accessToken);
        console.log('[GoogleCalendarSync] Access token set on service');
        // Parse time range if provided, otherwise use a sensible default
        let parsedTimeRange;
        if (timeRange && timeRange.start && timeRange.end) {
            parsedTimeRange = {
                start: new Date(timeRange.start),
                end: new Date(timeRange.end),
            };
            console.log('[GoogleCalendarSync] Using custom time range:', parsedTimeRange);
        }
        else {
            // Default: 6 months ago to 2 years in the future to catch most events
            parsedTimeRange = {
                start: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
                end: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 years from now
            };
            console.log('[GoogleCalendarSync] Using default wide time range:', parsedTimeRange);
        }
        console.log('[GoogleCalendarSync] Starting bidirectional sync...');
        const syncResult = await googleCalendarService.syncWithGoogle(userId, parsedTimeRange);
        console.log('[GoogleCalendarSync] Sync completed:');
        console.log('  Success:', syncResult.success);
        console.log('  Events imported:', syncResult.eventsImported);
        console.log('  Events exported:', syncResult.eventsExported);
        console.log('  Errors:', syncResult.errors);
        if (syncResult.success) {
            res.status(200).json({
                message: 'Sync completed successfully',
                result: syncResult,
            });
        }
        else {
            console.log('[GoogleCalendarSync] Sync completed with errors');
            res.status(500).json({
                message: 'Sync completed with errors',
                result: syncResult,
            });
        }
    }
    catch (error) {
        console.error('[GoogleCalendarSync] FATAL ERROR:', error);
        if (error instanceof Error) {
            console.error('[GoogleCalendarSync] Error message:', error.message);
            console.error('[GoogleCalendarSync] Error stack:', error.stack);
            res.status(500).json({ message: 'Error syncing with Google Calendar', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred during sync' });
        }
    }
};
exports.syncWithGoogleCalendar = syncWithGoogleCalendar;
// Get sync status
const getSyncStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const googleCalendarService = initializeGoogleCalendarService();
        const syncStatus = await googleCalendarService.getSyncStatus(userId);
        res.status(200).json(syncStatus);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error getting sync status', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred' });
        }
    }
};
exports.getSyncStatus = getSyncStatus;
// Import events from Google Calendar
const importFromGoogleCalendar = async (req, res) => {
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
        const result = await googleCalendarService.importEventsFromGoogle(userId, timeMin ? new Date(timeMin) : undefined, timeMax ? new Date(timeMax) : undefined);
        res.status(200).json({
            message: 'Import completed',
            imported: result.imported,
            errors: result.errors,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error importing from Google Calendar', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred during import' });
        }
    }
};
exports.importFromGoogleCalendar = importFromGoogleCalendar;
// Export events to Google Calendar
const exportToGoogleCalendar = async (req, res) => {
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
        const result = await googleCalendarService.exportEventsToGoogle(userId);
        res.status(200).json({
            message: 'Export completed',
            exported: result.exported,
            errors: result.errors,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: 'Error exporting to Google Calendar', error: error.message });
        }
        else {
            res.status(500).json({ message: 'An unknown error occurred during export' });
        }
    }
};
exports.exportToGoogleCalendar = exportToGoogleCalendar;
// Debug endpoint to check database state
const debugCalendarEvents = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        console.log('[CalendarDebug] Checking database state for user:', userId);
        // Get all events for this user
        const allEvents = await CalendarEvent_1.default.find({ userId }).sort({ createdAt: -1 });
        console.log('[CalendarDebug] Total events in DB:', allEvents.length);
        const eventSummary = allEvents.map(event => ({
            id: event._id,
            title: event.title,
            startTime: event.startTime,
            syncStatus: event.syncStatus,
            googleEventId: event.googleEventId,
            lastSyncAt: event.lastSyncAt,
            createdAt: event.createdAt
        }));
        const statusCounts = {
            synced: allEvents.filter(e => e.syncStatus === 'synced').length,
            pending: allEvents.filter(e => e.syncStatus === 'pending').length,
            error: allEvents.filter(e => e.syncStatus === 'error').length,
            local_only: allEvents.filter(e => e.syncStatus === 'local_only').length,
            undefined: allEvents.filter(e => !e.syncStatus).length,
        };
        console.log('[CalendarDebug] Status counts:', statusCounts);
        res.status(200).json({
            totalEvents: allEvents.length,
            statusCounts,
            events: eventSummary,
            userId
        });
    }
    catch (error) {
        console.error('[CalendarDebug] Error:', error);
        if (error instanceof Error) {
            res.status(500).json({ message: 'Debug error', error: error.message });
        }
        else {
            res.status(500).json({ message: 'Unknown debug error' });
        }
    }
};
exports.debugCalendarEvents = debugCalendarEvents;
