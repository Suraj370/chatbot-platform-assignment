import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { getDb } from "../utils/db.js";
import type { Project, CreateProjectRequest } from "../types/index.js";

const router = Router();

// Get all projects for the authenticated user
router.get("/projects", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<Project>(
        "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );

      res.json({ projects: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single project by ID
router.get("/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<Project>(
        "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
        [projectId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.json({ project: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new project
router.post("/projects", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const body = req.body as CreateProjectRequest;
    const { name, description, system_prompt } = body;

    if (!name) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<Project>(
        "INSERT INTO projects (user_id, name, description, system_prompt) VALUES ($1, $2, $3, $4) RETURNING *",
        [userId, name, description || null, system_prompt || null]
      );

      res.status(201).json({ project: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a project
router.put("/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.id;
    const body = req.body as Partial<CreateProjectRequest>;
    const { name, description, system_prompt } = body;

    const db = getDb();
    const client = await db.connect();

    try {
      // Check if project exists and belongs to user
      const existing = await client.query<Project>(
        "SELECT * FROM projects WHERE id = $1 AND user_id = $2",
        [projectId, userId]
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const result = await client.query<Project>(
        `UPDATE projects
         SET
           name = COALESCE($1, name),
           description = COALESCE($2, description),
           system_prompt = COALESCE($3, system_prompt),
           updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [name, description, system_prompt, projectId]
      );

      res.json({ project: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a project
router.delete("/projects/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<Project>(
        "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id",
        [projectId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
