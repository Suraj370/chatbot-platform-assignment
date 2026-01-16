import { Application } from "@oak/oak";
import { load } from "@std/dotenv";
import { initDatabase } from "./utils/db.ts";
import authRouter from "./routes/auth.ts";
import projectsRouter from "./routes/projects.ts";
import promptsRouter from "./routes/prompts.ts";
import chatsRouter from "./routes/chats.ts";

// Load environment variables
await load({ export: true });

const app = new Application();
const PORT = parseInt(Deno.env.get("PORT") || "8000");

// CORS middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  await next();
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Server error:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Logging middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
});

// Health check endpoint
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = { status: "ok" };
    return;
  }
  await next();
});

// Mount routers
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());
app.use(projectsRouter.routes());
app.use(projectsRouter.allowedMethods());
app.use(promptsRouter.routes());
app.use(promptsRouter.allowedMethods());
app.use(chatsRouter.routes());
app.use(chatsRouter.allowedMethods());

// Initialize database
console.log("🔄 Initializing database...");
await initDatabase();

// Start server
console.log(`🚀 Server running on http://localhost:${PORT}`);
await app.listen({ port: PORT });
