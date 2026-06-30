"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { routes } from "@/constants";
import type { ApiResult, AuthenticatedUser } from "@/types";

/**
 * Hydrates the auth store from the session cookie via /api/auth/me.
 * Client components can read the current user from useAuthStore.
 */
export function useAuth() {
  const { user, isLoading, setUser, reset } = useAuthStore();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(routes.api.auth.me, { credentials: "include" });
        const body = (await res.json()) as ApiResult<{
          user: AuthenticatedUser;
        }>;
        if (!active) return;
        if (body.success) setUser(body.data.user);
        else reset();
      } catch {
        if (active) reset();
      }
    }

    if (!user) load();
    return () => {
      active = false;
    };
  }, [user, setUser, reset]);

  return { user, isLoading };
}
