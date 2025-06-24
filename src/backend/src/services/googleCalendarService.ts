import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import CalendarEvent, { ICalendarEvent } from '../models/CalendarEvent';
import mongoose from 'mongoose';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface SyncResult {
  success: boolean;
  eventsImported: number;
  eventsExported: number;
  errors: string[];
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(config: GoogleCalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Set access token for the OAuth2 client
   */
  setAccessToken(accessToken: string): void {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });
  }

  /**
   * Convert Google Calendar event to our internal format
   */
  private convertGoogleEventToInternal(
    googleEvent: calendar_v3.Schema$Event,
    userId: mongoose.Schema.Types.ObjectId
  ): Partial<ICalendarEvent> {
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
  private convertInternalEventToGoogle(event: ICalendarEvent): calendar_v3.Schema$Event {
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
  async importEventsFromGoogle(
    userId: mongoose.Schema.Types.ObjectId,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<{ imported: number; errors: string[] }> {
    try {
      console.log('[GoogleCalendarService] Starting import from Google Calendar...');
      console.log('[GoogleCalendarService] User ID:', userId);
      console.log('[GoogleCalendarService] Time range:', { timeMin, timeMax });

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin?.toISOString() || new Date().toISOString(),
        timeMax: timeMax?.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      console.log('[GoogleCalendarService] Google API response status:', response.status);
      const googleEvents = response.data.items || [];
      console.log('[GoogleCalendarService] Found', googleEvents.length, 'events in Google Calendar');

      if (googleEvents.length > 0) {
        console.log('[GoogleCalendarService] Sample event titles:', 
          googleEvents.slice(0, 3).map(e => e.summary || 'No title'));
      }

      const imported: string[] = [];
      const errors: string[] = [];

      for (const googleEvent of googleEvents) {
        try {
          console.log('[GoogleCalendarService] Processing event:', googleEvent.summary, 'ID:', googleEvent.id);
          
          if (!googleEvent.id) {
            errors.push('Google event missing ID');
            continue;
          }

          // Check if event already exists
          const existingEvent = await CalendarEvent.findOne({
            googleEventId: googleEvent.id,
            userId,
          });

          if (existingEvent) {
            console.log('[GoogleCalendarService] Updating existing event:', googleEvent.summary);
            // Update existing event
            const updatedData = this.convertGoogleEventToInternal(googleEvent, userId);
            await CalendarEvent.findByIdAndUpdate(existingEvent._id, updatedData);
          } else {
            console.log('[GoogleCalendarService] Creating new event:', googleEvent.summary);
            // Create new event
            const eventData = this.convertGoogleEventToInternal(googleEvent, userId);
            const newEvent = await CalendarEvent.create(eventData);
            console.log('[GoogleCalendarService] Created event with DB ID:', newEvent._id);
            imported.push(googleEvent.id);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[GoogleCalendarService] Error processing event:', googleEvent.summary, errorMessage);
          errors.push(`Failed to import event ${googleEvent.id}: ${errorMessage}`);
        }
      }

      console.log('[GoogleCalendarService] Import completed. Imported:', imported.length, 'Errors:', errors.length);
      return { imported: imported.length, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleCalendarService] FATAL import error:', errorMessage);
      throw new Error(`Failed to import from Google Calendar: ${errorMessage}`);
    }
  }

  /**
   * Export local events to Google Calendar
   */
  async exportEventsToGoogle(
    userId: mongoose.Schema.Types.ObjectId
  ): Promise<{ exported: number; errors: string[] }> {
    try {
      console.log('[GoogleCalendarService] Starting export to Google Calendar...');
      console.log('[GoogleCalendarService] User ID:', userId);

      // Get local events that haven't been synced to Google
      const localEvents = await CalendarEvent.find({
        userId,
        $or: [
          { googleEventId: { $exists: false } },
          { syncStatus: 'pending' },
          { syncStatus: 'error' },
          { syncStatus: 'local_only' }
        ]
      });

      console.log('[GoogleCalendarService] Found', localEvents.length, 'local events to export');
      if (localEvents.length > 0) {
        console.log('[GoogleCalendarService] Sample local event titles:', 
          localEvents.slice(0, 3).map(e => e.title));
      }

      const exported: string[] = [];
      const errors: string[] = [];

      for (const localEvent of localEvents) {
        try {
          console.log('[GoogleCalendarService] Exporting event:', localEvent.title, 'Status:', localEvent.syncStatus);
          
          const googleEventData = this.convertInternalEventToGoogle(localEvent);

          if (localEvent.googleEventId) {
            console.log('[GoogleCalendarService] Updating existing Google event:', localEvent.googleEventId);
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
              console.log('[GoogleCalendarService] Updated Google event successfully');
            }
          } else {
            console.log('[GoogleCalendarService] Creating new Google event');
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
              console.log('[GoogleCalendarService] Created Google event with ID:', response.data.id);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[GoogleCalendarService] Error exporting event:', localEvent.title, errorMessage);
          errors.push(`Failed to export event ${localEvent.title}: ${errorMessage}`);
          localEvent.syncStatus = 'error';
          await localEvent.save();
        }
      }

      console.log('[GoogleCalendarService] Export completed. Exported:', exported.length, 'Errors:', errors.length);
      return { exported: exported.length, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleCalendarService] FATAL export error:', errorMessage);
      throw new Error(`Failed to export to Google Calendar: ${errorMessage}`);
    }
  }

  /**
   * Perform bidirectional sync
   */
  async syncWithGoogle(
    userId: mongoose.Schema.Types.ObjectId,
    timeRange?: { start: Date; end: Date }
  ): Promise<SyncResult> {
    try {
      // Import from Google Calendar
      const importResult = await this.importEventsFromGoogle(
        userId,
        timeRange?.start,
        timeRange?.end
      );

      // Export to Google Calendar
      const exportResult = await this.exportEventsToGoogle(userId);

      return {
        success: true,
        eventsImported: importResult.imported,
        eventsExported: exportResult.exported,
        errors: [...importResult.errors, ...exportResult.errors],
      };
    } catch (error) {
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
  async deleteEventFromGoogle(googleEventId: string): Promise<boolean> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to delete event from Google Calendar: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get sync status for user's events
   */
  async getSyncStatus(userId: mongoose.Schema.Types.ObjectId): Promise<{
    totalEvents: number;
    syncedEvents: number;
    pendingEvents: number;
    errorEvents: number;
    localOnlyEvents: number;
    lastSyncAt?: Date;
  }> {
    const totalEvents = await CalendarEvent.countDocuments({ userId });
    const syncedEvents = await CalendarEvent.countDocuments({ userId, syncStatus: 'synced' });
    const pendingEvents = await CalendarEvent.countDocuments({ userId, syncStatus: 'pending' });
    const errorEvents = await CalendarEvent.countDocuments({ userId, syncStatus: 'error' });
    const localOnlyEvents = await CalendarEvent.countDocuments({ userId, syncStatus: 'local_only' });

    const lastSyncEvent = await CalendarEvent.findOne(
      { userId, lastSyncAt: { $exists: true } },
      {},
      { sort: { lastSyncAt: -1 } }
    );

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

export default GoogleCalendarService;