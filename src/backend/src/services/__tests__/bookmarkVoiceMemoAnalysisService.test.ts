import { bookmarkVoiceMemoAnalysisService } from '../bookmarkVoiceMemoAnalysisService';
import { VoiceMemoAnalysisResult } from '../../types/reminder.types';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  hasReminder: true,
                  reminderMessage: 'Check this AI article',
                  tags: ['AI', 'article'],
                  notes: 'Interesting article about artificial intelligence',
                  priority: 'medium',
                  temporalHints: ['in two days', 'tomorrow']
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('BookmarkVoiceMemoAnalysisService', () => {

  describe('Language Detection', () => {
    it('should detect Hebrew text correctly', () => {
      const hebrewText = 'תזכיר לי לקרוא את זה מחר';
      // @ts-ignore - accessing private method for testing
      const language = bookmarkVoiceMemoAnalysisService.detectLanguage(hebrewText);
      expect(language).toBe('he');
    });

    it('should detect English text correctly', () => {
      const englishText = 'Remind me to read this tomorrow';
      // @ts-ignore - accessing private method for testing
      const language = bookmarkVoiceMemoAnalysisService.detectLanguage(englishText);
      expect(language).toBe('en');
    });

    it('should detect mixed language text as Hebrew if Hebrew present', () => {
      const mixedText = 'תזכיר לי reminder tomorrow';
      // @ts-ignore - accessing private method for testing
      const language = bookmarkVoiceMemoAnalysisService.detectLanguage(mixedText);
      expect(language).toBe('he');
    });

    it('should return unknown for empty text', () => {
      // @ts-ignore - accessing private method for testing
      const language = bookmarkVoiceMemoAnalysisService.detectLanguage('');
      expect(language).toBe('unknown');
    });
  });

  describe('Temporal Expression Parsing - English', () => {
    it('should parse "tomorrow" correctly', () => {
      const text = 'Remind me to check this tomorrow';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'en');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(result.parsedDate.getDate()).toBe(tomorrow.getDate());
      }
    });

    it('should parse "in 2 days" correctly', () => {
      const text = 'Remind me in 2 days';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'en');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const inTwoDays = new Date();
        inTwoDays.setDate(inTwoDays.getDate() + 2);
        expect(result.parsedDate.getDate()).toBe(inTwoDays.getDate());
      }
    });

    it('should parse "next week" correctly', () => {
      const text = 'Remind me next week';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'en');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        expect(result.parsedDate.getDate()).toBeGreaterThanOrEqual(nextWeek.getDate() - 1);
        expect(result.parsedDate.getDate()).toBeLessThanOrEqual(nextWeek.getDate() + 1);
      }
    });

    it('should apply default time (9 AM) when no time specified', () => {
      const text = 'Remind me tomorrow';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'en');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        expect(result.parsedDate.getHours()).toBe(9); // Default reminder time
        expect(result.parsedDate.getMinutes()).toBe(0);
      }
    });

    it('should return not found for text without temporal expressions', () => {
      const text = 'This is an interesting article about AI';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'en');

      expect(result.found).toBe(false);
      expect(result.parsedDate).toBeUndefined();
    });
  });

  describe('Temporal Expression Parsing - Hebrew', () => {
    it('should parse "מחר" (tomorrow) correctly', () => {
      const text = 'תזכיר לי לקרוא את זה מחר';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'he');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(result.parsedDate.getDate()).toBe(tomorrow.getDate());
      }
    });

    it('should parse "בעוד יומיים" (in two days) correctly', () => {
      const text = 'תזכיר לי בעוד יומיים';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'he');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const inTwoDays = new Date();
        inTwoDays.setDate(inTwoDays.getDate() + 2);
        expect(result.parsedDate.getDate()).toBe(inTwoDays.getDate());
      }
    });

    it('should parse "בעוד שבוע" (in a week) correctly', () => {
      const text = 'תזכיר לי בעוד שבוע';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'he');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const inOneWeek = new Date();
        inOneWeek.setDate(inOneWeek.getDate() + 7);
        expect(result.parsedDate.getDate()).toBe(inOneWeek.getDate());
      }
    });

    it('should parse "בשבוע הבא" (next week) correctly', () => {
      const text = 'תזכיר לי בשבוע הבא';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'he');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        expect(result.parsedDate.getDate()).toBeGreaterThanOrEqual(nextWeek.getDate() - 1);
      }
    });

    it('should parse "בעוד 3 ימים" (in 3 days) with numbers correctly', () => {
      const text = 'תזכיר לי בעוד 3 ימים';
      // @ts-ignore - accessing private method for testing
      const result = bookmarkVoiceMemoAnalysisService.parseTemporalExpression(text, 'he');

      expect(result.found).toBe(true);
      expect(result.parsedDate).toBeDefined();

      if (result.parsedDate) {
        const inThreeDays = new Date();
        inThreeDays.setDate(inThreeDays.getDate() + 3);
        expect(result.parsedDate.getDate()).toBe(inThreeDays.getDate());
      }
    });
  });

  describe('Full Analysis', () => {
    it('should detect reminder with temporal expression and tags', async () => {
      const transcription = 'This article about AI is really interesting, remind me to read it in two days';
      const url = 'https://example.com/ai-article';

      const result: VoiceMemoAnalysisResult = await bookmarkVoiceMemoAnalysisService.analyze(transcription, url);

      expect(result.hasReminder).toBe(true);
      expect(result.reminderTime).toBeDefined();
      expect(result.reminderMessage).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle Hebrew reminder request', async () => {
      const transcription = 'תזכיר לי לקרוא את המאמר הזה על בינה מלאכותית מחר';
      const url = 'https://example.com/ai-article';

      const result: VoiceMemoAnalysisResult = await bookmarkVoiceMemoAnalysisService.analyze(transcription, url);

      expect(result.language).toBe('he');
      expect(result.hasReminder).toBe(true);
      expect(result.reminderTime).toBeDefined();
    });

    it('should not detect reminder when there is no temporal expression', async () => {
      // Mock AI response without reminder
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hasReminder: false,
                    reminderMessage: null,
                    tags: ['AI', 'article'],
                    notes: 'Interesting article',
                    priority: 'low',
                    temporalHints: []
                  })
                }
              }]
            })
          }
        }
      }));

      const transcription = 'This is a great article about AI';
      const url = 'https://example.com/ai-article';

      const result: VoiceMemoAnalysisResult = await bookmarkVoiceMemoAnalysisService.analyze(transcription, url);

      expect(result.hasReminder).toBe(false);
      expect(result.reminderTime).toBeUndefined();
    });

    it('should extract tags even without reminder', async () => {
      // Mock AI response without reminder but with tags
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hasReminder: false,
                    reminderMessage: null,
                    tags: ['programming', 'tutorial'],
                    notes: 'Helpful programming tutorial',
                    priority: 'low',
                    temporalHints: []
                  })
                }
              }]
            })
          }
        }
      }));

      const transcription = 'This is a helpful programming tutorial';
      const url = 'https://example.com/tutorial';

      const result: VoiceMemoAnalysisResult = await bookmarkVoiceMemoAnalysisService.analyze(transcription, url);

      expect(result.hasReminder).toBe(false);
      expect(result.tags).toContain('programming');
      expect(result.tags).toContain('tutorial');
    });

    it('should assign correct priority levels', async () => {
      // Mock AI response with high priority
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: JSON.stringify({
                    hasReminder: true,
                    reminderMessage: 'Urgent deadline article',
                    tags: ['deadline', 'urgent'],
                    notes: 'Very important deadline information',
                    priority: 'high',
                    temporalHints: ['tomorrow']
                  })
                }
              }]
            })
          }
        }
      }));

      const transcription = 'Urgent! Remind me to read this deadline article tomorrow';
      const url = 'https://example.com/deadline';

      const result: VoiceMemoAnalysisResult = await bookmarkVoiceMemoAnalysisService.analyze(transcription, url);

      expect(result.priority).toBe('high');
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence when both AI and temporal parsing succeed', () => {
      const aiAnalysis = {
        hasReminder: true,
        reminderMessage: 'Check this article',
        tags: ['AI'],
        notes: 'Interesting',
        priority: 'medium' as const,
        temporalHints: ['tomorrow']
      };

      const temporalResult = {
        found: true,
        parsedDate: new Date(),
        originalText: 'tomorrow'
      };

      // @ts-ignore - accessing private method for testing
      const confidence = bookmarkVoiceMemoAnalysisService.calculateConfidence(aiAnalysis, temporalResult);

      expect(confidence).toBeGreaterThanOrEqual(0.8);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it('should have medium confidence when only AI detects reminder', () => {
      const aiAnalysis = {
        hasReminder: true,
        reminderMessage: 'Check this',
        tags: [],
        notes: '',
        priority: 'low' as const,
        temporalHints: ['later']
      };

      const temporalResult = {
        found: false,
        parsedDate: undefined,
        originalText: undefined
      };

      // @ts-ignore - accessing private method for testing
      const confidence = bookmarkVoiceMemoAnalysisService.calculateConfidence(aiAnalysis, temporalResult);

      expect(confidence).toBeGreaterThanOrEqual(0.3);
      expect(confidence).toBeLessThan(0.8);
    });

    it('should have low confidence when no reminder detected', () => {
      const aiAnalysis = {
        hasReminder: false,
        reminderMessage: null,
        tags: ['AI'],
        notes: 'Just notes',
        priority: 'low' as const,
        temporalHints: []
      };

      const temporalResult = {
        found: false,
        parsedDate: undefined,
        originalText: undefined
      };

      // @ts-ignore - accessing private method for testing
      const confidence = bookmarkVoiceMemoAnalysisService.calculateConfidence(aiAnalysis, temporalResult);

      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe('Default Reminder Message Generation', () => {
    it('should generate English reminder message', () => {
      const transcription = 'Remind me to check this AI article tomorrow';

      // @ts-ignore - accessing private method for testing
      const message = bookmarkVoiceMemoAnalysisService.generateDefaultReminderMessage(transcription, 'en');

      expect(message).toContain('Remind me to check this AI article');
      expect(message.length).toBeLessThanOrEqual(100);
    });

    it('should generate Hebrew reminder message', () => {
      const transcription = 'תזכיר לי לקרוא את המאמר מחר';

      // @ts-ignore - accessing private method for testing
      const message = bookmarkVoiceMemoAnalysisService.generateDefaultReminderMessage(transcription, 'he');

      expect(message).toContain('תזכורת');
      expect(message.length).toBeLessThanOrEqual(100);
    });

    it('should truncate long transcriptions', () => {
      const longTranscription = 'This is a very long transcription '.repeat(10);

      // @ts-ignore - accessing private method for testing
      const message = bookmarkVoiceMemoAnalysisService.generateDefaultReminderMessage(longTranscription, 'en');

      expect(message.length).toBeLessThanOrEqual(100);
      expect(message).toContain('...');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      // Mock API failure
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      const transcription = 'Remind me tomorrow';
      const url = 'https://example.com/article';

      await expect(
        bookmarkVoiceMemoAnalysisService.analyze(transcription, url)
      ).rejects.toThrow();
    });

    it('should handle invalid JSON from AI', async () => {
      // Mock invalid JSON response
      const mockOpenAI = require('openai').default;
      mockOpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Invalid JSON {incomplete'
                }
              }]
            })
          }
        }
      }));

      const transcription = 'Remind me tomorrow';
      const url = 'https://example.com/article';

      await expect(
        bookmarkVoiceMemoAnalysisService.analyze(transcription, url)
      ).rejects.toThrow();
    });

    it('should handle empty transcription', async () => {
      const transcription = '';
      const url = 'https://example.com/article';

      const result = await bookmarkVoiceMemoAnalysisService.analyze(transcription, url);

      expect(result.hasReminder).toBe(false);
      expect(result.tags).toHaveLength(0);
    });
  });
});
