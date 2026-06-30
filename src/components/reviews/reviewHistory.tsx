"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/starRating";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { PaginationMeta, Review } from "@/types";

type ReviewRow = Omit<Review, "customerId" | "technicianId"> & {
  customerId: string | { customerName?: string };
  technicianId?: string | { name?: string };
};

const satisfactionStyle: Record<string, string> = {
  satisfied: "bg-green-100 text-green-700",
  neutral: "bg-amber-100 text-amber-700",
  dissatisfied: "bg-red-100 text-red-700",
};

function name(ref: unknown, key: "customerName" | "name"): string {
  return typeof ref === "object" && ref
    ? ((ref as Record<string, string>)[key] ?? "—")
    : "—";
}

export function ReviewHistory({ version }: { version: number }) {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { items, meta } = await api.list<ReviewRow>(
        `${routes.api.reviews}?page=${p}&limit=10`,
      );
      setRows((prev) => (p === 1 ? items : [...prev, ...items]));
      setMeta(meta ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load, version]);

  return (
    <Card>
      <CardTitle>Review history</CardTitle>
      {rows.length === 0 && !loading ? (
        <p className="mt-3 text-sm text-slate-400">No reviews yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarRating value={r.starRating} readOnly size="sm" />
                  <span className="text-sm font-medium text-slate-800">
                    {name(r.customerId, "customerName")}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    satisfactionStyle[r.satisfactionStatus] ?? "bg-slate-100"
                  }`}
                >
                  {r.satisfactionStatus}
                </span>
              </div>
              {r.reviewComment && (
                <p className="mt-1 text-sm text-slate-600">{r.reviewComment}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {name(r.technicianId, "name")} ·{" "}
                {new Date(r.reviewDate).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {meta && page < meta.totalPages && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={loading}
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(next);
          }}
        >
          Load more
        </Button>
      )}
    </Card>
  );
}
