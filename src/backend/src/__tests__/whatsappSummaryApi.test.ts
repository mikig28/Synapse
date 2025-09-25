import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Import the application and dependencies
import whatsappSummaryRoutes from '../api/routes/whatsappSummaryRoutes';
import { authMiddleware } from '../api/middleware/authMiddleware';
import WhatsAppMessage from '../models/WhatsAppMessage';
import WhatsAppContact from '../models/WhatsAppContact';
import WhatsAppGroupSummary from '../models/WhatsAppGroupSummary';

// Create test app
const app = express();
app.use(express.json());

// Mock auth middleware for testing
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com'
  };
  next();
};

app.use('/api/v1/whatsapp-summary', mockAuthMiddleware, whatsappSummaryRoutes);

// Mock WhatsApp service
jest.mock('../services/whatsappBaileysService', () => ({
  getInstance: () => ({
    getGroups: () => [
      {
        id: 'test-group-1',
        name: 'Test Group 1',
        participantCount: 5
      },
      {
        id: 'test-group-2', 
        name: 'Test Group 2',
        participantCount: 3
      }
    ]
  })
}));

// Mock summarization service
jest.mock('../services/whatsappSummarizationService', () => ({
  WhatsAppSummarizationService: jest.fn().mockImplementation(() => ({
    generateGroupSummary: jest.fn().mockResolvedValue({
      groupId: 'test-group-1',
      groupName: 'Test Group 1',
      timeRange: {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-01T23:59:59Z')
      },
      totalMessages: 25,
      activeParticipants: 3,
      senderInsights: [
        {
          senderName: 'John Doe',
          senderPhone: '+1234567890',
          messageCount: 15,
          summary: 'Sent 15 messages discussing project updates and shared several documents.',
          topKeywords: [{ keyword: 'project', count: 5, percentage: 33 }],
          topEmojis: [{ emoji: 'ðŸ‘', count: 3, percentage: 20 }],
          activityPattern: {
            peakHour: 14,
            messageDistribution: new Array(24).fill(0)
          },
          engagement: {
            averageMessageLength: 45,
            mediaCount: 2,
            questionCount: 1
          }
        }
      ],
      overallSummary: 'Test Group 1 had active discussions about project updates with 25 messages from 3 participants.',
      topKeywords: [
        { keyword: 'project', count: 8, percentage: 32 },
        { keyword: 'update', count: 5, percentage: 20 }
      ],
      topEmojis: [
        { emoji: 'ðŸ‘', count: 5, percentage: 20 },
        { emoji: 'ðŸ“‹', count: 3, percentage: 12 }
      ],
      activityPeaks: [
        { hour: 14, count: 10 },
        { hour: 16, count: 8 }
      ],
      messageTypes: {
        text: 20,
        image: 3,
        video: 1,
        audio: 1,
        document: 0,
        other: 0
      },
      processingStats: {
        processingTimeMs: 1250,
        messagesAnalyzed: 25,
        participantsFound: 3
      }
    }))
  }))
}));

