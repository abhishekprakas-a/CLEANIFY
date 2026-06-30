import { AdminDashboardView } from "@/components/dashboard/adminDashboardView";
import { dashboardService } from "@/services";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await dashboardService.adminSummary();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <AdminDashboardView data={data} />
    </div>
  );
}
