import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque refresh tokens (Node runtime only — used in route handlers, never in
 * the edge middleware). A refresh token is `<sessionId>.<secret>`:
 *   - `sessionId` locates the session row,
 *   - `secret` is high-entropy random; only its SHA-256 hash is stored.
 * Rotation issues a new secret on every refresh.
 */
export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function buildRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(
  token: string,
): { sessionId: string; secret: string } | null {
  const idx = token.indexOf(".");
  if (idx <= 0) return null;
  const sessionId = token.slice(0, idx);
  const secret = token.slice(idx + 1);
  if (!sessionId || !secret) return null;
  return { sessionId, secret };
}

/** Generate a one-time password-reset token (raw) and its stored hash. */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}
