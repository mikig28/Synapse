"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
const ELEVEN_API_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY || '';
if (!ELEVEN_KEY) {
    console.warn('[TTS Controller] ELEVENLABS_API_KEY is not set. Text-to-speech endpoint will return 500.');
}
router.post('/', async (req, res) => {
    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'text is required' });
    }
    if (!ELEVEN_KEY) {
        return res.status(500).json({ error: 'Server missing ELEVENLABS_API_KEY' });
    }
    try {
        const response = await axios_1.default.post(`${ELEVEN_API_BASE}/${voiceId}`, {
            text,
            model_id: 'eleven_multilingual_v2',
        }, {
            responseType: 'arraybuffer',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVEN_KEY,
            },
        });
        res.setHeader('Content-Type', 'audio/mpeg');
        return res.send(response.data);
    }
    catch (err) {
        console.error('[TTS Controller] ElevenLabs request failed', err.response?.status, err.response?.data);
        const status = err.response?.status || 500;
        return res.status(status).json({ error: 'ElevenLabs TTS failed', details: err.response?.data });
    }
});
exports.default = router;
