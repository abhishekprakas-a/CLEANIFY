"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { StaffManager } from "@/components/admin/staffManager";
import { AccountApprovalPanel } from "@/components/admin/accountApprovalPanel";
import { routes } from "@/constants";

const TABS = [
  { key: "staff", label: "Staff" },
  { key: "pending", label: "Pending approvals" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function StaffTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("tab");
  const active: TabKey = TABS.some((t) => t.key === raw)
    ? (raw as TabKey)
    : "staff";

  function select(key: TabKey) {
    router.replace(`${routes.admin.staff}?tab=${key}`);
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

      {active === "staff" ? <StaffManager /> : <AccountApprovalPanel />}
    </div>
  );
}
