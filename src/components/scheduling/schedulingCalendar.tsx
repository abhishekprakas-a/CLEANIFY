"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDialog } from "@/components/ui/dialog";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import {
  calendarView,
  routes,
  statusCalendarColor,
  type CalendarView,
} from "@/constants";
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
function endTime(start?: string, mins?: number): string | null {
  if (!start || !mins) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(start);
  if (!m) return null;
  const total = Math.min(Number(m[1]) * 60 + Number(m[2]) + mins, 24 * 60 - 1);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Legend: the six lifecycle colour groups (spec §C3).
const LEGEND: { label: string; sample: string }[] = [
  { label: "Scheduled", sample: "scheduled" },
  { label: "Pre-work approval", sample: "preWorkPendingApproval" },
  { label: "In progress", sample: "cleaningInProgress" },
  { label: "Completion approval", sample: "completionPendingApproval" },
  { label: "Completed", sample: "completed" },
  { label: "Cancelled", sample: "cancelled" },
];

function monthLabel(s: string): string {
  return parse(s).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// --- component -------------------------------------------------------------

export function SchedulingCalendar() {
  const { prompt } = useDialog();
  const toast = useToast();
  const [view, setView] = useState<CalendarView>(calendarView.monthly);
  const [anchor, setAnchor] = useState<string>(key(new Date()));
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScheduledJob | null>(null);

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

  // Toggle a technician in/out of the job's crew, then push the full crew.
  async function assign(job: ScheduledJob, technicianId: string) {
    if (!technicianId) return;
    const current = job.assignedTechnicians.map((t) => t.id);
    const technicianIds = current.includes(technicianId)
      ? current.filter((id) => id !== technicianId)
      : [...current, technicianId];
    if (technicianIds.length === 0) {
      toast.error("A job needs at least one technician. Reschedule to unassign.");
      return;
    }
    try {
      await api.patch(`${routes.api.jobs}/${job.id}/assign`, { technicianIds });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    }
  }

  async function reschedule(job: ScheduledJob) {
    const res = await prompt({
      title: `Reschedule ${job.jobCode}`,
      fields: [
        {
          name: "date",
          label: "New date",
          type: "date",
          required: true,
          defaultValue: anchor,
        },
        {
          name: "time",
          label: "New time (optional)",
          type: "time",
          defaultValue: job.scheduledTime ?? "",
        },
      ],
      confirmLabel: "Reschedule",
    });
    if (!res) return;
    try {
      await api.post(`${routes.api.jobs}/${job.id}/reschedule`, {
        scheduledDate: res.date,
        scheduledTime: res.time,
      });
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reschedule failed");
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

      <Legend />

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
          onPickJob={setSelected}
        />
      ) : view === calendarView.weekly ? (
        <WeekGrid days={days} onPickJob={setSelected} />
      ) : (
        <DayView
          day={days[0]}
          technicians={technicians}
          onAssign={assign}
          onReschedule={reschedule}
          onPickJob={setSelected}
        />
      )}

      {selected && (
        <JobDrawer
          job={selected}
          onClose={() => setSelected(null)}
          onReschedule={() => reschedule(selected)}
        />
      )}
    </div>
  );
}

// --- legend ----------------------------------------------------------------

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
      {LEGEND.map((l) => (
        <span
          key={l.label}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: statusCalendarColor(l.sample) }}
          />
          {l.label}
        </span>
      ))}
    </div>
  );
}

// --- a single job chip (colour-coded) --------------------------------------

