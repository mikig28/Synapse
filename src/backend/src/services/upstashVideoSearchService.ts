import { Search } from "@upstash/search";
import { Supadata } from "@supadata/js";

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
  lang: string;
}

export interface TranscriptInput {
  content: TranscriptSegment[];
  lang: string;
  availableLangs: string[];
}

export interface FormattedDocument {
  id: string;
  content: {
    text: string;
  };
  metadata: {
    start_time: number;
  };
}

function formatTranscriptData(transcript: TranscriptInput, url: string): FormattedDocument[] {
  return transcript.content.map((segment, index) => {
    const startTimeSeconds = Math.floor(segment.offset / 1000);
    return {
      id: `${url.split("v=")[1]}_${index.toString().padStart(4, "0")}`,
      content: {
        text: segment.text,
      },
      metadata: {
        start_time: startTimeSeconds,
      },
    };
  });
}

let searchClient: Search | null = null;
let supadataClient: Supadata | null = null;

if (process.env.UPSTASH_SEARCH_REST_URL && process.env.UPSTASH_SEARCH_REST_TOKEN) {
  searchClient = new Search({
    url: process.env.UPSTASH_SEARCH_REST_URL,
    token: process.env.UPSTASH_SEARCH_REST_TOKEN,
  });
}

if (process.env.SUPADATA_API_KEY) {
  supadataClient = new Supadata({
    apiKey: process.env.SUPADATA_API_KEY,
  });
}

export async function checkVideoIndexExists(videoId: string): Promise<boolean> {
  if (!searchClient) {
    console.warn('[UpstashVideoSearch] Search client not available - Upstash credentials not configured');
    return false;
  }
  const allIndexes = await searchClient.listIndexes();
  return allIndexes.includes(videoId);
}

async function upsertCaptionsBatch(formattedData: FormattedDocument[], index: any) {
  const batchSize = 100;
  for (let i = 0; i < formattedData.length; i += batchSize) {
    const batch = formattedData.slice(i, i + batchSize);
    // @ts-ignore - index.upsert typing may be broad
    await index.upsert(batch);
  }
}

export async function indexVideoCaptions(url: string, videoId: string): Promise<void> {
  if (!searchClient || !supadataClient) {
    console.warn('[UpstashVideoSearch] Search services not available - credentials not configured');
    return;
  }

  const already = await checkVideoIndexExists(videoId);
  if (already) return;

  const transcriptResult = (await supadataClient.transcript({
    url,
    lang: "en",
    text: false,
    mode: "auto",
  })) as unknown as TranscriptInput;

  const formattedData = formatTranscriptData(transcriptResult, url);
  const searchIndex: any = searchClient.index<{ text: string }>(videoId);
  await upsertCaptionsBatch(formattedData, searchIndex);
}

export async function searchVideoCaptions(videoId: string, query: string) {
  if (!searchClient) {
    console.warn('[UpstashVideoSearch] Search client not available - credentials not configured');
    return [];
  }

  const searchIndex: any = searchClient.index<{ text: string }>(videoId);
  const results = await searchIndex.search({
    query,
    limit: 10,
    reranking: true,
  });
  return results;
}