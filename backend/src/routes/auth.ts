import { Router } from "express";
import { getDb } from "../utils/db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateToken, verifyToken } from "../utils/jwt.js";
import type { RegisterRequest, LoginRequest, User } from "../types/index.js";

const router = Router();

// Register endpoint
router.post("/register", async (req, res) => {
  try {
    const body = req.body as RegisterRequest;
    const { email, password } = body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query<User>(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.status(409).json({ error: "User already exists" });
        return;
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const result = await client.query<User>(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        [email, passwordHash]
      );

      const user = result.rows[0];
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const body = req.body as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<User>(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const user = result.rows[0];
      const isValid = await verifyPassword(password, user.password_hash);

      if (!isValid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.query<User>(
        "SELECT id, email, created_at FROM users WHERE id = $1",
        [payload.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
