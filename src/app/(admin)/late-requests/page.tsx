import { LateRequestsList } from "@/components/admin/lateRequestsList";

export const metadata = { title: "Late Requests" };

export default function LateRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Late Requests</h1>
        <p className="text-sm text-slate-500">
          Requests raised by technicians when a job is running late. Acknowledge
          to let them know you&apos;ve seen it.
        </p>
      </div>
      <LateRequestsList />
    </div>
  );
}
