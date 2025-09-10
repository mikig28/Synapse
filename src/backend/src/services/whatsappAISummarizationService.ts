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
      // Generate AI-powered content summary
      const contentSummary = await this.generateAIContentSummary(messages, groupName);

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
          decisionsMade: contentSummary.decisionsMade
        }
      } as any;
    } catch (error) {
      console.error('[WhatsApp AI Summary] Error generating AI summary:', error);
      // Fall back to basic summary if AI fails
      return basicSummary;
    }
  }

  /**
   * Generate AI-powered content summary using the configured provider
   */
  private async generateAIContentSummary(
    messages: MessageData[],
    groupName: string
  ): Promise<ContentSummary> {
    // Prepare messages for AI analysis (limit to recent messages to manage token usage)
    const recentMessages = messages.slice(-100); // Last 100 messages
    const conversationText = this.formatMessagesForAI(recentMessages);

    switch (this.aiProvider.name) {
      case 'openai':
        return await this.generateOpenAISummary(conversationText, groupName);
      case 'anthropic':
        return await this.generateAnthropicSummary(conversationText, groupName);
      case 'gemini':
        return await this.generateGeminiSummary(conversationText, groupName);
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
        const time = msg.timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        return `[${time}] ${msg.senderName}: ${msg.message}`;
      })
      .join('\n');
  }

  /**
   * Generate summary using OpenAI
   */
  private async generateOpenAISummary(
    conversationText: string,
    groupName: string
  ): Promise<ContentSummary> {
    const prompt = `You are an expert at analyzing WhatsApp group conversations. Please analyze the following conversation from the group "${groupName}" and provide a comprehensive summary.

Conversation:
${conversationText}

Please provide:
1. An overall summary of the conversation (2-3 paragraphs highlighting the main discussion points, important topics, and key takeaways)
2. Key topics discussed (list the main subjects/themes)
3. Overall sentiment of the conversation (positive, neutral, negative, or mixed)
4. Any action items or tasks mentioned
5. Important events or announcements shared
6. Any decisions that were made

Format your response as a JSON object with the following structure:
{
  "overallSummary": "detailed summary here",
  "keyTopics": ["topic1", "topic2", ...],
  "sentiment": "positive|neutral|negative|mixed",
  "actionItems": ["action1", "action2", ...],
  "importantEvents": ["event1", "event2", ...],
  "decisionsMade": ["decision1", "decision2", ...]
}`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that analyzes WhatsApp group conversations and provides detailed summaries.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      try {
        const parsed = JSON.parse(content);
        return this.validateContentSummary(parsed);
      } catch (parseError) {
        console.error('[WhatsApp AI Summary] Failed to parse OpenAI response:', parseError);
        return this.getDefaultContentSummary();
      }
    } catch (error) {
      console.error('[WhatsApp AI Summary] OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Generate summary using Anthropic Claude
   */
  private async generateAnthropicSummary(
    conversationText: string,
    groupName: string
  ): Promise<ContentSummary> {
    const prompt = `Analyze this WhatsApp group conversation from "${groupName}" and provide a comprehensive summary.

Conversation:
${conversationText}

Provide a JSON response with:
- overallSummary: 2-3 paragraph summary of main discussion points
- keyTopics: array of main topics discussed
- sentiment: overall tone (positive/neutral/negative/mixed)
- actionItems: array of tasks/actions mentioned
- importantEvents: array of significant events/announcements
- decisionsMade: array of decisions reached`;

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3
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
      if (!content) {
        throw new Error('No content in Anthropic response');
      }

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return this.validateContentSummary(parsed);
        }
      } catch (parseError) {
        console.error('[WhatsApp AI Summary] Failed to parse Anthropic response:', parseError);
      }

      return this.getDefaultContentSummary();
    } catch (error) {
      console.error('[WhatsApp AI Summary] Anthropic API error:', error);
      throw error;
    }
  }

  /**
   * Generate summary using Google Gemini
   */
  private async generateGeminiSummary(
    conversationText: string,
    groupName: string
  ): Promise<ContentSummary> {
    const prompt = `Analyze this WhatsApp group conversation from "${groupName}" and provide a JSON summary with:
- overallSummary: comprehensive 2-3 paragraph summary
- keyTopics: main discussion topics
- sentiment: overall tone
- actionItems: tasks mentioned
- importantEvents: significant announcements
- decisionsMade: decisions reached

Conversation:
${conversationText}`;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content in Gemini response');
      }

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return this.validateContentSummary(parsed);
        }
      } catch (parseError) {
        console.error('[WhatsApp AI Summary] Failed to parse Gemini response:', parseError);
      }

      return this.getDefaultContentSummary();
    } catch (error) {
      console.error('[WhatsApp AI Summary] Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Enhance sender insights with AI-generated summaries
   */
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
          
          return {
            ...sender,
            summary: senderSummary
          };
        } catch (error) {
          console.error(`[WhatsApp AI Summary] Error enhancing sender ${sender.senderName}:`, error);
          return sender; // Return original if enhancement fails
        }
      })
    );

    // Combine enhanced top senders with rest of the senders
    return [...enhancedInsights, ...senderInsights.slice(5)];
  }

  /**
   * Generate AI-powered summary for individual sender
   */
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
            temperature: 0.3,
            max_tokens: 50
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const summary = response.data?.choices?.[0]?.message?.content;
        return summary ? summary.substring(0, 100) : `Sent ${messages.length} messages`;
      }
    } catch (error) {
      console.error('[WhatsApp AI Summary] Error generating sender summary:', error);
    }

    return `Sent ${messages.length} messages`;
  }

  /**
   * Validate and normalize content summary
   */
  private validateContentSummary(data: any): ContentSummary {
    return {
      overallSummary: data.overallSummary || 'Summary not available',
      keyTopics: Array.isArray(data.keyTopics) ? data.keyTopics : [],
      sentiment: this.validateSentiment(data.sentiment),
      actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
      importantEvents: Array.isArray(data.importantEvents) ? data.importantEvents : [],
      decisionsMade: Array.isArray(data.decisionsMade) ? data.decisionsMade : []
    };
  }

  /**
   * Validate sentiment value
   */
  private validateSentiment(sentiment: any): 'positive' | 'neutral' | 'negative' | 'mixed' {
    const validSentiments = ['positive', 'neutral', 'negative', 'mixed'];
    return validSentiments.includes(sentiment) ? sentiment : 'neutral';
  }

  /**
   * Get default content summary when AI is not available
   */
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