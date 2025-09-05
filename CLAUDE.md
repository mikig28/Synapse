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
- **Google Gemini** for video summarization and embeddings
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

# Vector Database & Embedding Services
VOYAGE_API_KEY=your_key           # For cost-efficient Voyage AI embeddings
EMBEDDING_PROVIDER=openai         # Primary provider ('voyage' | 'gemini' | 'openai')
EMBEDDING_FALLBACK_PROVIDERS=voyage,gemini  # Comma-separated fallback providers
PINECONE_API_KEY=your_key         # For Pinecone vector database

# Social Media Integration
TELEGRAM_BOT_TOKEN=your_token     # For Telegram bot integration
TWITTER_API_KEY=your_key          # For Twitter/X integration

# WhatsApp Integration (WAHA Service)
WAHA_API_KEY=your_waha_api_key    # Required for WAHA service authentication
WAHA_SERVICE_URL=https://synapse-waha.onrender.com  # WAHA service endpoint
WAHA_ENGINE=NOWEB                 # Use NOWEB engine to avoid browser conflicts with Puppeteer
WAHA_NOWEB_STORE_ENABLED=true     # Required: Enable NOWEB store for chats/messages access
WAHA_NOWEB_STORE_FULLSYNC=true    # Required: Enable full sync for complete message history
WHATSAPP_AUTO_REPLY_ENABLED=false # Enable/disable WhatsApp auto-reply
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome  # Chrome path for containers
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true  # Skip Chromium download in containers

# Deployment & URLs
RENDER=true                       # Render.com deployment flag
FRONTEND_URL=http://localhost:3000 # Frontend URL for CORS
CREWAI_SERVICE_URL=your_crewai_url # CrewAI service endpoint

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