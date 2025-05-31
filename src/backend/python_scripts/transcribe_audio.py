# File: src/backend/python_scripts/transcribe_audio.py
import sys
import os
import io
import json

# Ensure stdout is configured for UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        import faster_whisper
        return True, None
    except ImportError as e:
        return False, str(e)

def transcribe_audio_file(audio_path):
    """Transcribes the given audio file and returns the text."""
    
    # Check dependencies first
    deps_available, error_msg = check_dependencies()
    if not deps_available:
        error_response = {
            "success": False,
            "error": f"Missing dependency: {error_msg}",
            "suggestion": "Please install faster-whisper: pip install faster-whisper",
            "fallback": "Consider using the dedicated transcription service instead"
        }
        print(json.dumps(error_response), file=sys.stderr)
        return None
    
    # Import after dependency check
    import faster_whisper
    
    # Configuration
    MODEL_NAME = 'ivrit-ai/whisper-large-v3-ct2'
    FALLBACK_MODEL = 'openai/whisper-small'
    LANGUAGE_CODE = 'he'
    DEVICE = "cpu"
    COMPUTE_TYPE = "int8"
    
    global model
    if 'model' not in globals() or model is None:
        print(f"Loading model {MODEL_NAME} on device {DEVICE} with compute type {COMPUTE_TYPE}...", file=sys.stderr)
        
        # Try primary model first, then fallback
        models_to_try = [MODEL_NAME, FALLBACK_MODEL]
        
        for model_name in models_to_try:
            try:
                model = faster_whisper.WhisperModel(
                    model_name, 
                    device=DEVICE, 
                    compute_type=COMPUTE_TYPE,
                    local_files_only=False
                )
                print(f"Successfully loaded model: {model_name}", file=sys.stderr)
                break
            except Exception as e:
                print(f"Failed to load {model_name}: {e}", file=sys.stderr)
                if model_name == models_to_try[-1]:  # Last model failed
                    error_response = {
                        "success": False,
                        "error": f"Failed to load any Whisper model: {str(e)}",
                        "suggestion": "Check internet connection and model availability"
                    }
                    print(json.dumps(error_response), file=sys.stderr)
                    return None

    if not os.path.exists(audio_path):
        error_response = {
            "success": False,
            "error": f"Audio file not found: {audio_path}"
        }
        print(json.dumps(error_response), file=sys.stderr)
        return None

    try:
        print(f"Transcribing {audio_path}...", file=sys.stderr)
        segments, info = model.transcribe(audio_path, language=LANGUAGE_CODE, beam_size=5)
        print(f"Detected language '{info.language}' with probability {info.language_probability}", file=sys.stderr)

        # Concatenate segments to get the full transcription
        transcribed_text = "".join([segment.text for segment in segments])
        
        # Return success response as JSON
        success_response = {
            "success": True,
            "text": transcribed_text.strip(),
            "language": info.language,
            "language_probability": info.language_probability
        }
        
        print(json.dumps(success_response))
        print("Transcription complete.", file=sys.stderr)
        return transcribed_text.strip()

    except Exception as e:
        print(f"Error during transcription process: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        error_response = {
            "success": False,
            "error": f"Transcription failed: {str(e)}"
        }
        print(json.dumps(error_response), file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        audio_file_path = sys.argv[1]
        transcribed_text = transcribe_audio_file(audio_file_path)
        if transcribed_text is None:
            sys.exit(1)
    else:
        error_response = {
            "success": False,
            "error": "Usage: python transcribe_audio.py <path_to_audio_file>"
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)
