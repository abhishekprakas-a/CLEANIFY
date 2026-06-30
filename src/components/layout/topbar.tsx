"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { SessionUser } from "@/types";

export function Topbar({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function logout() {
    await api.logout();
    router.replace(routes.login);
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      <div className="text-sm text-slate-500">
        Signed in as{" "}
        <span className="font-medium text-slate-800">{user.name}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={logout}>
        Logout
      </Button>
    </header>
  );
}
