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
- **Google Gemini** for video summarization
- **Python transcription service** (separate Docker service)

### Frontend Architecture
- **React 18** with TypeScript and strict mode
- **Vite** for development and building
- **Tailwind CSS** + **shadcn/ui** components
- **Zustand** for state management
- **React Router** for navigation
- **Framer Motion** for animations

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
- **TelegramService**: Telegram bot integration for message capture
- **WhatsAppService**: WhatsApp integration using Baileys for message monitoring
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

# Social Media Integration
TELEGRAM_BOT_TOKEN=your_token     # For Telegram bot integration
TWITTER_API_KEY=your_key          # For Twitter/X integration
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
2. **Plan Work**: Use Task Master to analyze complexity and expand tasks
3. **Implement**: Follow task dependencies and update progress systematically
4. **Document**: Log implementation details and discoveries in task notes
5. **Validate**: Test according to task strategies before marking complete

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
- **WhatsApp Integration**: Baileys library for WhatsApp Web automation
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