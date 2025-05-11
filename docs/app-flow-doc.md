# Application Flow for Synapse

This document outlines the key application flows and user journeys within Synapse.

## Core Principles

- **Capture Everything:** Seamless ingestion from multiple sources.
- **Process & Organize:** Efficient triage and structuring of information.
- **Action & Manage:** Robust tools for tasks, projects, and goals.
- **Surface & Assist:** Intelligent retrieval and proactive support.

## Key Application Flows

### 1. Information Capture

**a. WhatsApp Message Capture (Text, Link, Media)**
   1. **User Action:** Forwards a WhatsApp message (text, link, image, video, voice note) to the dedicated Synapse WhatsApp number/bot.
      - *Optional:* User includes inline tags (e.g., `#task`, `#idea projectX`) or commands (e.g., `/task`) in the forwarded message.
   2. **Synapse Backend:**
      - Receives the message via WhatsApp Business API integration.
      - Parses message content (text, media type, sender info).
      - If voice note, sends to OpenAI Whisper API for transcription.
      - If link, attempts to fetch metadata (title, preview).
      - Processes inline tags/commands.
      - Applies AI-powered auto-tagging (OpenAI API) based on content.
      - Associates the item with the known WhatsApp contact.
   3. **Synapse System:**
      - Creates a new "captured item" record in the MongoDB database.
      - Stores associated media (if any) in a designated storage (e.g., S3 bucket, local filesystem if self-hosted).
      - Places the new item in the User's "Unified Inbox."
   4. **User Interface (Frontend):**
      - Inbox updates to show the new captured item.

**b. Web Clipper Usage**
   1. **User Action:** Activates the browser extension on a webpage.
      - Clips article, selection, bookmark, or screenshot.
      - *Optional:* Adds tags, notes, assigns to a project directly in the clipper UI.
   2. **Browser Extension:**
      - Gathers selected content and metadata.
      - Sends data to Synapse Backend API.
   3. **Synapse Backend:**
      - Receives data from the extension.
      - Creates a new "captured item."
      - Stores content and places it in the "Unified Inbox."
   4. **User Interface (Frontend):**
      - Inbox updates.

**c. Email Forwarding**
   *(Similar flow to WhatsApp: User forwards email -> Synapse email handler parses -> Creates item in Inbox)*

**d. Manual Entry**
   1. **User Action:** Clicks "Add Note" or "Add Task" in the Synapse UI.
   2. **User Interface (Frontend):**
      - Opens rich-text editor or task creation form.
      - User inputs content, title, tags, due dates, project associations, etc.
   3. **Synapse Backend:**
      - Receives data from the frontend.
      - Creates new note/task item in the database.
      - If it's a general capture, it might go to Inbox first, or directly to notes/tasks.

### 2. Information Processing & Organization (The Cortex)

**a. Triaging from Unified Inbox**
   1. **User Action:** Opens the "Unified Inbox."
   2. **User Interface (Frontend):**
      - Displays list of captured items.
      - For each item, user can:
         - Convert to Task (assign project, due date, priority).
         - Convert to Note (add to area/resource, link to other items).
         - Add/edit tags.
         - Archive/Delete.
         - Link to existing Project/Goal.
   3. **Synapse Backend:**
      - Updates item status, type, and associations in MongoDB based on user actions.

**b. Creating/Managing Tags**
   *(Standard CRUD for tags, ability to nest, assign colors, etc.)*

**c. Bi-Directional Linking**
   1. **User Action:** While viewing a note or task, selects "Link to..."
   2. **User Interface (Frontend):**
      - Opens a search/picker to find other notes, tasks, projects.
      - User selects item(s) to link.
   3. **Synapse Backend:**
      - Creates link relationships in the database (e.g., an array of linked item IDs on each document).

### 3. Project & Task Management (The Helm)

**a. Creating a Project**
   *(User defines project name, goals, deadlines. Can associate tasks, notes.)*

**b. Creating a Task (Standalone or within Project)**
   *(User defines task title, description, due date, priority, assigns to project/area, adds sub-tasks, context tags.)*

**c. Viewing "Today" / "Focus View"**
   1. **User Action:** Navigates to the "Today" dashboard.
   2. **Synapse Backend:**
      - Queries MongoDB for tasks due today, overdue, upcoming.
      - Fetches relevant new inbox items or reminders.
   3. **User Interface (Frontend):**
      - Displays a prioritized list of tasks and other relevant information.

### 4. Proactive Assistance (Illustrative Example)

**a. Suggesting Relevant Notes for a Task**
   1. **User Action:** Opens a specific task.
   2. **Synapse Backend (Potentially AI-driven):**
      - Analyzes task title, description, associated project.
      - Searches existing notes/resources for relevant keywords or semantic similarity (using OpenAI embeddings or similar).
   3. **User Interface (Frontend):**
      - Displays a "Suggested Related Items" section with links to potentially relevant notes.

## Data Models (High-Level for MongoDB)

- **`users`**: { `_id`, `name`, `email`, `hashedPassword`, `whatsAppJid`, `openAIKey_encrypted` (if user-provided), `settings`, etc. }
- **`captured_items`**: { `_id`, `userId`, `source` (whatsapp, web, email, manual), `type` (note, task, raw_capture), `title`, `content`, `transcription`, `tags`, `status` (inbox, processed, archived), `originalSenderInfo`, `media` [{ `type`, `url` or `storagePath` }], `linkedItemIds`, `createdAt`, `updatedAt`, etc. }
- **`projects`**: { `_id`, `userId`, `name`, `description`, `goal`, `status`, `deadline`, `linkedItemIds`, etc. }
- **`tasks`**: { `_id`, `userId`, `title`, `description`, `status` (pending, in-progress, done), `priority`, `dueDate`, `reminderDate`, `projectId`, `areaId`, `parentTaskId` (for sub-tasks), `contextTags`, `linkedItemIds`, etc. }
- **`tags`**: { `_id`, `userId`, `name`, `color`, `parentId` (for nesting), etc. }

---
*This is a starting point. Flows and data models will evolve.* 