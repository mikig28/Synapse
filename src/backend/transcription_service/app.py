"""
Transcription Service for Voice Memos
This service handles audio transcription using Whisper and can be deployed separately on Render
Fixed version with proper model downloading and caching for Render deployment
"""

import os
import sys
import io
import tempfile
import logging
from contextlib import asynccontextmanager
from typing import Optional
from pathlib import Path
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
import faster_whisper
from dotenv import load_dotenv
import time
import huggingface_hub

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure stdout is configured for UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# --- Configuration ---
# Use fallback models if the Hebrew model fails
PRIMARY_MODEL = os.getenv('WHISPER_MODEL', 'ivrit-ai/whisper-large-v3-ct2')
FALLBACK_MODEL = 'openai/whisper-small'
LANGUAGE_CODE = os.getenv('WHISPER_LANGUAGE', 'he')
DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')
API_KEY = os.getenv('TRANSCRIPTION_API_KEY', '')

# Set up cache directories with proper permissions
CACHE_DIR = os.getenv('MODEL_CACHE_DIR', '/app/models')
os.makedirs(CACHE_DIR, exist_ok=True)

# Set HuggingFace cache environment variables
os.environ['HF_HOME'] = CACHE_DIR
os.environ['TRANSFORMERS_CACHE'] = CACHE_DIR
os.environ['HUGGINGFACE_HUB_CACHE'] = CACHE_DIR

# Global model variable
model = None
current_model_name = None

class TranscriptionRequest(BaseModel):
    audio_url: str
    
class TranscriptionResponse(BaseModel):
    text: str
    language: Optional[str] = None
    language_probability: Optional[float] = None
    model_used: Optional[str] = None
    
class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    status: str
    model_loaded: bool
    model_name: Optional[str] = None

def download_model_with_retry(model_name: str, max_retries: int = 3) -> bool:
    """Download model with retry logic"""
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to download model {model_name} (attempt {attempt + 1}/{max_retries})")
            
            # Try to download the model using huggingface_hub
            model_path = huggingface_hub.snapshot_download(
                model_name,
                cache_dir=CACHE_DIR,
                local_files_only=False,
                resume_download=True
            )
            logger.info(f"Model {model_name} downloaded successfully to {model_path}")
            return True
            
        except Exception as e:
            logger.warning(f"Failed to download {model_name} on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                time.sleep(5)  # Wait before retry
            
    return False

def load_model_with_fallback():
    """Load the Whisper model with fallback options"""
    global model, current_model_name
    
    if model is not None:
        return True
    
    # Try primary model first
    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]
    
    for model_name in models_to_try:
        try:
            logger.info(f"Attempting to load model: {model_name}")
            
            # First try to load directly (in case it's already cached)
            try:
                model = faster_whisper.WhisperModel(
                    model_name,
                    device=DEVICE,
                    compute_type=COMPUTE_TYPE,
                    local_files_only=True,  # Try cached first
                    download_root=CACHE_DIR
                )
                current_model_name = model_name
                logger.info(f"Model {model_name} loaded successfully from cache")
                return True
            except Exception as cache_error:
                logger.info(f"Model not in cache, attempting download: {cache_error}")
                
                # If not cached, try to download
                if download_model_with_retry(model_name):
                    try:
                        model = faster_whisper.WhisperModel(
                            model_name,
                            device=DEVICE,
                            compute_type=COMPUTE_TYPE,
                            local_files_only=False,
                            download_root=CACHE_DIR
                        )
                        current_model_name = model_name
                        logger.info(f"Model {model_name} loaded successfully after download")
                        return True
                    except Exception as load_error:
                        logger.error(f"Failed to load {model_name} after download: {load_error}")
                
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            continue
    
    logger.error("All model loading attempts failed")
    return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    logger.info("Starting transcription service...")
    logger.info(f"Cache directory: {CACHE_DIR}")
    logger.info(f"Primary model: {PRIMARY_MODEL}")
    logger.info(f"Fallback model: {FALLBACK_MODEL}")
    
    try:
        success = load_model_with_fallback()
        if success:
            logger.info(f"Service started successfully with model: {current_model_name}")
        else:
            logger.error("Failed to load any model during startup")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down transcription service...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Synapse Transcription Service", 
    version="1.0.0",
    description="Audio transcription service with Hebrew support and fallback models",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Synapse Transcription Service is running", 
        "status": "healthy",
        "model": current_model_name
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    global model, current_model_name
    
    # Try to load model if not already loaded
    if model is None:
        success = load_model_with_fallback()
        if not success:
            raise HTTPException(status_code=503, detail="No models available")
    
    return HealthResponse(
        status="healthy",
        model_loaded=model is not None,
        model_name=current_model_name
    )

@app.post("/transcribe", response_model=TranscriptionResponse, tags=["Transcription"])
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe an uploaded audio file
    """
    global model, current_model_name
    
    if not model:
        success = load_model_with_fallback()
        if not success:
            raise HTTPException(status_code=503, detail="No transcription models available")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".oga") as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_file_path = tmp_file.name
    
    try:
        # Transcribe the audio file
        logger.info(f"Transcribing file: {file.filename} using model: {current_model_name}")
        
        # Use language detection if LANGUAGE_CODE is not set or if using fallback model
        language = LANGUAGE_CODE if current_model_name == PRIMARY_MODEL else None
        
        segments, info = model.transcribe(
            tmp_file_path, 
            language=language, 
            beam_size=5,
            word_timestamps=False
        )
        
        logger.info(f"Detected language '{info.language}' with probability {info.language_probability}")
        
        # Concatenate segments to get the full transcription
        transcribed_text = "".join([segment.text for segment in segments])
        
        return TranscriptionResponse(
            text=transcribed_text.strip(),
            language=info.language,
            language_probability=info.language_probability,
            model_used=current_model_name
        )
        
    except Exception as e:
        logger.error(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(tmp_file_path):
            os.unlink(tmp_file_path)

@app.post("/transcribe-url", response_model=TranscriptionResponse, tags=["Transcription"])
async def transcribe_from_url(request: TranscriptionRequest):
    """
    Transcribe audio from a URL
    """
    global model, current_model_name
    
    if not model:
        success = load_model_with_fallback()
        if not success:
            raise HTTPException(status_code=503, detail="No transcription models available")
    
    # Download audio from URL
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
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
        logger.info(f"Transcribing from URL: {request.audio_url} using model: {current_model_name}")
        
        # Use language detection if LANGUAGE_CODE is not set or if using fallback model
        language = LANGUAGE_CODE if current_model_name == PRIMARY_MODEL else None
        
        segments, info = model.transcribe(
            tmp_file_path, 
            language=language, 
            beam_size=5,
            word_timestamps=False
        )
        
        logger.info(f"Detected language '{info.language}' with probability {info.language_probability}")
        
        # Concatenate segments to get the full transcription
        transcribed_text = "".join([segment.text for segment in segments])
        
        return TranscriptionResponse(
            text=transcribed_text.strip(),
            language=info.language,
            language_probability=info.language_probability,
            model_used=current_model_name
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
    logger.info(f"Starting server on port {port}")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )
