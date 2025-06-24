# Google Calendar Sync Setup Guide

## Overview
This guide will help you set up Google Calendar synchronization with your Synapse application. Once configured, you'll be able to:

- **Bidirectional Sync**: Events created in Synapse will be exported to Google Calendar, and Google Calendar events will be imported to Synapse
- **Visual Distinction**: Google Calendar events appear with a distinct **emerald green** color (`bg-emerald-600`)
- **Real-time Status**: See sync status indicators showing how many events are synced

## 🔧 Setup Instructions

### Step 1: Create Google Cloud Project & OAuth Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable Google Calendar API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `http://localhost:5173` (for Vite dev server)
   - Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

Update your `.env` file with the Google credentials:

```bash
# Google Calendar Integration - REQUIRED for calendar sync
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
```

⚠️ **Important**: Replace `your-actual-google-client-id` and `your-actual-google-client-secret` with your real Google credentials.

### Step 3: Restart Both Servers

After updating the environment variables:

```bash
# Terminal 1 - Backend
cd src/backend
npm run dev

# Terminal 2 - Frontend  
cd src/frontend
npm run dev
```

## 🎯 How to Use Google Calendar Sync

### 1. **Connect to Google Calendar**
- Navigate to the Calendar page in Synapse
- Click the **"Sync Google"** button in the top toolbar
- If not connected, you'll be prompted to sign in with Google
- Grant calendar permissions when requested

### 2. **Perform Sync**
- Click **"Sync Google"** button again to start synchronization
- The button will show "Syncing..." with a spinning icon
- Watch the sync status indicator: `📅 X/Y 🔗` (synced/total events)

### 3. **Visual Indicators**

#### Event Colors:
- **Local Events**: Blue (`bg-blue-500`)
- **Google Calendar Events**: Emerald Green (`bg-emerald-600`)

#### Sync Status Icons:
- 🔄 **Blue Refresh**: Ready to sync
- ✅ **Green Check**: All events synced successfully  
- ⚠️ **Red Alert**: Some events have sync errors

## 🔄 Sync Process Details

### Import from Google Calendar:
- Fetches events from your primary Google Calendar
- Time range: 6 months past to 2 years future
- Creates local copies with `syncStatus: 'synced'`
- Assigns emerald green color for visual distinction

### Export to Google Calendar:
- Finds local events not yet synced (`syncStatus: 'local_only'`, `'pending'`, or `'error'`)
- Creates corresponding events in Google Calendar
- Updates local events with Google event IDs
- Sets `syncStatus: 'synced'` when successful

### Bidirectional Updates:
- **Create locally** → **Exports to Google** ✅
- **Create in Google** → **Imports to local** ✅
- **Edit locally** → **Updates in Google** ✅
- **Edit in Google** → **Updates locally** ✅

## 🛠️ Troubleshooting

### "Google Calendar service not configured properly"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart the backend server after updating environment variables
- Verify credentials are from a Google Cloud project with Calendar API enabled

### "Authentication cancelled" or Login Issues
- Ensure `VITE_GOOGLE_CLIENT_ID` matches `GOOGLE_CLIENT_ID` in `.env`
- Check that your domain is in the OAuth consent screen configuration
- Verify redirect URIs include `http://localhost:3000` and `http://localhost:5173`

### Events Not Syncing
- Check browser console for error messages
- Use the debug endpoint: `GET /calendar-events/debug` to see event status
- Verify you have calendar permissions in your Google account

### Color Issues
- Google Calendar events should appear in **emerald green**
- Local events should appear in **blue**
- If colors look wrong, clear browser cache and reload

## 🔍 Debug Information

### Backend Debug Logs
Look for these log patterns in your backend console:
```
[GoogleCalendarSync] Starting sync process...
[GoogleCalendarService] Found X events in Google Calendar
[GoogleCalendarService] Export completed. Exported: X events
```

### Frontend Debug
Open browser console and look for:
```
[Frontend] Starting Google Calendar sync...
[Frontend] Sync API response: {...}
[Frontend] Events refreshed
```

### API Endpoints for Testing
- `GET /calendar-events/debug` - View all events and their sync status
- `GET /calendar-events/sync/status` - Get current sync statistics
- `POST /calendar-events/sync` - Trigger manual sync

## 📝 Event Data Structure

### Local Events
```json
{
  "id": "mongodb_object_id",
  "title": "My Local Event",
  "color": "bg-blue-500",
  "syncStatus": "local_only"
}
```

### Google Calendar Events (After Import)
```json
{
  "id": "mongodb_object_id", 
  "title": "Google Event",
  "color": "bg-emerald-600",
  "googleEventId": "google_calendar_event_id",
  "syncStatus": "synced",
  "lastSyncAt": "2025-01-20T10:30:00Z"
}
```

## 🚀 Next Steps

1. **Set up your Google credentials** following Step 1-2
2. **Test the sync** by creating an event locally and syncing
3. **Verify bidirectional sync** by creating an event in Google Calendar and syncing
4. **Monitor the sync status** indicator to ensure everything works

The sync should now work seamlessly in both directions with proper color coding to distinguish between local and Google Calendar events!