"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { Booking } from "@/types";

type PopulatedCustomer = {
  customerName?: string;
  mobileNumber?: string;
  address?: string;
};
type BookingView = Omit<Booking, "customerId"> & {
  customerId: string | PopulatedCustomer;
};

function customer(b: BookingView): PopulatedCustomer {
  return typeof b.customerId === "object" ? b.customerId : {};
}
function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

const statusStyle: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-700",
  rescheduled: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function BookingDetail({ id }: { id: string }) {
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BookingView>(`${routes.api.bookings}/${id}`)
      .then(setBooking)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load booking"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!booking)
    return <p className="text-sm text-red-600">{error ?? "Not found"}</p>;

  const c = customer(booking);
  const isTerminal =
    booking.bookingStatus === "cancelled" ||
    booking.bookingStatus === "completed";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={routes.admin.bookings}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← Back to bookings
        </Link>
        {!isTerminal && (
          <Link href={`${routes.admin.bookings}/${booking.id}/edit`}>
            <Button size="sm">Edit booking</Button>
          </Link>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Customer</CardTitle>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              statusStyle[booking.bookingStatus] ?? "bg-slate-100"
            }`}
          >
            {booking.bookingStatus}
          </span>
        </div>
        <p className="mt-2 font-medium text-slate-800">
          {c.customerName ?? "—"}
        </p>
        {c.mobileNumber && (
          <p className="text-sm text-slate-500">{c.mobileNumber}</p>
        )}
        {c.address && (
          <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
            {c.address}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Tanks ({booking.tanks?.length ?? 0})</CardTitle>
        <ul className="mt-2 space-y-2">
          {(booking.tanks ?? []).map((t, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
            >
              <span className="capitalize text-slate-800">
                {t.name || `${t.tankType} tank`}
                <span className="text-slate-500">
                  {" · "}
                  {t.tankType} · {t.capacityLitres} L
                  {t.quantity && t.quantity > 1 ? ` · ×${t.quantity}` : ""}
                </span>
              </span>
              {t.cleaningCharge != null && (
                <span className="font-medium text-slate-700">
                  ₹{t.cleaningCharge}
                </span>
              )}
            </li>
          ))}
        </ul>
        {booking.totalCharge != null && (
          <p className="mt-2 text-right text-sm font-semibold text-slate-800">
            Total: ₹{booking.totalCharge}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle>Schedule</CardTitle>
        <p className="mt-2 text-sm text-slate-600">
          {fmtDate(booking.scheduledDate)}
          {booking.scheduledTime ? ` · ${booking.scheduledTime}` : ""}
        </p>
        {booking.specialInstructions && (
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Instructions: </span>
            {booking.specialInstructions}
          </p>
        )}
      </Card>
    </div>
  );
}
