"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = void 0;
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const TRANSCRIPTION_SERVICE_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://localhost:8000';
const TRANSCRIPTION_API_KEY = process.env.TRANSCRIPTION_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
// Fallback to local Python script if service URL is not configured
const USE_LOCAL_PYTHON = !process.env.TRANSCRIPTION_SERVICE_URL;
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const TRANSCRIPTION_SCRIPT_PATH = path_1.default.join(__dirname, '..', '..', 'python_scripts', 'transcribe_audio.py');
const transcribeAudio = async (filePath) => {
    const absoluteFilePath = path_1.default.resolve(filePath);
    // Try multiple transcription methods in order of preference
    const transcriptionMethods = [
        { name: 'Dedicated Service', method: () => transcribeWithDedicatedService(absoluteFilePath), critical: false },
        { name: 'OpenAI API', method: () => transcribeWithOpenAI(absoluteFilePath), critical: true },
        { name: 'Local Python', method: () => transcribeAudioLocal(absoluteFilePath), critical: false }
    ];
    let lastError = null;
    for (const { name, method, critical } of transcriptionMethods) {
        try {
            console.log(`[TranscriptionService]: Attempting transcription with ${name}`);
            const result = await method();
            console.log(`[TranscriptionService]: Transcription successful with ${name}`);
            return result;
        }
        catch (error) {
            console.error(`[TranscriptionService]: ${name} failed:`, error.message);
            lastError = error;
            // If this is a critical method (like OpenAI API) and it failed due to configuration,
            // log more detailed information
            if (critical && error.message.includes('API key')) {
                console.error(`[TranscriptionService]: Critical service ${name} failed due to missing configuration. Please check your API keys.`);
            }
            continue;
        }
    }
    // If all methods fail, throw the last error
    throw lastError || new Error('All transcription methods failed');
};
exports.transcribeAudio = transcribeAudio;
// Dedicated transcription service
const transcribeWithDedicatedService = async (filePath) => {
    if (USE_LOCAL_PYTHON) {
        throw new Error('Dedicated service not configured');
    }
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`);
    }
    // Create form data
    const formData = new form_data_1.default();
    formData.append('file', fs_1.default.createReadStream(filePath));
    // Make API request with proper typing
    const response = await axios_1.default.post(`${TRANSCRIPTION_SERVICE_URL}/transcribe`, formData, {
        headers: {
            ...formData.getHeaders(),
            ...(TRANSCRIPTION_API_KEY && { 'Authorization': `Bearer ${TRANSCRIPTION_API_KEY}` })
        },
        timeout: 120000 // 2 minutes timeout
    });
    if (response.data && response.data.text) {
        return response.data.text;
    }
    else {
        throw new Error('No transcription text received from dedicated service');
    }
};
// OpenAI Whisper API transcription
const transcribeWithOpenAI = async (filePath) => {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
    }
    // Check if file exists
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`);
    }
    // Create form data for OpenAI API
    const formData = new form_data_1.default();
    formData.append('file', fs_1.default.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'he'); // Hebrew language hint
    // Make request to OpenAI API
    const response = await axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 120000 // 2 minutes timeout
    });
    if (response.data && response.data.text) {
        return response.data.text;
    }
    else {
        throw new Error('No transcription text received from OpenAI API');
    }
};
// Local Python transcription with improved error handling and JSON support
const transcribeAudioLocal = (filePath) => {
    return new Promise((resolve, reject) => {
        // Check if Python executable exists before attempting to spawn
        const fs = require('fs');
        const { exec } = require('child_process');
        // Quick check if Python is available
        exec(`${PYTHON_EXECUTABLE} --version`, (error) => {
            if (error) {
                reject(new Error(`Python not found: ${PYTHON_EXECUTABLE}. Install Python or use other transcription methods.`));
                return;
            }
            // Check if script exists
            if (!fs.existsSync(TRANSCRIPTION_SCRIPT_PATH)) {
                reject(new Error(`Transcription script not found: ${TRANSCRIPTION_SCRIPT_PATH}`));
                return;
            }
            console.log(`[TranscriptionService]: Spawning Python script: ${PYTHON_EXECUTABLE} ${TRANSCRIPTION_SCRIPT_PATH} ${filePath}`);
            const { spawn } = require('child_process');
            const pythonProcess = spawn(PYTHON_EXECUTABLE, [TRANSCRIPTION_SCRIPT_PATH, filePath]);
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
                    // Try to parse JSON response from the improved Python script
                    try {
                        const jsonResponse = JSON.parse(transcribedText.trim());
                        if (jsonResponse.success && jsonResponse.text) {
                            console.log(`[TranscriptionService]: Transcription successful via local Python script`);
                            resolve(jsonResponse.text);
                        }
                        else {
                            const errorMessage = jsonResponse.error || 'Unknown error from Python script';
                            console.error(`[TranscriptionService]: Python script returned error: ${errorMessage}`);
                            if (jsonResponse.suggestion) {
                                console.log(`[TranscriptionService]: Suggestion: ${jsonResponse.suggestion}`);
                            }
                            reject(new Error(errorMessage));
                        }
                    }
                    catch (parseError) {
                        // Fallback to treating output as plain text (for backward compatibility)
                        console.log(`[TranscriptionService]: Could not parse JSON, treating as plain text`);
                        resolve(transcribedText.trim());
                    }
                }
                else {
                    // Handle error cases
                    let errorMessage = `Python script failed with code ${code}`;
                    // Try to parse error output as JSON
                    try {
                        const errorJson = JSON.parse(errorOutput);
                        if (errorJson.error) {
                            errorMessage = errorJson.error;
                            if (errorJson.suggestion) {
                                console.log(`[TranscriptionService]: Suggestion: ${errorJson.suggestion}`);
                            }
                            if (errorJson.fallback) {
                                console.log(`[TranscriptionService]: Fallback option: ${errorJson.fallback}`);
                            }
                        }
                    }
                    catch (parseError) {
                        // Use raw error output if JSON parsing fails
                        errorMessage += `. Error: ${errorOutput.trim() || 'No stderr output'}`;
                    }
                    console.error(`[TranscriptionService]: ${errorMessage}`);
                    reject(new Error(errorMessage));
                }
            });
            pythonProcess.on('error', (err) => {
                console.error('[TranscriptionService]: Failed to start Python script.', err);
                reject(err);
            });
        });
    });
};
