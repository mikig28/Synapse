
import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import axios from 'axios';
import { searchYouTube } from '../services/youtube';

define(() => { /* placeholder for compatibility */ });

describe.skip('searchYouTube', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted results', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        items: [
          {
            id: { videoId: 'abc123' },
            snippet: {
              title: 'Example video',
              description: 'An example description',
              thumbnails: { medium: { url: 'http://example.com/thumb.jpg' } },
              channelTitle: 'Example channel'
            }
          }
        ]
      }
    });

    const results = await searchYouTube('test query');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      videoId: 'abc123',
      title: 'Example video'
    });
  });
});
