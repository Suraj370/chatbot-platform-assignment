import { Router } from "@oak/oak";
import { authMiddleware } from "../middleware/auth.ts";
import { getDb } from "../utils/db.ts";
import type { Prompt, Project, CreatePromptRequest } from "../types/index.ts";

const router = new Router();

// Get all prompts for a project
router.get("/projects/:projectId/prompts", authMiddleware, async (ctx) => {
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

      const result = await client.queryObject<Prompt>`
        SELECT * FROM prompts WHERE project_id = ${projectId} ORDER BY created_at DESC
      `;

      ctx.response.body = { prompts: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get prompts error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Get a single prompt
router.get("/projects/:projectId/prompts/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const promptId = ctx.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<Prompt & { user_id: string }>`
        SELECT p.* FROM prompts p
        JOIN projects pr ON p.project_id = pr.id
        WHERE p.id = ${promptId} AND p.project_id = ${projectId} AND pr.user_id = ${userId}
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Prompt not found" };
        return;
      }

      ctx.response.body = { prompt: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get prompt error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Create a new prompt
router.post("/projects/:projectId/prompts", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const body = await ctx.request.body.json() as CreatePromptRequest;
    const { name, content } = body;

    if (!name || !content) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Name and content are required" };
      return;
    }

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

      const result = await client.queryObject<Prompt>`
        INSERT INTO prompts (project_id, name, content)
        VALUES (${projectId}, ${name}, ${content})
        RETURNING *
      `;

      ctx.response.status = 201;
      ctx.response.body = { prompt: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create prompt error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Update a prompt
router.put("/projects/:projectId/prompts/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const promptId = ctx.params.id;
    const body = await ctx.request.body.json() as Partial<CreatePromptRequest>;
    const { name, content } = body;

    const db = getDb();
    const client = await db.connect();

    try {
      // Verify project belongs to user and prompt exists
      const check = await client.queryObject`
        SELECT p.id FROM prompts p
        JOIN projects pr ON p.project_id = pr.id
        WHERE p.id = ${promptId} AND p.project_id = ${projectId} AND pr.user_id = ${userId}
      `;

      if (check.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Prompt not found" };
        return;
      }

      const result = await client.queryObject<Prompt>`
        UPDATE prompts
        SET
          name = COALESCE(${name}, name),
          content = COALESCE(${content}, content),
          updated_at = NOW()
        WHERE id = ${promptId}
        RETURNING *
      `;

      ctx.response.body = { prompt: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update prompt error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Delete a prompt
router.delete("/projects/:projectId/prompts/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.projectId;
    const promptId = ctx.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject`
        DELETE FROM prompts p
        USING projects pr
        WHERE p.id = ${promptId} AND p.project_id = ${projectId}
          AND p.project_id = pr.id AND pr.user_id = ${userId}
        RETURNING p.id
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Prompt not found" };
        return;
      }

      ctx.response.status = 204;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete prompt error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

export default router;
