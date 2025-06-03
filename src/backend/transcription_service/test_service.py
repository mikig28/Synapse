#!/usr/bin/env python3
"""
Simple test script for the transcription service
"""

try:
    import requests
except ImportError:  # Fallback when requests isn't installed
    requests = None
import sys
import os

def run_health_check_test():
    """Test the health check endpoint"""
    if requests is None:
        print("'requests' library not available. Skipping health check.")
        return False
    try:
        response = requests.get("http://localhost:8000/health")
        print(f"Health check status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def run_transcription_test(audio_file_path):
    """Test transcription with a file"""
    if requests is None:
        print("'requests' library not available. Skipping transcription test.")
        return False
    if not os.path.exists(audio_file_path):
        print(f"Audio file not found: {audio_file_path}")
        return False
    
    try:
        with open(audio_file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post("http://localhost:8000/transcribe", files=files)
        
        print(f"Transcription status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Transcribed text: {result.get('text', 'No text')}")
            print(f"Language: {result.get('language', 'Unknown')}")
            print(f"Confidence: {result.get('language_probability', 'Unknown')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Transcription test failed: {e}")
        return False

if __name__ == "__main__":
    print("Testing Transcription Service...")
    
    # Test health check
    print("\n1. Testing health check...")
    if not run_health_check_test():
        print("Health check failed. Make sure the service is running.")
        sys.exit(1)
    
    # Test transcription if audio file provided
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        print(f"\n2. Testing transcription with {audio_file}...")
        if run_transcription_test(audio_file):
            print("Transcription test passed!")
        else:
            print("Transcription test failed!")
    else:
        print("\n2. Skipping transcription test (no audio file provided)")
        print("Usage: python test_service.py [audio_file.oga]")
    
    print("\nTest completed!") 