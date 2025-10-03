import { IRealNewsArticle } from '../models/RealNewsArticle';
import { userInterestService } from './userInterestService';
import { telegramBotManager } from './telegramBotManager';
import WAHAService from './wahaService';
import { logger } from '../utils/logger';

/**
 * Format article for messaging
 */
function formatArticleForMessaging(article: IRealNewsArticle): string {
  const lines = [
    `📰 *${article.title}*`,
    '',
    article.description ? article.description : '',
    '',
    `📅 ${new Date(article.publishedAt).toLocaleDateString()}`,
    `📰 Source: ${article.source.name}`,
    article.category ? `🏷️ Category: ${article.category}` : '',
    '',
    `🔗 Read more: ${article.url}`
  ];
  
  return lines.filter(line => line !== '').join('\n');
}

/**
 * Auto-push new articles based on user preferences
 */
export async function autoPushNewArticles(userId: string, articles: IRealNewsArticle[]): Promise<void> {
  try {
    const userInterests = await userInterestService.getUserInterests(userId);
    
    if (!userInterests?.autoPush?.enabled || !userInterests?.autoPush?.platform) {
      return; // Auto-push not enabled
    }

    const { platform, whatsappGroupId, minRelevanceScore = 0.5 } = userInterests.autoPush;

    // Filter articles by relevance score
    const articlesToPush = articles.filter(article => 
      (article.relevanceScore ?? 0) >= minRelevanceScore
    );

    if (articlesToPush.length === 0) {
      logger.info(`[Auto-Push] No articles meet relevance threshold (${minRelevanceScore}) for user ${userId}`);
      return;
    }

    logger.info(`[Auto-Push] Pushing ${articlesToPush.length} articles for user ${userId} to ${platform}`);

    // Push each article
    for (const article of articlesToPush) {
      try {
        const message = formatArticleForMessaging(article);

        if (platform === 'telegram') {
          const userBot = telegramBotManager.getBotForUser(userId);
          if (userBot) {
            await telegramBotManager.sendMessage(
              userId,
              parseInt(userId),
              message,
              { parse_mode: 'Markdown' }
            );
          } else {
            logger.warn(`[Auto-Push] No Telegram bot configured for user ${userId}`);
          }
        } else if (platform === 'whatsapp' && whatsappGroupId) {
          const wahaService = WAHAService.getInstance();
          await wahaService.sendMessage(whatsappGroupId, message, 'default');
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`[Auto-Push] Failed to push article ${article._id}:`, error);
        // Continue with other articles
      }
    }

    logger.info(`[Auto-Push] Successfully pushed ${articlesToPush.length} articles for user ${userId}`);
  } catch (error) {
    logger.error('[Auto-Push] Error in autoPushNewArticles:', error);
    // Don't throw - we don't want to break the refresh flow
  }
}

