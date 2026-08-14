"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDialog } from "@/components/ui/dialog";
import { api } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import { allBookingStatuses, routes, serviceLabel } from "@/constants";
import type { Booking, PaginationMeta } from "@/types";

/** The list endpoint populates customerId, so it arrives as an object. */
type PopulatedCustomer = { customerName?: string; mobileNumber?: string };
type BookingRow = Omit<Booking, "customerId"> & {
  customerId: string | PopulatedCustomer;
};

const statusStyle: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-700",
  rescheduled: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function customerName(row: BookingRow): string {
  return typeof row.customerId === "object"
    ? (row.customerId.customerName ?? "—")
    : "—";
}

function tankSummary(row: BookingRow): string {
  const tanks = row.tanks ?? [];
  if (tanks.length === 0) return "—";
  const types = [...new Set(tanks.map((t) => t.tankType))].join(", ");
  return tanks.length === 1 ? types : `${types} (${tanks.length} lines)`;
}

function tankQty(row: BookingRow): number {
  return (row.tanks ?? []).reduce((s, t) => s + (t.quantity ?? 1), 0);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

const fieldClass = "h-10 rounded-lg border border-slate-300 px-3 text-sm";

export function BookingTable() {
  const { confirm, prompt } = useDialog();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, from, to]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (status !== "all") params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    return api
      .list<BookingRow>(`${routes.api.bookings}?${params.toString()}`)
      .then(({ items, meta }) => {
        setRows(items);
        setMeta(meta ?? null);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let active = true;
    load().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status, from, to]);

  async function onReschedule(row: BookingRow) {
    const res = await prompt({
      title: "Reschedule booking",
      fields: [
        {
          name: "date",
          label: "New date",
          type: "date",
          required: true,
          defaultValue: row.scheduledDate?.slice(0, 10),
        },
        {
          name: "time",
          label: "New time (optional)",
          type: "time",
          defaultValue: row.scheduledTime ?? "",
        },
      ],
      confirmLabel: "Reschedule",
    });
    if (!res) return;
    try {
      await api.post(`${routes.api.bookings}/${row.id}/reschedule`, {
        scheduledDate: res.date,
        scheduledTime: res.time,
      });
      toast.success("Booking rescheduled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reschedule failed");
    }
  }

  async function onCancel(row: BookingRow) {
    const res = await prompt({
      title: "Cancel booking",
      fields: [
        {
          name: "reason",
          label: "Cancellation reason",
          required: true,
          placeholder: "Why is this booking being cancelled?",
        },
      ],
      confirmLabel: "Cancel booking",
      danger: true,
    });
    if (!res) return;
    try {
      await api.post(`${routes.api.bookings}/${row.id}/cancel`, {
        reason: res.reason,
      });
      toast.success("Booking cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  // Turn a booking into a schedulable job, then assign it on the Schedule.
  async function onCreateJob(row: BookingRow) {
    const ok = await confirm({
      title: "Create job",
      message:
        "Create a job for this booking? You can then assign a technician on the Schedule.",
      confirmLabel: "Create job",
    });
    if (!ok) return;
    try {
      await api.post(routes.api.jobs, {
        booking: row.id,
        scheduledDate: row.scheduledDate,
        scheduledTime: row.scheduledTime,
      });
      toast.success("Job created — open the Schedule to assign a technician.");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create job");
    }
  }

  const isTerminal = (s: string) => s === "cancelled" || s === "completed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${fieldClass} capitalize`}
          >
            <option value="all">All statuses</option>
            {allBookingStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={fieldClass}
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={fieldClass}
            aria-label="To date"
          />
        </div>
        <Link href={`${routes.admin.bookings}/new`}>
          <Button>New booking</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No bookings found.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {customerName(b)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="font-medium text-slate-700">
                      {serviceLabel(b.serviceType)}
                    </span>
                    <span className="block text-xs capitalize text-slate-400">
                      {tankSummary(b)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tankQty(b)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(b.scheduledDate)}
                    {b.scheduledTime ? ` · ${b.scheduledTime}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        statusStyle[b.bookingStatus] ??
                        "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {b.bookingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`${routes.admin.bookings}/${b.id}`}
                        className="text-sm font-medium text-slate-600 hover:text-slate-800"
                      >
                        View
                      </Link>
                      {b.bookingStatus === "pending" && (
                        <button
                          onClick={() => onCreateJob(b)}
                          className="text-sm font-medium text-green-600 hover:text-green-700"
                        >
                          Create job
                        </button>
                      )}
                      <Link
                        href={`${routes.admin.bookings}/${b.id}/edit`}
                        className={`text-sm font-medium ${
                          isTerminal(b.bookingStatus)
                            ? "pointer-events-none opacity-40"
                            : "text-brand-600 hover:text-brand-700"
                        }`}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => onReschedule(b)}
                        disabled={isTerminal(b.bookingStatus)}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => onCancel(b)}
                        disabled={isTerminal(b.bookingStatus)}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} bookings
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
