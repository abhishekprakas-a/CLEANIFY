import { Suspense } from "react";
import { BookingDeskTabs } from "@/components/bookingDesk/bookingDeskTabs";

export const metadata = { title: "Booking Desk" };

export default function BookingDeskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Booking Desk</h1>
        <p className="text-sm text-slate-500">
          Take a booking, schedule it, and assign a crew — all in one place.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
        <BookingDeskTabs />
      </Suspense>
    </div>
  );
}
