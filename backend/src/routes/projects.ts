import { Router } from "@oak/oak";
import { authMiddleware, type AuthState } from "../middleware/auth.ts";
import { getDb } from "../utils/db.ts";
import type { Project, CreateProjectRequest } from "../types/index.ts";

const router = new Router();

// Get all projects for the authenticated user
router.get("/projects", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<Project>`
        SELECT * FROM projects WHERE user_id = ${userId} ORDER BY created_at DESC
      `;

      ctx.response.body = { projects: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get projects error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Get a single project by ID
router.get("/projects/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<Project>`
        SELECT * FROM projects WHERE id = ${projectId} AND user_id = ${userId}
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Project not found" };
        return;
      }

      ctx.response.body = { project: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Create a new project
router.post("/projects", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const body = await ctx.request.body.json() as CreateProjectRequest;
    const { name, description, system_prompt } = body;

    if (!name) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Project name is required" };
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<Project>`
        INSERT INTO projects (user_id, name, description, system_prompt)
        VALUES (${userId}, ${name}, ${description || null}, ${system_prompt || null})
        RETURNING *
      `;

      ctx.response.status = 201;
      ctx.response.body = { project: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Update a project
router.put("/projects/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.id;
    const body = await ctx.request.body.json() as Partial<CreateProjectRequest>;
    const { name, description, system_prompt } = body;

    const db = getDb();
    const client = await db.connect();

    try {
      // Check if project exists and belongs to user
      const existing = await client.queryObject<Project>`
        SELECT * FROM projects WHERE id = ${projectId} AND user_id = ${userId}
      `;

      if (existing.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Project not found" };
        return;
      }

      const result = await client.queryObject<Project>`
        UPDATE projects
        SET
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          system_prompt = COALESCE(${system_prompt}, system_prompt),
          updated_at = NOW()
        WHERE id = ${projectId}
        RETURNING *
      `;

      ctx.response.body = { project: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Delete a project
router.delete("/projects/:id", authMiddleware, async (ctx) => {
  try {
    const userId = ctx.state.auth!.userId;
    const projectId = ctx.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<Project>`
        DELETE FROM projects WHERE id = ${projectId} AND user_id = ${userId}
        RETURNING id
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "Project not found" };
        return;
      }

      ctx.response.status = 204;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete project error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

export default router;
