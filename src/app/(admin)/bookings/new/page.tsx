import Link from "next/link";
import { Suspense } from "react";
import { BookingForm } from "@/components/bookings/bookingForm";
import { routes } from "@/constants";

export default function NewBookingPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={routes.admin.bookings}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← Back to bookings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">New booking</h1>
      </div>
      <Suspense fallback={null}>
        <BookingForm />
      </Suspense>
    </div>
  );
}
