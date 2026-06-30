import { AuditLogTable } from "@/components/admin/auditLogTable";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit log</h1>
        <p className="text-sm text-slate-500">
          A record of sensitive actions: logins, approvals, and deletions.
        </p>
      </div>
      <AuditLogTable />
    </div>
  );
}
