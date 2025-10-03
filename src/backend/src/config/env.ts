/**
 * Environment Variable Validation and Type-Safe Configuration
 *
 * This file ensures all required environment variables are present and valid
 * BEFORE the application starts. Prevents silent failures and runtime crashes.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Core Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),

  // Database (REQUIRED)
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // JWT Authentication (REQUIRED)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // AI Services (REQUIRED)
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Optional AI Services
  GEMINI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),

  // External Services
  CREWAI_SERVICE_URL: z.string().url().default('https://synapse-crewai.onrender.com'),
  WAHA_SERVICE_URL: z.string().url().optional(),
  WAHA_API_KEY: z.string().optional(),

  // Frontend URL for CORS
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Vector Database & Embeddings
  EMBEDDING_PROVIDER: z.enum(['voyage', 'gemini', 'openai']).default('openai'),
  EMBEDDING_FALLBACK_PROVIDERS: z.string().optional(),
  VOYAGE_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),

  // Social Media Integration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_API_ID: z.string().optional(),
  TELEGRAM_API_HASH: z.string().optional(),
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_BEARER_TOKEN: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),

  // WhatsApp Configuration
  WHATSAPP_AUTO_REPLY_ENABLED: z.string().transform(val => val === 'true').default('false'),
  WAHA_ENGINE: z.enum(['NOWEB', 'WEBJS']).default('NOWEB'),
  WAHA_NOWEB_STORE_ENABLED: z.string().transform(val => val === 'true').default('true'),
  WAHA_NOWEB_STORE_FULLSYNC: z.string().transform(val => val === 'true').default('true'),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: z.string().optional(),

  // Google Services
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Optional Features
  FIRECRAWL_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),
  TASK_REMINDER_TIME: z.string().default('09:00'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // Deployment Flags
  RENDER: z.string().optional(),
  WHATSAPP_SUMMARY_SCHEDULER_ENABLED: z.string().default('true'),
});

// Validate and parse environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    console.error('');

    error.errors.forEach((err) => {
      console.error(`  • ${err.path.join('.')}: ${err.message}`);
    });

    console.error('');
    console.error('💡 Please check your .env file and ensure all required variables are set.');
    console.error('');

    process.exit(1);
  }
  throw error;
}

// Export validated configuration
export const config = {
  app: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isRender: env.RENDER === 'true',
  },

  database: {
    uri: env.MONGODB_URI,
  },

  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },

  ai: {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    gemini: env.GEMINI_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY,
    cohere: env.COHERE_API_KEY,
    replicate: env.REPLICATE_API_TOKEN,
  },

  services: {
    crewai: env.CREWAI_SERVICE_URL,
    waha: {
      url: env.WAHA_SERVICE_URL,
      apiKey: env.WAHA_API_KEY,
      engine: env.WAHA_ENGINE,
    },
  },

  embeddings: {
    provider: env.EMBEDDING_PROVIDER,
    fallbackProviders: env.EMBEDDING_FALLBACK_PROVIDERS?.split(',') || [],
    voyageApiKey: env.VOYAGE_API_KEY,
    pineconeApiKey: env.PINECONE_API_KEY,
  },

  social: {
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
      apiId: env.TELEGRAM_API_ID,
      apiHash: env.TELEGRAM_API_HASH,
    },
    twitter: {
      apiKey: env.TWITTER_API_KEY,
      bearerToken: env.TWITTER_BEARER_TOKEN,
    },
    reddit: {
      clientId: env.REDDIT_CLIENT_ID,
      clientSecret: env.REDDIT_CLIENT_SECRET,
    },
  },

  whatsapp: {
    autoReplyEnabled: env.WHATSAPP_AUTO_REPLY_ENABLED,
    engine: env.WAHA_ENGINE,
    puppeteerExecutablePath: env.PUPPETEER_EXECUTABLE_PATH,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  },

  features: {
    firecrawlApiKey: env.FIRECRAWL_API_KEY,
    newsApiKey: env.NEWS_API_KEY,
    taskReminderTime: env.TASK_REMINDER_TIME,
    whatsappSummarySchedulerEnabled: env.WHATSAPP_SUMMARY_SCHEDULER_ENABLED === 'true',
  },

  logging: {
    level: env.LOG_LEVEL,
  },
};

// Helper function to check if a service is configured
export const isServiceConfigured = {
  crewai: () => !!config.services.crewai,
  waha: () => !!config.services.waha.url && !!config.services.waha.apiKey,
  telegram: () => !!config.social.telegram.botToken,
  twitter: () => !!config.social.twitter.bearerToken,
  google: () => !!config.google.clientId && !!config.google.clientSecret,
  embeddings: {
    voyage: () => !!config.embeddings.voyageApiKey,
    pinecone: () => !!config.embeddings.pineconeApiKey,
  },
};

export default config;
