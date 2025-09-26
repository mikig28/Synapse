import { MessageData, MessageGroup, KeywordAnalysis, EmojiAnalysis, SenderInsights, GroupSummaryData, SummaryGenerationOptions } from '../types/whatsappSummary';
import axios from 'axios';

/**
 * Groups messages by sender phone number and name
 */
export function groupMessagesBySender(messages: MessageData[]): Map<string, MessageGroup> {
  const groups = new Map<string, MessageGroup>();
  
  for (const message of messages) {
    const key = message.senderPhone;
    
    if (!groups.has(key)) {
      groups.set(key, {
        senderPhone: message.senderPhone,
        senderName: message.senderName || `Contact ${message.senderPhone}`,
        messages: [],
        messageCount: 0,
        firstMessage: message.timestamp,
        lastMessage: message.timestamp
      });
    }
    
    const group = groups.get(key)!;
    group.messages.push(message);
    group.messageCount++;
    
    if (message.timestamp < group.firstMessage) {
      group.firstMessage = message.timestamp;
    }
    if (message.timestamp > group.lastMessage) {
      group.lastMessage = message.timestamp;
    }
  }
  
  return groups;
}

/**
 * Extracts and ranks keywords from text messages
 */
export function extractKeywords(text: string, minLength: number = 3): string[] {
  // Remove emojis, URLs, and special characters
  const cleanText = text
    .replace(/[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase();
  
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
    'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'am', 'im', 'ok',
    'okay', 'yes', 'no', 'yeah', 'yep', 'nope', 'lol', 'haha', 'omg', 'btw'
  ]);
  
  const words = cleanText
    .split(/\s+/)
    .filter(word => word.length >= minLength && !stopWords.has(word) && !/^\d+$/.test(word));
  
  return words;
}

/**
 * Extracts emojis from text
 */
