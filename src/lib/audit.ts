import { dbConnect } from "@/lib/dbConnect";
import { logger } from "@/lib/logger";
import { auditLogModel } from "@/models";

export interface AuditEntry {
  actor?: string;
  actorName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}

/**
 * Append an audit-log entry. Best-effort: a logging failure must never break the
 * action it records, so errors are swallowed (and logged).
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await dbConnect();
    await auditLogModel.create(entry);
  } catch (err) {
    logger.error("Audit write failed", {
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
