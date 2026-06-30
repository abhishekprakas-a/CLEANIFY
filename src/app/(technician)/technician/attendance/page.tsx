import { AttendanceCard } from "@/components/technician/attendanceCard";
import { AttendanceHistory } from "@/components/technician/attendanceHistory";

export default function TechnicianAttendancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
      <AttendanceCard />
      <AttendanceHistory />
    </div>
  );
}
