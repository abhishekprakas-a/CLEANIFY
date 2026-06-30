import { StaffManager } from "@/components/admin/staffManager";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
        <p className="text-sm text-slate-500">
          Manage admin and technician accounts.
        </p>
      </div>
      <StaffManager />
    </div>
  );
}