function JobChip({
  job,
  onClick,
  dense,
}: {
  job: ScheduledJob;
  onClick: () => void;
  dense?: boolean;
}) {
  const color = statusCalendarColor(job.status);
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${job.jobCode} · ${job.status}`}
      className="flex w-full items-center gap-1 truncate rounded border border-slate-100 bg-white px-1 py-0.5 text-left text-[11px] text-slate-700 hover:bg-slate-50"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="truncate">
        {job.scheduledTime ? `${job.scheduledTime} ` : ""}
        {dense ? "" : "· "}
        {job.customer?.customerName ?? job.jobCode}
      </span>
    </button>
  );
}

// --- month -----------------------------------------------------------------

function MonthGrid({
  anchor,
  days,
  onPickDay,
  onPickJob,
}: {
  anchor: string;
  days: DaySchedule[];
  onPickDay: (date: string) => void;
  onPickJob: (job: ScheduledJob) => void;
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
            <div
              key={k}
              className={`min-h-24 border-b border-r border-slate-100 p-1.5 align-top ${
                inMonth ? "" : "bg-slate-50 text-slate-300"
              }`}
            >
              <button
                type="button"
                onClick={() => onPickDay(k)}
                className="text-xs font-medium text-slate-500 hover:text-brand-600"
              >
                {d.getDate()}
              </button>
              <div className="mt-1 space-y-1">
                {jobs.slice(0, 3).map((j) => (
                  <JobChip key={j.id} job={j} dense onClick={() => onPickJob(j)} />
                ))}
                {jobs.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onPickDay(k)}
                    className="text-[11px] text-slate-400 hover:text-brand-600"
                  >
                    +{jobs.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- week ------------------------------------------------------------------

function WeekGrid({
  days,
  onPickJob,
}: {
  days: DaySchedule[];
  onPickJob: (job: ScheduledJob) => void;
}) {
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
                <JobChip key={j.id} job={j} onClick={() => onPickJob(j)} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- day (per-worker stacked) ----------------------------------------------

function DayView({
  day,
  technicians,
  onAssign,
  onReschedule,
  onPickJob,
}: {
  day?: DaySchedule;
  technicians: User[];
  onAssign: (job: ScheduledJob, technicianId: string) => void;
  onReschedule: (job: ScheduledJob) => void;
  onPickJob: (job: ScheduledJob) => void;
}) {
  const [grouped, setGrouped] = useState(false);

  if (!day || day.jobs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        No jobs scheduled for this day.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setGrouped((g) => !g)}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {grouped ? "Show as list" : "Group by worker"}
        </button>
      </div>

      {grouped ? (
        <PerWorkerDay day={day} onPickJob={onPickJob} />
      ) : (
        <div className="space-y-2">
          {day.jobs.map((j) => (
            <div
              key={j.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
              style={{ borderLeft: `4px solid ${statusCalendarColor(j.status)}` }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPickJob(j)}
                    className="font-medium text-slate-800 hover:text-brand-600"
                  >
                    {j.jobCode}
                  </button>
                  <Badge status={j.status} />
                </div>
                <div className="text-sm text-slate-500">
                  {j.scheduledTime ? `${j.scheduledTime}` : "—"}
                  {endTime(j.scheduledTime, j.estimatedDurationMins)
                    ? `–${endTime(j.scheduledTime, j.estimatedDurationMins)}`
                    : ""}
                  {" · "}
                  {j.customer?.customerName ?? "—"}
                  {j.customer?.mobileNumber ? ` · ${j.customer.mobileNumber}` : ""}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Crew:{" "}
                  {j.assignedTechnicians.length > 0
                    ? j.assignedTechnicians
                        .map((t) =>
                          t.id === j.supervisorId ? `${t.name} (lead)` : t.name,
                        )
                        .join(", ")
                    : "Unassigned"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value=""
                  onChange={(e) => onAssign(j, e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
                >
                  <option value="">Add / remove technician…</option>
                  {technicians.map((t) => {
                    const inCrew = j.assignedTechnicians.some(
                      (a) => a.id === t.id,
                    );
                    return (
                      <option key={t.id} value={t.id}>
                        {inCrew ? `✓ ${t.name} (remove)` : t.name}
                      </option>
                    );
                  })}
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
      )}
    </div>
  );
}

/** Day jobs stacked in a column per worker (spec §C3). */
function PerWorkerDay({
  day,
  onPickJob,
}: {
  day: DaySchedule;
  onPickJob: (job: ScheduledJob) => void;
}) {
  const columns = new Map<string, { name: string; jobs: ScheduledJob[] }>();
  const unassigned: ScheduledJob[] = [];
  for (const j of day.jobs) {
    if (j.assignedTechnicians.length === 0) {
      unassigned.push(j);
      continue;
    }
    for (const t of j.assignedTechnicians) {
      const col = columns.get(t.id) ?? { name: t.name, jobs: [] };
      col.jobs.push(j);
      columns.set(t.id, col);
    }
  }
  const cols = [...columns.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name),
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cols.map(([id, col]) => (
        <div
          key={id}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="mb-2 text-sm font-semibold text-slate-700">
            {col.name}
            <span className="ml-1 text-xs font-normal text-slate-400">
              ({col.jobs.length})
            </span>
          </div>
          <div className="space-y-1">
            {col.jobs
              .slice()
              .sort((a, b) =>
                (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""),
              )
              .map((j) => (
                <JobChip key={j.id} job={j} onClick={() => onPickJob(j)} />
              ))}
          </div>
        </div>
      ))}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-slate-500">
            Unassigned
            <span className="ml-1 text-xs font-normal text-slate-400">
              ({unassigned.length})
            </span>
          </div>
          <div className="space-y-1">
            {unassigned.map((j) => (
              <JobChip key={j.id} job={j} onClick={() => onPickJob(j)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- detail drawer ---------------------------------------------------------

function JobDrawer({
  job,
  onClose,
  onReschedule,
}: {
  job: ScheduledJob;
  onClose: () => void;
  onReschedule: () => void;
}) {
  const end = endTime(job.scheduledTime, job.estimatedDurationMins);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative z-50 flex h-full w-full max-w-sm flex-col gap-4 overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                {job.jobCode}
              </h2>
              <Badge status={job.status} />
            </div>
            {job.customer && (
              <p className="text-sm text-slate-500">
                {job.customer.customerName}
                {job.customer.mobileNumber
                  ? ` · ${job.customer.mobileNumber}`
                  : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">When</dt>
            <dd className="text-slate-700">
              {job.scheduledDate
                ? new Date(job.scheduledDate).toLocaleDateString()
                : "—"}
              {job.scheduledTime ? ` · ${job.scheduledTime}` : ""}
              {end ? `–${end}` : ""}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Duration</dt>
            <dd className="text-slate-700">
              {job.estimatedDurationMins
                ? `${job.estimatedDurationMins} min`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Crew</dt>
            <dd className="text-right text-slate-700">
              {job.assignedTechnicians.length > 0
                ? job.assignedTechnicians
                    .map((t) =>
                      t.id === job.supervisorId ? `${t.name} (lead)` : t.name,
                    )
                    .join(", ")
                : "Unassigned"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col gap-2">
          <Button variant="secondary" onClick={onReschedule}>
            Reschedule
          </Button>
          <Link
            href={`${routes.admin.jobs}/${job.id}/edit`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open &amp; manage (assign / edit)
          </Link>
          <Link
            href={routes.admin.workApprovals}
            className="rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open work photos
          </Link>
        </div>
      </aside>
    </div>
  );
}
