import { AttendanceDashboard } from "@/components/attendance/attendanceDashboard";

export default function AdminAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-sm text-slate-500">
          Daily roster and weekly / monthly summaries for field technicians.
        </p>
      </div>
      <AttendanceDashboard />
    </div>
  );
}
