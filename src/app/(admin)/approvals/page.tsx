import { AccountApprovalPanel } from "@/components/admin/accountApprovalPanel";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Account approvals</h1>
        <p className="text-sm text-slate-500">
          Verify new technician sign-ups. Approve to let them sign in, or reject
          to keep them out.
        </p>
      </div>
      <AccountApprovalPanel />
    </div>
  );
}
