import { Suspense } from "react";
import { WorkApprovalsTabs } from "@/components/admin/workApprovalsTabs";

export const metadata = { title: "Work Photos & Approvals" };

export default function WorkApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Work Photos &amp; Approvals
        </h1>
        <p className="text-sm text-slate-500">
          Before/after work photos, and the approval queue for pre-work and
          completion submissions.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
        <WorkApprovalsTabs />
      </Suspense>
    </div>
  );
}
