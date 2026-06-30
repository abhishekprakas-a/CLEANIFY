import mongoose, { Schema, type Model } from "mongoose";

/**
 * A persisted login session. Holds the **hash** of the current refresh token
 * (never the token itself). Refresh tokens are rotated on every use, so this
 * is the single source of truth for whether a session is still valid.
 */
export interface SessionDocument {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true, default: () => new Date() },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

// TTL index: Mongo removes expired sessions automatically.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const sessionModel: Model<SessionDocument> =
  (mongoose.models.Session as Model<SessionDocument>) ||
  mongoose.model<SessionDocument>("Session", sessionSchema);
