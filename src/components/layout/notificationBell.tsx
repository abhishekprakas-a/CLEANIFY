"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/hooks/useApi";
import { routes } from "@/constants";
import type { AppNotification } from "@/types";

interface Feed {
  items: AppNotification[];
  unread: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<Feed>({ items: [], unread: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api
      .get<Feed>(routes.api.notifications)
      .then(setFeed)
      .catch(() => {});
  }, []);

  // Initial load + light polling — but only while the tab is visible, so a
  // backgrounded tab makes no recurring calls. Refreshes when it returns.
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function openNotification(n: AppNotification) {
    setOpen(false);
    if (!n.isRead) {
      await api.post(`${routes.api.notifications}/read`, { id: n.id }).catch(() => {});
      load();
    }
    // Only follow internal, same-origin paths (defence against a bad stored URL).
    if (n.url && n.url.startsWith("/") && !n.url.startsWith("//")) {
      router.push(n.url);
    }
  }

  async function markAll() {
    await api.post(`${routes.api.notifications}/read`, { all: true }).catch(() => {});
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <span aria-hidden className="text-lg">
          🔔
        </span>
        {feed.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {feed.unread > 9 ? "9+" : feed.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-700">
              Notifications
            </span>
            {feed.unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {feed.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                You&apos;re all caught up.
              </p>
            ) : (
              feed.items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-2.5 text-left hover:bg-slate-50 ${
                    n.isRead ? "" : "bg-brand-50/40"
                  }`}
                >
                  <span className="flex items-start gap-2 text-sm text-slate-700">
                    {!n.isRead && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    )}
                    <span className={n.isRead ? "pl-3.5" : ""}>{n.message}</span>
                  </span>
                  <span
                    className={`text-[11px] text-slate-400 ${
                      n.isRead ? "pl-3.5" : "pl-3.5"
                    }`}
                  >
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
