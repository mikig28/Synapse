import * as chrono from 'chrono-node';
import OpenAI from 'openai';
import { z } from 'zod';
import { VoiceMemoAnalysisResult, TemporalParseResult } from '../types/reminder.types';
import { ReminderPriority } from '../models/Reminder';

const AnalysisResponseSchema = z.object({
  hasReminder: z.boolean(),
  reminderMessage: z.string().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  temporalHints: z.array(z.string()).optional()
});

type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

class BookmarkVoiceMemoAnalysisService {
  private openai: OpenAI;
  private defaultReminderTime: { hour: number; minute: number };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.openai = new OpenAI({ apiKey });
    
    const defaultTime = process.env.REMINDER_DEFAULT_TIME || '09:00';
    const [hour, minute] = defaultTime.split(':').map(Number);
    this.defaultReminderTime = { hour, minute };
  }

  async analyze(transcription: string, bookmarkUrl: string): Promise<VoiceMemoAnalysisResult> {
    try {
      console.log(`[BookmarkAnalysis] Analyzing: "${transcription.substring(0, 100)}..."`);

      const language = this.detectLanguage(transcription);
      const aiAnalysis = await this.extractWithAI(transcription, bookmarkUrl, language);
      const temporalResult = this.parseTemporalExpression(transcription, language);

      const result: VoiceMemoAnalysisResult = {
        hasReminder: aiAnalysis.hasReminder && temporalResult.found,
        reminderTime: temporalResult.parsedDate,
        reminderMessage: aiAnalysis.reminderMessage || this.generateDefaultReminderMessage(transcription, language),
        tags: aiAnalysis.tags,
        notes: aiAnalysis.notes,
        priority: aiAnalysis.priority,
        temporalExpression: temporalResult.originalText,
        confidence: this.calculateConfidence(aiAnalysis, temporalResult),
        language
      };

      return result;
    } catch (error) {
      console.error('[BookmarkAnalysis] Error:', error);
      return {
        hasReminder: false,
        tags: [],
        priority: 'medium',
        confidence: 0,
        language: this.detectLanguage(transcription)
      };
    }
  }

  private async extractWithAI(t: string, url: string, lang: 'en' | 'he' | 'unknown'): Promise<AnalysisResponse> {
    try {
      const systemPrompt = `You are analyzing voice memos about bookmarks to detect reminder requests.

A reminder request is when the user wants to be reminded about the bookmark at a future time.

Common reminder phrases in English:
- "remind me", "reminder", "alert me", "notify me"
- "come back to this", "review this", "check this"
- With time expressions: "tomorrow", "next week", "in 2 days"

Common reminder phrases in Hebrew:
- "תזכיר לי", "תזכורת", "להזכיר"
- "לחזור על זה", "לבדוק את זה", "לקרוא את זה"
- With time: "מחר", "בשבוע הבא", "בעוד יומיים", "בעוד X ימים"

Return JSON with:
- hasReminder: true if ANY reminder intent detected (in any language)
- reminderMessage: what user wants to be reminded about
- tags: relevant tags
- notes: additional context
- priority: low/medium/high
- temporalHints: time-related words found

Be liberal in detecting reminders - if there's ANY indication of wanting to return/review/check later, set hasReminder=true.`;

      const userPrompt = `Analyze this voice memo about a bookmark:

Text: "${t}"
URL: ${url}
Language: ${lang}

Return JSON only.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No AI response');

      return AnalysisResponseSchema.parse(JSON.parse(content));
    } catch (error) {
      return { hasReminder: false, tags: [], priority: 'medium', notes: t };
    }
  }

  private parseTemporalExpression(text: string, language: 'en' | 'he' | 'unknown'): TemporalParseResult {
    try {
      const results = chrono.parse(text, new Date(), { forwardDate: true });

      if (results.length > 0) {
        const firstResult = results[0];
        const parsedDate = firstResult.start.date();
        
        if (!firstResult.start.isCertain('hour')) {
          parsedDate.setHours(this.defaultReminderTime.hour, this.defaultReminderTime.minute, 0, 0);
        }

        return {
          found: true,
          parsedDate,
          originalText: firstResult.text,
          confidence: 0.8,
          index: firstResult.index
        };
      }

      if (language === 'he') return this.parseHebrewTemporal(text);
      return { found: false, originalText: text, confidence: 0 };
    } catch (error) {
      return { found: false, originalText: text, confidence: 0 };
    }
  }

  private parseHebrewTemporal(text: string): TemporalParseResult {
    const patterns = [
      { regex: /בעוד\s+(\d+)\s+ימ?ים?/i, days: (m: RegExpMatchArray) => parseInt(m[1]) },
      { regex: /מחר/i, days: () => 1 },
      { regex: /בשבוע הבא/i, days: () => 7 }
    ];

    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) {
        const date = new Date();
        date.setHours(this.defaultReminderTime.hour, this.defaultReminderTime.minute, 0, 0);
        date.setDate(date.getDate() + p.days(match));

        return { found: true, parsedDate: date, originalText: match[0], confidence: 0.8, index: match.index };
      }
    }

    return { found: false, originalText: text, confidence: 0 };
  }

  private detectLanguage(text: string): 'en' | 'he' | 'unknown' {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars === 0) return 'unknown';

    const ratio = hebrewChars / totalChars;
    return ratio > 0.3 ? 'he' : ratio < 0.1 ? 'en' : 'unknown';
  }

  private calculateConfidence(ai: AnalysisResponse, temp: TemporalParseResult): number {
    if (!ai.hasReminder || !temp.found) return 0.3;
    
    let c = 0.5;
    if (temp.found) c += temp.confidence * 0.3;
    if (ai.reminderMessage && ai.reminderMessage.length > 10) c += 0.2;
    
    return Math.min(c, 1.0);
  }

  private generateDefaultReminderMessage(t: string, lang: 'en' | 'he' | 'unknown'): string {
    const max = 100;
    const truncated = t.substring(0, max);
    const suffix = t.length > max ? '...' : '';
    
    return lang === 'he' ? `סקור סימנייה: ${truncated}${suffix}` : `Review bookmark: ${truncated}${suffix}`;
  }
}

export const bookmarkVoiceMemoAnalysisService = new BookmarkVoiceMemoAnalysisService();
