#!/bin/bash

# Install Python dependencies for transcription service
echo "Installing Python dependencies for transcription service..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "pip3 not found. Please install pip."
    exit 1
fi

# Install dependencies from requirements.txt
echo "Installing dependencies from requirements.txt..."
pip3 install -r requirements.txt

echo "Python dependencies installed successfully!"
echo ""
echo "To test the transcription service, you can run:"
echo "python3 python_scripts/transcribe_audio.py <path_to_audio_file>"
