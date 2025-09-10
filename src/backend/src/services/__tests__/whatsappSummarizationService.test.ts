import { jest } from '@jest/globals';
import type { MessageData } from '../../types/whatsappSummary';

interface RequestContent {
  role: string;
  content: string;
}

const mockResponsesCreate = jest.fn<Promise<{ output_text?: string }>, [
  { input: RequestContent[] }
]>();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      responses: {
        create: mockResponsesCreate
      }
    }))
  };
});

describe('WhatsAppSummarizationService', () => {
  const baseMessages: MessageData[] = [
    {
      id: '1',
      message: 'Hello there',
      timestamp: new Date(),
      type: 'text',
      senderName: 'Alice',
      senderPhone: '123'
    }
  ];

  beforeEach(() => {
    jest.resetModules();
    mockResponsesCreate.mockReset();
    delete process.env.OPENAI_API_KEY;
  });

  test('falls back when no API key', async () => {
    const module = await import('../whatsappSummarizationService');
    const service = new module.WhatsAppSummarizationService();
    const range = module.WhatsAppSummarizationService.getLast24HoursRange();
    const summary = await service.generateGroupSummary('g1', 'Group 1', baseMessages, range, {});
    expect(mockResponsesCreate).not.toHaveBeenCalled();
    expect(summary.overallSummary).toContain('participant');
  });

  test('uses AI when API key present', async () => {
    process.env.OPENAI_API_KEY = 'test';
    mockResponsesCreate.mockResolvedValue({ output_text: 'AI summary' });
    const module = await import('../whatsappSummarizationService');
    const service = new module.WhatsAppSummarizationService();
    const range = module.WhatsAppSummarizationService.getLast24HoursRange();
    const summary = await service.generateGroupSummary('g1', 'Group 1', baseMessages, range, {});
    expect(mockResponsesCreate).toHaveBeenCalled();
    expect(summary.overallSummary).toBe('AI summary');
  });

  test('falls back on AI error', async () => {
    process.env.OPENAI_API_KEY = 'test';
    mockResponsesCreate.mockRejectedValue(new Error('fail'));
    const module = await import('../whatsappSummarizationService');
    const service = new module.WhatsAppSummarizationService();
    const range = module.WhatsAppSummarizationService.getLast24HoursRange();
    const summary = await service.generateGroupSummary('g1', 'Group 1', baseMessages, range, {});
    expect(summary.overallSummary).toContain('participant');
  });

  test('truncates long conversations', async () => {
    process.env.OPENAI_API_KEY = 'test';
    const longMsg = 'a'.repeat(500);
    const manyMessages: MessageData[] = Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      message: longMsg,
      timestamp: new Date(),
      type: 'text',
      senderName: `User${i}`,
      senderPhone: String(i)
    }));
    mockResponsesCreate.mockImplementation(({ input }) => {
      const conversation = input[1].content;
      const lines = conversation.split('\n');
      expect(lines.length).toBe(50);
      expect(lines[0].length).toBeLessThanOrEqual(280 + lines[0].indexOf(': ') + 2);
      return Promise.resolve({ output_text: 'ok' });
    });
    const module = await import('../whatsappSummarizationService');
    const service = new module.WhatsAppSummarizationService();
    const range = module.WhatsAppSummarizationService.getLast24HoursRange();
    const summary = await service.generateGroupSummary('g1', 'Group 1', manyMessages, range, {});
    expect(summary.overallSummary).toBe('ok');
  });
});

