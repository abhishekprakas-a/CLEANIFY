import { BookingTable } from "@/components/bookings/bookingTable";

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
        <p className="text-sm text-slate-500">
          Create, search, filter, reschedule, and cancel bookings.
        </p>
      </div>
      <BookingTable />
    </div>
  );
}
