import { SchedulingCalendar } from "@/components/scheduling/schedulingCalendar";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
        <p className="text-sm text-slate-500">
          Day, week, and month view of scheduled work and crew assignments.
        </p>
      </div>
      <SchedulingCalendar />
    </div>
  );
}
