import { Context, Next } from "@oak/oak";
import { verifyToken } from "../utils/jwt.ts";
import type { AuthPayload } from "../types/index.ts";

export interface AuthState {
  auth?: AuthPayload;
}

export async function authMiddleware(
  ctx: Context<AuthState>,
  next: Next
) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: No token provided" };
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const payload = await verifyToken(token);

  if (!payload) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized: Invalid token" };
    return;
  }

  ctx.state.auth = payload;
  await next();
}
