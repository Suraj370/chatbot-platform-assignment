const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

class ApiClient {
  private getAuthToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "An error occurred",
      }));
      throw new Error(error.error || "An error occurred");
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string) {
    const response = await this.request<{ user: User; token: string }>(
      "/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    localStorage.setItem("auth_token", response.token);
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{ user: User; token: string }>(
      "/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    localStorage.setItem("auth_token", response.token);
    return response;
  }

  async getMe() {
    return this.request<{ user: User }>("/me");
  }

  logout() {
    localStorage.removeItem("auth_token");
  }

  // Projects
  async getProjects() {
    return this.request<{ projects: Project[] }>("/projects");
  }

  async getProject(id: string) {
    return this.request<{ project: Project }>(`/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    system_prompt?: string;
  }) {
    return this.request<{ project: Project }>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      system_prompt?: string;
    }
  ) {
    return this.request<{ project: Project }>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, {
      method: "DELETE",
    });
  }

  // Chats
  async getChats(projectId: string) {
    return this.request<{ chats: Chat[] }>(`/projects/${projectId}/chats`);
  }

  async getChat(projectId: string, chatId: string) {
    return this.request<{ chat: Chat; messages: Message[] }>(
      `/projects/${projectId}/chats/${chatId}`
    );
  }

  async createChat(projectId: string) {
    return this.request<{ chat: Chat }>(`/projects/${projectId}/chats`, {
      method: "POST",
    });
  }

  async sendMessage(projectId: string, chatId: string, message: string) {
    return this.request<{ userMessage: Message; aiMessage: Message }>(
      `/projects/${projectId}/chats/${chatId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ message }),
      }
    );
  }

  async sendMessageStream(
    projectId: string,
    chatId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onUserMessage: (message: Message) => void,
    onComplete: (message: Message) => void,
    onError: (error: string) => void
  ) {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(
        `${API_URL}/projects/${projectId}/chats/${chatId}/messages/stream`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "An error occurred",
        }));
        throw new Error(error.error || "An error occurred");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "userMessage") {
              onUserMessage(data.message);
            } else if (data.type === "chunk") {
              onChunk(data.content);
            } else if (data.type === "done") {
              onComplete(data.message);
            } else if (data.type === "error") {
              onError(data.error);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "An error occurred");
    }
  }

  async deleteChat(projectId: string, chatId: string) {
    return this.request(`/projects/${projectId}/chats/${chatId}`, {
      method: "DELETE",
    });
  }
}

export const api = new ApiClient();
