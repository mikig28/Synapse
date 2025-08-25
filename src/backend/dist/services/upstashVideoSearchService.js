"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVideoIndexExists = checkVideoIndexExists;
exports.indexVideoCaptions = indexVideoCaptions;
exports.searchVideoCaptions = searchVideoCaptions;
const search_1 = require("@upstash/search");
const js_1 = require("@supadata/js");
function formatTranscriptData(transcript, url) {
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
let searchClient = null;
let supadataClient = null;
if (process.env.UPSTASH_SEARCH_REST_URL && process.env.UPSTASH_SEARCH_REST_TOKEN) {
    searchClient = new search_1.Search({
        url: process.env.UPSTASH_SEARCH_REST_URL,
        token: process.env.UPSTASH_SEARCH_REST_TOKEN,
    });
}
if (process.env.SUPADATA_API_KEY) {
    supadataClient = new js_1.Supadata({
        apiKey: process.env.SUPADATA_API_KEY,
    });
}
async function checkVideoIndexExists(videoId) {
    if (!searchClient) {
        console.warn('[UpstashVideoSearch] Search client not available - Upstash credentials not configured');
        return false;
    }
    const allIndexes = await searchClient.listIndexes();
    return allIndexes.includes(videoId);
}
async function upsertCaptionsBatch(formattedData, index) {
    const batchSize = 100;
    for (let i = 0; i < formattedData.length; i += batchSize) {
        const batch = formattedData.slice(i, i + batchSize);
        // @ts-ignore - index.upsert typing may be broad
        await index.upsert(batch);
    }
}
async function indexVideoCaptions(url, videoId) {
    if (!searchClient || !supadataClient) {
        console.warn('[UpstashVideoSearch] Search services not available - credentials not configured');
        return;
    }
    const already = await checkVideoIndexExists(videoId);
    if (already)
        return;
    const transcriptResult = (await supadataClient.transcript({
        url,
        lang: "en",
        text: false,
        mode: "auto",
    }));
    const formattedData = formatTranscriptData(transcriptResult, url);
    const searchIndex = searchClient.index(videoId);
    await upsertCaptionsBatch(formattedData, searchIndex);
}
async function searchVideoCaptions(videoId, query) {
    if (!searchClient) {
        console.warn('[UpstashVideoSearch] Search client not available - credentials not configured');
        return [];
    }
    const searchIndex = searchClient.index(videoId);
    const results = await searchIndex.search({
        query,
        limit: 10,
        reranking: true,
    });
    return results;
}
