/** @jest-environment node */
import express = require('express');
import mongoose from 'mongoose';
import type { Server } from 'http';
import { AddressInfo } from 'net';

import whatsappSummaryRoutes from '../api/routes/whatsappSummaryRoutes';
import WhatsAppSummarySchedule from '../models/WhatsAppSummarySchedule';
import { whatsappSummaryScheduleService } from '../services/whatsappSummaryScheduleService';

const mockUserId = new mongoose.Types.ObjectId().toHexString();

jest.mock('../api/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: mockUserId, email: 'test@example.com' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/v1/whatsapp-summary', whatsappSummaryRoutes);

jest.spyOn(whatsappSummaryScheduleService, 'executeScheduleById').mockResolvedValue(null);

let server: Server;
let baseUrl: string;

type RequestOptions = {
  method?: string;
  body?: Record<string, unknown>;
};

async function apiRequest(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let body: any = undefined;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  return { status: response.status, body };
}

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/synapse-test';
  await mongoose.connect(mongoUri);

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api/v1/whatsapp-summary`;
});

beforeEach(async () => {
  await WhatsAppSummarySchedule.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('WhatsApp summary scheduler API', () => {
  it('creates and lists schedules', async () => {
    const createResponse = await apiRequest('/schedules', {
      method: 'POST',
      body: {
        name: 'Morning Briefing',
        runAt: '08:00',
        timezone: 'UTC',
        targetGroups: [
          { groupId: 'test-group-1', groupName: 'Test Group 1' }
        ],
        includeAIInsights: true,
        summaryOptions: { includeEmojis: false, includeKeywords: true }
      }
    });

    if (createResponse.status !== 201) {
      console.log('createResponse', createResponse);
    }

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      name: 'Morning Briefing',
      timezone: 'UTC',
      status: 'active'
    });

    const listResponse = await apiRequest('/schedules');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data).toHaveLength(1);
  });

  it('toggles schedule status', async () => {
    const createResponse = await apiRequest('/schedules', {
      method: 'POST',
      body: {
        name: 'Evening Digest',
        runAt: '19:30',
        timezone: 'UTC',
        targetGroups: [
          { groupId: 'test-group-1', groupName: 'Test Group 1' }
        ]
      }
    });

    const scheduleId = createResponse.body?.data?._id;
    expect(scheduleId).toBeDefined();

    const toggleResponse = await apiRequest(`/schedules/${scheduleId}/toggle`, {
      method: 'PATCH'
    });

    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body.success).toBe(true);
    expect(toggleResponse.body.data.status).toBe('paused');
  });

  it('executes a schedule on demand', async () => {
    const createResponse = await apiRequest('/schedules', {
      method: 'POST',
      body: {
        name: 'Ad-hoc Summary',
        runAt: '12:00',
        timezone: 'UTC',
        targetGroups: [
          { groupId: 'test-group-1', groupName: 'Test Group 1' }
        ]
      }
    });

    const scheduleId = createResponse.body?.data?._id;
    expect(scheduleId).toBeDefined();

    const runResponse = await apiRequest(`/schedules/${scheduleId}/run`, {
      method: 'POST'
    });

    expect(runResponse.status).toBe(200);
    expect(runResponse.body.success).toBe(true);
    expect(whatsappSummaryScheduleService.executeScheduleById).toHaveBeenCalledWith(scheduleId);
  });
});
