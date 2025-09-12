# Synapse Project Analysis

## Project Overview

Synapse is a web-based application that functions as a personal, automated "Second Brain" and project management platform. It aims to help users manage information overload by providing a unified system for knowledge management, AI-powered intelligence, and project tracking.

**Key Technologies:**

*   **Frontend:** React 18 with TypeScript, Vite, Tailwind CSS, and shadcn/ui.
*   **Backend:** Node.js with TypeScript and Express.js.
*   **AI:** Anthropic Claude, OpenAI, and Gemini for various AI capabilities.
*   **Database:** MongoDB (inferred from `mongoose` dependency).
*   **Authentication:** JWT-based authentication.
*   **Development:** The project uses a "Cursor Memory Bank" system for AI-assisted development, with tools like Task Master AI and MCP Server for AI integration.

## Building and Running

The following commands are available for building, running, and testing the project:

*   `npm run dev`: Starts the development servers for both the frontend and backend.
*   `npm run dev:backend`: Starts only the backend development server.
*   `npm run build`: Builds the frontend application for production.
*   `npm run start`: Starts the production server for the frontend.
*   `npm run test`: Runs the test suite using Jest.
*   `npm run list`: Lists available development tasks.
*   `npm run generate`: Generates project files.
*   `npm run parse-prd`: Parses the product requirements document.

## Development Conventions

*   **TypeScript-First:** The project follows a strict TypeScript-first development approach, with a "no `any` types" rule.
*   **UI/UX:** The project has a detailed UI/UX improvement plan that emphasizes a modern, visually appealing, and intuitive user experience. Key design principles include Glassmorphism, Neumorphism, and micro-animations.
*   **AI-Assisted Development:** The project utilizes a "Cursor Memory Bank" system to provide context to AI assistants for development tasks.
*   **Testing:** The project uses Jest for testing.

## Key Files

*   `README.md`: Provides a high-level overview of the project, its features, and how to get started.
*   `SYNAPSE_PRD.md`: The Product Requirements Document, which outlines the features of the Synapse platform.
*   `package.json`: Defines the project's dependencies and scripts.
*   `UI_UX_IMPROVEMENT_PLAN.md`: A detailed plan for improving the user interface and user experience of the application.
*   `AGENT_ENHANCEMENT_PLAN.md`: A plan for enhancing the AI agent system, with a focus on social media integration and dynamic topic handling.
*   `src/`: Contains the source code for the frontend and backend applications.
*   `scripts/`: Contains development and automation scripts.
*   `tests/`: Contains the test suites for the project.
*   `memory-bank/`: Contains the Cursor AI memory system files.
*   `tasks/`: Contains task management files.
