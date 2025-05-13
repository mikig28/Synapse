import axios from 'axios';

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

export async function analyzeTranscription(transcription: string) {
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

  const response = await axios.post(
    OPENAI_URL,
    {
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const content = response.data.choices[0].message.content as string;
  // Try to parse JSON
  let result = { tasks: [], notes: [], ideas: [], raw: content };
  try {
    // Remove markdown code block if present
    const jsonStr = content.replace(/```json|```/g, '').trim();
    result = { ...result, ...JSON.parse(jsonStr) };
  } catch (e) {
    // fallback: leave as empty arrays, keep raw
  }
  return result;
} 