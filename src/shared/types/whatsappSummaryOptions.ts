export interface SummaryGenerationOptions {
  maxSummaryLength?: number;
  maxSenderSummaryLength?: number;
  includeEmojis?: boolean;
  includeKeywords?: boolean;
  minMessageCount?: number;
  keywordMinCount?: number;
  emojiMinCount?: number;
  excludeSystemMessages?: boolean;
  timezone?: string;
  targetLanguage?: 'auto' | 'en' | 'he' | string;
  speakerAttribution?: boolean;
  maxSpeakerAttributions?: number;
}
