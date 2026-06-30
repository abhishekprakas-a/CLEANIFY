export const satisfactionStatus = {
  satisfied: "satisfied",
  neutral: "neutral",
  dissatisfied: "dissatisfied",
} as const;

export type SatisfactionStatus =
  (typeof satisfactionStatus)[keyof typeof satisfactionStatus];

export const allSatisfactionStatuses: SatisfactionStatus[] =
  Object.values(satisfactionStatus);

/** Derive a satisfaction band from a 1–5 star rating. */
export function satisfactionFromRating(rating: number): SatisfactionStatus {
  if (rating >= 4) return satisfactionStatus.satisfied;
  if (rating === 3) return satisfactionStatus.neutral;
  return satisfactionStatus.dissatisfied;
}
