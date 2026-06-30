"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewMetrics } from "@/components/reviews/reviewMetrics";
import { ReviewForm } from "@/components/reviews/reviewForm";
import { ReviewHistory } from "@/components/reviews/reviewHistory";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { ReviewSummary } from "@/types";

export function ReviewsDashboard() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [version, setVersion] = useState(0);

  const loadSummary = useCallback(() => {
    api
      .get<ReviewSummary>(`${routes.api.reviews}/summary`)
      .then(setSummary)
      .catch(() => {});
  }, []);

  useEffect(loadSummary, [loadSummary]);

  function onCreated() {
    loadSummary();
    setVersion((v) => v + 1);
  }

  return (
    <div className="space-y-6">
      {summary && <ReviewMetrics summary={summary} />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReviewForm onCreated={onCreated} />
        <ReviewHistory version={version} />
      </div>
    </div>
  );
}
