import mongoose, { Schema, type Model } from "mongoose";

/** Immutable record of a sensitive action (auth, approvals, deletions, …). */
export interface AuditLogDocument {
  _id: mongoose.Types.ObjectId;
  actor?: mongoose.Types.ObjectId;
  actorName?: string;
  action: string; // e.g. "auth.login", "photo.approve"
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: String },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ actor: 1 });

export const auditLogModel: Model<AuditLogDocument> =
  (mongoose.models.AuditLog as Model<AuditLogDocument>) ||
  mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
