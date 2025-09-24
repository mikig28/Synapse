import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { searchYouTube } from '../services/youtube';

vi.mock('axios');

describe('searchYouTube backoff', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retries on 403 quota errors', async () => {
    const mocked = axios as unknown as { get: ReturnType<typeof vi.fn> };
    mocked.get = vi.fn()
      .mockRejectedValueOnce({ response: { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } } })
      .mockResolvedValueOnce({ data: { items: [], nextPageToken: undefined } });

    const res = await searchYouTube('key', { q: 'test', maxResults: 1 });
    expect(res.items.length).toBe(0);
    expect(mocked.get).toHaveBeenCalledTimes(2);
  }, 10000);
});


