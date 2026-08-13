"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { routes } from "@/constants";
import { Logo } from "@/components/brand/logo";

const navItems = [
  { href: routes.admin.dashboard, label: "Dashboard" },
  { href: routes.admin.customers, label: "Customers" },
  { href: routes.admin.bookings, label: "Bookings" },
  { href: routes.admin.schedule, label: "Schedule" },
  { href: routes.admin.jobs, label: "Jobs" },
  { href: routes.admin.photos, label: "Job photos" },
  { href: routes.admin.approvals, label: "Approvals" },
  { href: routes.admin.reviews, label: "Reviews" },
  { href: routes.admin.attendance, label: "Attendance" },
  { href: routes.admin.reports, label: "Reports" },
  { href: routes.admin.staff, label: "Staff" },
  { href: routes.admin.audit, label: "Audit log" },
];

export function Sidebar() {
  const pathname = usePathname();
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100",
                active && "bg-brand-50 text-brand-700",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
