import { PhotoReviewPanel } from "@/components/admin/photoReviewPanel";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Photo approvals</h1>
        <p className="text-sm text-slate-500">
          Review before/after cleaning photos and advance jobs.
        </p>
      </div>
      <PhotoReviewPanel />
    </div>
  );
}
