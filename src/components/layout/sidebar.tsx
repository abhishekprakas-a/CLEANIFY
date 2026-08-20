"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import { Logo } from "@/components/brand/logo";

const navItems = [
  { href: routes.admin.dashboard, label: "Dashboard" },
  { href: routes.admin.calendar, label: "Calendar" },
  { href: routes.admin.bookingDesk, label: "Booking Desk" },
  { href: routes.admin.jobs, label: "Jobs" },
  {
    href: routes.admin.workApprovals,
    label: "Work Photos & Approvals",
    badge: "approvals" as const,
  },
  { href: routes.admin.reviews, label: "Reviews" },
  { href: routes.admin.attendance, label: "Attendance" },
  { href: routes.admin.reports, label: "Reports" },
  { href: routes.admin.staff, label: "Staff" },
  { href: routes.admin.audit, label: "Audit log" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const loadBadges = useCallback(() => {
    api
      .get<{ count: number }>(`${routes.api.submissions}?count=1`)
      .then((d) => setPendingApprovals(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBadges();
    // Poll only while the tab is visible so a backgrounded tab is silent.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadBadges();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadBadges();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadBadges, pathname]);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex items-center gap-2 px-5 py-4">
        <Logo className="h-6" />
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
          Admin
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count =
            item.badge === "approvals" ? pendingApprovals : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100",
                active && "bg-brand-50 text-brand-700",
              )}
            >
              <span>{item.label}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
