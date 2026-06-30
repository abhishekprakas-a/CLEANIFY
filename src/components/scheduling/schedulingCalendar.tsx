"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/hooks/useApi";
import { calendarView, routes, type CalendarView } from "@/constants";
import type { DaySchedule, ScheduledJob, User } from "@/types";

// --- date helpers ----------------------------------------------------------

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function parse(s: string): Date {
  return new Date(`${s}T00:00:00`);
}
function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return key(d);
}
function addMonths(s: string, n: number): string {
  const d = parse(s);
  d.setMonth(d.getMonth() + n);
  return key(d);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(s: string): string {
  return parse(s).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// --- component -------------------------------------------------------------

export function SchedulingCalendar() {
  const [view, setView] = useState<CalendarView>(calendarView.monthly);
  const [anchor, setAnchor] = useState<string>(key(new Date()));
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User[]>(routes.api.technicians)
      .then(setTechnicians)
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get<DaySchedule | DaySchedule[]>(
        `${routes.api.schedule}?view=${view}&date=${anchor}`,
      )
      .then((data) => setDays(Array.isArray(data) ? data : [data]))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [view, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(dir: number) {
    if (view === calendarView.monthly) setAnchor((a) => addMonths(a, dir));
    else if (view === calendarView.weekly)
      setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => addDays(a, dir));
  }

  async function assign(job: ScheduledJob, technicianId: string) {
    if (!technicianId) return;
    try {
      if (job.assignedTechnician) {
        await api.post(`${routes.api.jobs}/${job.id}/reassign`, {
          technicianId,
        });
      } else {
        await api.patch(`${routes.api.jobs}/${job.id}/assign`, {
          technicianId,
        });
      }
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Assignment failed");
    }
  }

  async function reschedule(job: ScheduledJob) {
    const date = prompt("New date (YYYY-MM-DD):", anchor);
    if (!date) return;
    const time =
      prompt("New time (HH:mm), optional:", job.scheduledTime ?? "") ?? "";
    try {
      await api.post(`${routes.api.jobs}/${job.id}/reschedule`, {
        scheduledDate: date,
        scheduledTime: time,
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reschedule failed");
    }
  }

  const headerLabel = useMemo(() => {
    if (view === calendarView.monthly) return monthLabel(anchor);
    if (view === calendarView.daily)
      return parse(anchor).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    const first = days[0]?.date;
    const last = days[days.length - 1]?.date;
    return first && last ? `${first} → ${last}` : monthLabel(anchor);
  }, [view, anchor, days]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)}>
            ←
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAnchor(key(new Date()))}
          >
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shift(1)}>
            →
          </Button>
          <span className="ml-2 text-sm font-semibold text-slate-700">
            {headerLabel}
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {[calendarView.daily, calendarView.weekly, calendarView.monthly].map(
            (v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  view === v
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v}
              </button>
            ),
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading schedule…</p>
      ) : view === calendarView.monthly ? (
        <MonthGrid
          anchor={anchor}
          days={days}
          onPickDay={(d) => {
            setAnchor(d);
            setView(calendarView.daily);
          }}
        />
      ) : view === calendarView.weekly ? (
        <WeekGrid days={days} />
      ) : (
        <DayList
          day={days[0]}
          technicians={technicians}
          onAssign={assign}
          onReschedule={reschedule}
        />
      )}
    </div>
  );
}

// --- month -----------------------------------------------------------------

function MonthGrid({
  anchor,
  days,
  onPickDay,
}: {
  anchor: string;
  days: DaySchedule[];
  onPickDay: (date: string) => void;
}) {
  const byDay = new Map(days.map((d) => [d.date, d.jobs]));
  const first = parse(anchor);
  first.setDate(1);
  const weekday = (first.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - weekday);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const month = first.getMonth();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-2 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const k = key(d);
          const jobs = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === month;
          return (
            <button
              key={k}
              onClick={() => onPickDay(k)}
              className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left align-top hover:bg-brand-50 ${
                inMonth ? "" : "bg-slate-50 text-slate-300"
              }`}
            >
              <div className="text-xs font-medium text-slate-500">
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {jobs.slice(0, 3).map((j) => (
                  <div
                    key={j.id}
                    className="truncate rounded bg-brand-100 px-1 text-[11px] text-brand-800"
                    title={`${j.jobCode} · ${j.status}`}
                  >
                    {j.scheduledTime ? `${j.scheduledTime} ` : ""}
                    {j.customer?.customerName ?? j.jobCode}
                  </div>
                ))}
                {jobs.length > 3 && (
                  <div className="text-[11px] text-slate-400">
                    +{jobs.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- week ------------------------------------------------------------------

function WeekGrid({ days }: { days: DaySchedule[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((d) => (
        <div
          key={d.date}
          className="rounded-xl border border-slate-200 bg-white p-2"
        >
          <div className="mb-2 text-xs font-medium text-slate-500">
            {d.date}
          </div>
          <div className="space-y-1">
            {d.jobs.length === 0 ? (
              <p className="text-[11px] text-slate-300">—</p>
            ) : (
              d.jobs.map((j) => (
                <div
                  key={j.id}
                  className="rounded bg-slate-50 p-1.5 text-[11px]"
                >
                  <div className="font-medium text-slate-700">
                    {j.scheduledTime ? `${j.scheduledTime} · ` : ""}
                    {j.customer?.customerName ?? j.jobCode}
                  </div>
                  <div className="text-slate-400">
                    {j.assignedTechnician?.name ?? "Unassigned"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- day -------------------------------------------------------------------

function DayList({
  day,
  technicians,
  onAssign,
  onReschedule,
}: {
  day?: DaySchedule;
  technicians: User[];
  onAssign: (job: ScheduledJob, technicianId: string) => void;
  onReschedule: (job: ScheduledJob) => void;
}) {
  if (!day || day.jobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        No jobs scheduled for this day.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {day.jobs.map((j) => (
        <div
          key={j.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{j.jobCode}</span>
              <Badge status={j.status} />
            </div>
            <div className="text-sm text-slate-500">
              {j.scheduledTime ? `${j.scheduledTime} · ` : ""}
              {j.customer?.customerName ?? "—"}
              {j.customer?.mobileNumber ? ` · ${j.customer.mobileNumber}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue={j.assignedTechnician?.id ?? ""}
              onChange={(e) => onAssign(j, e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
            >
              <option value="">
                {j.assignedTechnician ? "Reassign to…" : "Assign to…"}
              </option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReschedule(j)}
            >
              Reschedule
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
