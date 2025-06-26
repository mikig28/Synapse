"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const googleapis_1 = require("googleapis");
const CalendarEvent_1 = __importDefault(require("../models/CalendarEvent"));
class GoogleCalendarService {
    constructor(config) {
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    /**
     * Set access token for the OAuth2 client
     */
    setAccessToken(accessToken) {
        this.oauth2Client.setCredentials({
            access_token: accessToken,
        });
    }
    /**
     * Convert Google Calendar event to our internal format
     */
    convertGoogleEventToInternal(googleEvent, userId) {
        const startTime = googleEvent.start?.dateTime
            ? new Date(googleEvent.start.dateTime)
            : new Date(googleEvent.start?.date || '');
        const endTime = googleEvent.end?.dateTime
            ? new Date(googleEvent.end.dateTime)
            : new Date(googleEvent.end?.date || '');
        return {
            title: googleEvent.summary || 'Untitled Event',
            startTime,
            endTime,
            description: googleEvent.description || '',
            location: googleEvent.location || '',
            attendees: googleEvent.attendees?.map(attendee => attendee.email || '') || [],
            organizer: googleEvent.organizer?.email || '',
            googleEventId: googleEvent.id || '',
            lastSyncAt: new Date(),
            syncStatus: 'synced',
            userId,
            color: '#3174ad', // Default color
        };
    }
    /**
     * Convert our internal event to Google Calendar format
     */
    convertInternalEventToGoogle(event) {
        return {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: {
                dateTime: event.startTime.toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: event.endTime.toISOString(),
                timeZone: 'UTC',
            },
            attendees: event.attendees?.map(email => ({ email })) || [],
        };
    }
    /**
     * Import events from Google Calendar
     */
    async importEventsFromGoogle(userId, timeMin, timeMax) {
        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin?.toISOString() || new Date().toISOString(),
                timeMax: timeMax?.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 100,
            });
            const googleEvents = response.data.items || [];
            const imported = [];
            const errors = [];
            for (const googleEvent of googleEvents) {
                try {
                    if (!googleEvent.id) {
                        errors.push('Google event missing ID');
                        continue;
                    }
                    // Check if event already exists
                    const existingEvent = await CalendarEvent_1.default.findOne({
                        googleEventId: googleEvent.id,
                        userId,
                    });
                    if (existingEvent) {
                        // Update existing event
                        const updatedData = this.convertGoogleEventToInternal(googleEvent, userId);
                        await CalendarEvent_1.default.findByIdAndUpdate(existingEvent._id, updatedData);
                    }
                    else {
                        // Create new event
                        const eventData = this.convertGoogleEventToInternal(googleEvent, userId);
                        await CalendarEvent_1.default.create(eventData);
                        imported.push(googleEvent.id);
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Failed to import event ${googleEvent.id}: ${errorMessage}`);
                }
            }
            return { imported: imported.length, errors };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to import from Google Calendar: ${errorMessage}`);
        }
    }
    /**
     * Export local events to Google Calendar
     */
    async exportEventsToGoogle(userId) {
        try {
            // Get local events that haven't been synced to Google
            const localEvents = await CalendarEvent_1.default.find({
                userId,
                $or: [
                    { googleEventId: { $exists: false } },
                    { syncStatus: 'pending' },
                    { syncStatus: 'error' },
                    { syncStatus: 'local_only' }
                ]
            });
            const exported = [];
            const errors = [];
            for (const localEvent of localEvents) {
                try {
                    const googleEventData = this.convertInternalEventToGoogle(localEvent);
                    if (localEvent.googleEventId) {
                        // Update existing Google event
                        const response = await this.calendar.events.update({
                            calendarId: 'primary',
                            eventId: localEvent.googleEventId,
                            requestBody: googleEventData,
                        });
                        if (response.data.id) {
                            exported.push(response.data.id);
                            localEvent.syncStatus = 'synced';
                            localEvent.lastSyncAt = new Date();
                            await localEvent.save();
                        }
                    }
                    else {
                        // Create new Google event
                        const response = await this.calendar.events.insert({
                            calendarId: 'primary',
                            requestBody: googleEventData,
                        });
                        if (response.data.id) {
                            exported.push(response.data.id);
                            localEvent.googleEventId = response.data.id;
                            localEvent.syncStatus = 'synced';
                            localEvent.lastSyncAt = new Date();
                            await localEvent.save();
                        }
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push(`Failed to export event ${localEvent.title}: ${errorMessage}`);
                    localEvent.syncStatus = 'error';
                    await localEvent.save();
                }
            }
            return { exported: exported.length, errors };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to export to Google Calendar: ${errorMessage}`);
        }
    }
    /**
     * Perform bidirectional sync
     */
    async syncWithGoogle(userId, timeRange) {
        try {
            // Import from Google Calendar
            const importResult = await this.importEventsFromGoogle(userId, timeRange?.start, timeRange?.end);
            // Export to Google Calendar
            const exportResult = await this.exportEventsToGoogle(userId);
            return {
                success: true,
                eventsImported: importResult.imported,
                eventsExported: exportResult.exported,
                errors: [...importResult.errors, ...exportResult.errors],
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                eventsImported: 0,
                eventsExported: 0,
                errors: [errorMessage],
            };
        }
    }
    /**
     * Delete event from Google Calendar
     */
    async deleteEventFromGoogle(googleEventId) {
        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: googleEventId,
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to delete event from Google Calendar: ${errorMessage}`);
            return false;
        }
    }
    /**
     * Get sync status for user's events
     */
    async getSyncStatus(userId) {
        const totalEvents = await CalendarEvent_1.default.countDocuments({ userId });
        const syncedEvents = await CalendarEvent_1.default.countDocuments({ userId, syncStatus: 'synced' });
        const pendingEvents = await CalendarEvent_1.default.countDocuments({ userId, syncStatus: 'pending' });
        const errorEvents = await CalendarEvent_1.default.countDocuments({ userId, syncStatus: 'error' });
        const localOnlyEvents = await CalendarEvent_1.default.countDocuments({ userId, syncStatus: 'local_only' });
        const lastSyncEvent = await CalendarEvent_1.default.findOne({ userId, lastSyncAt: { $exists: true } }, {}, { sort: { lastSyncAt: -1 } });
        return {
            totalEvents,
            syncedEvents,
            pendingEvents,
            errorEvents,
            localOnlyEvents,
            lastSyncAt: lastSyncEvent?.lastSyncAt,
        };
    }
}
exports.GoogleCalendarService = GoogleCalendarService;
exports.default = GoogleCalendarService;
