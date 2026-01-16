import { create, verify, getNumericDate } from "djwt";
import type { AuthPayload } from "../types/index.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "change-this-secret";
const encoder = new TextEncoder();
const keyBuf = encoder.encode(JWT_SECRET);

async function getKey() {
  return await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function generateToken(payload: AuthPayload): Promise<string> {
  const key = await getKey();

  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      ...payload,
      exp: getNumericDate(60 * 60 * 24 * 7) // 7 days
    },
    key
  );
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const key = await getKey();
    const payload = await verify(token, key);

    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
