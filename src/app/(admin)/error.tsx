"use client";

import { ErrorState } from "@/components/ui/errorState";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} />;
}
