import Link from "next/link";
import { JobIntakeForm } from "@/components/jobs/jobIntakeForm";
import { routes } from "@/constants";

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={routes.admin.jobs}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← Back to jobs
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">
          Create job (job card)
        </h1>
        <p className="text-sm text-slate-500">
          Pick or add a customer, list the tanks to clean, schedule it, and
          assign workers — all in one step.
        </p>
      </div>
      <JobIntakeForm />
    </div>
  );
}
