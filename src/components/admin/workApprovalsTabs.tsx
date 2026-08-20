"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { JobPhotoGallery } from "@/components/admin/jobPhotoGallery";
import { ApprovalsList } from "@/components/admin/approvalsList";
import { routes } from "@/constants";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All photos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function WorkApprovalsTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  const active: TabKey = TABS.some((t) => t.key === raw)
    ? (raw as TabKey)
    : "all";

  function select(key: TabKey) {
    router.replace(`${routes.admin.workApprovals}?tab=${key}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              active === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "all" ? (
        <JobPhotoGallery />
      ) : (
        <ApprovalsList status={active} />
      )}
    </div>
  );
}
