import { BookingDetail } from "@/components/bookings/bookingDetail";

export default function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Booking details</h1>
      <BookingDetail id={params.id} />
    </div>
  );
}
