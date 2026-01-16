export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Prompt {
  id: string;
  project_id: string;
  name: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface Chat {
  id: string;
  project_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  system_prompt?: string;
}

export interface CreatePromptRequest {
  name: string;
  content: string;
}

export interface ChatRequest {
  message: string;
}
