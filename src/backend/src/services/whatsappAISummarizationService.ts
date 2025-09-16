import axios from 'axios';
import {
  GroupSummaryData,
  SenderInsights,
  MessageData,
  MessageGroup,
  KeywordAnalysis,
  EmojiAnalysis,
  SummaryGenerationOptions,
  DateRange
} from '../types/whatsappSummary';
import WhatsAppSummarizationService from './whatsappSummarizationService';

// AI Service Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface AIProvider {
  name: 'openai' | 'anthropic' | 'gemini';
  available: boolean;
}

interface ContentSummary {
  overallSummary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  actionItems: string[];
  importantEvents: string[];
  decisionsMade: string[];
  speakerAttributions?: { speakerName: string; bullets: string[] }[];
}

export class WhatsAppAISummarizationService extends WhatsAppSummarizationService {
  private aiProvider: AIProvider;

  constructor() {
    super();
    // Determine which AI provider to use based on available API keys
    if (OPENAI_API_KEY) {
      this.aiProvider = { name: 'openai', available: true };
    } else if (ANTHROPIC_API_KEY) {
      this.aiProvider = { name: 'anthropic', available: true };
    } else if (GEMINI_API_KEY) {
      this.aiProvider = { name: 'gemini', available: true };
    } else {
      this.aiProvider = { name: 'openai', available: false };
      console.warn('[WhatsApp AI Summary] No AI API key configured, will use basic summarization');
    }
  }

  /**
   * Generate a comprehensive daily summary with AI-powered content analysis
   */
  public async generateGroupSummary(
    groupId: string,
    groupName: string,
    messages: MessageData[],
    timeRange: DateRange,
    options: Partial<SummaryGenerationOptions> = {}
  ): Promise<GroupSummaryData> {
    // First get the basic metadata summary from parent class
    const basicSummary = await super.generateGroupSummary(groupId, groupName, messages, timeRange, options);

    // If no AI provider is available, return basic summary
    if (!this.aiProvider.available) {
      return basicSummary;
    }

    // If there are no messages, return basic summary
    if (messages.length === 0) {
      return basicSummary;
    }

    try {
      // Determine output language
      const targetLanguage = await this.resolveTargetLanguage(messages, options.targetLanguage || 'auto');

      // Generate AI-powered content summary
      const contentSummary = await this.generateAIContentSummary(messages, groupName, {
        language: targetLanguage,
        withAttribution: options.speakerAttribution === true,
        maxSpeakers: options.maxSpeakerAttributions || 5
      });

      // Enhance sender insights with AI summaries
      const enhancedSenderInsights = await this.enhanceSenderInsights(
        basicSummary.senderInsights,
        messages
      );

      // Merge AI insights with basic summary
      return {
        ...basicSummary,
        overallSummary: contentSummary.overallSummary,
        senderInsights: enhancedSenderInsights,
        // Add new AI-generated fields
        aiInsights: {
          keyTopics: contentSummary.keyTopics,
          sentiment: contentSummary.sentiment,
          actionItems: contentSummary.actionItems,
          importantEvents: contentSummary.importantEvents,
          decisionsMade: contentSummary.decisionsMade,
          speakerAttributions: contentSummary.speakerAttributions
        }
      } as any;
    } catch (error) {
      console.error('[WhatsApp AI Summary] Error generating AI summary:', error);
      // Fall back to basic summary if AI fails
      return basicSummary;
    }
  }

