import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { getDb } from "../utils/db.js";
import { sendToGeminiStream } from "../utils/openai.js";
import type { Chat, Message, Project, ChatRequest } from "../types/index.js";

const router = Router();

router.get("/projects/:projectId/chats", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const db = getDb();
    const client = await db.connect();

    try {
      const projectCheck = await client.query<Project>(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const result = await client.query<Chat>(
        "SELECT * FROM chats WHERE project_id = $1 ORDER BY created_at DESC",
        [projectId]
      );

      res.json({ chats: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:projectId/chats/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const chatId = req.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const chatCheck = await client.query<Chat>(
        `SELECT c.* FROM chats c
         JOIN projects p ON c.project_id = p.id
         WHERE c.id = $1 AND c.project_id = $2 AND p.user_id = $3`,
        [chatId, projectId, userId]
      );

      if (chatCheck.rows.length === 0) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      const chat = chatCheck.rows[0];

      const messages = await client.query<Message>(
        "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
        [chatId]
      );

      res.json({
        chat,
        messages: messages.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new chat
router.post("/projects/:projectId/chats", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const db = getDb();
    const client = await db.connect();

    try {
      // Verify project belongs to user
      const projectCheck = await client.query<Project>(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        [projectId, userId]
      );

      if (projectCheck.rows.length === 0) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const result = await client.query<Chat>(
        "INSERT INTO chats (project_id) VALUES ($1) RETURNING *",
        [projectId]
      );

      res.status(201).json({ chat: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send a message in a chat with streaming
router.post("/projects/:projectId/chats/:id/messages/stream", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const chatId = req.params.id;
    const body = req.body as ChatRequest;
    const { message } = body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const db = getDb();
    const client = await db.connect();

    let systemPrompt: string | null = null;

    try {
      // Verify chat belongs to user's project and get project details
      const chatCheck = await client.query<Chat & { system_prompt: string | null }>(
        `SELECT c.*, p.system_prompt FROM chats c
         JOIN projects p ON c.project_id = p.id
         WHERE c.id = $1 AND c.project_id = $2 AND p.user_id = $3`,
        [chatId, projectId, userId]
      );

      if (chatCheck.rows.length === 0) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      systemPrompt = chatCheck.rows[0].system_prompt;

      // Save user message
      const userMessageResult = await client.query<Message>(
        "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING *",
        [chatId, 'user', message]
      );

      const userMessage = userMessageResult.rows[0];

      // Get chat history
      const historyResult = await client.query<Message>(
        "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
        [chatId]
      );

      const history = historyResult.rows.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send user message first
      res.write(`data: ${JSON.stringify({
        type: "userMessage",
        message: userMessage
      })}\n\n`);

      let fullResponse = "";

      try {
        // Stream AI response
        for await (const chunk of sendToGeminiStream(history, systemPrompt || undefined)) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({
            type: "chunk",
            content: chunk
          })}\n\n`);
        }

        // Save complete AI message to database
        const aiMessageResult = await client.query<Message>(
          "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING *",
          [chatId, 'assistant', fullResponse]
        );

        const aiMessage = aiMessageResult.rows[0];

        // Send completion event with full message
        res.write(`data: ${JSON.stringify({
          type: "done",
          message: aiMessage
        })}\n\n`);

        res.end();
      } catch (error) {
        console.error("Streaming error:", error);
        res.write(`data: ${JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "An error occurred"
        })}\n\n`);
        res.end();
      } finally {
        client.release();
      }
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Send message stream error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a chat
router.delete("/projects/:projectId/chats/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const chatId = req.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query(
        `DELETE FROM chats c
         USING projects p
         WHERE c.id = $1 AND c.project_id = $2
           AND c.project_id = p.id AND p.user_id = $3
         RETURNING c.id`,
        [chatId, projectId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
