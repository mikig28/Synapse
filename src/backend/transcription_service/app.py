"""
Transcription Service for Voice Memos
This service handles audio transcription using Whisper and can be deployed separately on Render
"""

import os
import sys
import io
import tempfile
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import faster_whisper
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure stdout is configured for UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# --- Configuration ---
MODEL_NAME = os.getenv('WHISPER_MODEL', 'ivrit-ai/whisper-large-v3-ct2')
LANGUAGE_CODE = os.getenv('WHISPER_LANGUAGE', 'he')
DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')
API_KEY = os.getenv('TRANSCRIPTION_API_KEY', '')  # Optional API key for authentication

# Initialize FastAPI app
app = FastAPI(title="Transcription Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

class TranscriptionRequest(BaseModel):
    audio_url: str
    
class TranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = None
    language_probability: Optional[float] = None
    
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool

def load_model():
    """Load the Whisper model"""
    global model
    if model is None:
        logger.info(f"Loading model {MODEL_NAME} on device {DEVICE} with compute type {COMPUTE_TYPE}...")
        try:
            model = faster_whisper.WhisperModel(
                MODEL_NAME, 
                device=DEVICE, 
                compute_type=COMPUTE_TYPE,
                local_files_only=False
            )
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    try:
        load_model()
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=model is not None
    )

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe an uploaded audio file
    """
    if not model:
        try:
            load_model()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".oga") as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Transcribe the audio file
        logger.info(f"Transcribing file: {file.filename}")
        segments, info = model.transcribe(tmp_file_path, language=LANGUAGE_CODE, beam_size=5)
        
        logger.info(f"Detected language '{info.language}' with probability {info.language_probability}")
        
        # Concatenate segments to get the full transcription
        transcribed_text = "".join([segment.text for segment in segments])
        
        return TranscriptionResponse(
            text=transcribed_text.strip(),
            language=info.language,
            language_probability=info.language_probability
        )
        
    except Exception as e:
        logger.error(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)

@app.post("/transcribe-url", response_model=TranscriptionResponse)
async def transcribe_from_url(request: TranscriptionRequest):
    """
    Transcribe audio from a URL
    """
    if not model:
        try:
            load_model()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Model loading failed: {str(e)}")
    
    # Download audio from URL
    import httpx
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(request.audio_url)
            response.raise_for_status()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to download audio: {str(e)}")
    
    # Save to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".oga") as tmp_file:
        tmp_file.write(response.content)
        tmp_file_path = tmp_file.name
    
    try:
        # Transcribe the audio file
        logger.info(f"Transcribing from URL: {request.audio_url}")
        segments, info = model.transcribe(tmp_file_path, language=LANGUAGE_CODE, beam_size=5)
        
        logger.info(f"Detected language '{info.language}' with probability {info.language_probability}")
        
        # Concatenate segments to get the full transcription
        transcribed_text = "".join([segment.text for segment in segments])
        
        return TranscriptionResponse(
            text=transcribed_text.strip(),
            language=info.language,
            language_probability=info.language_probability
        )
        
    except Exception as e:
        logger.error(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 