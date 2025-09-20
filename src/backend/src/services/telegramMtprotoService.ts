import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import type { ITelegramChannelMessage } from '../models/TelegramChannel';

interface MtprotoChannelInfo {
  id: string;
  title: string;
  username?: string;
  description?: string;
  type: 'channel' | 'group' | 'supergroup';
}

interface FetchOptions {
  limit?: number;
  minId?: number;
  offsetDate?: Date;
}

const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID || process.env.TELEGRAM_APP_ID;
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || process.env.TELEGRAM_APP_HASH;
const TELEGRAM_USER_SESSION = process.env.TELEGRAM_USER_SESSION || '';

class TelegramMtprotoService {
  private client: TelegramClient | null = null;
  private connectingPromise: Promise<TelegramClient> | null = null;

  constructor() {
    if (this.isConfigured()) {
      console.log('[TelegramMtprotoService] MTProto credentials detected. MTProto monitoring enabled.');
    } else {
      console.warn('[TelegramMtprotoService] MTProto credentials missing. Set TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_USER_SESSION to enable non-bot monitoring.');
    }
  }

  isConfigured(): boolean {
    return Boolean(TELEGRAM_API_ID && TELEGRAM_API_HASH && TELEGRAM_USER_SESSION);
  }

  async getChannelInfo(identifier: string): Promise<MtprotoChannelInfo | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const client = await this.ensureClient();
      const entity = await client.getEntity(identifier);

      if (entity instanceof Api.Channel) {
        return {
          id: entity.username ? `@${entity.username}` : entity.id.toString(),
          title: entity.title || identifier,
          username: entity.username || undefined,
          description: 'about' in entity ? (entity as any).about : undefined,
          type: entity.megagroup ? 'supergroup' : 'channel'
        };
      }

      if (entity instanceof Api.Chat || entity instanceof Api.ChatForbidden) {
        return {
          id: entity.id.toString(),
          title: (entity as Api.Chat).title || identifier,
          type: 'group'
        };
      }

