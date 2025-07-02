# Transcription Service Fix Instructions

## Issue Fixed
The transcription service was failing because the Hebrew model (`ivrit-ai/whisper-large-v3-ct2`) was too large for Render.com's starter plan. The model couldn't load, causing `model_loaded: false` in health checks.

## Changes Made

### 1. Updated Model Configuration
- **Primary Model**: Changed from `ivrit-ai/whisper-large-v3-ct2` to `openai/whisper-small`
- **Fallback Model**: Changed from `openai/whisper-small` to `openai/whisper-tiny`

### 2. Files Modified
- `src/backend/transcription_service/app.py`
- `src/backend/transcription_service/render.yaml`
- `src/backend/transcription_service/Dockerfile`
- `src/backend/python_scripts/transcribe_audio.py`

## Deployment Steps

### Option 1: Automatic Render Deployment
If you have Render auto-deploy enabled:
1. Commit and push these changes
2. Render will automatically redeploy the transcription service
3. Wait 5-10 minutes for deployment to complete

### Option 2: Manual Render Deployment
1. Go to your Render dashboard
2. Find the "synapse-transcription" service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete

## Verification Steps

After deployment, test the service:

```bash
# Test health endpoint
curl -X GET "https://synapse-transcription.onrender.com/health"
# Should return: {"status":"healthy","model_loaded":true,"model_name":"openai/whisper-small"}

# Test root endpoint
curl -X GET "https://synapse-transcription.onrender.com/"
# Should return: {"message":"Synapse Transcription Service is running","status":"healthy","model":"openai/whisper-small"}
```

## Expected Improvements

1. **Faster Startup**: Smaller models load much faster
2. **Reliable Service**: No more model loading failures
3. **Better Resource Usage**: Fits within Render's starter plan limits
4. **Maintained Hebrew Support**: Models still support Hebrew language detection

## Fallback Chain

The system now uses this fallback chain:
1. **Dedicated Service** (openai/whisper-small) - Primary
2. **OpenAI API** (whisper-1) - Secondary
3. **Local Python** (openai/whisper-small) - Tertiary

## Performance Notes

- **openai/whisper-small**: ~244MB, good accuracy, Hebrew support
- **openai/whisper-tiny**: ~39MB, basic accuracy, emergency fallback
- Both models are much more reliable than the large Hebrew model

## Future Considerations

If you need better Hebrew accuracy later:
1. Upgrade Render plan to Standard or Pro
2. Revert to `ivrit-ai/whisper-large-v3-ct2` as primary model
3. Keep current setup as fallback

The current setup prioritizes reliability over maximum Hebrew accuracy.