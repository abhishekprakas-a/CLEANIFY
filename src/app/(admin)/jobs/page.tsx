import { JobsTable } from "@/components/admin/jobsTable";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Jobs</h1>
        <p className="text-sm text-slate-500">
          All jobs across the pipeline — filter by status or technician.
        </p>
      </div>
      <JobsTable />
    </div>
  );
}
