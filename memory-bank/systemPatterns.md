# System Patterns: Synapse

## Architecture Overview

### High-Level Structure
```
Synapse/
├── src/
│   ├── frontend/          # React + TypeScript + Vite
│   └── backend/           # Node.js + TypeScript + Express
├── scripts/               # Development and automation scripts
├── tests/                 # Test suites
├── docs/                  # Documentation
└── memory-bank/          # Cursor AI memory system
```

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and builds
- **Styling**: Tailwind CSS for utility-first styling
- **UI Components**: Custom components with shadcn/ui patterns
- **State Management**: Context API + hooks (expandable to Zustand if needed)

#### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **AI Integration**: Anthropic Claude SDK + OpenAI SDK
- **Python Integration**: Transcription services and ML models
- **Authentication**: JWT-based authentication

#### Development Tools
- **TypeScript**: Strict type checking across the stack
- **Task Management**: Custom task-master integration
- **MCP Server**: Anthropic's Model Context Protocol
- **Testing**: Comprehensive test suites

## Key Technical Decisions

### 1. Monorepo Structure
- **Decision**: Single repository with frontend/backend separation
- **Rationale**: Simplifies development workflow and dependency management
- **Pattern**: Shared TypeScript types and utilities

### 2. TypeScript-First Approach
- **Decision**: TypeScript for all JavaScript/Node.js code
- **Rationale**: Type safety, better IDE support, reduced runtime errors
- **Pattern**: Strict compiler settings, comprehensive type definitions

### 3. API-First Design
- **Decision**: RESTful API with clear separation of concerns
- **Rationale**: Enables future mobile apps, clear frontend/backend boundaries
- **Pattern**: Express.js with typed routes and middleware

### 4. AI Integration Strategy
- **Decision**: Multi-provider AI support (Anthropic + OpenAI)
- **Rationale**: Flexibility and redundancy for AI features
- **Pattern**: Abstracted AI service layer with provider switching

## Design Patterns

### 1. Component Architecture (Frontend)
```typescript
// Standard React component pattern
interface ComponentProps {
  // Explicit prop types
}

export const Component: React.FC<ComponentProps> = ({ props }) => {
  // Hooks at top
  // Event handlers
  // Render logic
};
```

### 2. Service Layer Pattern (Backend)
```typescript
// Service classes for business logic
export class KnowledgeService {
  constructor(private db: Database, private ai: AIService) {}
  
  async processKnowledge(input: KnowledgeInput): Promise<ProcessedKnowledge> {
    // Business logic here
  }
}
```

### 3. Repository Pattern (Data Access)
```typescript
// Data access abstraction
export interface KnowledgeRepository {
  save(knowledge: Knowledge): Promise<void>;
  findByQuery(query: string): Promise<Knowledge[]>;
}
```

### 4. Middleware Pattern (API)
```typescript
// Express middleware for cross-cutting concerns
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Authentication logic
};
```

## Component Relationships

### Frontend Architecture
- **Pages**: Route-level components
- **Layouts**: Shared UI structure
- **Components**: Reusable UI elements
- **Hooks**: Custom logic encapsulation
- **Services**: API communication
- **Types**: Shared TypeScript definitions

### Backend Architecture
- **Routes**: Express route handlers
- **Controllers**: Request/response logic
- **Services**: Business logic
- **Repositories**: Data access
- **Middleware**: Cross-cutting concerns
- **Utils**: Shared utilities

### Data Flow
1. **User Interaction** → Frontend Component
2. **Component** → API Service call
3. **API Route** → Controller
4. **Controller** → Service Layer
5. **Service** → Repository/External APIs
6. **Response** flows back through the chain

## Security Patterns

### Authentication
- JWT tokens for stateless authentication
- Refresh token rotation
- Secure HTTP-only cookies for sensitive data

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection with Content Security Policy
- CORS configuration for API access

### AI Security
- API key management through environment variables
- Rate limiting for AI service calls
- Input sanitization for AI prompts
- Response validation from AI services

## Performance Patterns

### Frontend Optimization
- Code splitting with React.lazy
- Component memoization with React.memo
- Efficient state updates with useCallback/useMemo
- Image optimization and lazy loading

### Backend Optimization
- Database query optimization
- Caching strategies (in-memory, Redis)
- Pagination for large datasets
- Background job processing

### AI Performance
- Response streaming for real-time AI interactions
- Caching of AI responses where appropriate
- Asynchronous processing of heavy AI tasks
- Circuit breaker pattern for AI service failures 