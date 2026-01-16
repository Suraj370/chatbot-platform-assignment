# Chatbot Platform Backend

A Deno-based backend API for the chatbot platform with JWT authentication, PostgreSQL database, and Gemini AI integration.

## Features

- JWT-based authentication
- User registration and login
- Project/Agent management
- Prompt storage and management
- Chat functionality with Gemini AI
- RESTful API design
- PostgreSQL database

## Prerequisites

- Deno (v2.0 or later)
- PostgreSQL database
- Gemini API key

## Setup

1. **Install Deno** (if not already installed):
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Set up PostgreSQL database**:
   Create a new PostgreSQL database for the application.

3. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT signing
   - `GEMINI_API_KEY`: Your Gemini API key
   - `PORT`: Server port (default: 8000)

4. **Run the server**:
   ```bash
   deno task dev
   ```

   The server will automatically create the database tables on first run.

## API Endpoints

### Authentication

- `POST /register` - Register a new user
  - Body: `{ email, password }`
- `POST /login` - Login
  - Body: `{ email, password }`
- `GET /me` - Get current user (requires auth)

### Projects

- `GET /projects` - Get all projects (requires auth)
- `GET /projects/:id` - Get project by ID (requires auth)
- `POST /projects` - Create project (requires auth)
  - Body: `{ name, description?, system_prompt? }`
- `PUT /projects/:id` - Update project (requires auth)
- `DELETE /projects/:id` - Delete project (requires auth)

### Prompts

- `GET /projects/:projectId/prompts` - Get all prompts for a project (requires auth)
- `GET /projects/:projectId/prompts/:id` - Get prompt by ID (requires auth)
- `POST /projects/:projectId/prompts` - Create prompt (requires auth)
  - Body: `{ name, content }`
- `PUT /projects/:projectId/prompts/:id` - Update prompt (requires auth)
- `DELETE /projects/:projectId/prompts/:id` - Delete prompt (requires auth)

### Chats

- `GET /projects/:projectId/chats` - Get all chats for a project (requires auth)
- `GET /projects/:projectId/chats/:id` - Get chat with messages (requires auth)
- `POST /projects/:projectId/chats` - Create new chat (requires auth)
- `POST /projects/:projectId/chats/:id/messages` - Send message (requires auth)
  - Body: `{ message }`
- `DELETE /projects/:projectId/chats/:id` - Delete chat (requires auth)

### Health Check

- `GET /health` - Health check endpoint

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Database Schema

The application uses the following tables:
- `users` - User accounts
- `projects` - User projects/agents
- `prompts` - Saved prompts for projects
- `chats` - Chat sessions
- `messages` - Chat messages

## Development

Run in development mode with auto-reload:
```bash
deno task dev
```

Run in production mode:
```bash
deno task start
```
