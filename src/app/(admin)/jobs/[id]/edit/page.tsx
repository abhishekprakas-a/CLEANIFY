import { JobEdit } from "@/components/jobs/jobEdit";

export default function JobEditPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Manage job</h1>
        <p className="text-sm text-slate-500">
          Edit details, and assign or reassign workers.
        </p>
      </div>
      <JobEdit id={params.id} />
    </div>
  );
}
