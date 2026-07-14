import Link from "next/link";
import { BookingEdit } from "@/components/bookings/bookingEdit";
import { routes } from "@/constants";

export default function EditBookingPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${routes.admin.bookings}/${params.id}`}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          ← Back to booking
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">Edit booking</h1>
      </div>
      <BookingEdit id={params.id} />
    </div>
  );
}
