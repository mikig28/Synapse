# File: src/backend/python_scripts/transcribe_audio.py
import faster_whisper
import sys
import os
import io # Import io

# Ensure stdout is configured for UTF-8
# This helps when Python's output is piped/captured, especially on Windows.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8') # Also for stderr for consistency

# --- Configuration ---
# Model name from Hugging Face
MODEL_NAME = 'ivrit-ai/whisper-large-v3-ct2'
# Language code for transcription (Hebrew)
LANGUAGE_CODE = 'he'
# Device: "cuda" for GPU (requires CUDA and compatible PyTorch), "cpu" otherwise
# Compute type: "float16" for GPU (faster, good precision),
#               "int8" for CPU (faster, slightly lower precision),
#               "float32" for CPU (slower, higher precision)
# Choose based on your hardware setup
DEVICE = "cpu" # Default to CPU, change to "cuda" if GPU is available
COMPUTE_TYPE = "int8" # Good balance for CPU, change to "float16" for GPU
# --- End Configuration ---

# Initialize the global model variable
model = None

def transcribe_audio_file(audio_path):
    """Transcribes the given audio file and returns the text."""
    global model # Access the global model instance
    if model is None:
        print(f"Loading model {MODEL_NAME} on device {DEVICE} with compute type {COMPUTE_TYPE}...")
        try:
            # Ensure it attempts to download if not cached
            model = faster_whisper.WhisperModel(
                MODEL_NAME, 
                device=DEVICE, 
                compute_type=COMPUTE_TYPE,
                local_files_only=False # <-- Explicitly allow download
            )
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            raise # Re-raise the exception to be caught by the main block

    if not os.path.exists(audio_path):
        print(f"Error: Audio file not found at {audio_path}", file=sys.stderr)
        return None # Or raise an error

    try:
        # Transcribe the audio file
        print(f"Transcribing {audio_path}...", file=sys.stderr)
        # beam_size=5 is a common default, adjust if needed
        segments, info = model.transcribe(audio_path, language=LANGUAGE_CODE, beam_size=5)
        print(f"Detected language '{info.language}' with probability {info.language_probability}", file=sys.stderr)

        # Concatenate segments to get the full transcription
        transcribed_text = "".join([segment.text for segment in segments])

        # Print the final transcription to standard output
        print(transcribed_text.strip())
        print("Transcription complete.", file=sys.stderr)

        return transcribed_text.strip()

    except Exception as e:
        print(f"Error during transcription process: {e}", file=sys.stderr)
        # Print traceback for more details during debugging
        import traceback
        traceback.print_exc(file=sys.stderr)
        return None

if __name__ == "__main__":
    # Ensure an audio file path is provided as a command-line argument
    if len(sys.argv) > 1:
        audio_file_path = sys.argv[1]
        # Call the transcription function with the provided path
        transcribed_text = transcribe_audio_file(audio_file_path)
        if transcribed_text is None:
            sys.exit(1)
    else:
        # Print usage instructions if no argument is provided
        print("Usage: python transcribe_audio.py <path_to_audio_file>", file=sys.stderr)
        sys.exit(1) 