      return null;
    } catch (error) {
      console.error('[TelegramMtprotoService] Failed to resolve channel info:', error);
      return null;
    }
  }

  async fetchRecentMessages(identifier: string, options: FetchOptions = {}): Promise<ITelegramChannelMessage[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const client = await this.ensureClient();
      const entity = await client.getEntity(identifier);

      const history = await client.getMessages(entity, {
        limit: options.limit ?? 100,
        minId: options.minId ?? 0,
        offsetDate: options.offsetDate ? Math.floor(options.offsetDate.getTime() / 1000) : undefined
      });

      return history
        .filter((message): message is Api.Message => message instanceof Api.Message)
        .map(message => this.mapMessage(message))
        .filter((value): value is ITelegramChannelMessage => Boolean(value));
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('AUTH_KEY_UNREGISTERED')) {
        console.error('[TelegramMtprotoService] MTProto session expired. Update TELEGRAM_USER_SESSION.');
      } else {
        console.error(`[TelegramMtprotoService] Failed to fetch messages for ${identifier}:`, errorMessage);
      }
      return [];
    }
  }

  private async ensureClient(): Promise<TelegramClient> {
    if (!this.isConfigured()) {
      throw new Error('MTProto credentials not configured');
    }

    if (this.client) {
      return this.client;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    const apiId = Number(TELEGRAM_API_ID);
    if (Number.isNaN(apiId)) {
      throw new Error('TELEGRAM_API_ID must be a valid number');
    }

    const stringSession = new StringSession(TELEGRAM_USER_SESSION);
    this.connectingPromise = this.createClient(stringSession, apiId, TELEGRAM_API_HASH as string);

    try {
      this.client = await this.connectingPromise;
      return this.client;
    } finally {
      this.connectingPromise = null;
    }
  }

  private async createClient(session: StringSession, apiId: number, apiHash: string): Promise<TelegramClient> {
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      autoReconnect: true,
      deviceModel: 'Synapse MTProto Monitor',
      appVersion: '1.0.0',
      systemVersion: 'NodeJS',
      langCode: 'en'
    });

    await client.connect();

    if (!client.session || !client.session.authKey) {
      throw new Error('Invalid MTProto session. Provide TELEGRAM_USER_SESSION from a logged-in account.');
    }

    return client;
  }

  private mapMessage(message: Api.Message): ITelegramChannelMessage | null {
    const text = message.message ? message.message.trim() : undefined;

    if (!text && !message.media) {
      return null;
    }

    const mapped: ITelegramChannelMessage = {
      messageId: message.id,
      text,
      date: this.getMessageDate(message),
      views: typeof message.views === 'number' ? message.views : undefined,
      forwards: typeof message.forwards === 'number' ? message.forwards : undefined,
      reactions: this.mapReactions(message.reactions),
      urls: this.extractUrls(text, message.entities),
      hashtags: this.extractHashtags(text, message.entities),
      author: this.resolveAuthor(message)
    };

    if (mapped.urls && mapped.urls.length === 0) {
      delete mapped.urls;
    }

    if (mapped.hashtags && mapped.hashtags.length === 0) {
      delete mapped.hashtags;
    }

    if (message.media instanceof Api.MessageMediaPhoto) {
      mapped.mediaType = 'photo';
      mapped.mediaFileId = this.extractFileId(message.media.photo);
    } else if (message.media instanceof Api.MessageMediaDocument) {
      const document = message.media.document as Api.Document;
      mapped.mediaFileId = this.extractFileId(document);
      const mimeType = document?.mimeType || '';

      if (mimeType.startsWith('video/')) {
        mapped.mediaType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        mapped.mediaType = 'audio';
      } else if (mimeType === 'application/pdf') {
        mapped.mediaType = 'document';
      } else if (mimeType === 'image/webp') {
        mapped.mediaType = 'sticker';
      } else {
        mapped.mediaType = 'document';
      }
    }

    return mapped;
  }

  private getMessageDate(message: Api.Message): Date {
    if (typeof message.date === 'number') {
      return new Date(message.date * 1000);
    }

    return new Date();
  }

  private mapReactions(reactions?: Api.MessageReactions | null) {
    if (!reactions || !(reactions instanceof Api.MessageReactions)) {
      return undefined;
    }

    const result = reactions.results?.map(item => ({
      emoji: this.extractReactionEmoji(item.reaction),
      count: item.count
    })) ?? [];

    return result.length > 0 ? result : undefined;
  }

  private extractReactionEmoji(reaction?: Api.TypeReaction | null): string {
    if (!reaction) {
      return 'unknown';
    }

    if (reaction instanceof Api.ReactionEmoji) {
      return reaction.emoticon;
    }

    if (reaction instanceof Api.ReactionCustomEmoji) {
      return `custom:${reaction.documentId.toString()}`;
    }

    return 'unknown';
  }

  private extractUrls(text?: string, entities?: Api.TypeMessageEntity[]): string[] | undefined {
    if (!text) {
      return undefined;
    }

    const urls = new Set<string>();

    if (entities) {
      for (const entity of entities) {
        if (entity instanceof Api.MessageEntityUrl || entity instanceof Api.MessageEntityTextUrl) {
          const substring = text.slice(entity.offset, entity.offset + entity.length);
          if (substring) {
            urls.add(substring);
          }
          if (entity instanceof Api.MessageEntityTextUrl && entity.url) {
            urls.add(entity.url);
          }
        }
      }
    }

    const regex = /\bhttps?:\/\/\S+/gi;
    const matches = text.match(regex);
    if (matches) {
      for (const match of matches) {
        urls.add(match);
      }
    }

    return urls.size > 0 ? Array.from(urls) : undefined;
  }

  private extractHashtags(text?: string, entities?: Api.TypeMessageEntity[]): string[] | undefined {
    if (!text) {
      return undefined;
    }

    const hashtags = new Set<string>();

    if (entities) {
      for (const entity of entities) {
        if (entity instanceof Api.MessageEntityHashtag) {
          const tag = text.slice(entity.offset, entity.offset + entity.length);
          if (tag) {
            hashtags.add(tag.startsWith('#') ? tag : `#${tag}`);
          }
        }
      }
    }

    const regex = /#[A-Za-z0-9_]+/g;
    const matches = text.match(regex);
    if (matches) {
      for (const match of matches) {
        hashtags.add(match);
      }
    }

    return hashtags.size > 0 ? Array.from(hashtags) : undefined;
  }

  private resolveAuthor(message: Api.Message): string | undefined {
    if (message.postAuthor) {
      return message.postAuthor;
    }

    if (message.fromId instanceof Api.PeerUser && message.fwdFrom?.fromName) {
      return message.fwdFrom.fromName;
    }

    return undefined;
  }

  private extractFileId(media?: Api.TypePhoto | Api.TypeDocument | null): string | undefined {
    if (!media) {
      return undefined;
    }

    if (media instanceof Api.Photo || media instanceof Api.Document) {
      return media.id.toString();
    }

    return undefined;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.error('[TelegramMtprotoService] Error during shutdown:', error);
      } finally {
        this.client = null;
      }
    }
  }
}

export const telegramMtprotoService = new TelegramMtprotoService();
export default telegramMtprotoService;
