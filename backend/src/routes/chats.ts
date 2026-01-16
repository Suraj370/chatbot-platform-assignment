import { Router } from "@oak/oak";
import { authMiddleware } from "../middleware/auth.ts";
import { getDb } from "../utils/db.ts";
import {  sendToGeminiStream } from "../utils/openai.ts";
import type { Chat, Message, Project, ChatRequest } from "../types/index.ts";

const router = new Router();

router.get("/projects/:projectId/chats", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const db = getDb();
    const client = await db.connect();

    try {
      const projectCheck = await client.queryObject<Project>`
        SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${userId}
      `;

      if (projectCheck.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Project not found" };
        return;
      }

      const result = await client.queryObject<Chat>`
        SELECT * FROM chats WHERE project_id = ${projectId} ORDER BY created_at DESC
      `;

      ctx.response.body = { chats: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get chats error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

router.get("/projects/:projectId/chats/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const chatId = ctx.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const chatCheck = await client.queryObject<Chat>`
        SELECT c.* FROM chats c
        JOIN projects p ON c.project_id = p.id
        WHERE c.id = ${chatId} AND c.project_id = ${projectId} AND p.user_id = ${userId}
      `;

      if (chatCheck.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Chat not found" };
        return;
      }

      const chat = chatCheck.rows[0];

      const messages = await client.queryObject<Message>`
        SELECT * FROM messages WHERE chat_id = ${chatId} ORDER BY created_at ASC
      `;

      ctx.response.body = {
        chat,
        messages: messages.rows,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get chat error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Create a new chat
router.post("/projects/:projectId/chats", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const db = getDb();
    const client = await db.connect();

    try {
      // Verify project belongs to user
      const projectCheck = await client.queryObject<Project>`
        SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${userId}
      `;

      if (projectCheck.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Project not found" };
        return;
      }

      const result = await client.queryObject<Chat>`
        INSERT INTO chats (project_id)
        VALUES (${projectId})
        RETURNING *
      `;

      ctx.response.status = 201;
      ctx.response.body = { chat: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create chat error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});



// Send a message in a chat with streaming
router.post("/projects/:projectId/chats/:id/messages/stream", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const chatId = ctx.params.id;
    const body = await ctx.request.body.json() as ChatRequest;
    const { message } = body;

    if (!message) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Message is required" };
      return;
    }

    const db = getDb();
    const client = await db.connect();

    let systemPrompt: string | null = null;

    try {
      // Verify chat belongs to user's project and get project details
      const chatCheck = await client.queryObject<Chat & { system_prompt: string | null }>`
        SELECT c.*, p.system_prompt FROM chats c
        JOIN projects p ON c.project_id = p.id
        WHERE c.id = ${chatId} AND c.project_id = ${projectId} AND p.user_id = ${userId}
      `;

      if (chatCheck.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Chat not found" };
        return;
      }

      systemPrompt = chatCheck.rows[0].system_prompt;

      // Save user message
      const userMessageResult = await client.queryObject<Message>`
        INSERT INTO messages (chat_id, role, content)
        VALUES (${chatId}, 'user', ${message})
        RETURNING *
      `;

      const userMessage = userMessageResult.rows[0];

      // Get chat history
      const historyResult = await client.queryObject<Message>`
        SELECT * FROM messages WHERE chat_id = ${chatId} ORDER BY created_at ASC
      `;

      const history = historyResult.rows.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Set up SSE headers
      ctx.response.headers.set("Content-Type", "text/event-stream");
      ctx.response.headers.set("Cache-Control", "no-cache");
      ctx.response.headers.set("Connection", "keep-alive");

      // Create a readable stream
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send user message first
          const userMessageEvent = `data: ${JSON.stringify({
            type: "userMessage",
            message: userMessage
          })}\n\n`;
          controller.enqueue(encoder.encode(userMessageEvent));

          let fullResponse = "";

          try {
            // Stream AI response
            for await (const chunk of sendToGeminiStream(history, systemPrompt || undefined)) {
              fullResponse += chunk;
              const chunkEvent = `data: ${JSON.stringify({
                type: "chunk",
                content: chunk
              })}\n\n`;
              controller.enqueue(encoder.encode(chunkEvent));
            }

            // Save complete AI message to database
            const aiMessageResult = await client.queryObject<Message>`
              INSERT INTO messages (chat_id, role, content)
              VALUES (${chatId}, 'assistant', ${fullResponse})
              RETURNING *
            `;

            const aiMessage = aiMessageResult.rows[0];

            // Send completion event with full message
            const doneEvent = `data: ${JSON.stringify({
              type: "done",
              message: aiMessage
            })}\n\n`;
            controller.enqueue(encoder.encode(doneEvent));

          } catch (error) {
            console.error("Streaming error:", error);
            const errorEvent = `data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "An error occurred"
            })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          } finally {
            client.release();
            controller.close();
          }
        },
      });

      ctx.response.body = stream;
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error) {
    console.error("Send message stream error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Delete a chat
router.delete("/projects/:projectId/chats/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const chatId = ctx.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject`
        DELETE FROM chats c
        USING projects p
        WHERE c.id = ${chatId} AND c.project_id = ${projectId}
          AND c.project_id = p.id AND p.user_id = ${userId}
        RETURNING c.id
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Chat not found" };
        return;
      }

      ctx.response.status = 204;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete chat error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

export default router;
