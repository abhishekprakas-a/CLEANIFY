import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { toDtoList } from "@/lib/serialize";
import { env } from "@/lib/env";
import {
  buildRefreshToken,
  generateSecret,
  hashToken,
  parseRefreshToken,
} from "@/lib/tokens";
import { sessionModel } from "@/models";
import type { SessionDto } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SessionContext {
  userAgent?: string;
  ip?: string;
  remember?: boolean;
}

interface IssuedSession {
  sessionId: string;
  refreshToken: string;
  expiresAt: Date;
  rememberDays: number;
}

function rememberDaysFor(remember?: boolean): number {
  return remember ? env.refreshRememberDays : env.refreshExpiresInDays;
}

export const sessionService = {
  /** Create a new session row and return the raw refresh token (shown once). */
  async create(userId: string, ctx: SessionContext): Promise<IssuedSession> {
    await dbConnect();
    const secret = generateSecret();
    const rememberDays = rememberDaysFor(ctx.remember);
    const expiresAt = new Date(Date.now() + rememberDays * DAY_MS);

    const session = await sessionModel.create({
      user: userId,
      tokenHash: hashToken(secret),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
      expiresAt,
      lastUsedAt: new Date(),
    });

    return {
      sessionId: String(session._id),
      refreshToken: buildRefreshToken(String(session._id), secret),
      expiresAt,
      rememberDays,
    };
  },

  /**
   * Validate a presented refresh token and rotate it: the old secret is
   * replaced with a new one (single-use refresh tokens). Returns the userId +
   * the new refresh token. Throws UNAUTHENTICATED on any mismatch.
   */
  async rotate(
    refreshToken: string,
    ctx: SessionContext,
  ): Promise<{ userId: string; sessionId: string } & IssuedSession> {
    await dbConnect();
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) throw ApiError.unauthenticated("Invalid session");

    const session = await sessionModel.findById(parsed.sessionId);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now() ||
      session.tokenHash !== hashToken(parsed.secret)
    ) {
      // Reuse or tampering — revoke defensively if the row exists.
      if (session && !session.revokedAt) {
        session.revokedAt = new Date();
        await session.save();
      }
      throw ApiError.unauthenticated("Session expired, please sign in again");
    }

    const secret = generateSecret();
    const rememberDays = rememberDaysFor(ctx.remember);
    const expiresAt = new Date(Date.now() + rememberDays * DAY_MS);

    session.tokenHash = hashToken(secret);
    session.lastUsedAt = new Date();
    session.expiresAt = expiresAt;
    if (ctx.userAgent) session.userAgent = ctx.userAgent;
    if (ctx.ip) session.ip = ctx.ip;
    await session.save();

    return {
      userId: String(session.user),
      sessionId: String(session._id),
      refreshToken: buildRefreshToken(String(session._id), secret),
      expiresAt,
      rememberDays,
    };
  },

  async revoke(sessionId: string): Promise<void> {
    await dbConnect();
    await sessionModel.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
  },

  /** Revoke every session for a user (e.g. after a password reset). */
  async revokeAllForUser(userId: string): Promise<void> {
    await dbConnect();
    await sessionModel.updateMany(
      { user: userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
  },

  async listForUser(userId: string): Promise<SessionDto[]> {
    await dbConnect();
    const docs = await sessionModel
      .find({ user: userId, revokedAt: { $exists: false } })
      .sort({ lastUsedAt: -1 })
      .lean();
    return toDtoList<SessionDto>(docs);
  },
};
