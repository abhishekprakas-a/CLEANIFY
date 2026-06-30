import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signAccessToken } from "@/lib/jwt";
import { generateResetToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { toDto } from "@/lib/serialize";
import { userModel } from "@/models";
import { roles, routes, userStatus, type Role } from "@/constants";
import { sessionService, type SessionContext } from "./sessionService";
import { roleService } from "./roleService";
import type {
  LoginInput,
  CreateUserInput,
  UpdateUserInput,
} from "@/schemas/authSchema";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/schemas/authSchema";
import type { AuthenticatedUser, SessionUser, User } from "@/types";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  rememberDays: number;
}

export interface AuthResult extends AuthTokens {
  user: AuthenticatedUser;
}

async function buildAuthenticatedUser(
  base: SessionUser,
): Promise<AuthenticatedUser> {
  const permissions = await roleService.getPermissions(base.role);
  return { ...base, permissions };
}

export const authService = {
  /** Verify credentials, open a session, and mint access + refresh tokens. */
  async login(input: LoginInput, ctx: SessionContext): Promise<AuthResult> {
    await dbConnect();

    const user = await userModel
      .findOne({ email: input.email.toLowerCase() })
      .select("+passwordHash");

    if (!user || user.status !== userStatus.active) {
      throw ApiError.unauthenticated("Invalid email or password");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw ApiError.unauthenticated("Invalid email or password");

    user.lastLoginAt = new Date();
    await user.save();

    const session = await sessionService.create(String(user._id), ctx);

    const sessionUser: SessionUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role as Role,
      sessionId: session.sessionId,
    };

    const accessToken = await signAccessToken({
      sub: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      sid: session.sessionId,
    });

    await recordAudit({
      actor: sessionUser.id,
      actorName: sessionUser.name,
      action: "auth.login",
      ip: ctx.ip,
    });

    return {
      accessToken,
      refreshToken: session.refreshToken,
      rememberDays: session.rememberDays,
      user: await buildAuthenticatedUser(sessionUser),
    };
  },

  /** Rotate the refresh token and issue a fresh access token. */
  async refresh(
    refreshToken: string,
    ctx: SessionContext,
  ): Promise<AuthResult> {
    await dbConnect();
    const rotated = await sessionService.rotate(refreshToken, ctx);

    const user = await userModel.findById(rotated.userId);
    if (!user || user.status !== userStatus.active) {
      await sessionService.revoke(rotated.sessionId);
      throw ApiError.unauthenticated("Session is no longer valid");
    }

    const sessionUser: SessionUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role as Role,
      sessionId: rotated.sessionId,
    };

    const accessToken = await signAccessToken({
      sub: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      sid: rotated.sessionId,
    });

    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      rememberDays: rotated.rememberDays,
      user: await buildAuthenticatedUser(sessionUser),
    };
  },

  /** Revoke the current session. */
  async logout(sessionId?: string): Promise<void> {
    if (sessionId) await sessionService.revoke(sessionId);
  },

  /** Resolve the current session user with its permission set. */
  async me(sessionUser: SessionUser): Promise<AuthenticatedUser> {
    return buildAuthenticatedUser(sessionUser);
  },

  /**
   * Begin a password reset. Always resolves successfully (no user enumeration).
   * In development the reset link is logged by the mailer.
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await dbConnect();
    const user = await userModel.findOne({ email: input.email.toLowerCase() });
    if (!user || user.status !== userStatus.active) return;

    const { raw, hash } = generateResetToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpiresAt = new Date(
      Date.now() + env.passwordResetExpiresMinutes * 60 * 1000,
    );
    await user.save();

    const resetUrl = `${env.appUrl}${routes.resetPassword}?token=${raw}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  },

  /** Complete a password reset and revoke all existing sessions. */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await dbConnect();
    const tokenHash = hashToken(input.token);

    const user = await userModel
      .findOne({ passwordResetTokenHash: tokenHash })
      .select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw ApiError.badRequest("This reset link is invalid or has expired");
    }

    user.passwordHash = await hashPassword(input.password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    // Force re-login everywhere after a credential change.
    await sessionService.revokeAllForUser(String(user._id));
  },

  /** Create a staff user (admin or technician). Admin-only at the route layer. */
  async createUser(input: CreateUserInput): Promise<User> {
    await dbConnect();

    const existing = await userModel.findOne({
      $or: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
    });
    if (existing) {
      throw ApiError.conflict("A user with this email or phone already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const created = await userModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: input.role ?? roles.technician,
    });

    return toDto<User>(created.toObject());
  },

  /** Update a staff user (name/phone/role/status, optional password). */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    await dbConnect();
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.email !== undefined) update.email = input.email.toLowerCase();
    if (input.role !== undefined) update.role = input.role;
    if (input.status !== undefined) update.status = input.status;
    if (input.password)
      update.passwordHash = await hashPassword(input.password);

    const updated = await userModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .lean();
    if (!updated) throw ApiError.notFound("User not found");
    return toDto<User>(updated);
  },
};
