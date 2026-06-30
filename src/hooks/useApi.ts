"use client";

import { routes } from "@/constants";
import type { ApiResult, PaginationMeta } from "@/types";

/** Shared in-flight refresh so concurrent 401s trigger only one refresh call. */
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(routes.api.auth.refresh, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
}

/**
 * Typed fetch that unwraps the standard API envelope. On a 401 it transparently
 * refreshes the access token once and retries, so a short-lived access token
 * never interrupts an active user.
 */
export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
  retry = true,
): Promise<T> {
  let res = await rawFetch(input, init);

  if (res.status === 401 && retry && !input.includes("/api/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) res = await rawFetch(input, init);
  }

  const body = (await res.json()) as ApiResult<T>;
  if (!body.success) {
    throw new Error(body.error.message || "Request failed");
  }
  return body.data;
}

/** Like apiFetch but also returns the pagination `meta` for list endpoints. */
export async function apiList<T>(
  input: string,
  retry = true,
): Promise<{ items: T[]; meta?: PaginationMeta }> {
  let res = await rawFetch(input);
  if (res.status === 401 && retry && !input.includes("/api/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) res = await rawFetch(input);
  }
  const body = (await res.json()) as ApiResult<T[]>;
  if (!body.success) {
    throw new Error(body.error.message || "Request failed");
  }
  return { items: body.data, meta: body.meta };
}

export const api = {
  get: <T>(url: string) => apiFetch<T>(url),
  list: <T>(url: string) => apiList<T>(url),
  post: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, {
      method: "POST",
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  patch: <T>(url: string, data: unknown) =>
    apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
  logout: () => apiFetch(routes.api.auth.logout, { method: "POST" }),
};