export function extractEmojis(text: string): string[] {
  const emojiRegex = /[\u{1F600}-\u{1F6FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  return text.match(emojiRegex) || [];
}

/**
 * Counts frequency of items and returns sorted analysis
 */
export function analyzeFrequency<T>(items: T[], minCount: number = 1): Array<{ item: T; count: number; percentage: number }> {
  const frequency = new Map<T, number>();
  
  for (const item of items) {
    frequency.set(item, (frequency.get(item) || 0) + 1);
  }
  
  const total = items.length;
  return Array.from(frequency.entries())
    .filter(([_, count]) => count >= minCount)
    .map(([item, count]) => ({
      item,
      count,
      percentage: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generates keyword analysis from messages
 */
export function generateKeywordAnalysis(messages: MessageData[], minCount: number = 2): KeywordAnalysis[] {
  const allKeywords: string[] = [];
  
  for (const message of messages) {
    if (message.type === 'text' || message.type === 'conversation') {
      const keywords = extractKeywords(message.message);
      allKeywords.push(...keywords);
    }
  }
  
  return analyzeFrequency(allKeywords, minCount)
    .slice(0, 10) // Top 10 keywords
    .map(({ item, count, percentage }) => ({
      keyword: item,
      count,
      percentage
    }));
}

/**
 * Generates emoji analysis from messages
 */
export function generateEmojiAnalysis(messages: MessageData[], minCount: number = 2): EmojiAnalysis[] {
  const allEmojis: string[] = [];
  
  for (const message of messages) {
    const emojis = extractEmojis(message.message);
    allEmojis.push(...emojis);
  }
  
  return analyzeFrequency(allEmojis, minCount)
    .slice(0, 10) // Top 10 emojis
    .map(({ item, count, percentage }) => ({
      emoji: item,
      count,
      percentage
    }));
}

/**
 * Calculates activity distribution by hour
 */
export function calculateActivityDistribution(messages: MessageData[]): number[] {
  const hourDistribution = new Array(24).fill(0);
  
  for (const message of messages) {
    const hour = new Date(message.timestamp).getHours();
    hourDistribution[hour]++;
  }
  
  return hourDistribution;
}

/**
 * Finds peak activity hour
 */
export function findPeakActivityHour(distribution: number[]): number {
  return distribution.reduce((maxHour, count, hour) => 
    count > distribution[maxHour] ? hour : maxHour, 0
  );
}

/**
 * Generates summary for a single sender
 */
export function generateSenderSummary(
  group: MessageGroup,
  options: SummaryGenerationOptions = {}
): string {
  const { maxSenderSummaryLength = 60 } = options;
  const { messages, messageCount, senderName } = group;
  
  if (messageCount === 0) {
    return `${senderName} sent no messages during this period.`;
  }
  
  // Analyze message types
  const messageTypes = {
    text: messages.filter(m => m.type === 'text' || m.type === 'conversation').length,
    media: messages.filter(m => ['image', 'video', 'audio', 'document'].includes(m.type)).length
  };
  
  // Calculate engagement metrics
  const textMessages = messages.filter(m => m.type === 'text' || m.type === 'conversation');
  const averageLength = textMessages.length > 0 
    ? Math.round(textMessages.reduce((sum, m) => sum + m.message.length, 0) / textMessages.length)
    : 0;
  
  const questionCount = textMessages.filter(m => m.message.includes('?')).length;
  
  // Generate contextual summary
  let summary = `${senderName} sent ${messageCount} messages`;
  
  if (messageTypes.media > 0) {
    summary += ` (${messageTypes.text} text, ${messageTypes.media} media)`;
  }
  
  if (questionCount > 0) {
    summary += `, asked ${questionCount} questions`;
  }
  
  if (averageLength > 0) {
    summary += `, avg ${averageLength} chars per message`;
  }
  
  // Add activity timing
  const firstTime = new Date(group.firstMessage).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const lastTime = new Date(group.lastMessage).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (firstTime !== lastTime) {
    summary += `. Active from ${firstTime} to ${lastTime}`;
  } else {
    summary += `. Active at ${firstTime}`;
  }
  
  // Ensure summary doesn't exceed word limit
  const words = summary.split(' ');
  if (words.length > maxSenderSummaryLength) {
    summary = words.slice(0, maxSenderSummaryLength).join(' ') + '...';
  }
  
  return summary + '.';
}

/**
 * Generates AI-powered content summary using OpenAI
 */
async function generateAIGroupSummary(
  messages: MessageData[],
  groupName: string,
  groupData: {
    totalMessages: number;
    activeParticipants: number;
    topKeywords: KeywordAnalysis[];
    topEmojis: EmojiAnalysis[];
    messageTypes: any;
    timeRange: { start: Date; end: Date };
  }
): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return generateBasicGroupSummary(groupData);
  }

  try {
    // Format recent messages for AI analysis (limit to manage token usage)
    const recentMessages = messages.slice(-100);
    const conversationText = recentMessages
      .map(msg => {
        const time = msg.timestamp.toISOString().substring(11, 16);
        return `[${time}] ${msg.senderName}: ${msg.message}`;
      })
      .join('\n');

    const prompt = `Analyze this WhatsApp group conversation from "${groupName}" and provide a concise, informative summary focusing on the main discussion topics, key decisions, important events, and overall group activity.

Conversation:
${conversationText}

Statistical context:
- ${groupData.totalMessages} total messages from ${groupData.activeParticipants} participants
- Time period: ${groupData.timeRange.start.toLocaleDateString()} to ${groupData.timeRange.end.toLocaleDateString()}
- Main topics: ${groupData.topKeywords.slice(0, 5).map(k => k.keyword).join(', ')}

Please provide a 2-3 paragraph summary that captures the essence of the conversation, major themes discussed, and any significant events or decisions. Write in the same language as the majority of the messages.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing group conversations and creating concise, informative summaries that capture the key points and context.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 400
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    const aiSummary = response.data?.choices?.[0]?.message?.content;
    if (aiSummary && aiSummary.trim().length > 50) {
      return aiSummary.trim();
    }
  } catch (error) {
    console.error('[Summarization] AI summary generation failed:', error);
  }

  // Fallback to basic summary if AI fails
  return generateBasicGroupSummary(groupData);
}

/**
 * Generates basic statistical group summary (fallback)
 */
function generateBasicGroupSummary(
  groupData: {
    totalMessages: number;
    activeParticipants: number;
    topKeywords: KeywordAnalysis[];
    topEmojis: EmojiAnalysis[];
    messageTypes: any;
    timeRange: { start: Date; end: Date };
  }
): string {
  const { totalMessages, activeParticipants, topKeywords, topEmojis, messageTypes, timeRange } = groupData;

  let summary = '';

  // Basic stats
  summary += `Group activity summary: ${totalMessages} messages from ${activeParticipants} participants. `;

  // Message composition
  if (messageTypes.text > 0 || messageTypes.media > 0) {
    summary += `Message breakdown: ${messageTypes.text} text messages`;
    if (messageTypes.media > 0) {
      summary += `, ${messageTypes.media} media files`;
    }
    if (messageTypes.other > 0) {
      summary += `, ${messageTypes.other} other`;
    }
    summary += '. ';
  }

  // Top discussion topics
  if (topKeywords.length > 0) {
    const topTopics = topKeywords.slice(0, 5).map(k => k.keyword).join(', ');
    summary += `Main topics discussed: ${topTopics}. `;
  }

  // Emoji usage
  if (topEmojis.length > 0) {
    const topEmojisStr = topEmojis.slice(0, 3).map(e => `${e.emoji} (${e.count})`).join(', ');
    summary += `Most used emojis: ${topEmojisStr}. `;
  }

  // Time period
  const startTime = timeRange.start.toLocaleDateString();
  const endTime = timeRange.end.toLocaleDateString();

  if (startTime === endTime) {
    summary += `Activity occurred on ${startTime}.`;
  } else {
    summary += `Activity period: ${startTime} to ${endTime}.`;
  }

  return summary;
}

/**
 * Generates overall group summary (with AI when available)
 */
export async function generateGroupSummary(
  messages: MessageData[],
  groupName: string,
  groupData: {
    totalMessages: number;
    activeParticipants: number;
    topKeywords: KeywordAnalysis[];
    topEmojis: EmojiAnalysis[];
    messageTypes: any;
    timeRange: { start: Date; end: Date };
  },
  options: SummaryGenerationOptions = {}
): Promise<string> {
  // Try AI-powered summary first if we have enough messages
  if (messages.length >= 5) {
    try {
      return await generateAIGroupSummary(messages, groupName, groupData);
    } catch (error) {
      console.error('[Summarization] AI summary failed, falling back to basic summary:', error);
    }
  }

  // Fallback to basic summary
  return generateBasicGroupSummary(groupData);
}

/**
 * Creates comprehensive sender insights
 */
export function createSenderInsights(
  group: MessageGroup,
  options: SummaryGenerationOptions = {}
): SenderInsights {
  const keywords = generateKeywordAnalysis(group.messages, options.keywordMinCount || 2);
  const emojis = generateEmojiAnalysis(group.messages, options.emojiMinCount || 2);
  const distribution = calculateActivityDistribution(group.messages);
  const peakHour = findPeakActivityHour(distribution);
  
  // Calculate engagement metrics
  const textMessages = group.messages.filter(m => m.type === 'text' || m.type === 'conversation');
  const averageMessageLength = textMessages.length > 0
    ? Math.round(textMessages.reduce((sum, m) => sum + m.message.length, 0) / textMessages.length)
    : 0;
  
  const mediaCount = group.messages.filter(m => 
    ['image', 'video', 'audio', 'document'].includes(m.type)
  ).length;
  
  const questionCount = textMessages.filter(m => m.message.includes('?')).length;
  
  return {
    senderName: group.senderName,
    senderPhone: group.senderPhone,
    messageCount: group.messageCount,
    summary: generateSenderSummary(group, options),
    topKeywords: keywords,
    topEmojis: emojis,
    activityPattern: {
      peakHour,
      messageDistribution: distribution
    },
    engagement: {
      averageMessageLength,
      mediaCount,
      questionCount
    }
  };
}

/**
 * Calculates message type distribution
 */
export function calculateMessageTypeDistribution(messages: MessageData[]): {
  text: number;
  image: number;
  video: number;
  audio: number;
  document: number;
  other: number;
} {
  const distribution = {
    text: 0,
    image: 0,
    video: 0,
    audio: 0,
    document: 0,
    other: 0
  };
  
  for (const message of messages) {
    const type = message.type.toLowerCase();
    
    if (type === 'text' || type === 'conversation') {
      distribution.text++;
    } else if (type.includes('image')) {
      distribution.image++;
    } else if (type.includes('video')) {
      distribution.video++;
    } else if (type.includes('audio')) {
      distribution.audio++;
    } else if (type.includes('document')) {
      distribution.document++;
    } else {
      (distribution as any).other++;
    }
  }
  
  return distribution;
}

/**
 * Generates complete group summary data
 */
export async function generateCompleteGroupSummary(
  messages: MessageData[],
  groupId: string,
  groupName: string,
  timeRange: { start: Date; end: Date },
  options: SummaryGenerationOptions = {}
): Promise<GroupSummaryData> {
  const startTime = Date.now();
  
  // Filter messages by minimum count if specified
  const filteredMessages = messages.filter(m => 
    !options.excludeSystemMessages || (m.type !== 'system' && m.type !== 'protocol')
  );
  
  // Group messages by sender
  const senderGroups = groupMessagesBySender(filteredMessages);
  
  // Filter out senders with too few messages
  const minMessageCount = options.minMessageCount || 1;
  const activeSenders = Array.from(senderGroups.values())
    .filter(group => group.messageCount >= minMessageCount);
  
  // Generate insights for each sender
  const senderInsights = activeSenders.map(group => 
    createSenderInsights(group, options)
  );
  
  // Calculate overall analytics
  const totalMessages = filteredMessages.length;
  const activeParticipants = activeSenders.length;
  const topKeywords = generateKeywordAnalysis(filteredMessages, options.keywordMinCount);
  const topEmojis = generateEmojiAnalysis(filteredMessages, options.emojiMinCount);
  const messageTypes = calculateMessageTypeDistribution(filteredMessages);
  
  // Calculate activity peaks
  const hourDistribution = calculateActivityDistribution(filteredMessages);
  const activityPeaks = hourDistribution
    .map((count, hour) => ({ hour, count }))
    .filter(peak => peak.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Generate overall summary
  const overallSummary = await generateGroupSummary(
    filteredMessages,
    groupName,
    {
      totalMessages,
      activeParticipants,
      topKeywords,
      topEmojis,
      messageTypes,
      timeRange
    },
    options
  );
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    groupId,
    groupName,
    timeRange,
    totalMessages,
    activeParticipants,
    senderInsights,
    overallSummary,
    topKeywords,
    topEmojis,
    activityPeaks,
    messageTypes,
    processingStats: {
      processingTimeMs,
      messagesAnalyzed: filteredMessages.length,
      participantsFound: senderGroups.size
    }
  };
}