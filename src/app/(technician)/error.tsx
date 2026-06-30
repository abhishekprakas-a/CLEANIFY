"use client";

import { ErrorState } from "@/components/ui/errorState";

export default function TechnicianError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} />;
}
