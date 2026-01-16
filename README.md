# Chatbot Platform

A full-stack chatbot platform built with Bun, React, and Gemini AI.

## Features

- User authentication (register/login)
- Create and manage multiple chatbot projects
- Configure custom system prompts for each project
- Chat interface with AI-powered responses using Gemini
- Multiple chat sessions per project
- Real-time message history

## Tech Stack

### Backend
- **Runtime**: Bun
- **Framework**: Express
- **Database**: PostgreSQL
- **AI**: Google Gemini 2.5 Flash
- **Auth**: JWT tokens

### Frontend
- **Framework**: React 19
- **Router**: TanStack Router
- **Styling**: TailwindCSS 4
- **UI Components**: shadcn/ui
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Bun
- PostgreSQL database
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot_platform
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
PORT=8000
```

3. Run the backend:
```bash
bun run dev
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```env
VITE_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Architecture & Design

### System Overview

The Chatbot Platform follows a **client-server architecture** with clear separation of concerns:

```
┌─────────────┐         HTTP/REST API          ┌─────────────┐
│             │ ◄────────────────────────────► │             │
│  Frontend   │      JSON over HTTPS           │   Backend   │
│  (React)    │                                │   (Express) │
│             │                                │             │
└─────────────┘                                └──────┬──────┘
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    │                                   │
                                    ▼                                   ▼
                              ┌───────────┐                     ┌────────────┐
                              │PostgreSQL │                     │ Gemini AI  │
                              │ Database  │                     │    API     │
                              └───────────┘                     └────────────┘
```

### Design Principles

1. **Separation of Concerns**: Frontend handles UI/UX, backend manages business logic and data
2. **RESTful API Design**: Stateless HTTP endpoints with JWT authentication
3. **Type Safety**: Full TypeScript implementation on both frontend and backend
4. **Modular Architecture**: Route-based file organization for scalability

### Backend Architecture

**Framework**: Express (Node.js web framework running on Bun)

**Key Components**:
- **Routes Layer** (`src/routes/`): HTTP endpoint handlers organized by domain
  - `auth.ts`: User registration, login, profile management
  - `projects.ts`: CRUD operations for chatbot projects
  - `chats.ts`: Chat session and message handling
  - `prompts.ts`: System prompt configuration

- **Middleware Layer** (`src/middleware/`):
  - `auth.ts`: JWT token validation and user authentication
  - CORS handling for cross-origin requests
  - Request/response logging

- **Utils Layer** (`src/utils/`):
  - `db.ts`: PostgreSQL connection pool and query execution
  - `jwt.ts`: Token generation and verification
  - `password.ts`: Bcrypt hashing for secure password storage
  - `openai.ts`: Gemini AI API integration

**Data Flow** (Example: Sending a chat message):
```
1. Client sends POST /projects/:projectId/chats/:chatId/messages
2. Auth middleware validates JWT token → extracts userId
3. Route handler validates projectId ownership
4. Insert user message into database
5. Call Gemini API with system prompt + message history
6. Store AI response in database
7. Return both messages to client
```

### Frontend Architecture

**Framework**: React 19 with TanStack Router for file-based routing

**Key Components**:
- **Routes** (`src/routes/`): File-based routing pages
  - `index.tsx`: Landing page with auth redirect
  - `login.tsx` / `register.tsx`: Authentication forms
  - `dashboard.tsx`: Project management dashboard
  - `projects.$projectId.tsx`: Chat interface with real-time messaging

- **Contexts** (`src/contexts/`):
  - `AuthContext`: Global authentication state management
  - User session persistence via localStorage

- **Components** (`src/components/`): Reusable UI components
  - Built with shadcn/ui (Radix UI primitives)
  - Styled with TailwindCSS utility classes

- **API Client** (`src/lib/api.ts`):
  - Centralized HTTP client with auth token injection
  - Error handling and response normalization

**State Management Strategy**:
- **Local State**: React hooks (useState, useReducer) for component state
- **Server State**: TanStack Query for data fetching and caching
- **Global State**: React Context for authentication
- **URL State**: TanStack Router for navigation parameters

### Database Schema

```sql
users
├── id (SERIAL PRIMARY KEY)
├── username (VARCHAR UNIQUE)
├── email (VARCHAR UNIQUE)
├── password_hash (VARCHAR)
└── created_at (TIMESTAMP)

projects
├── id (SERIAL PRIMARY KEY)
├── user_id (INTEGER FK → users.id)
├── name (VARCHAR)
├── system_prompt (TEXT)
└── created_at (TIMESTAMP)

chats
├── id (SERIAL PRIMARY KEY)
├── project_id (INTEGER FK → projects.id)
├── title (VARCHAR)
└── created_at (TIMESTAMP)

messages
├── id (SERIAL PRIMARY KEY)
├── chat_id (INTEGER FK → chats.id)
├── role ('user' | 'assistant')
├── content (TEXT)
└── created_at (TIMESTAMP)
```

**Relationships**:
- One-to-Many: User → Projects → Chats → Messages
- Cascade Delete: Deleting a project removes all associated chats and messages

### Security Features

1. **Authentication**: JWT tokens with HTTP-only cookies (recommended for production)
2. **Password Security**: Bcrypt hashing with salt rounds
3. **Authorization**: Middleware checks resource ownership before operations
4. **SQL Injection Prevention**: Parameterized queries via postgres library
5. **CORS Configuration**: Restricted to frontend origin

### AI Integration

**Gemini 2.5 Flash** is used for chat responses:
- System prompts are configurable per project
- Message history is sent for context-aware responses
- Streaming responses 

## Project Structure

```
chatbot-platform/
├── backend/
│   └── src/
│       ├── routes/         # API endpoints
│       │   ├── auth.ts     # Authentication routes
│       │   ├── projects.ts # Project management
│       │   ├── prompts.ts  # Prompt management
│       │   └── chats.ts    # Chat and messaging
│       ├── middleware/     # Custom middleware
│       ├── utils/          # Utility functions
│       ├── types/          # TypeScript types
│       └── main.ts         # Application entry point
│
└── frontend/
    └── src/
        ├── routes/         # Page components
        │   ├── index.tsx   # Home/redirect page
        │   ├── login.tsx   # Login page
        │   ├── register.tsx # Registration page
        │   ├── dashboard.tsx # Projects dashboard
        │   └── projects.$projectId.tsx # Chat interface
        ├── contexts/       # React contexts
        ├── components/     # Reusable UI components
        ├── lib/            # Utilities and API client
        └── styles.css      # Global styles

## API Endpoints

### Authentication
- `POST /register` - Register a new user
- `POST /login` - Login user
- `GET /me` - Get current user

### Projects
- `GET /projects` - List all user projects
- `GET /projects/:id` - Get project details
- `POST /projects` - Create new project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Chats
- `GET /projects/:projectId/chats` - List all chats for a project
- `GET /projects/:projectId/chats/:id` - Get chat with messages
- `POST /projects/:projectId/chats` - Create new chat
- `POST /projects/:projectId/chats/:id/messages` - Send message
- `DELETE /projects/:projectId/chats/:id` - Delete chat

## Database Schema

The platform uses the following main tables:
- `users` - User accounts
- `projects` - Chatbot projects
- `prompts` - Saved prompts (future feature)
- `chats` - Chat sessions
- `messages` - Chat messages

## Development

### Backend Development
```bash
cd backend
bun run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Build for Production

Backend:
```bash
cd backend
bun build src/main.ts --compile --outfile chatbot-platform
```

Frontend:
```bash
cd frontend
npm run build
```

