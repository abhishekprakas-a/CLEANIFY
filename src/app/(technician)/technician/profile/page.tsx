import { redirect } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { PushToggle } from "@/components/pwa/pushToggle";
import { InstallButton } from "@/components/pwa/installButton";
import { LogoutButton } from "@/components/technician/logoutButton";
import { getSessionUser } from "@/lib/authGuard";
import { routes } from "@/constants";

export const dynamic = "force-dynamic";

export default async function TechnicianProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect(routes.login);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Profile</h1>

      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Name</dt>
            <dd className="font-medium text-slate-800">{user.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Email</dt>
            <dd className="font-medium text-slate-800">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Role</dt>
            <dd className="font-medium capitalize text-slate-800">
              {user.role}
            </dd>
          </div>
        </dl>
      </Card>

      <PushToggle />

      <Card>
        <CardTitle>App</CardTitle>
        <p className="mt-1 text-sm text-slate-500">
          Install the app on your phone for offline access and quicker entry.
        </p>
        <div className="mt-3">
          <InstallButton />
        </div>
      </Card>

      <LogoutButton />
    </div>
  );
}
