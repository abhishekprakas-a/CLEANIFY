import { SchedulingCalendar } from "@/components/scheduling/schedulingCalendar";

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Schedule</h1>
        <p className="text-sm text-slate-500">
          Assign technicians and manage the daily, weekly, and monthly calendar.
        </p>
      </div>
      <SchedulingCalendar />
    </div>
  );
}
