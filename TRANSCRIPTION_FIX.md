# Transcription Service Fix

## Problem
The main service was trying to use local Python script instead of the external transcription service because `TRANSCRIPTION_SERVICE_URL` was not configured.

## Solution
Add the following environment variable to Render:

```
TRANSCRIPTION_SERVICE_URL=https://synapse-transcription.onrender.com
```

## How it works
- When `TRANSCRIPTION_SERVICE_URL` is set, the main service will use the external transcription service
- When not set, it falls back to local Python script (which was failing)

## Files affected
- `src/backend/.env` (local development only - add the URL there too)
- Render environment variables (production)

The external transcription service at `https://synapse-transcription.onrender.com` is already deployed and working with the Hebrew Whisper model.
