import { Router } from "@oak/oak";
import { getDb } from "../utils/db.ts";
import { hashPassword, verifyPassword } from "../utils/password.ts";
import { generateToken } from "../utils/jwt.ts";
import type { RegisterRequest, LoginRequest, User } from "../types/index.ts";

const router = new Router();

// Register endpoint
router.post("/register", async (ctx) => {
  try {
    const body = await ctx.request.body.json() as RegisterRequest;
    const { email, password } = body;

    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and password are required" };
      return;
    }

    if (password.length < 8) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Password must be at least 8 characters" };
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      // Check if user already exists
      const existingUser = await client.queryObject<User>`
        SELECT * FROM users WHERE email = ${email}
      `;

      if (existingUser.rows.length > 0) {
        ctx.response.status = 409;
        ctx.response.body = { error: "User already exists" };
        return;
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const result = await client.queryObject<User>`
        INSERT INTO users (email, password_hash)
        VALUES (${email}, ${passwordHash})
        RETURNING id, email, created_at
      `;

      const user = result.rows[0];
      const token = await generateToken({
        userId: user.id,
        email: user.email,
      });

      ctx.response.status = 201;
      ctx.response.body = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Registration error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Login endpoint
router.post("/login", async (ctx) => {
  try {
    const body = await ctx.request.body.json() as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and password are required" };
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<User>`
        SELECT * FROM users WHERE email = ${email}
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Invalid credentials" };
        return;
      }

      const user = result.rows[0];
      const isValid = await verifyPassword(password, user.password_hash);

      if (!isValid) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Invalid credentials" };
        return;
      }

      const token = await generateToken({
        userId: user.id,
        email: user.email,
      });

      ctx.response.status = 200;
      ctx.response.body = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Login error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Get current user
router.get("/me", async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const token = authHeader.slice(7);
    const { verifyToken } = await import("../utils/jwt.ts");
    const payload = await verifyToken(token);

    if (!payload) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid token" };
      return;
    }

    const db = getDb();
    const client = await db.connect();

    try {
      const result = await client.queryObject<User>`
        SELECT id, email, created_at FROM users WHERE id = ${payload.userId}
      `;

      if (result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = { error: "User not found" };
        return;
      }

      ctx.response.body = { user: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Get user error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

export default router;
