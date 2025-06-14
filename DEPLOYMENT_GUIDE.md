# Voice Memo Transcription Deployment Guide

This guide will help you deploy the voice memo transcription feature that works with your Telegram bot to automatically transcribe Hebrew voice messages and categorize them as tasks, notes, or ideas.

## Architecture Overview

The solution consists of two parts:
1. **Transcription Service**: A standalone FastAPI service that handles audio transcription using Whisper
2. **Main Backend**: Your existing Node.js/TypeScript backend that integrates with the transcription service

## Step 1: Deploy the Transcription Service on Render

### 1.1 Create a New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Service Details:**
- **Name**: `synapse-transcription` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your deployment branch)

**Build & Deploy:**
- **Runtime**: Docker
- **Dockerfile Path**: `src/backend/transcription_service/Dockerfile`
- **Docker Context**: `src/backend/transcription_service`
- **Build Command**: (leave empty)
- **Start Command**: (leave empty)

### 1.2 Configure Environment Variables

Add these environment variables in Render:

```
WHISPER_MODEL=ivrit-ai/whisper-large-v3-ct2
WHISPER_LANGUAGE=he
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
PORT=8000
```

### 1.3 Add Persistent Storage

1. In the service settings, go to "Disks"
2. Add a new disk:
   - **Name**: `whisper-models`
   - **Mount Path**: `/app/models`
   - **Size**: 10GB

This will cache the Whisper model between deployments.

### 1.4 Configure Health Check

- **Health Check Path**: `/health`

### 1.5 Choose a Plan

- **Starter Plan**: Good for testing, but may be slow
- **Standard Plan**: Recommended for production use
- **Pro Plan**: For high-volume usage

### 1.6 Deploy

1. Click "Create Web Service"
2. Wait for deployment (first deployment will take 10-15 minutes as the Whisper model downloads)
3. Note your service URL (e.g., `https://synapse-transcription.onrender.com`)

## Step 2: Configure Your Main Backend

### 2.1 Update Environment Variables

In your main backend service (or local `.env` file), add:

```bash
# Transcription Service Configuration
TRANSCRIPTION_SERVICE_URL=https://your-transcription-service.onrender.com

# Optional: API key for authentication (if you implement it)
TRANSCRIPTION_API_KEY=your_optional_api_key
```

### 2.2 Verify Integration

The updated `transcriptionService.ts` will automatically:
1. Try to use the API service first
2. Fall back to local Python script if the API is unavailable
3. Log which method is being used

## Step 3: Test the Integration

### 3.1 Test the Transcription Service

You can test the service directly:

```bash
# Health check
curl https://your-transcription-service.onrender.com/health

# Test with a file (if you have one)
curl -X POST -F "file=@test_audio.oga" https://your-transcription-service.onrender.com/transcribe
```

### 3.2 Test via Telegram

1. Send a voice message to your Telegram bot
2. Check the logs to see if it uses the API service
3. Verify that the transcription is categorized correctly

## Step 4: Monitor and Optimize

### 4.1 Monitor Performance

- Check Render metrics for response times
- Monitor memory usage
- Watch for any timeout errors

### 4.2 Optimize if Needed

**If transcription is slow:**
- Upgrade to a higher Render plan
- Consider using GPU compute type (requires plan upgrade)

**If you get memory errors:**
- Upgrade to a plan with more RAM
- Consider using a smaller Whisper model

**If you get timeout errors:**
- Increase timeout in `transcriptionService.ts`
- Consider breaking large audio files into chunks

## Step 5: Troubleshooting

### Common Issues

**Service won't start:**
- Check logs for model download errors
- Verify environment variables are set correctly
- Ensure sufficient disk space

**Transcription fails:**
- Check if the model loaded successfully (`/health` endpoint)
- Verify audio file format is supported
- Check service logs for errors

**Integration issues:**
- Verify `TRANSCRIPTION_SERVICE_URL` is set correctly
- Check network connectivity between services
- Review logs in both services

### Fallback Behavior

If the transcription service is unavailable, the system will:
1. Log the API failure
2. Attempt to use the local Python script (if available)
3. If both fail, the voice memo will be saved but not transcribed

## Step 6: Security Considerations

### 6.1 API Authentication (Optional)

To add API key authentication:

1. Set `TRANSCRIPTION_API_KEY` in both services
2. The main backend will send this as a Bearer token
3. The transcription service can validate it (implementation needed)

### 6.2 Network Security

- Consider using Render's private networking if both services are on Render
- Implement rate limiting if needed
- Monitor for unusual usage patterns

## Step 7: Scaling Considerations

### 7.1 High Volume Usage

For high-volume usage, consider:
- Multiple transcription service instances
- Load balancing
- Queue-based processing for non-real-time transcription

### 7.2 Cost Optimization

- Monitor usage and costs
- Consider using smaller models for less critical transcriptions
- Implement caching for repeated audio content

## Environment Variables Reference

### Transcription Service
```bash
WHISPER_MODEL=ivrit-ai/whisper-large-v3-ct2  # Whisper model to use
WHISPER_LANGUAGE=he                           # Language code
WHISPER_DEVICE=cpu                           # cpu or cuda
WHISPER_COMPUTE_TYPE=int8                    # int8, float16, float32
PORT=8000                                    # Service port
TRANSCRIPTION_API_KEY=                       # Optional API key
```

### Main Backend
```bash
TRANSCRIPTION_SERVICE_URL=https://your-service.onrender.com  # API URL
TRANSCRIPTION_API_KEY=                                       # Optional API key
PYTHON_EXECUTABLE=python                                     # Fallback Python
```

## Success Criteria

Your deployment is successful when:
1. ✅ Transcription service health check returns 200
2. ✅ Voice messages in Telegram are transcribed
3. ✅ Transcriptions are categorized as tasks/notes/ideas
4. ✅ Items appear in your Synapse dashboard
5. ✅ Fallback works if service is temporarily unavailable

## Support

If you encounter issues:
1. Check the service logs in Render dashboard
2. Verify all environment variables are set
3. Test the health endpoint
4. Review the integration logs in your main backend 