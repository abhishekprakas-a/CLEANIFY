import { ReviewsDashboard } from "@/components/reviews/reviewsDashboard";

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reviews</h1>
        <p className="text-sm text-slate-500">
          Customer satisfaction, technician ratings, and review history.
        </p>
      </div>
      <ReviewsDashboard />
    </div>
  );
}
