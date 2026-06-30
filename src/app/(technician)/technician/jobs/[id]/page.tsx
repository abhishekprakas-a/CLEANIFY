import { JobDetail } from "@/components/technician/jobDetail";

export default function TechnicianJobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <JobDetail jobId={params.id} />;
}
