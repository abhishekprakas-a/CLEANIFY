import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { customerService } from "@/services";
import { ApiError } from "@/lib/apiError";
import { routes } from "@/constants";

export const dynamic = "force-dynamic";

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let history;
  try {
    history = await customerService.getHistory(params.id);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) notFound();
    throw err;
  }

  const { customer, bookings, jobs, stats } = history;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={routes.admin.customers}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            ← Back to customers
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold text-slate-800">
            {customer.customerName}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                customer.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {customer.status}
            </span>
          </h1>
        </div>
        <Link href={`${routes.admin.customers}/${customer.id}/edit`}>
          <Button variant="secondary">Edit</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Details</CardTitle>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Mobile</dt>
              <dd className="font-medium text-slate-800">
                {customer.mobileNumber}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Google Maps</dt>
              <dd className="font-medium text-slate-800">
                {customer.googleMapLocation ? (
                  <a
                    href={customer.googleMapLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700"
                  >
                    Open location
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Address</dt>
              <dd className="whitespace-pre-line font-medium text-slate-800">
                {customer.address}
              </dd>
            </div>
            {customer.notes && (
              <div className="sm:col-span-2">
                <dt className="text-slate-400">Notes</dt>
                <dd className="whitespace-pre-line text-slate-700">
                  {customer.notes}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle>Summary</CardTitle>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Bookings</dt>
              <dd className="font-semibold">{stats.totalBookings}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Jobs</dt>
              <dd className="font-semibold">{stats.totalJobs}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Completed jobs</dt>
              <dd className="font-semibold">{stats.completedJobs}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <CardTitle>Booking history</CardTitle>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No bookings yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Tank type</th>
                <th className="py-2">Tanks</th>
                <th className="py-2">Scheduled date</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="py-2 capitalize text-slate-700">
                    {b.tankType}
                  </td>
                  <td className="py-2 text-slate-600">{b.numberOfTanks}</td>
                  <td className="py-2 text-slate-600">
                    {fmtDate(b.scheduledDate)}
                  </td>
                  <td className="py-2 capitalize text-slate-600">
                    {b.bookingStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardTitle>Job history</CardTitle>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No jobs yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Job code</th>
                <th className="py-2">Scheduled</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="py-2 font-medium text-slate-800">
                    {j.jobCode}
                  </td>
                  <td className="py-2 text-slate-600">
                    {fmtDate(j.scheduledDate)}
                  </td>
                  <td className="py-2">
                    <Badge status={j.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
