"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/starRating";
import { api } from "@/hooks/useApi";
import {
  allSatisfactionStatuses,
  satisfactionFromRating,
  routes,
} from "@/constants";
import type { ReviewableJob } from "@/types";

const fieldClass = "h-10 rounded-lg border border-slate-300 px-3 text-sm";

export function ReviewForm({ onCreated }: { onCreated: () => void }) {
  const [jobs, setJobs] = useState<ReviewableJob[]>([]);
  const [jobId, setJobId] = useState("");
  const [starRating, setStarRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [satisfaction, setSatisfaction] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadJobs() {
    api
      .get<ReviewableJob[]>(routes.api.reviews + "/reviewableJobs")
      .then(setJobs)
      .catch(() => setJobs([]));
  }

  useEffect(loadJobs, []);

  function pickRating(value: number) {
    setStarRating(value);
    setSatisfaction(satisfactionFromRating(value));
  }

  async function submit() {
    setError(null);
    if (!jobId) return setError("Select a completed job");
    if (starRating < 1) return setError("Give a star rating");
    setBusy(true);
    try {
      await api.post(routes.api.reviews, {
        jobId,
        starRating,
        reviewComment: reviewComment || undefined,
        satisfactionStatus: satisfaction || undefined,
      });
      setJobId("");
      setStarRating(0);
      setReviewComment("");
      setSatisfaction("");
      loadJobs();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Add a review</CardTitle>
      <p className="mt-1 text-sm text-slate-500">
        Record customer feedback for a completed job.
      </p>

      <div className="mt-3 space-y-3">
        <select
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className={`${fieldClass} w-full`}
        >
          <option value="">Select a completed job…</option>
          {jobs.map((j) => (
            <option key={j.jobId} value={j.jobId}>
              {j.jobCode} · {j.customerName}
              {j.technicianName ? ` · ${j.technicianName}` : ""}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Rating</span>
          <StarRating value={starRating} onChange={pickRating} size="lg" />
        </div>

        {satisfaction && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Satisfaction</span>
            <select
              value={satisfaction}
              onChange={(e) => setSatisfaction(e.target.value)}
              className={`${fieldClass} capitalize`}
            >
              {allSatisfactionStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        <Textarea
          label="Comment (optional)"
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save review"}
        </Button>
      </div>
    </Card>
  );
}
