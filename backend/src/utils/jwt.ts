import jwt from "jsonwebtoken";
import type { AuthPayload } from "../types/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
}
