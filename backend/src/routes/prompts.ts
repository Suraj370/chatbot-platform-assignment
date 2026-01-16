import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { getDb } from "../utils/db.js";
import type { Prompt, Project, CreatePromptRequest } from "../types/index.js";

const router = Router();

// Get all prompts for a project
router.get("/projects/:projectId/prompts", authMiddleware, async (req: AuthRequest, res) => {
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

      const result = await client.query<Prompt>(
        "SELECT * FROM prompts WHERE project_id = $1 ORDER BY created_at DESC",
        [projectId]
      );

      res.json({ prompts: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get prompts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get a single prompt
router.get("/projects/:projectId/prompts/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const promptId = req.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<Prompt>(
        `SELECT p.* FROM prompts p
         JOIN projects pr ON p.project_id = pr.id
         WHERE p.id = $1 AND p.project_id = $2 AND pr.user_id = $3`,
        [promptId, projectId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Prompt not found" });
        return;
      }

      res.json({ prompt: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get prompt error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new prompt
router.post("/projects/:projectId/prompts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const body = req.body as CreatePromptRequest;
    const { name, content } = body;

    if (!name || !content) {
      res.status(400).json({ error: "Name and content are required" });
      return;
    }

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

      const result = await client.query<Prompt>(
        "INSERT INTO prompts (project_id, name, content) VALUES ($1, $2, $3) RETURNING *",
        [projectId, name, content]
      );

      res.status(201).json({ prompt: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create prompt error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update a prompt
router.put("/projects/:projectId/prompts/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const promptId = req.params.id;
    const body = req.body as Partial<CreatePromptRequest>;
    const { name, content } = body;

    const db = getDb();
    const client = await db.connect();

    try {
      // Verify project belongs to user and prompt exists
      const check = await client.query(
        `SELECT p.id FROM prompts p
         JOIN projects pr ON p.project_id = pr.id
         WHERE p.id = $1 AND p.project_id = $2 AND pr.user_id = $3`,
        [promptId, projectId, userId]
      );

      if (check.rows.length === 0) {
        res.status(404).json({ error: "Prompt not found" });
        return;
      }

      const result = await client.query<Prompt>(
        `UPDATE prompts
         SET
           name = COALESCE($1, name),
           content = COALESCE($2, content),
           updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [name, content, promptId]
      );

      res.json({ prompt: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update prompt error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a prompt
router.delete("/projects/:projectId/prompts/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId;
    const promptId = req.params.id;
    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query(
        `DELETE FROM prompts p
         USING projects pr
         WHERE p.id = $1 AND p.project_id = $2
           AND p.project_id = pr.id AND pr.user_id = $3
         RETURNING p.id`,
        [promptId, projectId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Prompt not found" });
        return;
      }

      res.status(204).send();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Delete prompt error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
