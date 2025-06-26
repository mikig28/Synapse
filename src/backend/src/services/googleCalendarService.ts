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
      color: 'bg-emerald-600', // Distinct emerald color for Google Calendar events
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

      // Default time range: 6 months in the past to 2 years in the future
      const defaultTimeMin = timeMin || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000); // 6 months ago
      const defaultTimeMax = timeMax || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years from now

      console.log('[GoogleCalendarService] Using time range:', { 
        timeMin: defaultTimeMin.toISOString(), 
        timeMax: defaultTimeMax.toISOString() 
      });

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: defaultTimeMin.toISOString(),
        timeMax: defaultTimeMax.toISOString(),
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
      const updated: string[] = [];
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
            // Update existing event, but preserve sync status if it's pending
            const updatedData = this.convertGoogleEventToInternal(googleEvent, userId);
            
            // Don't overwrite pending status - let the export handle pending changes
            if (existingEvent.syncStatus === 'pending') {
              console.log('[GoogleCalendarService] Preserving pending status for event:', googleEvent.summary);
              updatedData.syncStatus = 'pending';
            }
            
            await CalendarEvent.findByIdAndUpdate(existingEvent._id, updatedData);
            updated.push(googleEvent.id);
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

      console.log('[GoogleCalendarService] Import completed. New:', imported.length, 'Updated:', updated.length, 'Errors:', errors.length);
      return { imported: imported.length + updated.length, errors }; // Count both new and updated as "imported"
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

      // Debug: Check all events for this user first
      const allUserEvents = await CalendarEvent.find({ userId });
      console.log('[GoogleCalendarService] Total events for user:', allUserEvents.length);
      if (allUserEvents.length > 0) {
        console.log('[GoogleCalendarService] Sample events:', allUserEvents.slice(0, 3).map(e => ({
          title: e.title,
          syncStatus: e.syncStatus,
          googleEventId: e.googleEventId ? 'Present' : 'None',
          color: e.color
        })));
      }

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
      console.log('[GoogleCalendarService] Starting bidirectional sync for user:', userId);

      // Step 1: Import from Google Calendar
      console.log('[GoogleCalendarService] Step 1: Importing from Google Calendar...');
      const importResult = await this.importEventsFromGoogle(
        userId,
        timeRange?.start,
        timeRange?.end
      );

      // Step 2: Handle pending deletions (events deleted in Synapse but still in Google)
      console.log('[GoogleCalendarService] Step 2: Processing deletions...');
      const deletionResult = await this.processPendingDeletions(userId);

      // Step 3: Export to Google Calendar
      console.log('[GoogleCalendarService] Step 3: Exporting to Google Calendar...');
      const exportResult = await this.exportEventsToGoogle(userId);

      console.log('[GoogleCalendarService] Sync completed:', {
        imported: importResult.imported,
        deleted: deletionResult.deleted,
        exported: exportResult.exported,
        totalErrors: [...importResult.errors, ...deletionResult.errors, ...exportResult.errors].length
      });

      return {
        success: true,
        eventsImported: importResult.imported,
        eventsExported: exportResult.exported + deletionResult.deleted, // Include deletions in export count
        errors: [...importResult.errors, ...deletionResult.errors, ...exportResult.errors],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleCalendarService] Sync failed:', errorMessage);
      return {
        success: false,
        eventsImported: 0,
        eventsExported: 0,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Process pending deletions - handle events that were deleted in Synapse but need deletion from Google
   */
  private async processPendingDeletions(
    userId: mongoose.Schema.Types.ObjectId
  ): Promise<{ deleted: number; errors: string[] }> {
    try {
      console.log('[GoogleCalendarService] Processing pending deletions...');

      // Find events marked for deletion or check for events deleted from our DB but still in Google
      // This is a complex scenario - for now, we'll focus on ensuring clean sync
      
      // Get all our current events with Google IDs
      const ourGoogleEvents = await CalendarEvent.find({
        userId,
        googleEventId: { $exists: true, $ne: null }
      });

      console.log('[GoogleCalendarService] Found', ourGoogleEvents.length, 'events with Google IDs in our database');

      // Get Google Calendar events to compare
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
        timeMax: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years from now
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      const googleEvents = response.data.items || [];
      const googleEventIds = new Set(googleEvents.map(e => e.id).filter(Boolean));
      const ourGoogleEventIds = new Set(ourGoogleEvents.map(e => e.googleEventId).filter(Boolean));

      console.log('[GoogleCalendarService] Google Calendar has', googleEventIds.size, 'events');
      console.log('[GoogleCalendarService] Our database has', ourGoogleEventIds.size, 'Google-synced events');

      // Find events in Google that are no longer in our database (potential deletions)
      const eventsToDeleteFromGoogle: string[] = [];
      for (const googleEventId of googleEventIds) {
        if (!ourGoogleEventIds.has(googleEventId)) {
          // This event exists in Google but not in our database - should we delete it?
          // For safety, we'll NOT auto-delete from Google Calendar
          // Only delete if explicitly marked for deletion
          console.log('[GoogleCalendarService] Found orphaned event in Google Calendar:', googleEventId, '(not auto-deleting)');
        }
      }

      let deleted = 0;
      const errors: string[] = [];

      // For now, we don't auto-delete orphaned events for safety
      // In the future, this could be enhanced to handle explicit deletion marking

      console.log('[GoogleCalendarService] Deletion processing completed. Deleted:', deleted, 'Errors:', errors.length);
      return { deleted, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleCalendarService] Error processing deletions:', errorMessage);
      return { deleted: 0, errors: [errorMessage] };
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