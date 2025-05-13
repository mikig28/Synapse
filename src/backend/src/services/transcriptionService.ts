import fs from 'fs';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';

dotenv.config();

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const TRANSCRIPTION_SCRIPT_PATH = path.join(__dirname, '..', '..', 'python_scripts', 'transcribe_audio.py');

export const transcribeAudio = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const absoluteFilePath = path.resolve(filePath);

    console.log(`[TranscriptionService]: Spawning Python script: ${PYTHON_EXECUTABLE} ${TRANSCRIPTION_SCRIPT_PATH} ${absoluteFilePath}`);

    const pythonProcess = spawn(PYTHON_EXECUTABLE, [TRANSCRIPTION_SCRIPT_PATH, absoluteFilePath]);

    let transcribedText = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      transcribedText += data.toString();
      console.log(`[TranscriptionService]: Python script stdout: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[TranscriptionService]: Python script stderr: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`[TranscriptionService]: Python script exited with code ${code}`);
      if (code === 0 && transcribedText.trim()) {
        resolve(transcribedText.trim());
      } else {
        const errorMessage = `Python script failed with code ${code}. Error: ${errorOutput.trim() || 'No stderr output'}`;
        console.error(`[TranscriptionService]: ${errorMessage}`);
        reject(new Error(errorMessage));
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('[TranscriptionService]: Failed to start Python script.', err);
      reject(err);
    });
  });
}; 