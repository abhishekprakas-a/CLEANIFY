"use client";

/**
 * A tiny localStorage-backed outbox for mutations made while offline. Items are
 * replayed (in order) by `useOfflineSync` when connectivity returns.
 */
export interface OutboxItem {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  createdAt: number;
}

const KEY = "wtcs.outbox";

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export const outbox = {
  list: read,

  enqueue(item: Omit<OutboxItem, "id" | "createdAt">): OutboxItem {
    const entry: OutboxItem = {
      ...item,
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      createdAt: Date.now(),
    };
    write([...read(), entry]);
    return entry;
  },

  remove(id: string): void {
    write(read().filter((i) => i.id !== id));
  },

  clear(): void {
    write([]);
  },

  count(): number {
    return read().length;
  },
};