  private async resolveTargetLanguage(messages: MessageData[], preferred: 'auto' | string): Promise<string> {
    if (preferred && preferred !== 'auto') return preferred;
    // Simple heuristic: detect if majority of characters are Hebrew vs Latin
    const recent = messages.slice(-200);
    let he = 0, en = 0;
    for (const m of recent) {
      const text = (m.message || '').slice(0, 400);
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // Hebrew block: 0x0590 - 0x05FF
        if (code >= 0x0590 && code <= 0x05FF) he++;
        // Basic Latin and Latin-1 supplement/extended ranges (rough heuristic)
        else if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) en++;
      }
    }
    if (he === 0 && en === 0) return 'en';
    return he > en ? 'he' : 'en';
  }

  /**
   * Generate AI-powered content summary using the configured provider
   */
  private async generateAIContentSummary(
    messages: MessageData[],
    groupName: string,
    opts: { language: string; withAttribution: boolean; maxSpeakers: number }
  ): Promise<ContentSummary> {
    // Prepare messages for AI analysis (limit to recent messages to manage token usage)
    const recentMessages = messages.slice(-150); // Last N messages
    const conversationText = this.formatMessagesForAI(recentMessages);

    switch (this.aiProvider.name) {
      case 'openai':
        return await this.generateOpenAISummary(conversationText, groupName, opts);
      case 'anthropic':
        return await this.generateAnthropicSummary(conversationText, groupName, opts);
      case 'gemini':
        return await this.generateGeminiSummary(conversationText, groupName, opts);
      default:
        throw new Error('No AI provider configured');
    }
  }

  /**
   * Format messages for AI processing
   */
  private formatMessagesForAI(messages: MessageData[]): string {
    return messages
      .map(msg => {
        const time = msg.timestamp.toISOString().substring(11, 16);
        return `[${time}] ${msg.senderName}: ${msg.message}`;
      })
      .join('\n');
  }

  /**
   * Generate summary using OpenAI
   */
  private async generateOpenAISummary(
    conversationText: string,
    groupName: string,
    opts: { language: string; withAttribution: boolean; maxSpeakers: number }
  ): Promise<ContentSummary> {
    const attributionClause = opts.withAttribution
      ? `\n7. Provide a concise bullet list of per-participant contributions (up to ${opts.maxSpeakers} speakers) as { "speakerAttributions": [{ "speakerName": "...", "bullets": ["point1", "point2"] }] }\n` : '\n';

    const languageClause = opts.language && opts.language !== 'auto'
      ? `Write the entire output in ${opts.language === 'he' ? 'Hebrew' : opts.language}.`
      : 'Write the entire output in the same language as the majority of the messages.';

    const prompt = `You are an expert at analyzing WhatsApp group conversations. Analyze the following conversation from the group "${groupName}" and provide a comprehensive summary. ${languageClause}

Conversation:
${conversationText}

Please provide a JSON object with the following structure:
1. overallSummary: 2-3 paragraphs highlighting main discussion points, events, decisions, and takeaways
2. keyTopics: array of main subjects/themes
3. sentiment: one of positive|neutral|negative|mixed
4. actionItems: array of tasks mentioned (with owners if clear)
5. importantEvents: array of significant events/announcements
6. decisionsMade: array of decisions reached
${attributionClause}
Format strictly as JSON.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise analyst that outputs strictly valid JSON without extra commentary.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in OpenAI response');

    try {
      const parsed = JSON.parse(content);
      return this.validateContentSummary(parsed);
    } catch (e) {
      console.error('[WhatsApp AI Summary] Failed to parse OpenAI response:', e);
      return this.getDefaultContentSummary();
    }
  }

  /**
   * Generate summary using Anthropic Claude
   */
  private async generateAnthropicSummary(
    conversationText: string,
    groupName: string,
    opts: { language: string; withAttribution: boolean; maxSpeakers: number }
  ): Promise<ContentSummary> {
    const attributionClause = opts.withAttribution
      ? `\n7. Provide speakerAttributions: a short bullet list per participant (up to ${opts.maxSpeakers}) as JSON` : '';

    const languageClause = opts.language && opts.language !== 'auto'
      ? `Write the output in ${opts.language === 'he' ? 'Hebrew' : opts.language}.`
      : 'Write the output in the language that matches most messages.';

    const prompt = `Analyze this WhatsApp group conversation from "${groupName}" and return a strict JSON summary. ${languageClause}

Conversation:
${conversationText}

JSON fields:
- overallSummary: 2-3 paragraph summary
- keyTopics: string[]
- sentiment: positive|neutral|negative|mixed
- actionItems: string[]
- importantEvents: string[]
- decisionsMade: string[]${attributionClause}`;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data?.content?.[0]?.text;
    if (!content) throw new Error('No content in Anthropic response');

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return this.validateContentSummary(JSON.parse(jsonMatch[0]));
    } catch (e) {
      console.error('[WhatsApp AI Summary] Failed to parse Anthropic response:', e);
    }
    return this.getDefaultContentSummary();
  }

  /**
   * Generate summary using Google Gemini
   */
  private async generateGeminiSummary(
    conversationText: string,
    groupName: string,
    opts: { language: string; withAttribution: boolean; maxSpeakers: number }
  ): Promise<ContentSummary> {
    const attributionClause = opts.withAttribution
      ? `\n7. Also include speakerAttributions: up to ${opts.maxSpeakers} participants with concise bullet points each.` : '';

    const languageClause = opts.language && opts.language !== 'auto'
      ? `Write the output in ${opts.language === 'he' ? 'Hebrew' : opts.language}.`
      : 'Write the output in the dominant language of the messages.';

    const prompt = `Analyze this WhatsApp group conversation from "${groupName}" and provide a JSON summary with:
- overallSummary: comprehensive 2-3 paragraph summary
- keyTopics: main discussion topics
- sentiment: overall tone
- actionItems: tasks mentioned
- importantEvents: significant announcements
- decisionsMade: decisions reached${attributionClause}
${languageClause}

Conversation:
${conversationText}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content in Gemini response');

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return this.validateContentSummary(JSON.parse(jsonMatch[0]));
    } catch (e) {
      console.error('[WhatsApp AI Summary] Failed to parse Gemini response:', e);
    }
    return this.getDefaultContentSummary();
  }

  private async enhanceSenderInsights(
    senderInsights: SenderInsights[],
    messages: MessageData[]
  ): Promise<SenderInsights[]> {
    // For top 5 senders, generate personalized summaries
    const topSenders = senderInsights.slice(0, 5);
    const enhancedInsights = await Promise.all(
      topSenders.map(async (sender) => {
        try {
          const senderMessages = messages.filter(m => m.senderPhone === sender.senderPhone);
          const senderSummary = await this.generateAISenderSummary(
            sender.senderName,
            senderMessages
          );
          return { ...sender, summary: senderSummary };
        } catch (error) {
          console.error(`[WhatsApp AI Summary] Error enhancing sender ${sender.senderName}:`, error);
          return sender; // Return original if enhancement fails
        }
      })
    );
    return [...enhancedInsights, ...senderInsights.slice(5)];
  }

  private async generateAISenderSummary(
    senderName: string,
    messages: MessageData[]
  ): Promise<string> {
    if (messages.length === 0) return 'No messages';
    if (!this.aiProvider.available) {
      return `Sent ${messages.length} messages`;
    }

    const messageTexts = messages.slice(-20).map(m => m.message).join('. ');
    const prompt = `Summarize what ${senderName} discussed in these messages in one concise sentence (max 100 characters): "${messageTexts}"`;

    try {
      if (this.aiProvider.name === 'openai') {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 50
          },
          { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } }
        );
        const summary = response.data?.choices?.[0]?.message?.content;
        return summary ? summary.substring(0, 100) : `Sent ${messages.length} messages`;
      }
    } catch (error) {
      console.error('[WhatsApp AI Summary] Error generating sender summary:', error);
    }
    return `Sent ${messages.length} messages`;
  }

  private validateContentSummary(data: any): ContentSummary {
    const result: ContentSummary = {
      overallSummary: data.overallSummary || 'Summary not available',
      keyTopics: Array.isArray(data.keyTopics) ? data.keyTopics : [],
      sentiment: this.validateSentiment(data.sentiment),
      actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
      importantEvents: Array.isArray(data.importantEvents) ? data.importantEvents : [],
      decisionsMade: Array.isArray(data.decisionsMade) ? data.decisionsMade : []
    };
    if (Array.isArray(data.speakerAttributions)) {
      result.speakerAttributions = data.speakerAttributions
        .filter((x: any) => x && typeof x.speakerName === 'string' && Array.isArray(x.bullets))
        .map((x: any) => ({ speakerName: String(x.speakerName), bullets: x.bullets.map((b: any) => String(b)) }));
    }
    return result;
  }

  private validateSentiment(sentiment: any): 'positive' | 'neutral' | 'negative' | 'mixed' {
    const validSentiments = ['positive', 'neutral', 'negative', 'mixed'];
    return validSentiments.includes(sentiment) ? sentiment : 'neutral';
  }

  private getDefaultContentSummary(): ContentSummary {
    return {
      overallSummary: 'AI summary generation failed. Please check your API configuration.',
      keyTopics: [],
      sentiment: 'neutral',
      actionItems: [],
      importantEvents: [],
      decisionsMade: []
    };
  }
}

export default WhatsAppAISummarizationService;