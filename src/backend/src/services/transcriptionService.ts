import fs from 'fs';
import dotenv from 'dotenv';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import path from 'path';

dotenv.config();

// Define the response type from the transcription API
interface TranscriptionApiResponse {
  text: string;
  language?: string;
  language_probability?: number;
}

const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8000';
const TRANSCRIPTION_API_KEY = process.env.TRANSCRIPTION_API_KEY || '';

// Fallback to local Python script if service URL is not configured
const USE_LOCAL_PYTHON = !process.env.TRANSCRIPTION_SERVICE_URL;
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const TRANSCRIPTION_SCRIPT_PATH = path.join(__dirname, '..', '..', 'python_scripts', 'transcribe_audio.py');

export const transcribeAudio = async (filePath: string): Promise<string> => {
  const absoluteFilePath = path.resolve(filePath);
  
  // If transcription service URL is configured, use the API
  if (!USE_LOCAL_PYTHON) {
    console.log(`[TranscriptionService]: Using API service at ${TRANSCRIPTION_SERVICE_URL}`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(absoluteFilePath)) {
        throw new Error(`Audio file not found: ${absoluteFilePath}`);
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(absoluteFilePath));
      
      // Make API request with proper typing
      const response: AxiosResponse<TranscriptionApiResponse> = await axios.post(
        `${TRANSCRIPTION_SERVICE_URL}/transcribe`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            ...(TRANSCRIPTION_API_KEY && { 'Authorization': `Bearer ${TRANSCRIPTION_API_KEY}` })
          },
          timeout: 120000 // 2 minutes timeout
        }
      );
      
      if (response.data && response.data.text) {
        console.log(`[TranscriptionService]: Transcription successful via API`);
        return response.data.text;
      } else {
        throw new Error('No transcription text received from API');
      }
      
    } catch (error: any) {
      console.error('[TranscriptionService]: API transcription failed:', error.message);
      
      // If API fails and local Python is available, fall back to it
      if (fs.existsSync(TRANSCRIPTION_SCRIPT_PATH)) {
        console.log('[TranscriptionService]: Falling back to local Python script');
        return transcribeAudioLocal(absoluteFilePath);
      }
      
      throw error;
    }
  } else {
    // Use local Python script
    console.log('[TranscriptionService]: Using local Python script');
    return transcribeAudioLocal(absoluteFilePath);
  }
};

// Local Python transcription (original implementation)
const transcribeAudioLocal = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`[TranscriptionService]: Spawning Python script: ${PYTHON_EXECUTABLE} ${TRANSCRIPTION_SCRIPT_PATH} ${filePath}`);
    
    const { spawn } = require('child_process');
    const pythonProcess = spawn(PYTHON_EXECUTABLE, [TRANSCRIPTION_SCRIPT_PATH, filePath]);

    let transcribedText = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data: Buffer) => {
      transcribedText += data.toString();
      console.log(`[TranscriptionService]: Python script stdout: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
      console.error(`[TranscriptionService]: Python script stderr: ${data.toString()}`);
    });

    pythonProcess.on('close', (code: number) => {
      console.log(`[TranscriptionService]: Python script exited with code ${code}`);
      if (code === 0 && transcribedText.trim()) {
        resolve(transcribedText.trim());
      } else {
        const errorMessage = `Python script failed with code ${code}. Error: ${errorOutput.trim() || 'No stderr output'}`;
        console.error(`[TranscriptionService]: ${errorMessage}`);
        reject(new Error(errorMessage));
      }
    });

    pythonProcess.on('error', (err: Error) => {
      console.error('[TranscriptionService]: Failed to start Python script.', err);
      reject(err);
    });
  });
}; 