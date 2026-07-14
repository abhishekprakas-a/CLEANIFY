"use client";

import { useEffect, useState } from "react";
import { BookingForm } from "@/components/bookings/bookingForm";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { Booking } from "@/types";

/** Fetches a booking, then renders the form in edit mode (BG-07b). */
export function BookingEdit({ id }: { id: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<
        Omit<Booking, "customerId"> & {
          customerId: string | { _id?: string; id?: string };
        }
      >(`${routes.api.bookings}/${id}`)
      .then((b) => {
        // The detail endpoint populates customerId; normalise it back to an id.
        const cid =
          typeof b.customerId === "object"
            ? (b.customerId.id ?? b.customerId._id ?? "")
            : b.customerId;
        setBooking({ ...b, customerId: String(cid) } as Booking);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load booking"),
      );
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!booking) return <p className="text-sm text-slate-400">Loading…</p>;
  return <BookingForm booking={booking} />;
}
