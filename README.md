# Synapse - Your Personal Second Brain

Synapse is a revolutionary, fully web-based application designed to function as a personal, automated "Second Brain" and comprehensive life project management platform.

## 🧠 What is Synapse?

Synapse helps knowledge workers overcome information overload by providing:
- **Unified Knowledge Management**: Capture and organize all your information in one place
- **AI-Powered Intelligence**: Get smart insights and suggestions from your data
- **Project Management**: Track complex projects with context and automation
- **Intelligent Search**: Find what you need using natural language queries

## 🚀 Features

### Knowledge Management
- Effortless capture of text, voice, images, and web content
- Automatic categorization and intelligent linking
- Contextual information surfacing when you need it

### AI-Powered Insights
- Natural language query processing
- Automatic content categorization
- Intelligent suggestions and recommendations
- AI-assisted project planning

### Project Management
- Task creation and tracking with AI assistance
- Project visualization and progress monitoring
- Dependency management and intelligent scheduling

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive styling
- **shadcn/ui** component patterns

### Backend
- **Node.js** with TypeScript and Express.js
- **Anthropic Claude** and **OpenAI** for AI capabilities
- **JWT** authentication for security
- **Python** integration for ML and transcription services

### Development Tools
- **Task Master AI** for project management
- **MCP Server** for AI model integration
- **Cursor Memory Bank** for AI-assisted development

## 📁 Project Structure

```
synapse/
├── src/
│   ├── frontend/          # React + TypeScript frontend
│   └── backend/           # Node.js + TypeScript backend
├── scripts/               # Development and automation scripts
├── tests/                 # Test suites
├── docs/                  # Documentation
├── memory-bank/          # Cursor AI memory system
└── tasks/                # Task management files
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ LTS
- Python 3.8+ (for ML components)
- npm latest version

### Environment Setup
Create a `.env` file in the project root:

```bash
# AI Service Configuration
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_api_key  # For video summarization

# Application Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
```

### Installation & Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# List available tasks
npm run list

# Generate project files
npm run generate

# Parse requirements document
npm run parse-prd
```

## 🤖 AI-Assisted Development

This project uses a **Cursor Memory Bank** system for enhanced AI-assisted development:

### Memory Bank Files
- `memory-bank/projectbrief.md` - Core mission and requirements
- `memory-bank/productContext.md` - User problems and solutions
- `memory-bank/systemPatterns.md` - Architecture and design patterns
- `memory-bank/techContext.md` - Technology stack and dependencies
- `memory-bank/activeContext.md` - Current work focus and changes
- `memory-bank/progress.md` - Implementation status and next steps

### Development Workflow
1. AI reads all memory bank files at session start
2. Apply documented patterns and architecture
3. Use Task Master AI for project management
4. Update memory bank as project evolves

## 📝 Development Commands

```bash
npm run dev              # Start development servers
npm run list             # List development tasks
npm run generate         # Generate project files
npm run parse-prd        # Parse requirements document
```

## 🎯 Current Status

**Phase 1: Foundation** (Current)
- ✅ Project structure and tooling
- ✅ Memory bank documentation system
- ✅ AI integration dependencies
- ⏳ Basic frontend and backend implementation
- ⏳ Authentication system

**Next: Core Features**
- Knowledge capture interface
- AI-powered search and organization
- Project management features

## 🤝 Contributing

This project follows TypeScript-first development with strict type checking:

### Code Standards
- No `any` types allowed
- Comprehensive type definitions
- Functional components with hooks
- JSDoc comments for public APIs

### Development Workflow
- Read memory bank files before starting work
- Follow documented patterns in `systemPatterns.md`
- Use Task Master AI for task management
- Update documentation as patterns evolve

## 📄 License

[License information to be added]

## 🔗 Links

- [Memory Bank Documentation](./memory-bank/)
- [Task Management](./tasks/)
- [API Documentation](./docs/)

---

**Built with ❤️ using AI-assisted development and the Cursor Memory Bank system**
