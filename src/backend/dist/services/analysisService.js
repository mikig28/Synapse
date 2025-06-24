"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTranscription = analyzeTranscription;
const axios_1 = __importDefault(require("axios"));
// Constants declared before envCheck is called
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
// Now call envCheck
envCheck();
function envCheck() {
    // This check is fine as it refers to process.env directly
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set in .env');
    }
    // If you intended to check the const OPENAI_API_KEY specifically after it's been assigned
    // from process.env, you could also do:
    // if (!OPENAI_API_KEY) {
    //   throw new Error('OPENAI_API_KEY was not loaded correctly from .env');
    // }
}
async function analyzeTranscription(transcription) {
    const prompt = `
הטקסט הבא הוא תמלול של הודעה קולית.
נתח את התוכן וחלק אותו לשלוש קטגוריות:
1. משימות (tasks) – דברים שצריך לבצע.
2. הערות כלליות (notes) – תובנות, תזכורות, או מידע כללי.
3. רעיונות (ideas) – הצעות, brain-storming, או מחשבות עתידיות.

החזר תשובה בפורמט JSON בלבד, לדוגמה:
{
  "tasks": ["..."],
  "notes": ["..."],
  "ideas": ["..."]
}

הטקסט:
"""${transcription}"""
  `.trim();
    const response = await axios_1.default.post(OPENAI_URL, {
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
    }, {
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    // Safely access content
    const choice = response.data?.choices?.[0];
    const content = choice?.message?.content;
    let result = { tasks: [], notes: [], ideas: [], raw: content || "Error: No content from AI" };
    if (typeof content === 'string') {
        try {
            const jsonStr = content.replace(/```json|```/g, '').trim();
            const parsedJson = JSON.parse(jsonStr);
            // Ensure parsedJson has the expected structure before spreading
            result = {
                tasks: Array.isArray(parsedJson.tasks) ? parsedJson.tasks : [],
                notes: Array.isArray(parsedJson.notes) ? parsedJson.notes : [],
                ideas: Array.isArray(parsedJson.ideas) ? parsedJson.ideas : [],
                raw: content, // Keep the original raw content
            };
        }
        catch (e) {
            console.error("[AnalysisService] Failed to parse JSON from AI content:", e);
            // result already contains raw content and empty arrays as fallback
        }
    }
    else {
        console.error("[AnalysisService] Failed to get content string from OpenAI response:", response.data);
        // result already initialized with error message in raw field
    }
    return result;
}
