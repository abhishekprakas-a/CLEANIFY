"use client";

import { ErrorState } from "@/components/ui/errorState";

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} />;
}
