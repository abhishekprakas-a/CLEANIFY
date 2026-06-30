import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { Role } from "@/constants";
import type { SessionUser } from "@/types";

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
  sid: string; // session id (links the access token to a refresh session)
}

const secretKey = new TextEncoder().encode(env.jwtSecret);

/** Sign a short-lived access token. Edge-compatible (jose). */
export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.jwtAccessExpiresIn)
    .sign(secretKey);
}

/** Verify an access token. Returns the session user or null. */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.sub || !payload.role) return null;
    return {
      id: String(payload.sub),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as Role,
      sessionId: payload.sid ? String(payload.sid) : undefined,
    };
  } catch {
    return null;
  }
}
