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
  temporalHints: z.array(z.string()).optional(),
  // New: Structured temporal data from AI
  temporalData: z.object({
    minutes: z.number().optional(),
    hours: z.number().optional(),
    days: z.number().optional(),
    weeks: z.number().optional(),
    months: z.number().optional(),
    specificTime: z.string().optional(), // e.g., "2 AM", "14:00"
    specificDate: z.string().optional()  // e.g., "2025-01-15"
  }).optional()
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

      // Use AI's temporal data instead of regex patterns
      let reminderTime: Date | undefined;
      let temporalExpression: string | undefined;

      if (aiAnalysis.hasReminder && aiAnalysis.temporalData) {
        const calculatedTime = this.calculateDateFromTemporalData(aiAnalysis.temporalData);
        if (calculatedTime) {
          reminderTime = calculatedTime;
          temporalExpression = this.formatTemporalData(aiAnalysis.temporalData);
        }
      }

      const result: VoiceMemoAnalysisResult = {
        hasReminder: aiAnalysis.hasReminder && !!reminderTime,
        reminderTime,
        reminderMessage: aiAnalysis.reminderMessage || this.generateDefaultReminderMessage(transcription, language),
        tags: aiAnalysis.tags,
        notes: aiAnalysis.notes,
        priority: aiAnalysis.priority,
        temporalExpression,
        confidence: this.calculateConfidence(aiAnalysis, !!reminderTime),
        language
      };

      console.log(`[BookmarkAnalysis] Result: hasReminder=${result.hasReminder}, time=${result.reminderTime?.toISOString()}`);
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
      const systemPrompt = `You are analyzing voice memos about bookmarks to detect reminder requests and extract time information.

A reminder request is ANY indication the user wants to be reminded/notified/return to this bookmark later.

**Detect reminders liberally - even vague future intent counts!**

Examples of reminder phrases (ANY language):
- English: "remind me", "come back to this", "review later", "check tomorrow"
- Hebrew: "תזכיר לי", "לחזור על זה", "לבדוק", "לקרוא מחר"
- Spanish: "recuérdame", "volver a esto"
- ANY phrase indicating future action

**Extract structured temporal data:**
- Parse ANY time expression: "in 2 days", "tomorrow at 2 PM", "בעוד יומיים", "next week", "in 5 minutes"
- Break down into components: days, hours, minutes, specific times
- Return ALL temporal components you find

Return JSON with:
{
  "hasReminder": true/false (true if ANY future intent detected),
  "reminderMessage": "what to be reminded about",
  "tags": ["relevant", "tags"],
  "notes": "additional context",
  "priority": "low/medium/high",
  "temporalHints": ["time-related", "words", "found"],
  "temporalData": {
    "minutes": number (if mentioned),
    "hours": number (if mentioned),
    "days": number (e.g., "2 days" → 2, "tomorrow" → 1),
    "weeks": number (if mentioned),
    "months": number (if mentioned),
    "specificTime": "string" (e.g., "2 AM", "14:00" if mentioned),
    "specificDate": "YYYY-MM-DD" (if specific date mentioned)
  }
}

Be VERY liberal with hasReminder - if user says ANYTHING about future action, set it true.`;

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
    console.log(`[HebrewTemporal] Parsing: "${text}"`);

    const patterns = [
      // "בעוד X ימים" / "בעוד יומיים" (in X days / in 2 days)
      { regex: /בעוד\s+(\d+)\s+ימ?ים?/i, days: (m: RegExpMatchArray) => parseInt(m[1]) },
      // Special case for "יומיים" (two days)
      { regex: /בעוד\s+יומיים/i, days: () => 2 },
      // "שבועיים" (two weeks) / "בעוד X שבועות" (in X weeks)
      { regex: /בעוד\s+שבועיים/i, days: () => 14 },
      { regex: /בעוד\s+(\d+)\s+שבועות?/i, days: (m: RegExpMatchArray) => parseInt(m[1]) * 7 },
      // "שני ימים" (two days - alternative phrasing)
      { regex: /בעוד\s+שני\s+יום/i, days: () => 2 },
      // "מחר" (tomorrow)
      { regex: /מחר/i, days: () => 1 },
      // "בשבוע הבא" / "שבוע הבא" (next week)
      { regex: /(ב)?שבוע\s+הבא/i, days: () => 7 },
      // "חודש" / "בחודש הבא" (month / next month)
      { regex: /(ב)?חודש\s+הבא/i, days: () => 30 }
    ];

    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) {
        const daysToAdd = p.days(match);
        const date = new Date();
        date.setHours(this.defaultReminderTime.hour, this.defaultReminderTime.minute, 0, 0);
        date.setDate(date.getDate() + daysToAdd);

        console.log(`[HebrewTemporal] ✅ Matched pattern "${p.regex}" → ${daysToAdd} days → ${date.toISOString()}`);
        return { found: true, parsedDate: date, originalText: match[0], confidence: 0.8, index: match.index };
      }
    }

    console.log(`[HebrewTemporal] ❌ No pattern matched`);
    return { found: false, originalText: text, confidence: 0 };
  }

  private detectLanguage(text: string): 'en' | 'he' | 'unknown' {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars === 0) return 'unknown';

    const ratio = hebrewChars / totalChars;
    return ratio > 0.3 ? 'he' : ratio < 0.1 ? 'en' : 'unknown';
  }

  private calculateDateFromTemporalData(data: NonNullable<AnalysisResponse['temporalData']>): Date | undefined {
    try {
      let targetDate = new Date();

      // Handle specific date if provided
      if (data.specificDate) {
        targetDate = new Date(data.specificDate);
      }

      // Add time components
      if (data.months) targetDate.setMonth(targetDate.getMonth() + data.months);
      if (data.weeks) targetDate.setDate(targetDate.getDate() + (data.weeks * 7));
      if (data.days) targetDate.setDate(targetDate.getDate() + data.days);
      if (data.hours) targetDate.setHours(targetDate.getHours() + data.hours);
      if (data.minutes) targetDate.setMinutes(targetDate.getMinutes() + data.minutes);

      // Handle specific time (e.g., "2 AM", "14:00")
      if (data.specificTime) {
        const timeMatch = data.specificTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3]?.toUpperCase();

          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;

          targetDate.setHours(hour, minute, 0, 0);
        }
      } else if (!data.hours && !data.minutes) {
        // No specific time mentioned, use default reminder time
        targetDate.setHours(this.defaultReminderTime.hour, this.defaultReminderTime.minute, 0, 0);
      }

      console.log(`[TemporalCalc] AI data:`, data, `→ Date:`, targetDate.toISOString());
      return targetDate;
    } catch (error) {
      console.error('[TemporalCalc] Error calculating date:', error);
      return undefined;
    }
  }

  private formatTemporalData(data: NonNullable<AnalysisResponse['temporalData']>): string {
    const parts: string[] = [];

    if (data.specificDate) parts.push(data.specificDate);
    if (data.months) parts.push(`${data.months} month${data.months > 1 ? 's' : ''}`);
    if (data.weeks) parts.push(`${data.weeks} week${data.weeks > 1 ? 's' : ''}`);
    if (data.days) parts.push(`${data.days} day${data.days > 1 ? 's' : ''}`);
    if (data.specificTime) parts.push(`at ${data.specificTime}`);
    else if (data.hours) parts.push(`${data.hours} hour${data.hours > 1 ? 's' : ''}`);
    if (data.minutes) parts.push(`${data.minutes} minute${data.minutes > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : 'unspecified time';
  }

  private calculateConfidence(ai: AnalysisResponse, temporalFound: boolean): number {
    if (!ai.hasReminder) return 0.3;

    let c = 0.5;
    if (temporalFound) c += 0.3;
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
