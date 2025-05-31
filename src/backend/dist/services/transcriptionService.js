"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const TRANSCRIPTION_SCRIPT_PATH = path_1.default.join(__dirname, '..', '..', 'python_scripts', 'transcribe_audio.py');
const transcribeAudio = (filePath) => {
    return new Promise((resolve, reject) => {
        const absoluteFilePath = path_1.default.resolve(filePath);
        console.log(`[TranscriptionService]: Spawning Python script: ${PYTHON_EXECUTABLE} ${TRANSCRIPTION_SCRIPT_PATH} ${absoluteFilePath}`);
        const pythonProcess = (0, child_process_1.spawn)(PYTHON_EXECUTABLE, [TRANSCRIPTION_SCRIPT_PATH, absoluteFilePath]);
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
            }
            else {
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
exports.transcribeAudio = transcribeAudio;
