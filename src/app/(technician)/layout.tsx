import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/authGuard";
import { Topbar } from "@/components/layout/topbar";
import { OfflineBanner } from "@/components/pwa/offlineBanner";
import { roles, routes } from "@/constants";

const navItems = [
  { href: routes.technician.home, label: "Home" },
  { href: routes.technician.jobs, label: "Jobs" },
  { href: routes.technician.attendance, label: "Attendance" },
  { href: routes.technician.profile, label: "Profile" },
];

export default async function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(routes.login);
  if (user.role !== roles.technician) redirect(routes.admin.dashboard);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <Topbar user={user} />
      <OfflineBanner />
      <main className="flex-1 p-4 pb-20">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t border-slate-200 bg-white py-2 text-xs">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-1 text-slate-500"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
