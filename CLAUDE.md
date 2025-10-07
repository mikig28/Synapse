# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Project Commands
```bash
npm run dev              # Start all development servers (frontend + backend)
npm run dev:backend      # Start only backend server
npm run build            # Build frontend for production
npm start                # Start production preview server
npm run test             # Run Jest tests (all test files)
npm run list             # List available tasks via Task Master
npm run generate         # Generate project files via Task Master
npm run parse-prd        # Parse requirements document via Task Master
```

### Backend Commands (src/backend/)
```bash
npm run dev              # Start backend with nodemon (auto-reload)
npm run build            # Build TypeScript to dist/
npm start                # Run production server from dist/
```

### Frontend Commands (src/frontend/)
```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Build for production
npm run build:analyze    # Build with bundle analysis visualization
npm run type-check       # TypeScript type checking
npm run preview          # Preview production build
```

## Project Architecture

### Monorepo Structure
- **src/frontend/**: React 18 + TypeScript + Vite + Tailwind CSS
- **src/backend/**: Node.js + TypeScript + Express.js + MongoDB
- **memory-bank/**: Cursor AI memory system for development context
- **scripts/**: Development automation scripts

### AI Integration
- **Anthropic Claude SDK** for main AI processing
- **OpenAI SDK** for additional AI capabilities
- **Google Gemini** for video summarization and embeddings (gemini-embedding-001)
- **Voyage AI** for cost-efficient embeddings
- **Cohere AI** and **Replicate** for additional AI services
- **Python transcription service** (separate Docker service)
- **Vector Databases**: Pinecone and ChromaDB support

### Frontend Architecture
- **React 18** with TypeScript and strict mode
- **Vite** for development and building
- **Tailwind CSS** + **shadcn/ui** components
- **Zustand** for state management
- **React Router** for navigation
- **Framer Motion** for animations
- **Three.js** with React Three Fiber for 3D graphics and agent avatars
- **PWA capabilities** with service worker and install prompts
- **Drag & Drop** with @dnd-kit for sortable interfaces

### Backend Architecture
- **Express.js** with TypeScript
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **Socket.io** for real-time features
- **GridFS** for file storage
- **Multer** for file uploads

### Key Services
- **TranscriptionService**: Audio/video transcription using Python service (src/backend/transcription_service/)
- **VideoSummarizationService**: AI-powered video analysis with Gemini integration
- **VectorDatabaseService**: Multi-provider embedding system (Voyage AI, Gemini, OpenAI) with cost optimization and rate limiting
- **TelegramService**: Telegram bot integration for message capture
- **WhatsAppService**: WhatsApp integration using Baileys for message monitoring with container-aware Puppeteer configuration
- **AnalysisService**: Content analysis and insights generation
- **AgentService**: CrewAI agent orchestration and execution
- **GoogleCalendarService**: Calendar integration and event management

## TypeScript Configuration

### Strict Mode Enabled
- No `any` types allowed
- Comprehensive type definitions required
- Explicit return types for functions
- Strict null checks enabled

### Common Patterns
```typescript
// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component Props
interface ComponentProps {
  data: DataType;
  onAction: (action: ActionType) => void;
  className?: string;
}

// Service Classes
export class ServiceName {
  constructor(private repository: RepositoryType) {}
  
  async processData(input: InputType): Promise<OutputType> {
    // Implementation
  }
}
```

## Testing

### Jest Configuration
- Uses jsdom environment for React testing with File API support
- TypeScript support with ts-jest pointing to frontend tsconfig
- Path aliases configured for @/ imports (maps to src/frontend/src/)
- Mocks for UI libraries (Radix UI, Lucide React, class-variance-authority)
- Automatic mock clearing before each test

### Test Structure
- Frontend tests: Component and service tests in __tests__ folders
- Backend tests: Service and controller tests (planned)
- Location: Tests alongside source files or in dedicated __tests__ directories
- Example locations: src/frontend/src/pages/__tests__/, src/frontend/src/services/__tests__/

### Running Tests
```bash
npm run test                    # Run all Jest tests from root
cd src/frontend && npm test     # Run frontend tests (if available)
```

## Environment Variables

### Required Variables
```bash
# AI Services
ANTHROPIC_API_KEY=your_key        # Required for Claude integration
OPENAI_API_KEY=your_key           # Required for OpenAI features
GEMINI_API_KEY=your_key           # Required for video summarization
PERPLEXITY_API_KEY=your_key       # Optional: For research-backed task expansion

# Database
MONGODB_URI=mongodb://localhost:27017/synapse

# Authentication
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000                         # Backend server port
API_BASE_URL=http://localhost:3000

# Email Service (Required for email verification)
SMTP_HOST=smtp.gmail.com          # SMTP server host
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER=your-email@gmail.com    # SMTP username/email
SMTP_PASSWORD=your-app-password   # SMTP password (use app-specific password for Gmail)
SMTP_FROM_NAME=SYNAPSE            # Email sender name
SMTP_FROM_EMAIL=noreply@synapse.ai # Email sender address
FRONTEND_URL=http://localhost:5173 # Frontend URL for verification links

# Vector Database & Embedding Services
VOYAGE_API_KEY=your_key           # For cost-efficient Voyage AI embeddings
EMBEDDING_PROVIDER=openai         # Primary provider ('voyage' | 'gemini' | 'openai')
EMBEDDING_FALLBACK_PROVIDERS=voyage,gemini  # Comma-separated fallback providers
PINECONE_API_KEY=your_key         # For Pinecone vector database

# Social Media Integration
TELEGRAM_BOT_TOKEN=your_token     # For Telegram bot integration
TWITTER_API_KEY=your_key          # For Twitter/X integration

# WhatsApp Integration (WAHA-PLUS Service)
WAHA_API_KEY=your_waha_api_key    # Required for WAHA-PLUS service authentication
WAHA_SERVICE_URL=https://synapse-waha.onrender.com  # WAHA-PLUS service endpoint (Render.com)

# Engine Configuration (WAHA-PLUS supports all engines)
# Recommended: WEBJS (full functionality with WAHA-PLUS features)
WAHA_ENGINE=WEBJS                 # Use WEBJS engine for full WhatsApp Web functionality + media support
WAHA_WEBJS_STORE_ENABLED=true     # Required: Enable WEBJS store for chats/messages access
WAHA_WEBJS_HEADLESS=true          # Run browser in headless mode (recommended for production)

# Alternative: NOWEB (lightweight, monitoring-focused)
# WAHA_ENGINE=NOWEB                # Use NOWEB engine for monitoring (limited media support)
# WAHA_NOWEB_STORE_ENABLED=true    # Required: Enable NOWEB store for chats/messages access
# WAHA_NOWEB_STORE_FULLSYNC=true   # Required: Enable full sync for complete message history

WHATSAPP_AUTO_REPLY_ENABLED=false # Enable/disable WhatsApp auto-reply
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome  # Chrome path for containers
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true  # Skip Chromium download in containers

# Deployment & URLs
RENDER=true                       # Render.com deployment flag
FRONTEND_URL=http://localhost:3000 # Frontend URL for CORS
CREWAI_SERVICE_URL=your_crewai_url # CrewAI service endpoint

# Production Service URLs (Render.com)
# Backend: https://synapse-backend-7lq6.onrender.com
# Frontend: https://synapse-frontend.onrender.com
# CrewAI: https://synapse-crewai.onrender.com
# WAHA-PLUS: https://synapse-waha.onrender.com

# Redis (Required for Socket.io horizontal scaling across multiple server instances)
REDIS_URL=redis://your-redis-url  # Full Redis connection URL (recommended)
# OR use individual variables:
# REDIS_HOST=localhost             # Redis server host
# REDIS_PORT=6379                  # Redis server port
# REDIS_PASSWORD=your_password     # Optional: Redis password
# REDIS_USERNAME=default           # Optional: Redis username
# REDIS_DB=0                       # Optional: Redis database number (default 0)

# Optional Services
FIRECRAWL_API_KEY=your_key        # For web scraping via Firecrawl
TASK_REMINDER_TIME=09:00          # Daily task reminder time
```

## Memory Bank System

This project uses a Cursor Memory Bank system in `memory-bank/` directory:
- **projectbrief.md**: Core mission and requirements
- **systemPatterns.md**: Architecture patterns
- **activeContext.md**: Current work context
- **progress.md**: Implementation status

Always read memory bank files before starting work to understand project context and patterns.

## Task-Driven Development Workflow

This project uses **Task Master AI** for systematic project management with MCP server integration.

### Getting Started with Tasks
```bash
npm run list                     # List current tasks and status
npm run generate                 # Generate task files after JSON updates
npm run parse-prd               # Parse requirements document to create initial tasks
```

### Task Management Process
1. **Start Session**: Always run `npm run list` to see current tasks
2. **Plan Work**: Use Task Master to analyze complexity and expand tasks with research-backed insights
3. **Implement**: Follow task dependencies and update progress systematically
4. **Document**: Log implementation details and discoveries in task notes
5. **Validate**: Test according to task strategies before marking complete

### Advanced Task Master Features
- **Complexity Analysis**: Automatic difficulty assessment and time estimation
- **Research Integration**: Perplexity AI-powered task expansion with real-world insights
- **Dependency Management**: Automatic validation and fixing of task dependencies
- **Priority System**: Smart prioritization based on dependencies and complexity
- **Subtask Management**: Hierarchical task breakdown with progress tracking

### Core Development Rules
1. Read memory bank files for project context before starting work
2. Use TypeScript strict mode - no `any` types allowed
3. Follow established patterns in existing code
4. Update memory bank when discovering new patterns
5. Use Jest for testing with proper mocks
6. Maintain comprehensive type definitions
7. Respect task dependencies and use Task Master for project coordination

## File Organization & Architecture Patterns

### Backend Structure
- **Controllers** (src/backend/src/api/controllers/): Handle HTTP requests and responses
- **Routes** (src/backend/src/api/routes/): Define API endpoints and middleware
- **Services** (src/backend/src/services/): Business logic and external integrations
- **Models** (src/backend/src/models/): MongoDB/Mongoose data models
- **Types** (src/backend/src/types/): TypeScript type definitions
- **Config** (src/backend/src/config/): Database and GridFS configuration

### Frontend Structure
- **Pages** (src/frontend/src/pages/): Route components and main application views
- **Components** (src/frontend/src/components/): Reusable UI components
  - **Dashboard/**: Dashboard-specific components
  - **ui/**: shadcn/ui base components
  - **animations/**: Framer Motion animated components
- **Services** (src/frontend/src/services/): API calls and external service integrations
- **Store** (src/frontend/src/store/): Zustand state management
- **Types** (src/frontend/src/types/): TypeScript interfaces and types
- **Hooks** (src/frontend/src/hooks/): Custom React hooks

### External Services Integration
- **Python Services**: Separate Docker containers for ML/transcription
- **CrewAI Agents**: Independent service in src/backend/services/crewai-agents/
- **WhatsApp Integration**: WAHA service + Puppeteer for media extraction workaround
- **Social Media**: Telegram, Twitter, Reddit agent integrations

## WhatsApp Media Handling Architecture

Since WAHA Core (free version) doesn't support automatic media downloads, we implement a dual-service workaround:

### Architecture Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│   WAHA NOWEB    │───▶│   Message        │───▶│   Frontend Detection    │
│   (WebSocket)   │    │   Detection      │    │   [📷 Image] [Download] │
│   No Browser    │    │   + Metadata     │    │                         │
└─────────────────┘    └──────────────────┘    └─────────────────────────┘
                                                              │
                                                              ▼ (User clicks)
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│   Puppeteer     │◀───│   Image          │◀───│   On-Demand             │
│   Chrome        │    │   Extraction     │    │   Extraction Request    │
│   WhatsApp Web  │    │   Service        │    │                         │
└─────────────────┘    └──────────────────┘    └─────────────────────────┘
```

### Dual Service Configuration

1. **WAHA Service (NOWEB Engine)**
   - Handles real-time message detection via WebSocket
   - No browser conflicts since it doesn't use Puppeteer
   - Provides metadata: `isMedia: true`, `mimeType: 'image/jpeg'`
   - Requires QR code authentication once

2. **Puppeteer Service (Our Custom Implementation)**
   - Separate WhatsApp Web browser session for image extraction
   - Activated only when user clicks download
   - Extracts images from WhatsApp Web DOM using blob URLs
   - Independent authentication (separate QR scan required)

### Session Management Strategy

**Separate Sessions Approach**: Two independent WhatsApp Web sessions
- **WAHA Session**: Phone number authentication via NOWEB engine
- **Puppeteer Session**: Separate browser login for image extraction
- **Benefit**: No session conflicts between services
- **Limitation**: Requires two QR code scans (WAHA + Image Extractor)

### Implementation Components

- **WAHAService** (`src/backend/src/services/wahaService.ts`): Message detection with NOWEB engine
- **WhatsAppImageExtractor** (`src/backend/src/services/whatsappImageExtractor.ts`): Puppeteer-based extraction
- **WhatsAppImageService** (`src/backend/src/services/whatsappImageService.ts`): Orchestration layer
- **WhatsAppImagesController** (`src/backend/src/api/controllers/whatsappImagesController.ts`): API endpoints

### Key Environment Variables
```bash
WAHA_ENGINE=NOWEB                    # Avoid browser conflicts
WHATSAPP_IMAGES_DIR=storage/images   # Image storage location
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome  # Container Chrome path
```

### User Experience Flow

1. **Real-time Detection**: User receives WhatsApp image → Frontend shows [📷 Image] [Download]
2. **On-Demand Extraction**: User clicks Download → Puppeteer extracts → Saves to Images page
3. **No Automatic Downloads**: Only extracts images user specifically wants
4. **Cost Effective**: Avoids WAHA Plus subscription while maintaining functionality

## WhatsApp Voice Memo Processing

This project includes intelligent voice memo processing for WhatsApp monitored groups, similar to the Telegram bot functionality.

### Feature Overview
- **Voice Message Detection**: Automatically detects PTT (push-to-talk) voice messages in monitored WhatsApp groups
- **Transcription**: Uses multi-provider transcription service (OpenAI Whisper, dedicated service, local Python)
- **AI Analysis**: Extracts tasks, notes, ideas, and locations from voice transcriptions
- **Group Monitoring**: Only processes voice messages in groups that have active monitors with voice processing enabled
- **Bilingual Support**: Supports both Hebrew and English with automatic language detection

### How It Works

1. **Voice Message Detection**: When a voice message is sent to a monitored WhatsApp group:
   - WAHA service detects PTT/voice message type
   - Automatically fetches media URL using `getMessage(messageId, downloadMedia=true)`
   - Downloads voice file to local storage via WhatsAppMediaService

2. **Transcription**: Voice file is transcribed using the transcription service:
   - Primary: OpenAI Whisper API with Hebrew language hint
   - Fallback: Dedicated transcription service
   - Last resort: Local Python script with Whisper

3. **Content Analysis**:
   - **Location Extraction**: Detects location mentions and creates location notes
   - **Task Extraction**: Identifies action items and creates tasks
   - **Note Extraction**: Captures important information as notes
   - **Idea Extraction**: Recognizes creative ideas and stores them

4. **User Notification**: Sends confirmation message to WhatsApp group:
   - Hebrew or English based on transcription language
   - Summary of items created (tasks, notes, ideas)
   - Location details with confidence score if applicable

### Configuration

Voice processing is enabled by default for all group monitors. To disable for a specific group:

```typescript
// In group monitor settings
{
  processVoiceNotes: false  // Disable voice processing
}
```

### Error Handling

The service provides detailed error messages when voice processing fails:

- **No Media URL**: WAHA NOWEB engine doesn't support media downloads - suggests using WEBJS engine
- **Download Failed**: Network or WAHA configuration issue
- **Transcription Failed**: Audio quality or service availability issue

### WAHA Engine Compatibility

- **NOWEB Engine**: Limited support - may not provide media URLs for voice messages consistently
- **WEBJS Engine**: Full support - recommended for voice memo processing

### Example Usage

Send a voice message to a monitored WhatsApp group:
- "תזכיר לי לקנות חלב מחר" → Creates a task "לקנות חלב" with Hebrew language
- "Meeting location: Central Park New York" → Creates a location note with coordinates
- "Great idea: add dark mode to the app" → Creates an idea entry

## WhatsApp Daily Summary Feature

This project includes an advanced WhatsApp Daily Summary system that provides AI-powered analysis of group conversations with per-group summary generation.

### Feature Overview
- **Per-Group Analysis**: Generate summaries for specific WhatsApp groups
- **Flexible Time Ranges**: Support for Today, Yesterday, Last 24H, and custom date ranges
- **AI-Powered Summarization**: Deterministic text processing with keyword extraction, emoji analysis, and sender insights
- **Real-time Processing**: On-demand summary generation with progress indicators
- **Export Functionality**: Download summaries as structured text files

### Architecture Components

#### Backend Services
- **WhatsAppSummarizationService** (`src/backend/src/services/whatsappSummarizationService.ts`):
  - Deterministic text processing algorithms
  - N-gram keyword extraction with stop-word filtering
  - Emoji frequency analysis
  - Sender activity pattern recognition
  - Configurable summary length limits (40-60 words per sender, 300-500 word total)

#### API Endpoints
- **WhatsAppSummaryController** (`src/backend/src/api/controllers/whatsappSummaryController.ts`):
  - `GET /api/v1/whatsapp-summary/groups` - List available groups for summarization
  - `GET /api/v1/whatsapp-summary/groups/:groupId/messages` - Fetch messages by date range
  - `POST /api/v1/whatsapp-summary/generate` - Generate custom date summary
  - `POST /api/v1/whatsapp-summary/generate-today` - Generate today's summary
  - `GET /api/v1/whatsapp-summary/groups/:groupId/stats` - Group statistics

#### Frontend Components
- **Enhanced WhatsAppGroupMonitorPage** with "Daily Summaries" tab
- **Group Cards**: Individual summary generation buttons per group
- **Date Range Selector**: Today/Yesterday/Last 24H/Custom options
- **Summary Modal**: Rich display with participant insights, keywords, emojis, and activity patterns

### Key Features

#### Summary Content Structure
```typescript
interface GroupSummaryData {
  groupName: string;
  timeRange: { start: Date; end: Date };
  totalMessages: number;
  activeParticipants: number;
  senderInsights: SenderInsights[];     // Per-participant analysis
  overallSummary: string;               // Group overview
  topKeywords: KeywordAnalysis[];       // Most frequent topics
  topEmojis: EmojiAnalysis[];          // Most used emojis
  activityPeaks: { hour: number; count: number }[]; // Peak activity times
  messageTypes: MessageTypeBreakdown;   // Text/Image/Video/etc distribution
}
```

#### Text Processing Features
- **Keyword Extraction**: Unigram and bigram analysis with frequency counting
- **Stop Word Filtering**: Removes common words (the, and, is, etc.)
- **Emoji Analysis**: Unicode emoji detection and frequency analysis  
- **Activity Pattern Recognition**: Hour-by-hour message distribution
- **Message Type Categorization**: Text, image, video, audio, document classification

#### Performance Optimizations
- **Paginated Message Fetching**: Handles groups with >10k messages/day
- **Progressive Loading**: Real-time loading states and progress indicators
- **Rate Limiting**: Built-in API rate limiting for summary generation
- **Caching**: Summary results cached per group/date combination

#### Security & Validation
- **Authorization**: Group access validation via existing auth middleware
- **Input Sanitization**: All user inputs sanitized and validated
- **Rate Limiting**: Prevents abuse of summary generation endpoints
- **Timezone Handling**: Proper local timezone support for date boundaries

### Usage Instructions

#### Frontend Usage
1. Navigate to WhatsApp Group Monitor page
2. Click on "Daily Summaries" tab
3. Select desired time range (Today/Yesterday/Last 24H/Custom)
4. Click "Today's Summary" or "Custom Date" on any group card
5. View detailed summary in modal popup
6. Download summary as text file if needed

#### API Usage
```bash
# Get available groups
curl -X GET /api/v1/whatsapp-summary/groups

# Generate today's summary for a group
curl -X POST /api/v1/whatsapp-summary/generate-today \
  -H "Content-Type: application/json" \
  -d '{"groupId": "group123", "timezone": "America/New_York"}'

# Generate custom date summary
curl -X POST /api/v1/whatsapp-summary/generate \
  -H "Content-Type: application/json" \
  -d '{"groupId": "group123", "date": "2024-01-01", "timezone": "America/New_York"}'
```

### Testing
- **Unit Tests**: Comprehensive test suite for summarization algorithms (`src/backend/src/services/__tests__/whatsappSummarizationService.test.ts`)
- **Edge Case Handling**: Empty messages, missing display names, system messages
- **Performance Testing**: Validated with 1000+ message datasets
- **Integration Testing**: Full API endpoint testing

### Configuration Options
```typescript
interface SummaryGenerationOptions {
  maxSummaryLength?: number;           // Default: 500 words
  maxSenderSummaryLength?: number;     // Default: 60 words  
  includeEmojis?: boolean;             // Default: true
  includeKeywords?: boolean;           // Default: true
  minMessageCount?: number;            // Default: 1
  keywordMinCount?: number;            // Default: 2
  emojiMinCount?: number;              // Default: 2
  excludeSystemMessages?: boolean;     // Default: true
}
```

- **Social Media**: Telegram, Twitter, Reddit agent integrations

## Cursor Rules & AI-Assisted Development

This project includes comprehensive Cursor rules in `.cursor/rules/` directory:

### Key Rule Files
- **dev_workflow.mdc**: Task Master integration and development process
- **taskmaster.mdc**: Complete Task Master command reference
- **cursor_rules.mdc**: Project-specific coding patterns and conventions
- **self_improve.mdc**: Rule management and continuous improvement guidelines

### Rule-Based Development Pattern
1. **Pattern Recognition**: Create new rules when patterns appear in 3+ files
2. **Continuous Improvement**: Update rules after discovering better approaches
3. **Consistency**: Follow established patterns documented in rules
4. **Self-Documentation**: Rules capture project-specific knowledge for AI assistance

### Important Development Notes
- Use MCP server integration for Task Master (preferred over CLI)
- Log detailed implementation notes during development for learning
- Update Cursor rules when new patterns emerge
- Follow iterative subtask implementation with progress logging

## Vector Database & Embedding Architecture

This project implements a multi-provider embedding system for cost optimization and reliability:

### Embedding Providers
- **Voyage AI**: Cost-efficient primary option with rate limiting and retry logic
- **OpenAI**: Reliable fallback with generous rate limits
- **Google Gemini**: Alternative provider for diversified embedding strategies

### Rate Limiting Strategy
- 100ms delay between requests to prevent API overwhelming
- Exponential backoff for 429 rate limit responses
- Automatic fallback between providers on failure
- Provider-specific text truncation based on context limits

### Configuration
Set `EMBEDDING_PROVIDER=openai` for better rate limits during development. Use `voyage` for production cost optimization once API limits are properly configured.

## Container & Deployment Support

### Render.com Deployment
- Automatic Chrome/Puppeteer configuration for containers
- Environment variable detection (`RENDER=true`)
- Container-optimized WhatsApp service with Baileys

### PWA & 3D Features
- Service worker registration for offline capabilities  
- Install prompts for PWA functionality
- Three.js integration for 3D agent avatars with WebGL detection
- Agent 3D Avatar system with robot models