# Technical Context: Synapse

## Technology Stack

### Frontend Technologies
- **React 18**: Latest stable version with concurrent features
- **TypeScript 5+**: Strict type checking enabled
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing and optimization
- **shadcn/ui**: Modern component library patterns

### Backend Technologies
- **Node.js**: Latest LTS version
- **TypeScript**: Shared with frontend for consistency
- **Express.js**: Web framework for REST API
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security middleware
- **JWT**: JSON Web Tokens for authentication

### AI & ML Integration
- **Anthropic Claude SDK**: Primary AI provider
- **OpenAI SDK**: Secondary AI provider for specific use cases
- **Python Scripts**: ML models and transcription services
- **FastMCP**: Model Context Protocol server

### Development Tools
- **Task Master AI**: Custom task management system
- **Commander.js**: CLI command handling
- **Inquirer**: Interactive command-line prompts
- **Chalk**: Terminal string styling
- **Ora**: Terminal spinners and progress indicators

## Dependencies

### Frontend Dependencies
```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "tailwindcss": "^3.x",
  "@types/react": "^18.x"
}
```

### Backend Dependencies
```json
{
  "@anthropic-ai/sdk": "^0.39.0",
  "openai": "^4.100.0",
  "express": "^4.21.2",
  "cors": "^2.8.5",
  "helmet": "^8.1.0",
  "jsonwebtoken": "^9.0.2",
  "dotenv": "^16.3.1"
}
```

### Utility Dependencies
```json
{
  "axios": "^1.9.0",
  "cheerio": "^1.0.0",
  "fuse.js": "^7.0.0",
  "lru-cache": "^10.2.0",
  "commander": "^11.1.0",
  "inquirer": "^12.5.0"
}
```

## Development Setup

### Prerequisites
- **Node.js**: Version 18+ LTS
- **Python**: Version 3.8+ (for ML components)
- **npm**: Latest version
- **Git**: Version control

### Environment Variables
```bash
# AI Service Configuration
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Application Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Database (when implemented)
DATABASE_URL=your_database_url

# External Services
PERPLEXITY_API_KEY=your_perplexity_key
```

### Project Structure
```
src/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API communication
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── dist/               # Build output
└── backend/
    ├── src/
    │   ├── routes/         # Express route handlers
    │   ├── controllers/    # Request/response logic
    │   ├── services/       # Business logic
    │   ├── middleware/     # Express middleware
    │   ├── types/          # Shared TypeScript types
    │   └── utils/          # Utility functions
    ├── python_scripts/    # Python ML components
    └── dist/               # Compiled TypeScript
```

## Technical Constraints

### Browser Compatibility
- **Modern Browsers Only**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES2020 Features**: Using modern JavaScript features
- **Module System**: ES modules throughout the stack

### Performance Requirements
- **Initial Load**: < 3 seconds for main application
- **API Response**: < 500ms for standard operations
- **AI Response**: < 30 seconds for complex AI operations
- **Memory Usage**: < 200MB for frontend bundle

### Security Constraints
- **HTTPS Only**: Production requires HTTPS
- **API Rate Limiting**: Prevent abuse of AI services
- **Input Validation**: All user inputs must be validated
- **Secret Management**: Environment variables for all secrets

### Development Constraints
- **TypeScript Strict Mode**: No `any` types allowed
- **ESLint**: Enforced code style and quality
- **Testing Required**: Unit tests for critical functions
- **Documentation**: JSDoc comments for public APIs

## Build & Deployment

### Development Commands
```bash
npm run dev              # Start development servers
npm run list             # List development tasks
npm run generate         # Generate project files
npm run parse-prd        # Parse requirements document
```

### Build Process
1. **TypeScript Compilation**: Both frontend and backend
2. **Asset Optimization**: Vite handles frontend bundling
3. **Dependency Resolution**: npm handles package management
4. **Environment Configuration**: .env files for different environments

### Deployment Strategy
- **Frontend**: Static hosting (Vercel, Netlify)
- **Backend**: Node.js hosting (Railway, Heroku, AWS)
- **Python Services**: Containerized deployment
- **Environment Separation**: Dev, staging, production environments

## Integration Points

### AI Services
- **Primary**: Anthropic Claude for main AI features
- **Secondary**: OpenAI for specific use cases
- **Fallback**: Graceful degradation when AI services unavailable

### External APIs
- **Task Management**: Custom Task Master AI integration
- **Research**: Perplexity API for knowledge enhancement
- **File Processing**: Various APIs for different file types

### Python Integration
- **Transcription**: Speech-to-text services
- **ML Models**: Custom machine learning models
- **Data Processing**: Complex data analysis tasks

## Development Workflow

### Code Standards
- **TypeScript**: Strict mode with comprehensive types
- **Component Pattern**: Functional components with hooks
- **API Pattern**: RESTful endpoints with proper HTTP methods
- **Error Handling**: Comprehensive error boundaries and handling

### Testing Strategy
- **Unit Tests**: Jest for business logic
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Critical user workflows
- **AI Testing**: Mock AI responses for consistent testing

### Version Control
- **Git Flow**: Feature branches with pull requests
- **Commit Messages**: Conventional commit format
- **Code Review**: Required for all changes
- **CI/CD**: Automated testing and deployment 