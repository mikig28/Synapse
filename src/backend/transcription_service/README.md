# Transcription Service

This is a standalone FastAPI service for transcribing Hebrew voice memos using the Whisper model.

## Features

- Hebrew transcription using `ivrit-ai/whisper-large-v3-ct2` model
- FastAPI REST API with automatic documentation
- File upload and URL-based transcription
- Health check endpoint
- Docker containerization for easy deployment

## API Endpoints

### Health Check
```
GET /health
```
Returns the service status and whether the model is loaded.

### Transcribe File
```
POST /transcribe
Content-Type: multipart/form-data
```
Upload an audio file for transcription.

### Transcribe from URL
```
POST /transcribe-url
Content-Type: application/json
{
  "audio_url": "https://example.com/audio.oga"
}
```

## Environment Variables

- `WHISPER_MODEL`: Model name (default: `ivrit-ai/whisper-large-v3-ct2`)
- `WHISPER_LANGUAGE`: Language code (default: `he`)
- `WHISPER_DEVICE`: Device to use (default: `cpu`)
- `WHISPER_COMPUTE_TYPE`: Compute type (default: `int8`)
- `PORT`: Port to run on (default: `8000`)
- `TRANSCRIPTION_API_KEY`: Optional API key for authentication

## Local Development

1. Install dependencies:
```bash
pip install -r ../requirements.txt
```

2. Run the service:
```bash
python app.py
```

3. Access the API documentation at `http://localhost:8000/docs`

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the following:
   - **Build Command**: Leave empty (Docker build)
   - **Start Command**: Leave empty (uses Dockerfile CMD)
   - **Dockerfile Path**: `src/backend/transcription_service/Dockerfile`
   - **Docker Context**: `src/backend/transcription_service`

4. Add environment variables in Render dashboard:
   - `WHISPER_MODEL`: `ivrit-ai/whisper-large-v3-ct2`
   - `WHISPER_LANGUAGE`: `he`
   - `WHISPER_DEVICE`: `cpu`
   - `WHISPER_COMPUTE_TYPE`: `int8`
   - `PORT`: `8000`

5. Add a persistent disk:
   - **Name**: `whisper-models`
   - **Mount Path**: `/app/models`
   - **Size**: 10GB

6. Deploy and wait for the model to download on first startup

## Integration with Main Backend

In your main backend service, set the environment variable:

```bash
TRANSCRIPTION_SERVICE_URL=https://your-transcription-service.onrender.com
```

The backend will automatically use the API service instead of local Python scripts.

## Performance Notes

- First startup will be slow as the Whisper model downloads (~3GB)
- Consider upgrading to a higher Render plan for better performance
- The model is cached on the persistent disk for faster subsequent startups
- CPU transcription is slower but more cost-effective than GPU

## Troubleshooting

1. **Model download fails**: Check internet connectivity and disk space
2. **Out of memory**: Upgrade to a plan with more RAM
3. **Slow transcription**: Consider upgrading to a GPU-enabled plan
4. **Health check fails**: Model may still be loading, wait a few minutes 