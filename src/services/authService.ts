import { dbConnect } from "@/lib/dbConnect";
import { ApiError } from "@/lib/apiError";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signAccessToken } from "@/lib/jwt";
import { generateResetToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { toDto } from "@/lib/serialize";
import {
  attendanceModel,
  jobAssignmentModel,
  jobModel,
  reviewModel,
  userModel,
} from "@/models";
import { roles, routes, userStatus, type Role } from "@/constants";
import { sessionService, type SessionContext } from "./sessionService";
import { roleService } from "./roleService";
import type {
  LoginInput,
  SignupInput,
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

    if (!user) throw ApiError.unauthenticated("Invalid email or password");

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw ApiError.unauthenticated("Invalid email or password");

    // Only reveal account state once the password is proven correct, so this
    // can't be used to probe which emails exist.
    if (user.status !== userStatus.active) {
      if (user.status === userStatus.pending) {
        throw ApiError.forbidden(
          "Your account is awaiting admin approval. You'll be able to sign in once it's verified.",
        );
      }
      throw ApiError.forbidden(
        "Your account has been deactivated. Please contact an admin.",
      );
    }

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

  /**
   * Public self-registration. Creates a technician account with status
   * `pending`; it cannot log in until an admin verifies it. Returns nothing —
   * no session is opened.
   */
  async signup(input: SignupInput): Promise<void> {
    await dbConnect();

    const existing = await userModel.findOne({
      $or: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
    });
    if (existing) {
      throw ApiError.conflict(
        "An account with this email or phone already exists",
      );
    }

    const passwordHash = await hashPassword(input.password);
    const created = await userModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: roles.technician,
      status: userStatus.pending,
    });

    await recordAudit({
      actor: String(created._id),
      actorName: created.name,
      action: "auth.signup",
      entityType: "user",
      entityId: String(created._id),
    });
  },

  /** Accounts awaiting admin verification (newest first). */
  async listPendingUsers(): Promise<User[]> {
    await dbConnect();
    const docs = await userModel
      .find({ status: userStatus.pending })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => toDto<User>(d));
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

    // Re-read with the default projection so the password hash (select:false)
    // is never serialized back to the client.
    const safe = await userModel.findById(created._id).lean();
    if (!safe) throw ApiError.notFound("User not found");
    return toDto<User>(safe);
  },

  /** Update a staff user (name/phone/role/status, optional password). */
  async updateUser(
    id: string,
    input: UpdateUserInput,
    actor: SessionUser,
  ): Promise<User> {
    await dbConnect();
    const target = await userModel.findById(id);
    if (!target) throw ApiError.notFound("User not found");

    // Guard: deactivating or demoting an active admin can lock everyone out.
    const deactivating =
      input.status !== undefined && input.status !== userStatus.active;
    const demoting = input.role !== undefined && input.role !== roles.admin;
    if (
      target.role === roles.admin &&
      target.status === userStatus.active &&
      (deactivating || demoting)
    ) {
      if (id === actor.id) {
        throw ApiError.badRequest(
          "You can't deactivate or change your own admin account",
        );
      }
      const activeAdmins = await userModel.countDocuments({
        role: roles.admin,
        status: userStatus.active,
      });
      if (activeAdmins <= 1) {
        throw ApiError.unprocessable(
          "Can't deactivate or demote the last active admin",
        );
      }
    }

    // Pre-check email/phone uniqueness → a clean 409 instead of a raw 500.
    const clashOr: Record<string, unknown>[] = [];
    if (input.email !== undefined)
      clashOr.push({ email: input.email.toLowerCase() });
    if (input.phone !== undefined) clashOr.push({ phone: input.phone });
    if (clashOr.length > 0) {
      const clash = await userModel.exists({
        _id: { $ne: id },
        $or: clashOr,
      });
      if (clash) {
        throw ApiError.conflict(
          "A user with this email or phone already exists",
        );
      }
    }

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

    // A password change or deactivation must invalidate existing sessions.
    if (update.passwordHash || deactivating) {
      await sessionService.revokeAllForUser(id);
    }
    return toDto<User>(updated);
  },

  /**
   * Remove a worker/staff user (offboarding). If they are referenced by jobs,
   * assignments, attendance, or reviews they are DEACTIVATED (status inactive)
   * to preserve history; an unreferenced account is hard-deleted. Their
   * sessions are revoked either way. Guards against removing yourself or the
   * last remaining active admin.
   */
  async removeUser(
    id: string,
    actor: SessionUser,
  ): Promise<{ deleted: boolean; deactivated: boolean }> {
    await dbConnect();
    if (id === actor.id) {
      throw ApiError.badRequest("You can't delete your own account");
    }

    const target = await userModel.findById(id);
    if (!target) throw ApiError.notFound("User not found");

    // Only guard when the target is itself an active admin (removing an already
    // inactive admin doesn't reduce the active-admin count).
    if (target.role === roles.admin && target.status === userStatus.active) {
      const activeAdmins = await userModel.countDocuments({
        role: roles.admin,
        status: userStatus.active,
      });
      if (activeAdmins <= 1) {
        throw ApiError.unprocessable("Can't remove the last active admin");
      }
    }

    // Referenced anywhere that would leave a dangling required ref → keep the
    // record and deactivate instead of hard-deleting.
    const referenced = Boolean(
      (await jobModel.exists({ assignedTechnicians: id })) ||
        (await jobModel.exists({ createdBy: id })) ||
        (await jobModel.exists({ "statusHistory.by": id })) ||
        (await jobAssignmentModel.exists({ technician: id })) ||
        (await jobAssignmentModel.exists({ assignedBy: id })) ||
        (await attendanceModel.exists({ userId: id })) ||
        (await reviewModel.exists({ technicianId: id })) ||
        (await reviewModel.exists({ collectedBy: id })),
    );

    if (referenced) {
      target.status = userStatus.inactive;
      await target.save();
    } else {
      await target.deleteOne();
    }
    await sessionService.revokeAllForUser(id);

    await recordAudit({
      actor: actor.id,
      actorName: actor.name,
      action: referenced ? "user.deactivate" : "user.delete",
      entityType: "user",
      entityId: id,
    });

    return { deleted: !referenced, deactivated: referenced };
  },
};
