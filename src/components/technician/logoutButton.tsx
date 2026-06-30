"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await api.logout().catch(() => {});
    router.replace(routes.login);
    router.refresh();
  }

  return (
    <Button variant="danger" className="w-full" onClick={logout}>
      Log out
    </Button>
  );
}
