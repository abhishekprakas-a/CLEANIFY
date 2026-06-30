"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { api } from "@/hooks/useApi";
import { offlineMutate } from "@/lib/offline/mutate";
import type { Attendance, GeoPoint } from "@/types";

function getLocation(): Promise<GeoPoint | undefined> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 5000 },
    );
  });
}

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusLabel: Record<string, string> = {
  present: "Present",
  late: "Late",
  halfDay: "Half day",
  absent: "Absent",
};

export function AttendanceCard() {
  const [record, setRecord] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Attendance | null>("/api/attendance/today")
      .then(setRecord)
      .catch(() => {});
  }, []);

  async function act(path: string, optimisticCheckedOut: boolean) {
    setLoading(true);
    setNote(null);
    try {
      const location = await getLocation();
      const res = await offlineMutate(path, "POST", { location }, "Attendance");
      if (res.queued) {
        setNote("Saved offline — will sync when you're back online.");
        // optimistic local state
        setRecord((prev) =>
          optimisticCheckedOut
            ? prev
              ? { ...prev, checkOutTime: new Date().toISOString() }
              : prev
            : ({
                id: "local",
                userId: "local",
                date: new Date().toISOString().slice(0, 10),
                checkInTime: new Date().toISOString(),
                status: "present",
              } as Attendance),
        );
      } else if (res.ok) {
        const fresh = await api
          .get<Attendance | null>("/api/attendance/today")
          .catch(() => null);
        setRecord(fresh);
      } else {
        setNote(res.error ?? "Action failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const checkedIn = record && !record.checkOutTime;
  const checkedOut = record?.checkOutTime;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Today&apos;s attendance</CardTitle>
        {record && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
            {statusLabel[record.status] ?? record.status}
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-400">Check-in</dt>
          <dd className="font-medium text-slate-800">
            {formatTime(record?.checkInTime)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Check-out</dt>
          <dd className="font-medium text-slate-800">
            {formatTime(record?.checkOutTime)}
          </dd>
        </div>
      </dl>

      {note && <p className="mt-3 text-xs text-amber-700">{note}</p>}

      <div className="mt-4">
        {!record && (
          <Button
            onClick={() => act("/api/attendance/checkIn", false)}
            disabled={loading}
            className="w-full"
          >
            Check in
          </Button>
        )}
        {checkedIn && (
          <Button
            onClick={() => act("/api/attendance/checkOut", true)}
            disabled={loading}
            variant="secondary"
            className="w-full"
          >
            Check out
          </Button>
        )}
        {checkedOut && (
          <div className="space-y-2 text-center">
            <p className="text-sm text-green-700">
              Done for today — {record?.workingHours ?? 0}h worked.
            </p>
            <button
              type="button"
              onClick={() => act("/api/attendance/checkIn", false)}
              disabled={loading}
              className="text-xs font-medium text-brand-600 underline hover:text-brand-700 disabled:opacity-50"
            >
              Checked out by mistake? Check in again
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
