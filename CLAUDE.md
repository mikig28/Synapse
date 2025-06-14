# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Project Commands
```bash
npm run dev              # Start all development servers (frontend + backend)
npm run dev:backend      # Start only backend server
npm run test             # Run Jest tests
npm run list             # List available tasks
npm run generate         # Generate project files
npm run parse-prd        # Parse requirements document
```

### Backend Commands (src/backend/)
```bash
npm run dev              # Start backend with nodemon (auto-reload)
npm run build            # Build TypeScript to dist/
npm start                # Run production server from dist/
```

### Frontend Commands (src/frontend/)
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
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
- **TranscriptionService**: Audio/video transcription using Python service
- **VideoSummarizationService**: AI-powered video analysis
- **TelegramService**: Telegram bot integration
- **AnalysisService**: Content analysis and insights

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
- Uses jsdom environment for React testing
- TypeScript support with ts-jest
- Path aliases configured for @/ imports
- Mocks for UI libraries (Radix UI, Lucide React)

### Test Structure
- Backend tests: Service and controller tests
- Frontend tests: Component and service tests
- Location: Tests alongside source files or in __tests__ folders

## Environment Variables

### Required Variables
```bash
# AI Services
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key

# Database
MONGODB_URI=mongodb://localhost:27017/synapse

# Authentication
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
```

## Memory Bank System

This project uses a Cursor Memory Bank system in `memory-bank/` directory:
- **projectbrief.md**: Core mission and requirements
- **systemPatterns.md**: Architecture patterns
- **activeContext.md**: Current work context
- **progress.md**: Implementation status

Always read memory bank files before starting work to understand project context and patterns.

## Development Workflow

1. Read memory bank files for context
2. Use TypeScript strict mode - no `any` types
3. Follow established patterns in existing code
4. Update memory bank when discovering new patterns
5. Use Jest for testing with proper mocks
6. Maintain comprehensive type definitions