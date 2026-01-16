import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDatabase } from "./utils/db.js";
import authRouter from "./routes/auth.js";
import projectsRouter from "./routes/projects.js";
import promptsRouter from "./routes/prompts.js";
import chatsRouter from "./routes/chats.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "8000");

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${ms}ms`);
  });
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Mount routers
app.use(authRouter);
app.use(projectsRouter);
app.use(promptsRouter);
app.use(chatsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database
console.log("🔄 Initializing database...");
await initDatabase();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
