import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function TechnicianLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-40" />
      <SkeletonCard className="h-28" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonCard className="h-40" />
    </div>
  );
}
