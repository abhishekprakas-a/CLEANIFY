"use client";

import { cn } from "@/lib/cn";

const sizeClass = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
} as const;

/**
 * Reusable star rating. Read-only by default (display); pass `onChange` to make
 * it an interactive 1–5 input.
 */
export function StarRating({
  value,
  onChange,
  readOnly,
  size = "md",
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  const interactive = Boolean(onChange) && !readOnly;
  const filledUpTo = Math.round(value);

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= filledUpTo;
        const Star = (
          <span
            className={cn(
              sizeClass[size],
              filled ? "text-amber-400" : "text-slate-300",
            )}
          >
            ★
          </span>
        );
        return interactive ? (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            className="leading-none transition-transform hover:scale-110"
          >
            {Star}
          </button>
        ) : (
          <span key={star} className="leading-none">
            {Star}
          </span>
        );
      })}
    </div>
  );
}
