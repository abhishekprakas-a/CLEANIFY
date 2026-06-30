import { ReportsDashboard } from "@/components/reports/reportsDashboard";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500">
          Attendance, job completion, technician performance, reviews, and
          productivity — filter and export to CSV, Excel, or PDF.
        </p>
      </div>
      <ReportsDashboard />
    </div>
  );
}
