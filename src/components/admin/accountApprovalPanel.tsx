"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/hooks/useApi";
import type { User } from "@/types";

export function AccountApprovalPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api.get<User[]>("/api/users?status=pending"));
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(user: User, status: "active" | "inactive") {
    if (
      status === "inactive" &&
      !confirm(`Reject ${user.name}'s account request?`)
    )
      return;
    setBusy(user.id);
    try {
      await api.patch(`/api/users/${user.id}`, { status });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (users.length === 0)
    return (
      <Card>
        <p className="text-center text-sm text-slate-400">
          No accounts awaiting verification. 🎉
        </p>
      </Card>
    );

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <Card key={u.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{u.name}</CardTitle>
              <p className="mt-0.5 text-sm text-slate-500">
                {u.email} · {u.phone}
              </p>
              <p className="mt-0.5 text-xs capitalize text-slate-400">
                Role: {u.role}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy === u.id}
                onClick={() => decide(u, "active")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy === u.id}
                onClick={() => decide(u, "inactive")}
              >
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
