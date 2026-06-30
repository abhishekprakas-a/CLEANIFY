"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/starRating";
import type { ReviewSummary } from "@/types";

export function ReviewMetrics({ summary }: { summary: ReviewSummary }) {
  const { satisfaction, totalReviews } = summary;
  const pct = (n: number) =>
    totalReviews > 0 ? Math.round((n / totalReviews) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Average rating</CardTitle>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-4xl font-bold text-slate-900">
              {summary.averageRating.toFixed(1)}
            </span>
            <div>
              <StarRating value={summary.averageRating} readOnly />
              <p className="text-xs text-slate-400">{totalReviews} reviews</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Satisfaction</CardTitle>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-700">
                {satisfaction.satisfied}
              </p>
              <p className="text-green-600">
                Satisfied · {pct(satisfaction.satisfied)}%
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-2xl font-bold text-amber-700">
                {satisfaction.neutral}
              </p>
              <p className="text-amber-600">
                Neutral · {pct(satisfaction.neutral)}%
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">
                {satisfaction.dissatisfied}
              </p>
              <p className="text-red-600">
                Dissatisfied · {pct(satisfaction.dissatisfied)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Rating distribution</CardTitle>
          <div className="mt-3 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.ratingDistribution[String(star)] ?? 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-slate-500">{star}</span>
                  <span className="text-amber-400">★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${pct(count)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Technician ratings</CardTitle>
          {summary.technicianRatings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              No rated technicians yet.
            </p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {summary.technicianRatings.map((t) => (
                  <tr key={t.technicianId}>
                    <td className="py-2 font-medium text-slate-800">
                      {t.name}
                    </td>
                    <td className="py-2">
                      <StarRating value={t.averageRating} readOnly size="sm" />
                    </td>
                    <td className="py-2 text-right text-slate-500">
                      {t.averageRating.toFixed(1)} · {t.reviewCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
