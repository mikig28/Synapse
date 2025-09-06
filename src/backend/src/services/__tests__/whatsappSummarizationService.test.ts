import WhatsAppSummarizationService from '../whatsappSummarizationService';
import { MessageData, DateRange } from '../../types/whatsappSummary';

describe('WhatsAppSummarizationService', () => {
  let service: WhatsAppSummarizationService;
  let mockMessages: MessageData[];

  beforeEach(() => {
    service = new WhatsAppSummarizationService();
    
    // Create mock messages for testing
    mockMessages = [
      {
        id: '1',
        message: 'Hello everyone! How are you doing today?',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        type: 'text',
        senderName: 'Alice',
        senderPhone: '+1234567890'
      },
      {
        id: '2',
        message: 'Good morning! I\'m doing great. What about you? 😊',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        type: 'text',
        senderName: 'Bob',
        senderPhone: '+1234567891'
      },
      {
        id: '3',
        message: 'Meeting scheduled for tomorrow at 3 PM. Please confirm your attendance.',
        timestamp: new Date('2024-01-01T10:10:00Z'),
        type: 'text',
        senderName: 'Alice',
        senderPhone: '+1234567890'
      },
      {
        id: '4',
        message: 'Confirmed! Looking forward to the meeting. 👍',
        timestamp: new Date('2024-01-01T10:15:00Z'),
        type: 'text',
        senderName: 'Charlie',
        senderPhone: '+1234567892'
      },
      {
        id: '5',
        message: 'Same here! Meeting will be very productive I think.',
        timestamp: new Date('2024-01-01T10:20:00Z'),
        type: 'text',
        senderName: 'Bob',
        senderPhone: '+1234567891'
      },
      {
        id: '6',
        message: '',
        timestamp: new Date('2024-01-01T10:25:00Z'),
        type: 'image',
        senderName: 'Alice',
        senderPhone: '+1234567890'
      }
    ];
  });

  describe('generateGroupSummary', () => {
    it('should generate a basic summary with correct statistics', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      expect(summary.groupId).toBe('group123');
      expect(summary.groupName).toBe('Test Group');
      expect(summary.totalMessages).toBe(5); // Empty messages should be filtered
      expect(summary.activeParticipants).toBe(3); // Alice, Bob, Charlie
      expect(summary.senderInsights).toHaveLength(3);
      expect(summary.overallSummary).toContain('3 participants');
      expect(summary.overallSummary).toContain('5 messages');
    });

    it('should correctly group messages by sender', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      const aliceInsights = summary.senderInsights.find(s => s.senderName === 'Alice');
      const bobInsights = summary.senderInsights.find(s => s.senderName === 'Bob');
      const charlieInsights = summary.senderInsights.find(s => s.senderName === 'Charlie');

      expect(aliceInsights?.messageCount).toBe(2);
      expect(bobInsights?.messageCount).toBe(2);
      expect(charlieInsights?.messageCount).toBe(1);

      // Alice should be first (most messages)
      expect(summary.senderInsights[0].senderName).toBe('Alice');
    });

    it('should extract keywords correctly', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      const keywords = summary.topKeywords.map(k => k.keyword);
      expect(keywords).toContain('meeting');
      expect(keywords).not.toContain('the'); // Stop words should be filtered
      expect(keywords).not.toContain('and');
    });

    it('should extract emojis correctly', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      const emojis = summary.topEmojis.map(e => e.emoji);
      expect(emojis).toContain('😊');
      expect(emojis).toContain('👍');
    });

    it('should analyze message types correctly', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      expect(summary.messageTypes.text).toBe(5);
      expect(summary.messageTypes.image).toBe(0); // Empty messages filtered
      expect(summary.messageTypes.video).toBe(0);
      expect(summary.messageTypes.audio).toBe(0);
      expect(summary.messageTypes.document).toBe(0);
      expect(summary.messageTypes.other).toBe(0);
    });

    it('should calculate activity peaks', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      expect(summary.activityPeaks.length).toBeGreaterThan(0);
      // All messages are in hour 10, so that should be the peak
      expect(summary.activityPeaks[0].hour).toBe(10);
      expect(summary.activityPeaks[0].count).toBe(5); // 5 valid messages
    });

    it('should include processing stats', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange
      );

      expect(summary.processingStats.processingTimeMs).toBeGreaterThan(0);
      expect(summary.processingStats.messagesAnalyzed).toBe(5);
      expect(summary.processingStats.participantsFound).toBe(3);
    });

    it('should handle empty message list', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        [],
        timeRange
      );

      expect(summary.totalMessages).toBe(0);
      expect(summary.activeParticipants).toBe(0);
      expect(summary.senderInsights).toHaveLength(0);
      expect(summary.topKeywords).toHaveLength(0);
      expect(summary.topEmojis).toHaveLength(0);
    });

    it('should respect options for summary generation', async () => {
      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        timeRange,
        {
          maxSummaryLength: 100,
          maxSenderSummaryLength: 30,
          includeEmojis: false,
          includeKeywords: false,
          keywordMinCount: 3,
          emojiMinCount: 2
        }
      );

      expect(summary.topKeywords).toHaveLength(0); // includeKeywords: false
      expect(summary.topEmojis).toHaveLength(0); // includeEmojis: false
      expect(summary.overallSummary.length).toBeLessThanOrEqual(100);
      
      // Check that sender summaries are within limit
      summary.senderInsights.forEach(sender => {
        expect(sender.summary.length).toBeLessThanOrEqual(30);
      });
    });

    it('should filter system messages when enabled', async () => {
      const messagesWithSystem: MessageData[] = [
        ...mockMessages,
        {
          id: '7',
          message: 'Alice joined using this group\'s invite link',
          timestamp: new Date('2024-01-01T10:30:00Z'),
          type: 'text',
          senderName: 'System',
          senderPhone: 'system'
        },
        {
          id: '8',
          message: 'Bob left the group',
          timestamp: new Date('2024-01-01T10:35:00Z'),
          type: 'text',
          senderName: 'System',
          senderPhone: 'system'
        }
      ];

      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        messagesWithSystem,
        timeRange,
        { excludeSystemMessages: true }
      );

      // Should only count non-system messages
      expect(summary.totalMessages).toBe(5);
      expect(summary.activeParticipants).toBe(3); // Alice, Bob, Charlie (no System)
    });
  });

  describe('Date range utilities', () => {
    it('should create today range correctly', () => {
      const todayRange = WhatsAppSummarizationService.getTodayRange();
      
      expect(todayRange.type).toBe('today');
      expect(todayRange.label).toBe('Today');
      expect(todayRange.start.getHours()).toBe(0);
      expect(todayRange.start.getMinutes()).toBe(0);
      expect(todayRange.end.getHours()).toBe(23);
      expect(todayRange.end.getMinutes()).toBe(59);
    });

    it('should create last 24 hours range correctly', () => {
      const last24hRange = WhatsAppSummarizationService.getLast24HoursRange();
      
      expect(last24hRange.type).toBe('last24h');
      expect(last24hRange.label).toBe('Last 24 Hours');
      
      const timeDiff = last24hRange.end.getTime() - last24hRange.start.getTime();
      expect(timeDiff).toBeCloseTo(24 * 60 * 60 * 1000, -1000); // 24 hours ±1 second
    });
  });

  describe('Error handling', () => {
    it('should handle invalid date ranges gracefully', async () => {
      const invalidTimeRange: DateRange = {
        start: new Date('invalid'),
        end: new Date('invalid'),
        label: 'Invalid',
        type: 'custom'
      };

      // Should not throw an error
      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        mockMessages,
        invalidTimeRange
      );

      expect(summary).toBeDefined();
      expect(summary.totalMessages).toBeGreaterThan(0);
    });

    it('should handle messages with missing fields', async () => {
      const incompleteMessages: MessageData[] = [
        {
          id: '1',
          message: 'Test message',
          timestamp: new Date(),
          type: 'text',
          senderName: '', // Empty name
          senderPhone: '+1234567890'
        },
        {
          id: '2',
          message: '', // Empty message
          timestamp: new Date(),
          type: 'text',
          senderName: 'Bob',
          senderPhone: '+1234567891'
        }
      ];

      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        incompleteMessages,
        timeRange
      );

      // Should handle missing names gracefully
      expect(summary.senderInsights.length).toBeGreaterThan(0);
      const senderWithEmptyName = summary.senderInsights.find(s => s.senderPhone === '+1234567890');
      expect(senderWithEmptyName?.senderName).toContain('Contact'); // Default name pattern
    });
  });

  describe('Performance', () => {
    it('should handle large message sets efficiently', async () => {
      // Generate 1000 messages
      const largeMessageSet: MessageData[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        message: `This is test message number ${i}. It contains some keywords like meeting, project, and deadline.`,
        timestamp: new Date(`2024-01-01T${String(Math.floor(i / 100) % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`),
        type: 'text',
        senderName: `User${i % 10}`, // 10 different users
        senderPhone: `+123456789${i % 10}`
      }));

      const timeRange: DateRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z'),
        label: 'Today',
        type: 'today'
      };

      const startTime = Date.now();
      
      const summary = await service.generateGroupSummary(
        'group123',
        'Test Group',
        largeMessageSet,
        timeRange
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 1000 messages in reasonable time (less than 1 second)
      expect(processingTime).toBeLessThan(1000);
      expect(summary.totalMessages).toBe(1000);
      expect(summary.activeParticipants).toBe(10);
      expect(summary.processingStats.processingTimeMs).toBeGreaterThan(0);
    });
  });
});