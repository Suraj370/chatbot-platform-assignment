import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import type { AuthPayload } from "../types/index.js";

export interface AuthRequest extends Request {
  auth?: AuthPayload;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  req.auth = payload;
  next();
}