// Database setup for testing
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/synapse-test';
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Clear test data
  await WhatsAppMessage.deleteMany({});
  await WhatsAppContact.deleteMany({});
  await WhatsAppGroupSummary.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('WhatsApp Summary API Integration Tests', () => {
  describe('GET /api/v1/whatsapp-summary/groups', () => {
    it('should return available groups for summary generation', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      const group1 = response.body.data[0];
      expect(group1).toHaveProperty('id');
      expect(group1).toHaveProperty('name');
      expect(group1).toHaveProperty('participantCount');
    });
  });

  describe('GET /api/v1/whatsapp-summary/groups/:groupId/messages', () => {
    beforeEach(async () => {
      // Create test contact
      const contact = new WhatsAppContact({
        phoneNumber: '+1234567890',
        name: 'John Doe',
        profilePictureUrl: null
      });
      await contact.save();

      // Create test messages
      const messages = [
        {
          messageId: 'msg-1',
          from: '+1234567890',
          to: 'test-group-1',
          message: 'Hello everyone! How is the project going?',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'text',
          isIncoming: true,
          contactId: contact._id,
          metadata: {
            isGroup: true,
            groupId: 'test-group-1',
            groupName: 'Test Group 1'
          }
        },
        {
          messageId: 'msg-2',
          from: '+1234567890',
          to: 'test-group-1',
          message: 'I have some updates to share ðŸ“‹',
          timestamp: new Date('2024-01-01T14:30:00Z'),
          type: 'text',
          isIncoming: true,
          contactId: contact._id,
          metadata: {
            isGroup: true,
            groupId: 'test-group-1',
            groupName: 'Test Group 1'
          }
        }
      ];

      await WhatsAppMessage.insertMany(messages);
    });

    it('should return messages for a specific group and time range', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/test-group-1/messages')
        .query({
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z',
          page: 1,
          limit: 100
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('groupInfo');
      expect(response.body).toHaveProperty('timeRange');

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const message = response.body.data[0];
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('message');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('senderName', 'John Doe');
      expect(message).toHaveProperty('senderPhone', '+1234567890');

      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('total', 2);
      expect(response.body.pagination).toHaveProperty('hasMore', false);

      expect(response.body.groupInfo).toHaveProperty('id', 'test-group-1');
      expect(response.body.groupInfo).toHaveProperty('name', 'Test Group 1');
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/test-group-1/messages')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Start and end timestamps are required');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/non-existent-group/messages')
        .query({
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-01T23:59:59Z'
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Group not found');
    });
  });

  describe('POST /api/v1/whatsapp-summary/generate', () => {
    it('should generate daily summary for a specific group and date', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1',
          date: '2024-01-01',
          timezone: 'UTC'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const summary = response.body.data;
      expect(summary).toHaveProperty('groupId', 'test-group-1');
      expect(summary).toHaveProperty('groupName', 'Test Group 1');
      expect(summary).toHaveProperty('totalMessages', 25);
      expect(summary).toHaveProperty('activeParticipants', 3);
      expect(summary).toHaveProperty('overallSummary');
      expect(summary).toHaveProperty('senderInsights');
      expect(summary).toHaveProperty('topKeywords');
      expect(summary).toHaveProperty('topEmojis');
      expect(summary).toHaveProperty('messageTypes');
      expect(summary).toHaveProperty('processingStats');

      expect(Array.isArray(summary.senderInsights)).toBe(true);
      expect(summary.senderInsights).toHaveLength(1);

      const senderInsight = summary.senderInsights[0];
      expect(senderInsight).toHaveProperty('senderName', 'John Doe');
      expect(senderInsight).toHaveProperty('messageCount', 15);
      expect(senderInsight).toHaveProperty('summary');
      expect(senderInsight).toHaveProperty('topKeywords');
      expect(senderInsight).toHaveProperty('engagement');
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1'
          // Missing date
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Group ID and date are required');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1',
          date: 'invalid-date'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid date format. Use YYYY-MM-DD');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'non-existent-group',
          date: '2024-01-01'
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Group not found');
    });
  });

  describe('POST /api/v1/whatsapp-summary/generate-today', () => {
    it('should generate summary for today', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate-today')
        .send({
          groupId: 'test-group-1',
          timezone: 'UTC'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const summary = response.body.data;
      expect(summary).toHaveProperty('groupId', 'test-group-1');
      expect(summary).toHaveProperty('totalMessages');
      expect(summary).toHaveProperty('activeParticipants');
      expect(summary).toHaveProperty('overallSummary');
    });

    it('should return 400 for missing group ID', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate-today')
        .send({
          timezone: 'UTC'
          // Missing groupId
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Group ID is required');
    });
  });

  describe('GET /api/v1/whatsapp-summary/groups/:groupId/date-ranges', () => {
    beforeEach(async () => {
      // Create test contact
      const contact = new WhatsAppContact({
        phoneNumber: '+1234567890',
        name: 'John Doe'
      });
      await contact.save();

      // Create messages for different dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await WhatsAppMessage.insertMany([
        {
          messageId: 'today-1',
          from: '+1234567890',
          message: 'Today message',
          timestamp: today,
          type: 'text',
          isIncoming: true,
          contactId: contact._id,
          metadata: {
            isGroup: true,
            groupId: 'test-group-1',
            groupName: 'Test Group 1'
          }
        },
        {
          messageId: 'yesterday-1',
          from: '+1234567890',
          message: 'Yesterday message',
          timestamp: yesterday,
          type: 'text',
          isIncoming: true,
          contactId: contact._id,
          metadata: {
            isGroup: true,
            groupId: 'test-group-1',
            groupName: 'Test Group 1'
          }
        }
      ]);
    });

    it('should return available date ranges with message counts', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/test-group-1/date-ranges')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const dateRange = response.body.data[0];
      expect(dateRange).toHaveProperty('start');
      expect(dateRange).toHaveProperty('end');
      expect(dateRange).toHaveProperty('label');
      expect(dateRange).toHaveProperty('type');
      expect(dateRange).toHaveProperty('messageCount');
      expect(typeof dateRange.messageCount).toBe('number');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/non-existent-group/date-ranges')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Group not found');
    });
  });

  describe('GET /api/v1/whatsapp-summary/groups/:groupId/stats', () => {
    beforeEach(async () => {
      // Create test contact
      const contact = new WhatsAppContact({
        phoneNumber: '+1234567890',
        name: 'John Doe'
      });
      await contact.save();

      // Create test messages with different types
      const baseDate = new Date();
      await WhatsAppMessage.insertMany([
        {
          messageId: 'stats-1',
          from: '+1234567890',
          message: 'Text message',
          timestamp: baseDate,
          type: 'text',
          isIncoming: true,
          contactId: contact._id,
          metadata: {
            isGroup: true,
            groupId: 'test-group-1',
            groupName: 'Test Group 1'
          }
        },
        {
          messageId: 'stats-2',
          from: '+1234567890',
          message: '',
          timestamp: baseDate,
          type: 'image',
          isIncoming: true,
          contactId: contact._id,
          metadata: {
            isGroup: true,
            groupId: 'test-group-1',
            groupName: 'Test Group 1'
          }
        }
      ]);
    });

    it('should return group statistics', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/test-group-1/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const stats = response.body.data;
      expect(stats).toHaveProperty('groupId', 'test-group-1');
      expect(stats).toHaveProperty('groupName', 'Test Group 1');
      expect(stats).toHaveProperty('period');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('activeSenders');
      expect(stats).toHaveProperty('messageTypes');
      expect(stats).toHaveProperty('averageMessagesPerDay');
      expect(stats).toHaveProperty('averageMessagesPerSender');

      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.activeSenders).toBe('number');
      expect(stats.messageTypes).toHaveProperty('text');
      expect(stats.messageTypes).toHaveProperty('image');
    });

    it('should accept custom days parameter', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/test-group-1/stats')
        .query({ days: 14 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('period', 'Last 14 days');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp-summary/groups/non-existent-group/stats')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Group not found');
    });
  });

  describe('Database Integration', () => {
    it('should save summary to database when generated', async () => {
      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1',
          date: '2024-01-01',
          timezone: 'UTC'
        })
        .expect(200);

      // Check if summary was saved to database
      const savedSummary = await WhatsAppGroupSummary.findOne({
        groupId: 'test-group-1'
      });

      expect(savedSummary).toBeTruthy();
      expect(savedSummary?.status).toBe('completed');
      expect(savedSummary?.groupName).toBe('Test Group 1');
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Mock service to throw error
      const WhatsAppSummarizationService = require('../services/whatsappSummarizationService').WhatsAppSummarizationService;
      const mockInstance = new WhatsAppSummarizationService();
      mockInstance.generateGroupSummary = jest.fn().mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1',
          date: '2024-01-01'
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authentication', () => {
    const appWithoutAuth = express();
    appWithoutAuth.use(express.json());
    appWithoutAuth.use('/api/v1/whatsapp-summary', whatsappSummaryRoutes);

    it('should require authentication for all endpoints', async () => {
      await request(appWithoutAuth)
        .get('/api/v1/whatsapp-summary/groups')
        .expect(401);

      await request(appWithoutAuth)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1',
          date: '2024-01-01'
        })
        .expect(401);
    });
  });
});

describe('Performance Tests', () => {
  it('should handle large message volumes efficiently', async () => {
    const startTime = Date.now();
    
    const response = await request(app)
      .post('/api/v1/whatsapp-summary/generate')
      .send({
        groupId: 'test-group-1',
        date: '2024-01-01'
      })
      .expect(200);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
    
    expect(response.body.data.processingStats).toHaveProperty('processingTimeMs');
    expect(typeof response.body.data.processingStats.processingTimeMs).toBe('number');
  });
});

describe('Rate Limiting', () => {
  it('should handle multiple concurrent requests', async () => {
    const requests = Array(5).fill(null).map(() =>
      request(app)
        .post('/api/v1/whatsapp-summary/generate')
        .send({
          groupId: 'test-group-1',
          date: '2024-01-01'
        })
    );

    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
